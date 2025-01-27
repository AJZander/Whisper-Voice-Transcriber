// src/VoiceTranscriber.js
import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const VoiceTranscriber = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcriptions, setTranscriptions] = useState([]);
    const [speakers, setSpeakers] = useState([]);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioWorkletNodeRef = useRef(null);
    const audioBufferRef = useRef([]);
    const bufferLengthRef = useRef(0);
    const BUFFER_DURATION = 1; // Buffer duration in seconds

    useEffect(() => {
        // Initialize WebSocket connection
        const socketUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5001";
        socketRef.current = io(socketUrl, {
            transports: ["websocket"], // Use WebSocket only
            upgrade: false, // Do not upgrade from polling to WebSocket
        });

        socketRef.current.on("connect", () => {
            console.log("Connected to backend");
            setIsConnected(true);
        });

        socketRef.current.on("transcription", (data) => {
            console.log("Transcription received:", data);
            if (data && data.transcription) {
                setTranscriptions((prev) => [...prev, data.transcription]);
            } else {
                console.warn("Received empty transcription data:", data);
            }
            if (data && data.speakers) {
                setSpeakers(data.speakers);
            }
        });

        socketRef.current.on("error", (error) => {
            console.error("Socket error:", error);
            setError("An error occurred during transcription.");
        });

        socketRef.current.on("disconnect", () => {
            console.log("Disconnected from backend");
            setIsConnected(false);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const startRecording = async () => {
        if (isRecording) return;

        setIsRecording(true);
        setError(null); // Reset any previous errors
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const audioContext = audioContextRef.current;
            const sampleRate = audioContext.sampleRate;
            console.log(`AudioContext Sample Rate: ${sampleRate} Hz`);

            // Define the AudioWorkletProcessor as a string
            const workletCode = `
                class AudioSenderProcessor extends AudioWorkletProcessor {
                    constructor() {
                        super();
                    }

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

            // Create a Blob from the worklet code
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const blobURL = URL.createObjectURL(blob);

            // Add the worklet module
            await audioContext.audioWorklet.addModule(blobURL);

            // Create the AudioWorkletNode
            audioWorkletNodeRef.current = new AudioWorkletNode(audioContext, 'audio-sender-processor');

            // Handle messages from the AudioWorkletProcessor
            audioWorkletNodeRef.current.port.onmessage = (event) => {
                const channelData = event.data; // Float32Array
                audioBufferRef.current.push(new Float32Array(channelData));
                bufferLengthRef.current += channelData.length;

                // Check if buffer duration is met
                const bufferDuration = bufferLengthRef.current / sampleRate;
                if (bufferDuration >= BUFFER_DURATION) {
                    // Concatenate all buffered Float32Arrays
                    const concatenatedBuffer = flattenFloat32Array(audioBufferRef.current);
                    audioBufferRef.current = [];
                    bufferLengthRef.current = 0;

                    // Convert Float32Array to Int16Array
                    const int16Buffer = convertFloat32ToInt16(concatenatedBuffer);

                    // Send the raw PCM data to backend
                    socketRef.current.emit("audio_data", int16Buffer.buffer);
                    console.log("Sending buffered audio data to backend");
                }
            };

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(audioWorkletNodeRef.current);
            audioWorkletNodeRef.current.connect(audioContext.destination);

            console.log("Recording started");
        } catch (err) {
            console.error("Failed to start recording:", err);
            setError("Failed to access microphone. Please check your permissions.");
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (!isRecording) return;

        setIsRecording(false);
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.port.close();
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        audioBufferRef.current = [];
        bufferLengthRef.current = 0;
        console.log("Recording stopped");
    };

    return (
        <div style={styles.container}>
            <h1>Voice Transcription App</h1>
            <button
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                    ...styles.button,
                    backgroundColor: isRecording ? "#e74c3c" : "#2ecc71",
                }}
            >
                {isRecording ? "Stop Recording" : "Start Recording"}
            </button>

            {!isConnected && <p style={styles.status}>Connecting to backend...</p>}

            {error && <p style={styles.error}>{error}</p>}

            <div style={styles.section}>
                <h2>Transcriptions:</h2>
                {transcriptions.length === 0 ? (
                    <p>No transcriptions yet.</p>
                ) : (
                    <ul>
                        {transcriptions.map((text, index) => (
                            <li key={index}>{text}</li>
                        ))}
                    </ul>
                )}
            </div>

            <div style={styles.section}>
                <h2>Speakers:</h2>
                {speakers.length === 0 ? (
                    <p>No speaker information yet.</p>
                ) : (
                    <ul>
                        {speakers.map((speaker, index) => (
                            <li key={index}>
                                <strong>Speaker {speaker.speaker}:</strong> {formatTime(speaker.start)}s - {formatTime(speaker.end)}s
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

// Helper function to flatten an array of Float32Arrays into a single Float32Array
const flattenFloat32Array = (bufferArray) => {
    let totalLength = 0;
    bufferArray.forEach((buffer) => {
        totalLength += buffer.length;
    });
    const result = new Float32Array(totalLength);
    let offset = 0;
    bufferArray.forEach((buffer) => {
        result.set(buffer, offset);
        offset += buffer.length;
    });
    return result;
};

// Helper function to convert Float32Array to Int16Array
const convertFloat32ToInt16 = (buffer) => {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
        let s = Math.max(-1, Math.min(1, buffer[l]));
        buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buf;
};

// Helper function to format time to two decimal places
const formatTime = (time) => {
    return time.toFixed(2);
};

// Simple inline styles for better presentation
const styles = {
    container: {
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
    },
    button: {
        padding: "10px 20px",
        fontSize: "16px",
        marginBottom: "20px",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
    },
    section: {
        marginBottom: "20px",
    },
    error: {
        color: "#e74c3c",
    },
    status: {
        color: "#3498db",
    },
};

export default VoiceTranscriber;
