# models/diarization_pipeline.py

from pyannote.audio import Pipeline
import logging
import os
import torch
from app.config import Config

logger = logging.getLogger(__name__)

class DiarizationPipeline:
    def __init__(self, device: str):
        hf_token = Config.PYANNOTE_TOKEN
        if not hf_token:
            logger.error("Hugging Face token not found. Please set PYANNOTE_TOKEN environment variable.")
            raise ValueError("Hugging Face token not found. Please set PYANNOTE_TOKEN environment variable.")
        try:
            logger.info("Loading pyannote pipeline...")
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
            self.default_config = self.pipeline.parameters(instantiated=True)
            self.pipeline.to(torch.device(device))
            logger.info("Pyannote pipeline loaded.")
        except Exception as e:
            logger.error(f"Failed to load pyannote pipeline: {e}")
            raise e

    def diarize(self, wav_path: str, config: dict):
        logger.info(f"Performing speaker diarization on {wav_path}.")
        
        pipeline_config = dict(self.default_config)
        
        # Update only the parameters we want to change
        if "min_duration_off" in config:
            pipeline_config["segmentation"]["min_duration_off"] = config["min_duration_off"]
            
        if "offset" in config:
            pipeline_config["clustering"]["threshold"] = config["offset"]
    
        # First instantiate with the base config
        self.pipeline.instantiate(pipeline_config)

        # num_speakers is passed separately to the __call__ method
        diarization = self.pipeline(
            wav_path, 
            num_speakers=config.get("num_speakers", 2)
        )
        diarization = self.pipeline(wav_path, num_speakers=config.get("num_speakers", 2))

        logger.info("Speaker diarization completed.")
        return diarization
