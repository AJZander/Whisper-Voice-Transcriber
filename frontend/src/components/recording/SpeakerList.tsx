// src/components/SpeakerList.tsx
import React from "react";
import { Panel } from "primereact/panel";

interface SpeakerSegment {
    speaker: string;
    startTime: number;
    endTime: number;
    text: string;
}

interface SpeakerListProps {
    speakers: SpeakerSegment[];
}

const SpeakerList: React.FC<SpeakerListProps> = ({ speakers }) => {
    return (
        <Panel header="Speaker Segments" className="p-my-2">
            {speakers?.length > 0 ? (
                speakers.map((segment, index) => (
                    <div key={index} style={{ marginBottom: "0.5rem" }}>
                        <strong>Speaker {segment.speaker}:</strong> [ {segment.startTime} - {segment.endTime} ]<br />
                        {segment.text}
                    </div>
                ))
            ) : (
                <p>No speaker data available.</p>
            )}
        </Panel>
    );
};

export default SpeakerList;
