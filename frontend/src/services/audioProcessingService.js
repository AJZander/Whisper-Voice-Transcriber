import { getSocket } from "./socketService";

let audioContext;
let audioWorkletNode;
let mediaStream;
let audioBufferRef = [];
let bufferLengthRef = 0;

// Customize as needed
const BUFFER_DURATION = 1; // 1 second
let sampleRate = 44100;

export const startAudioCapture = async () => {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    sampleRate = audioContext.sampleRate;

    // Create AudioWorklet
    const workletCode = `
      class AudioSenderProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
              const input = inputs[0];
              if (input.length > 0) {
                  const channelData = input[0];
                  this.port.postMessage(channelData);
              }
              return true;
          }
      }
      registerProcessor('audio-sender-processor', AudioSenderProcessor);
  `;
    const blob = new Blob([workletCode], { type: "application/javascript" });
    const blobURL = URL.createObjectURL(blob);

    await audioContext.audioWorklet.addModule(blobURL);
    audioWorkletNode = new AudioWorkletNode(audioContext, "audio-sender-processor");

    // Message from worklet
    audioWorkletNode.port.onmessage = (event) => {
        const channelData = event.data;
        audioBufferRef.push(new Float32Array(channelData));
        bufferLengthRef += channelData.length;

        const currentBufferDuration = bufferLengthRef / sampleRate;
        if (currentBufferDuration >= BUFFER_DURATION) {
            // Flatten
            const concatBuffer = flattenFloat32Array(audioBufferRef);
            audioBufferRef = [];
            bufferLengthRef = 0;
            // Convert to Int16
            const int16Buffer = convertFloat32ToInt16(concatBuffer);
            // Emit through socket
            getSocket().emit("audio_data", sampleRate, int16Buffer.buffer);
            // Debug
            // console.log("Sent audio data to backend, length:", int16Buffer.length);
        }
    };

    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(audioWorkletNode);
    audioWorkletNode.connect(audioContext.destination);
};

export const stopAudioCapture = () => {
    if (audioWorkletNode) {
        audioWorkletNode.port.close();
        audioWorkletNode.disconnect();
        audioWorkletNode = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
    }
    audioBufferRef = [];
    bufferLengthRef = 0;
};

// Utility function to flatten arrays
function flattenFloat32Array(bufferArray) {
    let totalLength = 0;
    bufferArray.forEach((buf) => {
        totalLength += buf.length;
    });
    const result = new Float32Array(totalLength);
    let offset = 0;
    bufferArray.forEach((buf) => {
        result.set(buf, offset);
        offset += buf.length;
    });
    return result;
}

function convertFloat32ToInt16(buffer) {
    const l = buffer.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        let s = Math.max(-1, Math.min(1, buffer[i]));
        buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return buf;
}
