# app/routes/socket_events.py

import os
import time
import asyncio
import socketio
import torch
from fastapi import APIRouter
import tempfile
import logging
import subprocess
import io
import concurrent.futures

from app.services.audio_processor import AudioProcessor
from app.services.transcription_service import TranscriptionService
from app.services.diarization_service import DiarizationService
from app.models.whisper_model import WhisperModels
from app.models.diarization_pipeline import DiarizationPipeline
from app.utils.ffmpeg_wrapper import convert_pcm_to_wav
from app.models.transcript_combiner import TranscriptCombiner


router = APIRouter()
logger = logging.getLogger(__name__)
origins = [
    "*",
    "http://localhost:3000",
    "http://frontend",
    "http://10.0.0.10:3000", 
]

# Initialize services
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=origins)
device = "cuda" if torch.cuda.is_available() else "cpu"
whisper_models = WhisperModels(device=device)
transcription_service = TranscriptionService(whisper_models=whisper_models)
diarization_pipeline = DiarizationPipeline(device=device)
diarization_service = DiarizationService(diarization_pipeline=diarization_pipeline)
combiner = TranscriptCombiner(device="cuda" if torch.cuda.is_available() else "cpu")
audio_processor = AudioProcessor()

# Safely fetch and convert environment variables to integers
MAX_THREADS_FOR_PROCESSING = int(os.getenv("MAX_THREADS_FOR_PROCESSING", 5))
BUFFER_FLUSH_INTERVAL = int(os.getenv("BUFFER_FLUSH_INTERVAL", 10))
OVERLAP_DURATION = int(os.getenv("OVERLAP_DURATION", 2)) 

executor = concurrent.futures.ThreadPoolExecutor(max_workers=MAX_THREADS_FOR_PROCESSING)

# Store raw PCM data per session
audio_buffers = {}
buffer_locks = {}

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    audio_buffers[sid] = {
        "data": bytearray(),
        "sample_rate": None
    }
    buffer_locks[sid] = asyncio.Lock()
    # asyncio.create_task(flush_buffer_periodically(sid))

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    if sid in audio_buffers and audio_buffers[sid]["data"]:
        await process_audio(sid, bytes(audio_buffers[sid]["data"]), audio_buffers[sid]["sample_rate"])
    if sid in audio_buffers:
        del audio_buffers[sid]
    if sid in buffer_locks:
        del buffer_locks[sid]
        
@sio.event
async def diarization_config(sid, config):
    """
    Save diarization configuration for this session ID.
    E.g., store in a dictionary keyed by `sid`.
    """
    if sid not in audio_buffers:
        audio_buffers[sid] = {"data": bytearray(), "sample_rate": None}
    # Let's store this config as well:
    audio_buffers[sid]["diarization_config"] = config
    logger.info(f"Received diarization config for sid {sid}: {config}")
    
@sio.event
async def combine_transcripts(sid, data):
    try:
        real_time = data.get('realTimeTranscript', '')
        whisper = data.get('whisperTranscript', '')

        # Run the transcript combination in an executor to prevent blocking the event loop.
        result = await asyncio.get_event_loop().run_in_executor(
            None, combiner.combine_transcripts, real_time, whisper
        )

        await sio.emit('final_combined_transcript', {
            'transcript': result['text']
        }, to=sid)

    except Exception as e:
        logger.error(f"Error combining transcripts for sid {sid}: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)

@sio.event
async def audio_data(sid, *args):
    try:
        sample_rate, audio_chunk = args

        if sid not in audio_buffers:
            audio_buffers[sid] = {
                "data": bytearray(),
                "sample_rate": sample_rate
            }
            buffer_locks[sid] = asyncio.Lock()

        async with buffer_locks[sid]:
            if audio_buffers[sid]["sample_rate"] is None:
                audio_buffers[sid]["sample_rate"] = sample_rate
            audio_buffers[sid]["data"] += audio_chunk
    except Exception as e:
        logger.error(f"Error receiving audio data: {e}")
        await sio.emit('error', {'message': 'Failed to receive audio data.'}, to=sid)
        
@sio.event
async def stop_recording(sid):
    try:
        if sid in audio_buffers:
            buffer_info = audio_buffers[sid]
            audio_bytes = bytes(buffer_info["data"])
            sample_rate = buffer_info["sample_rate"]
            await process_audio(sid, audio_bytes, sample_rate)
            audio_buffers[sid]["data"] = bytearray()
    except Exception as e:
        logger.error(f"Error processing final audio: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)


async def process_audio(sid, audio_bytes, sample_rate):
    wav_path = None
    start_time = time.time()
    try:
        diarization_config = audio_buffers[sid].get("diarization_config", {})
        # Noise reduction
        denoised_bytes = await asyncio.get_event_loop().run_in_executor(
            executor, audio_processor.reduce_noise, audio_bytes
        )
        logger.info(f"Noise reduction completed for sid {sid}.")

        # Convert PCM to WAV with the correct sample rate
        wav_data = await asyncio.get_event_loop().run_in_executor(
            executor, convert_pcm_to_wav, denoised_bytes, sample_rate
        )
        logger.info(f"PCM to WAV conversion completed for sid {sid}.")

        # Save WAV to a temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
            tmp_wav.write(wav_data)
            wav_path = tmp_wav.name
        logger.info(f"Temporary WAV file created at {wav_path} for sid {sid}.")

        # Transcription
        transcription_text = await asyncio.get_event_loop().run_in_executor(
            executor, transcription_service.transcribe_audio, wav_path
        )
        logger.info(f"Transcription completed for sid {sid}: {transcription_text}")

        # # Diarization
        # speakers = []
        speakers = await asyncio.get_event_loop().run_in_executor(
            executor, diarization_service.diarize_audio, wav_path, diarization_config
        )
        logger.info(f"Diarization completed for sid {sid}.")

        # Emit results back to client
        await sio.emit('transcription', {
            "transcription": transcription_text,
            "speakers": speakers
        }, to=sid)
        logger.info(f"Emitted transcription and speaker data to {sid}.")

        processing_time = time.time() - start_time
        logger.info(f"Audio processing for sid {sid} completed in {processing_time:.2f} seconds.")

    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg conversion failed for sid {sid}: {e.stderr.decode()}")
        await sio.emit('error', {'message': 'Audio format conversion failed.'}, to=sid)
    except Exception as e:
        logger.error(f"Error processing audio for sid {sid}: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)
    finally:
        if wav_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
                logger.info(f"Temporary file {wav_path} removed.")
            except Exception as e:
                logger.error(f"Failed to remove temporary file {wav_path}: {e}")

