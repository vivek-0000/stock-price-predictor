from fastapi import APIRouter
from core.model_manager import model_manager
import torch

router = APIRouter()

@router.get("/health")
def health():
    return {
        "status": "ok",
        "models": {
            "tensorflow": "loaded" if model_manager.ready["tf"] else "not loaded",
            "pytorch":    "loaded" if model_manager.ready["pt"] else "not loaded",
        },
        "device": str(torch.device("cuda" if torch.cuda.is_available() else "cpu")),
        "features": ["Close", "Volume", "RSI", "MACD"],
        "lookback": 150,
    }
