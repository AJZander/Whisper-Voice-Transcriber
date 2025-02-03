// src/hooks/useTranscription.ts
import { useState, useEffect, useCallback } from "react";
import { initSocket, disconnectSocket, getSocket } from "../services/socketService";
import { startAudioCapture, stopAudioCapture } from "../services/audioProcessingService";

interface DiarizationConfig {
	num_speakers: number;
	min_duration_off: number;
	offset: number;
}

export function useTranscription() {
	const [isRecording, setIsRecording] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [partialTranscripts, setPartialTranscripts] = useState<string[]>([]);
	const [whisperTranscript, setWhisperTranscript] = useState<string[]>([]);
	const [speakers, setSpeakers] = useState<unknown[]>([]);
	const [combinedTranscript, setCombinedTranscript] = useState<string>("");

	useEffect(() => {
		const socket = initSocket();

		socket.on("connect", () => {
			console.log("Connected to backend via socket");
			setIsConnected(true);
		});

		socket.on("transcription_partial", (data: { text: string }) => {
			setPartialTranscripts((prev) => [...prev, data.text]);
		});


		socket.on("transcription", (data: { transcription: string; speakers?: unknown[] }) => {
			setWhisperTranscript((prev) => [...prev, data.transcription]);
			if (data.speakers) {
				setSpeakers(data.speakers);
			}
			
		});

		socket.on("final_combined_transcript", (data: { transcript: string }) => {
			setCombinedTranscript(data.transcript);
		});

		socket.on("speakers", (data: unknown[]) => {
			setSpeakers(data);
		});

		socket.on("error", (err: unknown) => {
			console.error("Socket error:", err);
			if (err instanceof Error) {
				setError(err.message || "An error occurred during transcription.");
			} else {
				setError("An error occurred during transcription.");
			}
		});

		socket.on("disconnect", () => {
			console.log("Socket disconnected");
			setIsConnected(false);
		});

		return () => {
			disconnectSocket(socket);
		};
	}, []);

	const startRecording = useCallback(
		async (diarizationConfig: DiarizationConfig) => {
			if (!isRecording) {
				setError(null);
				setPartialTranscripts([]);
				setWhisperTranscript([]);
				setSpeakers([]);
				setCombinedTranscript("");
				setIsRecording(true);

				try {
					await startAudioCapture(diarizationConfig);
				} catch (err) {
					console.error("Failed to start recording:", err);
					setError("Failed to access microphone. Please check your permissions.");
					setIsRecording(false);
				}
			}
		},
		[isRecording]
	);

	const stopRecording = useCallback(() => {
		if (isRecording) {
			setIsRecording(false);
			stopAudioCapture();
			const socket = getSocket();
			socket.emit('stop_recording');

		}
	}, [isRecording, whisperTranscript]);

	const combineTranscript = (transcript:string) => {
		const socket = getSocket();
		socket.emit("combine_transcripts", {
			realTimeTranscript: transcript,
			whisperTranscript: whisperTranscript.join(" ")
		});
	};

	return {
		isRecording,
		isConnected,
		error,
		partialTranscripts,
		whisperTranscript,
		speakers,
		combinedTranscript,
		startRecording,
		stopRecording,
		combineTranscript
	};
}