# VoiceTranscriber

**VoiceTranscriber** is a real-time voice transcription and speaker diarization application. It consists of a React frontend and a Python backend,openAI's whisper model to transcribe audio input and identify different speakers on the backend, whilst doing browser based real time transcription on the frontend.
Once the whisper model returns its transcription, both realtime and whisper transcriptions are passed into another model on the backend to create the best transcription possible out of the two provided.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Configure Environment Variables](#2-configure-environment-variables)
  - [3. Build and Run Docker Containers](#3-build-and-run-docker-containers)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- **Real-Time Transcription:** Converts spoken language into written text in real-time.
- **Speaker Diarization:** Identifies and distinguishes between different speakers in the audio stream.
- **GPU Acceleration:** Utilizes NVIDIA GPU's for hosting the models
- **WebSocket Communication:** Employs Socket.IO for efficient, bidirectional communication between frontend and backend.
- **Dockerized Deployment:** Simplifies setup and ensures consistency across different environments.

## Architecture

The application is divided into two main components:

1. **Frontend (React):**
   - **Purpose:** Captures audio from the user's microphone, provide the real time transcript, sends audio data to the backend, and displays transcriptions along with speaker information.
   - **Key Technologies:** React, Socket.IO Client.

2. **Backend (Python):**
   - **Purpose:** Receives audio data from the frontend, processes it using Whisper for transcription and pyannote.audio for speaker diarization, and sends the results back to the frontend.
   - **Key Technologies:** FastAPI, Uvicorn, Socket.IO, Whisper, pyannote.audio, PyTorch with CUDA support.


## Prerequisites

Before setting up the application, ensure you have the following installed on your system:

- **Docker:** [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose:** [Install Docker Compose](https://docs.docker.com/compose/install/)
- **NVIDIA GPU Drivers:** Ensure that your NVIDIA drivers are up to date
- **NVIDIA Container Toolkit:** [Install NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
- **Hugging Face Account:** [Sign Up](https://huggingface.co/join) and obtain an access token with the necessary permissions.

## Installation

Follow the steps below to set up and run VoiceTranscriber.

### 1. Clone the Repository

```bash
git clone https://github.com/AJZander/Whisper-Voice-Transcriber
cd VoiceTranscriber
```

### 2. Configure Environment Variables

copy the .env.example to .env and fill in your env variables

```bash
cp .env.example .env
```


**Notes:**

- Ensure that the token has at least `read` permissions for accessing the `pyannote/speaker-diarization` model.

### 3. Build and Run Docker Containers

Use Docker Compose to build and run both the frontend and backend services.

```bash
docker-compose up --build
```

**Expected Output:**

- **Backend Container:**
  - Initializes CUDA and loads the Whisper model.
  - Successfully loads the `pyannote` pipeline.
  - Listens for incoming audio data on port `5001`.

- **Frontend Container:**
  - Starts the React application.
  - Serves the application on port `3000`.

**Access the Application:**

Open your web browser and navigate to [http://localhost:3000](http://localhost:3000) to access the VoiceTranscriber frontend.

## Usage

1. **Start Recording:**
   - Click the **"Start Recording"** button to begin capturing audio from your microphone.
   
2. **Stop Recording:**
   - Click the **"Stop Recording"** button to end the recording session.

3. **View Transcriptions:**
   - As you speak, transcriptions will appear in real-time under the **Transcriptions** section.
   - Fianl transcription will appear at intervals after it has processed
   - Identified speakers will be listed under the **Speakers** section with their respective time ranges.



## Contributing

Contributions are welcome! feel free to form this repo and submit a pull request with any changes you think will improve.

Note: the front end is intentionally plain as i am really only interested in the backend for a larger system. If you want to develop the front end, be my guest.


## Contact

For any inquiries, please contact [awisely@mygene.com.au](mailto:awisely@mygene.com.au).

