// src/components/RecordingButton.tsx
import React from "react";
import { Button } from "primereact/button";

interface RecordingButtonProps {
    isRecording: boolean;
    onStart: () => void;
    onStop: () => void;
}

const RecordingButton: React.FC<RecordingButtonProps> = ({ isRecording, onStart, onStop }) => {
    return (
        <Button
            label={isRecording ? "Stop Recording" : "Start Recording"}
            icon={isRecording ? "pi pi-microphone-slash" : "pi pi-microphone"}
            className={isRecording ? "p-button-danger" : "p-button-success"}
            onClick={() => {
                if (isRecording) {
                    onStop();
                } else {
                    onStart();
                }
            }}
        />
    );
};

export default RecordingButton;
