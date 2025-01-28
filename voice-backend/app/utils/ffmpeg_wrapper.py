# utils/ffmpeg_wrapper.py

import subprocess
import logging
import io

logger = logging.getLogger(__name__)

def convert_pcm_to_wav(audio_bytes: bytes, sample_rate: int = 192000, channels: int = 1) -> bytes:
    try:
        process = subprocess.Popen([
            "ffmpeg",
            "-f", "s16le",          # Raw PCM format
            "-ar", str(sample_rate),  # Sample rate
            "-ac", str(channels),     # Number of channels
            "-i", "pipe:0",         # Input from stdin
            "-f", "wav",            # Output format
            "pipe:1"                # Output to stdout
        ], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        wav_data, stderr = process.communicate(input=audio_bytes)
        if process.returncode != 0:
            logger.error(f"FFmpeg error: {stderr.decode()}")
            raise subprocess.CalledProcessError(process.returncode, process.args, stderr)

        logger.info("PCM to WAV conversion successful.")
        return wav_data
    except Exception as e:
        logger.error(f"Error in PCM to WAV conversion: {e}")
        raise e
