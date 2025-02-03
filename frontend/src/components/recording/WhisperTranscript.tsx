// src/components/FinalTranscript.tsx
import React from "react";
import { Panel } from "primereact/panel";

interface WhisperTranscriptProps {
    whisperTranscript: string[];
}

const WhisperTranscript: React.FC<WhisperTranscriptProps> = ({ whisperTranscript }) => {
    return (
        <Panel header="Final Transcript" className="p-my-2">
            {whisperTranscript && whisperTranscript.length > 0 ? (
                whisperTranscript.map((t, idx) => (
                    <p key={idx} style={{ marginBottom: "0.5rem" }}>
                        {t}
                    </p>
                ))
            ) : (
                <p>No final transcripts yet.</p>
            )}
        </Panel>
    );
};

export default WhisperTranscript;
