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
    const scriptProcessorRef = useRef(null);
    const audioBufferRef = useRef([]);
    const sampleRateRef = useRef(44100); // Default sample rate

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
            sampleRateRef.current = audioContextRef.current.sampleRate;

            const source = audioContextRef.current.createMediaStreamSource(stream);
            const bufferSize = 4096;
            scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(audioContextRef.current.destination);

            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputBuffer = audioProcessingEvent.inputBuffer;
                const channelData = inputBuffer.getChannelData(0); // Mono channel
                audioBufferRef.current.push(new Float32Array(channelData));

                // Convert Float32Array to Int16Array
                const int16Buffer = convertFloat32ToInt16(channelData);

                // Convert Int16Array to ArrayBuffer
                const arrayBuffer = int16Buffer.buffer;

                // Send the raw PCM data to backend
                socketRef.current.emit("audio_data", arrayBuffer);
                console.log("Sending audio data to backend");
            };

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
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current.onaudioprocess = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
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

// Helper function to convert Float32Array to Int16Array
const convertFloat32ToInt16 = (buffer) => {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
        buf[l] = buffer[l] < 0 ? buffer[l] * 0x8000 : buffer[l] * 0x7fff;
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
