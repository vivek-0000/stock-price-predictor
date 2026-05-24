# 📈 Stock Market Predictor

> Dual LSTM stock price prediction with TensorFlow & PyTorch, served via FastAPI, visualized in React.js, deployed on AWS.

**Live Demo:** http://vivek-stockml-frontend.s3-website-ap-southeast-2.amazonaws.com

**API Docs:** http://3.106.166.28:8000/docs

---

## 🏗️ Architecture

```
React.js (AWS S3)
      ↓  HTTP
FastAPI Backend (AWS EC2)
      ↓
TensorFlow LSTM  +  PyTorch LSTM
      ↓
Yahoo Finance Data (yfinance)
```

---

## 📊 Model Performance

| Metric | TensorFlow | PyTorch |
|--------|-----------|---------|
| MAE    | $5.63     | $7.04   |
| RMSE   | $7.12     | $10.04  |
| MAPE   | 4.27%     | 4.82%   |
| R²     | 0.9400    | 0.8824  |

Trained on GOOG · 2012–2024 · 4 features: Close, Volume, RSI, MACD · Lookback: 150 days

---

## 🗂️ Project Structure

```
Stock_Market_Prediction_ML/
├── backend/                         ← FastAPI REST API
│   ├── main.py                      ← App entry point
│   ├── core/
│   │   ├── model_manager.py         ← Loads TF + PyTorch at startup
│   │   ├── features.py              ← RSI, MACD, ATR, BB engineering
│   │   └── inference.py             ← Inference logic for both models
│   ├── routers/
│   │   ├── predict.py               ← GET /predict, /forecast
│   │   ├── indicators.py            ← GET /indicators
│   │   ├── compare.py               ← GET /compare
│   │   └── health.py                ← GET /health
│   └── requirements.txt
│
├── frontend/                        ← React.js dashboard
│   ├── src/
│   │   ├── App.jsx                  ← Router + global ticker state
│   │   ├── services/api.js          ← Axios API calls
│   │   ├── components/              ← Navbar, UI components
│   │   └── pages/                   ← Dashboard, Predict, Compare, Indicators
│   └── package.json
│
└── notebooks/
    ├── Stock_Market_Prediction_Model_Creation_v2.ipynb   ← TF training
    └── Stock_Predictions_PyTorch_Phase1.ipynb            ← PyTorch training
```

---

## 🚀 Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
# Place model files in backend/:
#   Stock Predictions Model.keras
#   Stock_Predictions_PyTorch_scripted.pt
#   pytorch_scalers.pkl
python main.py
# → http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

---

## 🌐 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Model load status |
| `GET /predict?ticker=GOOG&model=tensorflow` | Historical prediction |
| `GET /forecast?ticker=GOOG&model=both` | Next-day forecast |
| `GET /indicators?ticker=GOOG&start=2023-01-01` | RSI, MACD, BB, ATR |
| `GET /compare?ticker=GOOG` | TF vs PyTorch metrics |

---

## ☁️ AWS Deployment

| Service | Usage |
|---------|-------|
| EC2 | FastAPI backend |
| S3 | React frontend static hosting |
| S3 | Model file storage |

---

## 🛠️ Tech Stack

`Python` `TensorFlow` `PyTorch` `LSTM` `FastAPI` `React.js` `Recharts` `AWS EC2` `AWS S3` `yfinance` `scikit-learn`

---

> ⚠️ For educational purposes only — not financial advice.
