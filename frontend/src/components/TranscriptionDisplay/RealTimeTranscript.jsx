import React from "react";

const RealtimeTranscript = ({ partialTranscripts }) => {

    if (!partialTranscripts || partialTranscripts.length === 0) {
        return <p>No real-time transcription available.</p>;
    }

    return (
        <div>
            {partialTranscripts.map((text, idx) => (
                <p key={idx} style={{ fontStyle: "italic" }}>
                    {text}
                </p>
            ))}
        </div>
    );
};

export default RealtimeTranscript;
