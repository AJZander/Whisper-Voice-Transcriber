// src/components/RealtimeTranscript.tsx
import React from "react";
import { Panel } from "primereact/panel";

interface RealtimeTranscriptProps {
    transcript: string;
}

const RealtimeTranscript: React.FC<RealtimeTranscriptProps> = ({ transcript }) => {
    return (
        <Panel header="Realtime Transcript" className="p-my-2">
            <p>{transcript || "..."}</p>
        </Panel>
    );
};

export default RealtimeTranscript;
