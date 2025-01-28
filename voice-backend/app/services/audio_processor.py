# app/services/audio_processor.py

import io
import logging
import soundfile as sf
import noisereduce as nr
import numpy as np

logger = logging.getLogger(__name__)

class AudioProcessor:
    def __init__(self):
        pass  # No initialization needed for noisereduce

    def reduce_noise(self, pcm_data: bytes, samplerate: int = 192000) -> bytes:
        try:
            # Convert PCM bytes to numpy array (assuming 16-bit PCM)
            data = np.frombuffer(pcm_data, dtype=np.int16).astype(np.float32) / 32768.0
            logger.info(f"PCM data read successfully with samplerate {samplerate} Hz.")

            # Ensure mono
            if len(data.shape) > 1:
                data = data.mean(axis=1)
                logger.info("Converted stereo to mono.")

            # Apply noise reduction
            denoised_data = nr.reduce_noise(y=data, sr=samplerate)
            logger.info("Noise reduction applied.")

            # Convert back to int16 PCM bytes
            denoised_data_int16 = (denoised_data * 32768.0).astype(np.int16)
            denoised_bytes = denoised_data_int16.tobytes()

            logger.info("Denoised PCM data converted back to bytes.")
            return denoised_bytes
        except Exception as e:
            logger.error(f"Error in noise reduction: {e}")
            raise e
