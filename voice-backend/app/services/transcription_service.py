# app/services/transcription_service.py

import logging
from app.models.whisper_model import WhisperModels

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self, whisper_models: WhisperModels):
        self.whisper_models = whisper_models

    def transcribe_audio(self, wav_path: str, language: str = "en") -> str:
        try:
            transcription_result = self.whisper_models.transcribe(wav_path, language)
            transcription_text = transcription_result['text']
            logger.info(f"Transcription result: {transcription_text}")
            return transcription_text
        except Exception as e:
            logger.error(f"Error in transcription: {e}")
            raise e
