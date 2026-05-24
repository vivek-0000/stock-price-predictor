"""
core/model_manager.py
Loads both models once at startup and keeps them in memory.
All routers import this singleton.
"""
import os
import pickle
import numpy as np
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler

# ── Config (must match training notebooks) ────────────────────────────────────
LOOKBACK    = 150
FEATURES    = ['Close', 'Volume', 'RSI', 'MACD']
TF_MODEL_PATH = os.environ.get(
    "TF_MODEL_PATH",
    "/home/ubuntu/stock-api/models/Stock Predictions Model.keras"
)

PT_SCRIPTED_PATH = os.environ.get(
    "PT_MODEL_PATH",
    "/home/ubuntu/stock-api/models/Stock_Predictions_PyTorch_scripted.pt"
)

PT_SCALERS_PATH = os.environ.get(
    "PT_SCALERS_PATH",
    "/home/ubuntu/stock-api/models/pytorch_scalers.pkl"
)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class ModelManager:
    def __init__(self):
        self.tf_model    = None
        self.pt_model    = None
        self.pt_scalers  = None   # dict of per-feature MinMaxScalers from PyTorch notebook
        self.ready       = {"tf": False, "pt": False}

    def load_all(self):
        self._load_tf()
        self._load_pt()

    def _load_tf(self):
        try:
            from keras.models import load_model
            self.tf_model = load_model(TF_MODEL_PATH)
            self.ready["tf"] = True
            print(f"  ✅ TensorFlow model loaded  ({TF_MODEL_PATH})")
            print(f"     Input shape: {self.tf_model.input_shape}")
        except Exception as e:
            print(f"  ⚠️  TensorFlow model failed: {e}")

    def _load_pt(self):
        try:
            self.pt_model = torch.jit.load(PT_SCRIPTED_PATH, map_location=DEVICE)
            self.pt_model.eval()

            with open(PT_SCALERS_PATH, "rb") as f:
                data = pickle.load(f)
            self.pt_scalers = data["scalers"]

            self.ready["pt"] = True
            print(f"  ✅ PyTorch model loaded     ({PT_SCRIPTED_PATH})")
        except Exception as e:
            print(f"  ⚠️  PyTorch model failed: {e}")


# Singleton — imported by all routers
model_manager = ModelManager()
