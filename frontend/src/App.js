import React from "react";
import { TranscriptionProvider } from "./context/TranscriptionContext";
import VoiceTranscriber from "./components/Transcriber";

function App() {
  return (
    <TranscriptionProvider>
      <div className="App">
        <VoiceTranscriber />
      </div>
    </TranscriptionProvider>
  );
}

export default App;
