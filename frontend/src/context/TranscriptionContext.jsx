import React, { createContext, useState, useEffect, useCallback } from "react";
import { initSocket, getSocket, disconnectSocket } from "../services/socketService";
import { startAudioCapture, stopAudioCapture } from "../services/audioProcessingService";

export const TranscriptionContext = createContext();

export const TranscriptionProvider = ({ children }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [partialTranscripts, setPartialTranscripts] = useState([]);
    const [finalTranscripts, setFinalTranscripts] = useState([]);
    const [speakers, setSpeakers] = useState([]);

    // --- Socket handlers
    useEffect(() => {
        // Initialize socket
        const socket = initSocket();

        socket.on("connect", () => {
            console.log("Connected to backend via socket");
            setIsConnected(true);
        });

        // Partial transcripts from the backend
        socket.on("transcription_partial", (data) => {
            // data could be { text: "...", timestamp: ... } or an entire array
            // for simplicity, assume data is a single partial string
            setPartialTranscripts((prev) => [...prev, data.text]);
        });

        // Final transcripts from the backend
        socket.on("transcription_final", (data) => {
            // Once we get a final chunk, we might want to clear partials
            // or just append. It's up to your design.
            setFinalTranscripts((prev) => [...prev, data.text]);
        });

        socket.on("transcription", (data) => {
            console.log("Transcription event received:", data);
            // data.transcription => The final transcript
            // data.speakers => The array of speaker segments
          
            // You can store them in your finalTranscripts or whichever states you prefer:
            setFinalTranscripts((prev) => [...prev, data.transcription]);
            setSpeakers(data.speakers || []);
          });

        // Speaker diarization updates
        socket.on("speakers", (data) => {
            // data could be an array of speaker segments
            setSpeakers(data);
        });

        // Error handling
        socket.on("error", (err) => {
            console.error("Socket error:", err);
            setError(err.message || "An error occurred during transcription.");
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected");
            setIsConnected(false);
        });

        return () => {
            // cleanup
            disconnectSocket(socket);
        };
    }, []);

    // --- Recording logic
    const startRecording = useCallback(async (diarizationConfig) => {
        if (!isRecording) {
            setError(null);
            setPartialTranscripts([]);
            setFinalTranscripts([]);
            setSpeakers([]);
            setIsRecording(true);
            try {
				
                await startAudioCapture(diarizationConfig);
            } catch (err) {
                console.error("Failed to start recording:", err);
                setError("Failed to access microphone. Please check your permissions.");
                setIsRecording(false);
            }
        }
    }, [isRecording]);

    const stopRecording = useCallback(async () => {
        if (isRecording) {
            setIsRecording(false);
            stopAudioCapture();
        }
    }, [isRecording]);

    return (
        <TranscriptionContext.Provider
            value={{
                isRecording,
                isConnected,
                error,
                partialTranscripts,
                finalTranscripts,
                speakers,
                startRecording,
                stopRecording,
            }}
        >
            {children}
        </TranscriptionContext.Provider>
    );
};
