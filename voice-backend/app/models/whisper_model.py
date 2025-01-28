# app/models/whisper_model.py

import whisper
import torch
import logging
import difflib
import os
from app.config import Config 


logger = logging.getLogger(__name__)

class WhisperModels:
    def __init__(self, device: str, model_dir: str = "./models"):
        self.device = device
        self.model_dir = model_dir
        self.models = {}
        self.load_models()

    def load_models(self):
        model_names =  Config.WHISPER_MODELS 
        for name in model_names:
            logger.info(f"Loading Whisper model: {name}")
            model = whisper.load_model(name, download_root=self.model_dir).to(self.device)
            self.models[name] = model
            logger.info(f"Whisper model '{name}' loaded on {self.device}.")
        logger.info(f"All Whisper models loaded on {self.device}.")

    def transcribe(self, wav_path: str, language: str = "en") -> dict:
        transcriptions = {}
        for name, model in self.models.items():
            logger.info(f"Transcribing with Whisper model: {name}")
            result = model.transcribe(wav_path, language=language)
            transcriptions[name] = result['text']
            logger.info(f"Transcription with '{name}' completed.")
    
        # If only one model is loaded, return its transcription
        if len(transcriptions) < 2:
            selected_text = next(iter(transcriptions.values()))
            logger.info("Only one model available. Selecting its transcription.")
            return {'text': selected_text}
    
        # Compute pairwise similarities
        similarities = {}
        model_names = list(transcriptions.keys())
        for i in range(len(model_names)):
            for j in range(i + 1, len(model_names)):
                name1 = model_names[i]
                name2 = model_names[j]
                text1 = transcriptions[name1]
                text2 = transcriptions[name2]
                similarity = difflib.SequenceMatcher(None, text1, text2).ratio()
                similarities[f"{name1}-{name2}"] = similarity
                logger.info(f"Similarity between '{name1}' and '{name2}': {similarity:.2f}")
    
        # Calculate average similarity
        average_similarity = sum(similarities.values()) / len(similarities)
        logger.info(f"Average similarity across models: {average_similarity:.2f}")
    
        threshold = 0.75  # Adjust as needed
    
        if average_similarity >= threshold:
            # If transcriptions are generally similar, select the highest priority model's transcription
            selected_model = max(transcriptions.keys(), key=lambda name: Config.WHISPER_MODEL_PRIORITIES.get(name, 0))
            selected_text = transcriptions[selected_model]
            logger.info(f"Transcriptions are similar. Selecting '{selected_model}' model's transcription based on priority.")
        else:
            # If transcriptions differ, select the longest transcription
            selected_text = max(transcriptions.values(), key=lambda x: len(x))
            logger.warning("Transcriptions differ significantly. Selecting the longest transcription.")
    
        return {'text': selected_text}