# voice-backend/main.py
import os
import asyncio
import socketio
from fastapi import FastAPI
import uvicorn
import tempfile
import logging
import subprocess

# Import Whisper for transcription
import whisper

# Import pyannote for speaker diarization
from pyannote.audio import Pipeline

from fastapi.middleware.cors import CORSMiddleware

import warnings

# Suppress specific FutureWarnings from torch.load in whisper and speechbrain
warnings.filterwarnings(
    "ignore",
    message=r".*torch.load.*weights_only=False.*",
    category=FutureWarning,
    module="whisper",
)
warnings.filterwarnings(
    "ignore",
    message=r".*torch.load.*weights_only=False.*",
    category=FutureWarning,
    module="speechbrain",
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://frontend",  # Docker service name
    # Add other origins if necessary
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allow specified origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=origins)
app.mount("/socket.io", socketio.ASGIApp(sio))

# Initialize Whisper model
logger.info("Loading Whisper model...")
whisper_model = whisper.load_model("base")  # Choose appropriate model size
logger.info("Whisper model loaded.")

# Retrieve Hugging Face token from environment variables
hf_token = os.getenv("PYANNOTE_TOKEN")
if not hf_token:
    logger.error("Hugging Face token not found. Please set PYANNOTE_TOKEN environment variable.")
    raise ValueError("Hugging Face token not found. Please set PYANNOTE_TOKEN environment variable.")

# Initialize pyannote pipeline for speaker diarization with authentication
logger.info("Loading pyannote pipeline...")
try:
    pyannote_pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization",
        use_auth_token=hf_token
    )
    logger.info("Pyannote pipeline loaded.")
except Exception as e:
    logger.error(f"Failed to load pyannote pipeline: {e}")
    raise e

# Store raw PCM data per session
audio_buffers = {}

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    audio_buffers[sid] = bytearray()
    asyncio.create_task(flush_buffer_periodically(sid))

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    if sid in audio_buffers:
        del audio_buffers[sid]

@sio.event
async def audio_data(sid, data):
    """
    Handle incoming raw PCM audio data from the frontend.
    Appends the received data to the client's audio buffer.
    """
    try:
        if sid not in audio_buffers:
            # Initialize buffer if not present
            audio_buffers[sid] = bytearray()
        audio_buffers[sid] += data  # data is received as bytes
        logger.info(f"Received {len(data)} bytes of audio data from sid: {sid}")
    except Exception as e:
        logger.error(f"Error receiving audio data from sid {sid}: {e}")
        await sio.emit('error', {'message': 'Failed to receive audio data.'}, to=sid)

async def flush_buffer_periodically(sid):
    try:
        while True:
            await asyncio.sleep(2)  # Flush every 2 seconds
            # Check if sid is still in audio_buffers
            if sid not in audio_buffers:
                logger.info(f"Stopping flush_buffer_periodically for disconnected sid: {sid}")
                break
            if audio_buffers[sid]:
                audio_bytes = bytes(audio_buffers[sid])
                audio_buffers[sid] = bytearray()

                # Save raw PCM data to temporary file
                with tempfile.NamedTemporaryFile(suffix=".raw", delete=False) as tmp_raw:
                    tmp_raw.write(audio_bytes)
                    tmp_raw_path = tmp_raw.name

                logger.info(f"Periodically flushing audio data from {sid}, processing file {tmp_raw_path}")

                # Run transcription and diarization in background
                asyncio.create_task(process_audio(sid, tmp_raw_path))
    except Exception as e:
        logger.error(f"Error in flush_buffer_periodically for sid {sid}: {e}")

async def process_audio(sid, raw_path):
    try:
        # Define paths
        wav_path = f"{raw_path}.wav"

        # Convert raw PCM to WAV using ffmpeg
        # Assuming 16-bit PCM, mono, sample rate 44100 Hz
        subprocess.run([
            "ffmpeg",
            "-f", "s16le",          # Raw PCM format
            "-ar", "44100",         # Sample rate (match frontend)
            "-ac", "1",             # Mono
            "-i", raw_path,         # Input raw PCM file
            "-ar", "16000",         # Target sample rate for Whisper
            "-ac", "1",             # Mono
            wav_path
        ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        logger.info(f"Converted raw PCM to WAV: {wav_path}")

        # Transcription using Whisper
        logger.info(f"Transcribing audio for {sid} using Whisper...")
        transcription = whisper_model.transcribe(wav_path)
        logger.info(f"Transcription completed for {sid}: {transcription['text']}")

        # Speaker Diarization using pyannote
        logger.info(f"Performing speaker diarization for {sid}...")
        diarization = pyannote_pipeline(wav_path)
        logger.info(f"Speaker diarization completed for {sid}.")

        # Prepare speaker segments
        speakers = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speakers.append({
                "speaker": speaker,
                "start": turn.start,
                "end": turn.end
            })

        # Emit transcription and speaker info back to client
        await sio.emit('transcription', {
            "transcription": transcription['text'],
            "speakers": speakers
        }, to=sid)
        logger.info(f"Emitted transcription and speaker data to {sid}.")

    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg conversion failed for {sid}: {e.stderr.decode()}")
        await sio.emit('error', {'message': 'Audio format conversion failed.'}, to=sid)
    except Exception as e:
        logger.error(f"Error processing audio for {sid}: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)
    finally:
        # Remove temporary files
        try:
            os.remove(raw_path)
            os.remove(wav_path)
            logger.info(f"Temporary files {raw_path} and {wav_path} removed.")
        except Exception as e:
            logger.error(f"Failed to remove temporary files: {e}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000)