import React from "react";
import "./indicatorStyles.css"; // or inline styles

const RecordingIndicator = ({ isRecording }) => {
    return (
        <div className="recording-indicator-container">
            {isRecording && <div className="recording-dot" />}
            {isRecording ? "Recording..." : "Not recording"}
        </div>
    );
};

export default RecordingIndicator;
