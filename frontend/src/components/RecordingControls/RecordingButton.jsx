import React from "react";

const RecordingButton = ({ isRecording, onStart, onStop}) => {
	return (
		<div>
			<button
				onClick={isRecording ? onStop : onStart}
				style={{
					backgroundColor: isRecording ? "#e74c3c" : "#2ecc71",
					color: "#fff",
					padding: "10px 20px",
					borderRadius: "5px",
					border: "none",
					cursor: "pointer",
					fontSize: "16px",
				}}
			>
				{isRecording ? "Stop Recording" : "Start Recording"}
			</button>
		</div>
    );
};

export default RecordingButton;
