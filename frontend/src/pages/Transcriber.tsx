// src/components/Transcriber.tsx
import React, { useEffect, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useTranscription } from "../hooks/useTranscription";

// PrimeReact imports
import { Card } from "primereact/card";
import { Divider } from "primereact/divider";

import RecordingButton from "../components/recording/RecordingButton";
import RealtimeTranscript from "../components/recording/RealtimeTranscript";
import WhisperTranscript from "../components/recording/WhisperTranscript";
import SpeakerList from "../components/recording/SpeakerList";
import DiarizationConfig from "../components/recording/DiarizationConfig";
import { Panel } from "primereact/panel";

interface DiarizationConfigType {
	num_speakers: number;
	min_duration_off: number;
	offset: number;
}

interface SpeakerSegment {
	speaker: string;
	startTime: number;
	endTime: number;
	text: string;
}

const Transcriber: React.FC = () => {
	// Our custom hook for server-based transcription
	const { isRecording, isConnected, error, whisperTranscript, speakers: unknownSpeakers, startRecording, stopRecording, combinedTranscript, combineTranscript } = useTranscription();
	const speakers: SpeakerSegment[] = unknownSpeakers as SpeakerSegment[];

	// Local config for diarization
	const [diarizationConfig, setDiarizationConfig] = useState<DiarizationConfigType>({
		num_speakers: 1,
		min_duration_off: 0.5,
		offset: 0.7,
	});

	const { transcript, listening, resetTranscript } = useSpeechRecognition();

	// If no browser support, show a fallback
	if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
		return (
			<Card title="Voice Transcription App">
				<p>Browser does not support the SpeechRecognition API.</p>
			</Card>
		);
	}

	// eslint-disable-next-line react-hooks/rules-of-hooks
	useEffect(() => {
		// Start/stop local SpeechRecognition based on isRecording
		if (isRecording) {
			SpeechRecognition.startListening({ continuous: true, language: "en-US" });
			resetTranscript();
		} else {
			SpeechRecognition.stopListening();
		}
	}, [isRecording, resetTranscript]);

	// eslint-disable-next-line react-hooks/rules-of-hooks
	useEffect(() => {
		combineTranscript(transcript);
	}, [whisperTranscript]);


	const handleStartRecording = () => {
		startRecording(diarizationConfig);
	};

	const handleStopRecording = () => {
		stopRecording();
	};

	return (
		<div className="grid w-full">
			<div className="col-12">
				<div className="flex justify-content-center">
					<div className="col-10">
						<Card className="shadow-4">
							<div className="flex align-items-center justify-content-between mb-3">
								<div className="flex flex-column">
									<h2 className="text-2xl font-bold m-0">Voice Transcription Testing</h2>
								</div>
							</div>

							{/* Recording Controls */}
							<div className="flex align-items-center gap-3 mb-3">
								<RecordingButton
									isRecording={isRecording}
									onStart={handleStartRecording}
									onStop={handleStopRecording}
								/>

							</div>
							<div>
								<DiarizationConfig
									config={diarizationConfig}
									onChange={setDiarizationConfig}
								/>
							</div>

							{/* Connection Status / Errors */}
							{!isConnected && (
								<div className="flex justify-content-center mb-3">
									<p className="text-primary m-0">Connecting to backend...</p>
								</div>
							)}
							{error && (
								<div className="flex justify-content-center mb-3">
									<p className="text-danger m-0">{error}</p>
								</div>
							)}

							<Divider />

							{/* Cards Section */}
							<div className="flex flex-column gap-3">
								{/* Local Real-Time Transcript */}
								<Card className="shadow-2">
									<div className="flex flex-column gap-2">
										<h3 className="text-xl m-0">Local Real-Time Transcript</h3>
										<RealtimeTranscript transcript={transcript} />
										<p className="m-0">
											Status: <span className={`font-bold ${listening ? 'text-success' : 'text-danger'}`}>
												{listening ? "Listening" : "Not Listening"}
											</span>
										</p>
									</div>
								</Card>

								{/* Server Whisper Transcripts */}
								<Card className="shadow-2">
									<div className="flex flex-column gap-2">
										<h3 className="text-xl m-0">Server Whisper Transcripts</h3>
										<WhisperTranscript whisperTranscript={whisperTranscript} />
									</div>
								</Card>

								{/* Combined Transcript */}
								<Card className="shadow-2">
									<div className="flex flex-column gap-2">
										<h3 className="text-xl m-0">Best Combined Transcript</h3>
										<Panel header="Combined Transcript" className="p-my-2">
											{combinedTranscript && combinedTranscript.length > 0 ? (
												<p>{combinedTranscript}</p>
											) : (
												<p>No final transcripts yet.</p>
											)}
										</Panel>
									</div>
								</Card>

								{/* Speaker Segments */}
								<Card className="shadow-2">
									<div className="flex flex-column gap-2">
										<h3 className="text-xl m-0">Speakers (Diarization)</h3>
										<SpeakerList speakers={speakers} />
									</div>
								</Card>
							</div>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Transcriber;
