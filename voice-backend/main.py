# main.py

import os
import asyncio
import socketio
from fastapi import FastAPI
import uvicorn
import tempfile
import logging
import subprocess
import whisper
import torch
from pyannote.audio import Pipeline
from fastapi.middleware.cors import CORSMiddleware
import warnings
import io

# Suppress specific FutureWarnings
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
    "http://frontend",
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

# Initialize Whisper model with GPU
logger.info("Loading Whisper model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
whisper_model = whisper.load_model("base").to(device)  # Upgraded to "base"
logger.info(f"Whisper model loaded on {device}.")

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
BUFFER_FLUSH_INTERVAL = 10  # Increased to 10 seconds

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    audio_buffers[sid] = bytearray()
    asyncio.create_task(flush_buffer_periodically(sid))

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    if sid in audio_buffers and audio_buffers[sid]:
        await process_audio(sid, bytes(audio_buffers[sid]))
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
            audio_buffers[sid] = bytearray()
        audio_buffers[sid] += data  # data is received as bytes
        logger.info(f"Received {len(data)} bytes of audio data from sid: {sid}")
    except Exception as e:
        logger.error(f"Error receiving audio data from sid {sid}: {e}")
        await sio.emit('error', {'message': 'Failed to receive audio data.'}, to=sid)

async def flush_buffer_periodically(sid):
    try:
        while True:
            await asyncio.sleep(BUFFER_FLUSH_INTERVAL)
            if sid not in audio_buffers:
                logger.info(f"Stopping flush_buffer_periodically for disconnected sid: {sid}")
                break
            if audio_buffers[sid]:
                audio_bytes = bytes(audio_buffers[sid])
                audio_buffers[sid] = bytearray()
                logger.info(f"Flushing {len(audio_bytes)} bytes of audio data for sid: {sid}")
                await process_audio(sid, audio_bytes)
    except Exception as e:
        logger.error(f"Error in flush_buffer_periodically for sid {sid}: {e}")

async def process_audio(sid, audio_bytes):
    try:
        # Convert raw PCM to WAV in memory
        process = subprocess.Popen([
            "ffmpeg",
            "-f", "s16le",          # Raw PCM format
            "-ar", "192000",         # Updated sample rate
            "-ac", "1",             # Mono
            "-i", "pipe:0",         # Input from stdin
            "-f", "wav",            # Output format
            "pipe:1"                # Output to stdout
        ], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        wav_data, stderr = process.communicate(input=audio_bytes)
        if process.returncode != 0:
            logger.error(f"FFmpeg error for sid {sid}: {stderr.decode()}")
            await sio.emit('error', {'message': 'Audio format conversion failed.'}, to=sid)
            return

        logger.info(f"Converted raw PCM to WAV for sid {sid}.")

        # Save WAV to a temporary file in memory
        wav_io = io.BytesIO(wav_data)

        # Save WAV to a temporary file for Whisper and pyannote
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
            tmp_wav.write(wav_io.getvalue())
            wav_path = tmp_wav.name

        logger.info(f"Temporary WAV file created at {wav_path} for sid {sid}.")

        # Transcription using Whisper
        logger.info(f"Transcribing audio for {sid} using Whisper...")
        transcription = whisper_model.transcribe(wav_path, language="en")  # Specify language if needed
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
        logger.error(f"FFmpeg conversion failed for sid {sid}: {e.stderr.decode()}")
        await sio.emit('error', {'message': 'Audio format conversion failed.'}, to=sid)
    except Exception as e:
        logger.error(f"Error processing audio for sid {sid}: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)
    finally:
        # Remove temporary files
        try:
            os.remove(wav_path)
            logger.info(f"Temporary file {wav_path} removed.")
        except Exception as e:
            logger.error(f"Failed to remove temporary file {wav_path}: {e}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000)
