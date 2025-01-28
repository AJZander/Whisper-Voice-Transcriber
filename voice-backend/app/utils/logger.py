# app/utils/logger.py

import logging
from app.config import Config

def setup_logger():
    logging.basicConfig(
        level=Config.LOG_LEVEL,
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    )
    logger = logging.getLogger(__name__)
    return logger
