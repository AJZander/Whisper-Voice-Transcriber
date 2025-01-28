import React from "react";

const SpeakerList = ({ speakers }) => {
    if (!speakers || speakers.length === 0) {
        return <p>No speaker information yet.</p>;
    }

    return (
        <ul>
            {speakers.map((sp, index) => (
                <li key={index}>
                    <strong>Speaker {sp.speaker}</strong>
                    &nbsp;({sp.start.toFixed(2)}s - {sp.end.toFixed(2)}s)
                </li>
            ))}
        </ul>
    );
};

export default SpeakerList;
