# models/diarization_pipeline.py

from pyannote.audio import Pipeline
import logging
import os
from app.config import Config

logger = logging.getLogger(__name__)

class DiarizationPipeline:
    def __init__(self):
        hf_token = Config.PYANNOTE_TOKEN
        if not hf_token:
            logger.error("Hugging Face token not found. Please set PYANNOTE_TOKEN environment variable.")
            raise ValueError("Hugging Face token not found. Please set PYANNOTE_TOKEN environment variable.")
        try:
            logger.info("Loading pyannote pipeline...")
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization",
                use_auth_token=hf_token
            )
            logger.info("Pyannote pipeline loaded.")
        except Exception as e:
            logger.error(f"Failed to load pyannote pipeline: {e}")
            raise e

    def diarize(self, wav_path: str):
        logger.info(f"Performing speaker diarization on {wav_path}.")
        diarization = self.pipeline(wav_path)
        logger.info("Speaker diarization completed.")
        return diarization
