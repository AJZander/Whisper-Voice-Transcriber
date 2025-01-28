# app/services/diarization_service.py

import logging
from app.models.diarization_pipeline import DiarizationPipeline

logger = logging.getLogger(__name__)

class DiarizationService:
    def __init__(self, diarization_pipeline: DiarizationPipeline):
        self.diarization_pipeline = diarization_pipeline

    def diarize_audio(self, wav_path: str):
        try:
            diarization = self.diarization_pipeline.diarize(wav_path)
            speakers = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                speakers.append({
                    "speaker": speaker,
                    "start": turn.start,
                    "end": turn.end
                })
            logger.info(f"Speaker segments extracted: {speakers}")
            return speakers
        except Exception as e:
            logger.error(f"Error in diarization: {e}")
            raise e
