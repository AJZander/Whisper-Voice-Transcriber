import React from "react";

const FinalTranscript = ({ finalTranscripts }) => {
    if (!finalTranscripts || finalTranscripts.length === 0) {
        return <p>No final transcriptions yet.</p>;
    }

    return (
        <ul>
            {finalTranscripts.map((finalText, idx) => (
                <li key={idx}>{finalText}</li>
            ))}
        </ul>
    );
};

export default FinalTranscript;
