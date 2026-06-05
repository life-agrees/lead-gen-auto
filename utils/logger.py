import logging
import os
from utils.config import LOG_LEVEL

def get_logger(name: str) -> logging.Logger:
    logger    = logging.getLogger(name)
    level     = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    if not logger.handlers:
        handler   = logging.StreamHandler()
        formatter = logging.Formatter(
            "[%(asctime)s] %(levelname)s %(name)s — %(message)s",
            datefmt="%H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger
