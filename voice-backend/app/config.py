# config.py

import os

class Config:
    WHISPER_MODEL_DIR = os.getenv("WHISPER_MODEL_DIR", "./models")
    PYANNOTE_TOKEN = os.getenv("PYANNOTE_TOKEN")
    BUFFER_FLUSH_INTERVAL = int(os.getenv("BUFFER_FLUSH_INTERVAL", 10))
    LOG_LEVEL=os.getenv("LOG_LEVEL")
    LANGUAGE=os.getenv("LANGUAGE")
    WHISPER_MODELS = os.getenv("WHISPER_MODELS", "base,medium,large-v2").split(",")
    WHISPER_MODEL_PRIORITIES = {
        "tiny": 1,
        "base": 2,
        "small": 3,
        "medium": 4,
        "large": 5,
        "large-v2": 6
    }
    OVERLAP_DURATION=os.getenv("OVERLAP_DURATION")
    
