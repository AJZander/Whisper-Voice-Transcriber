// src/services/audioProcessingService.ts
import { getSocket } from "./socketService";

let audioContext: AudioContext | null = null;
let audioWorkletNode: AudioWorkletNode | null = null;
let mediaStream: MediaStream | null = null;

let audioBufferRef: Float32Array[] = [];
let bufferLengthRef = 0;

const BUFFER_DURATION = 1;
let sampleRate = 44100;

interface DiarizationConfig {
    num_speakers: number;
    min_duration_off: number;
    offset: number;
}

export const startAudioCapture = async (diarizationConfig: DiarizationConfig) => {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    sampleRate = audioContext.sampleRate;

    // Send config to server
    getSocket().emit("diarization_config", diarizationConfig);

    // Create a minimal audio worklet
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

    audioWorkletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
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

// ---- Utils
function flattenFloat32Array(bufferArray: Float32Array[]): Float32Array {
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

function convertFloat32ToInt16(buffer: Float32Array): Int16Array {
    const l = buffer.length;
    const out = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        const s = Math.max(-1, Math.min(1, buffer[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
}
