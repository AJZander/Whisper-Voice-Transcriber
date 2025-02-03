import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import logging

logger = logging.getLogger(__name__)

class TranscriptCombiner:
    def __init__(self, device: str = None, model_dir: str = "./models"):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model_dir = model_dir
        self.model = None
        self.tokenizer = None
        self.load_model()

    def load_model(self):
        logger.info("Loading FLAN-T5 model for transcript combination")
        try:
            # Use an instruction-tuned model that excels at following prompts.
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
        	    "google/flan-t5-xl",
        	    cache_dir=self.model_dir,
        	    torch_dtype=torch.float16 
        	).to(self.device)
            self.tokenizer = AutoTokenizer.from_pretrained(
                "google/flan-t5-xl",
                cache_dir=self.model_dir
            )
            logger.info(f"FLAN-T5 model loaded successfully on {self.device}")
        except Exception as e:
            logger.error(f"Error loading FLAN-T5 model: {e}")
            raise

    def combine_transcripts(self, real_time_transcript: str, whisper_transcript: str) -> dict:
        try:
            prompt = (
			    "You are an expert transcriber and editor. Your task is to combine the two transcripts below into one clear, accurate, and coherent final transcript. "
			    "Both transcripts may contain errors, misinterpretations, or extraneous details, but note that the real-time transcript is generally more reliable. "
			    "Where there is conflicting information, prioritize the real-time transcript while incorporating any correct or clarifying details from the Whisper transcript. "
			    "Eliminate redundancies, correct errors, and ensure proper formatting, punctuation, and natural flow. Do not cut off any of the transcript and ensure you are returning the entire final transcript\n\n"
			    "Transcript 1 (Real-time):\n" + real_time_transcript.strip() + "\n\n"
			    "Transcript 2 (Whisper):\n" + whisper_transcript.strip() + "\n\n"
			    "Final Transcript:"
			)


            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                max_length=1024,
                truncation=True
            ).to(self.device)

            # Generate with beam search (no sampling) for consistency.
            outputs = self.model.generate(
                inputs.input_ids,
                max_length=512,
                num_beams=5,
                early_stopping=True,
                no_repeat_ngram_size=3,
            )

            combined_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
            logger.info("Successfully combined transcripts")
            return {'text': combined_text}
        except Exception as e:
            logger.error(f"Error during transcript combination: {e}")
            raise
