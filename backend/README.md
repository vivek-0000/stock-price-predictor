# 📈 Stock Market Predictor — FastAPI Backend

## Project Structure
```
backend/
├── main.py                                  ← FastAPI app entry point
├── requirements.txt
├── core/
│   ├── model_manager.py                     ← Loads TF + PyTorch models at startup
│   ├── features.py                          ← Feature engineering (RSI, MACD, etc.)
│   └── inference.py                         ← Inference logic for both models
├── routers/
│   ├── health.py                            ← GET /health
│   ├── predict.py                           ← GET /predict, GET /forecast
│   ├── indicators.py                        ← GET /indicators
│   └── compare.py                           ← GET /compare
├── Stock Predictions Model.keras            ← TF model   ← place here
├── Stock_Predictions_PyTorch_scripted.pt    ← PyTorch model ← place here
└── pytorch_scalers.pkl                      ← PyTorch scalers ← place here
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | API + model load status |
| GET | `/predict?ticker=GOOG&model=tensorflow` | Historical test-set prediction |
| GET | `/predict?ticker=GOOG&model=pytorch` | PyTorch historical prediction |
| GET | `/forecast?ticker=GOOG&model=both` | Next-day forecast (TF + PyTorch) |
| GET | `/indicators?ticker=GOOG&start=2020-01-01` | All technical indicators + OHLCV |
| GET | `/compare?ticker=GOOG` | TF vs PyTorch metrics side by side |
| GET | `/docs` | Auto-generated Swagger UI |

---

## 1. Setup & Run Locally

```bash
# Step 1 — Install dependencies
cd backend
pip install -r requirements.txt

# Step 2 — Place model files inside backend/
# Copy these 3 files into the backend/ folder:
#   Stock Predictions Model.keras
#   Stock_Predictions_PyTorch_scripted.pt
#   pytorch_scalers.pkl

# Step 3 — Start the server
python main.py

# API runs at → http://localhost:8000
# Swagger UI  → http://localhost:8000/docs
```

---

## 2. Environment Variables (optional)

If you want to keep model files in a different folder:

```bash
# Windows
set TF_MODEL_PATH=C:\models\Stock Predictions Model.keras
set PT_MODEL_PATH=C:\models\Stock_Predictions_PyTorch_scripted.pt
set PT_SCALERS_PATH=C:\models\pytorch_scalers.pkl
python main.py

# Mac / Linux
TF_MODEL_PATH=/models/Stock\ Predictions\ Model.keras \
PT_MODEL_PATH=/models/Stock_Predictions_PyTorch_scripted.pt \
PT_SCALERS_PATH=/models/pytorch_scalers.pkl \
python main.py
```

---

## 3. Deploy on AWS EC2 (no Docker)

```bash
# ── Step 1: Launch EC2 instance ──────────────────────────────────────────────
# AMI      : Ubuntu 22.04 LTS
# Type     : t2.medium or higher (needs RAM for TF + PyTorch)
# Storage  : 20GB minimum
# Security : open port 8000 inbound

# ── Step 2: Connect to EC2 ───────────────────────────────────────────────────
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>

# ── Step 3: Install Python ───────────────────────────────────────────────────
sudo apt update && sudo apt install -y python3-pip python3-venv

# ── Step 4: Upload project files from your local machine ─────────────────────
# Run these on YOUR machine (not EC2):
scp -i your-key.pem -r backend/ ubuntu@<EC2-IP>:~/stock-api/
scp -i your-key.pem "Stock Predictions Model.keras" ubuntu@<EC2-IP>:~/stock-api/backend/
scp -i your-key.pem Stock_Predictions_PyTorch_scripted.pt ubuntu@<EC2-IP>:~/stock-api/backend/
scp -i your-key.pem pytorch_scalers.pkl ubuntu@<EC2-IP>:~/stock-api/backend/

# ── Step 5: Install dependencies on EC2 ──────────────────────────────────────
cd ~/stock-api/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# ── Step 6: Run as background service ────────────────────────────────────────
# Install screen to keep it running after SSH disconnect
sudo apt install -y screen

screen -S stockapi
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
# Press Ctrl+A then D to detach (keeps running in background)

# API live at → http://<EC2-PUBLIC-IP>:8000
# Swagger UI  → http://<EC2-PUBLIC-IP>:8000/docs
```

---

## 4. Store Models on AWS S3 (recommended for EC2)

```bash
# Upload models to S3
aws s3 cp "Stock Predictions Model.keras" s3://your-bucket-name/models/
aws s3 cp Stock_Predictions_PyTorch_scripted.pt s3://your-bucket-name/models/
aws s3 cp pytorch_scalers.pkl s3://your-bucket-name/models/

# Download on EC2 at startup
aws s3 cp s3://your-bucket-name/models/ ~/stock-api/backend/ --recursive
```

---

## 5. Test the API

```bash
# Health check
curl http://localhost:8000/health

# Next-day forecast
curl "http://localhost:8000/forecast?ticker=GOOG&model=both"

# Historical prediction (TensorFlow)
curl "http://localhost:8000/predict?ticker=AAPL&model=tensorflow"

# Compare both models
curl "http://localhost:8000/compare?ticker=TSLA"

# Technical indicators
curl "http://localhost:8000/indicators?ticker=GOOG&start=2023-01-01"
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI |
| ML Model 1 | TensorFlow / Keras LSTM |
| ML Model 2 | PyTorch LSTM (TorchScript) |
| Data | yfinance (Yahoo Finance) |
| Features | RSI, MACD, Volume, Close |
| Deployment | AWS EC2 (Phase 4) |
| Frontend | React.js (Phase 3) |
