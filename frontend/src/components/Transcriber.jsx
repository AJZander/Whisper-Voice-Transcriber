/* eslint-disable react-hooks/rules-of-hooks */
// src/components/VoiceTranscriber.jsx
import React, { useContext, useEffect, useState } from "react";
import { TranscriptionContext } from "../context/TranscriptionContext";
import RecordingButton from "./RecordingControls/RecordingButton";
import RealtimeTranscript from "./TranscriptionDisplay/RealTimeTranscript";
import FinalTranscript from "./TranscriptionDisplay/FinalTranscript";
import SpeakerList from "./TranscriptionDisplay/SpeakerList";
import DiarizationConfig from './RecordingControls/ConfigEditor';

import { getSocket } from "../services/socketService";

import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { mergeTranscripts } from "../services/textMergeService";

const VoiceTranscriber = () => {
	const { isRecording, isConnected, error, finalTranscripts, speakers, startRecording, stopRecording } = useContext(TranscriptionContext);

	const [diarizationConfig, setDiarizationConfig] = useState({
		num_speakers: 1,
		min_duration_off: 0.5,
		offset: 0.7,
	  });

	// Local real-time transcript from the browser
	const { transcript, listening, resetTranscript } = useSpeechRecognition();

	// "combinedTranscript" accumulates all merges so far.
	const [combinedTranscript, setCombinedTranscript] = useState("");

	// Check browser support for Speech Recognition
	if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
		return (
			<div>
				<h1>Voice Transcription App</h1>
				<p>Browser doesn't support speech recognition.</p>
			</div>
		);
	}

	// Start/stop local recognition
	// eslint-disable-next-line react-hooks/rules-of-hooks
	useEffect(() => {
		if (isRecording) {
			SpeechRecognition.startListening({ continuous: true, language: "en-US" });
			resetTranscript();
		} else {
			SpeechRecognition.stopListening();
		}
	}, [isRecording, resetTranscript]);

	/**
	 * When a new final transcript arrives from the backend,
	 * merge it with our local transcript & the existing "combinedTranscript".
	 * Then update "combinedTranscript" to hold the newly merged text.
	 */
	useEffect(() => {
		if (finalTranscripts.length > 0) {
			const newServerFinal = finalTranscripts[finalTranscripts.length - 1];

			// Merge local transcript + new final + existing combined
			const merged = mergeTranscripts(transcript, newServerFinal, combinedTranscript);
			setCombinedTranscript(merged);
		}
	}, [finalTranscripts, transcript, combinedTranscript]);

	const handleStartRecording = async () => {
		startRecording(diarizationConfig);
	};

	return (
		<div style={styles.container}>
			<h1>Voice Transcription App</h1>

			<RecordingButton isRecording={isRecording} onStart={handleStartRecording} onStop={stopRecording} />

			<DiarizationConfig
				config={diarizationConfig}
				onChange={setDiarizationConfig}
			/>

			{!isConnected && <p style={styles.status}>Connecting to backend...</p>}
			{error && <p style={styles.error}>{error}</p>}

			<div style={styles.section}>
				<h2>Local Real-Time Transcript (Browser-based)</h2>
				<RealtimeTranscript partialTranscripts={[transcript]} />
				<p style={{ fontSize: "14px", color: "grey" }}>(Listening? {listening ? "Yes" : "No"})</p>
			</div>

			<div style={styles.section}>
				<h2>Back-End Final Transcripts (Whisper + Diarization)</h2>
				<FinalTranscript finalTranscripts={finalTranscripts} />
			</div>
			{/* 
            <div style={styles.section}>
                <h2>Best Combined Transcript</h2>
                <p>{combinedTranscript || "No final text to display yet."}</p>
            </div> */}

			<div style={styles.section}>
				<h2>Speakers (from server diarization):</h2>
				<SpeakerList speakers={speakers} />
			</div>
		</div>
	);
};

const styles = {
	container: {
		maxWidth: "600px",
		margin: "0 auto",
		padding: "20px",
		fontFamily: "Arial, sans-serif",
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
