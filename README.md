# Stock Market Predictor (LSTM)

Streamlit app for stock price charts and LSTM forecasts. Supports **US** and **Indian (NSE/BSE)** markets via Yahoo Finance.

## Local run

```bash
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
streamlit run app.py
```

Train or retrain the model in `Stock_Market_Prediction_Model_Creation_v2.ipynb`, then keep `Stock Predictions Model.keras` in this folder.

## Deploy to GitHub

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `Stock_Market_Prediction_ML`).
2. In this project folder:

```bash
git init
git add .
git commit -m "Initial commit: Streamlit stock predictor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

**Important:** `Stock Predictions Model.keras` (~2 MB) must be committed so Railway can serve predictions.

## Deploy to Railway

### Option A — From GitHub (recommended)

1. Push the repo to GitHub (steps above).
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Select your repository. Railway detects the `Dockerfile` via `railway.toml`.
4. Open the service → **Settings** → **Networking** → **Generate Domain**.
5. Optional **Variables** (Settings → Variables):

| Variable     | Example                         | Purpose              |
|-------------|----------------------------------|----------------------|
| `MARKET`    | `IN`                             | Default market       |
| `MODEL_PATH`| `Stock Predictions Model.keras`  | Model file path      |

6. Wait for the build (TensorFlow install can take several minutes). Open the public URL.

### Option B — Railway CLI

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

## Project layout

| File | Purpose |
|------|---------|
| `app.py` | Streamlit UI |
| `Stock Predictions Model.keras` | Trained LSTM model |
| `Dockerfile` | Production container (Railway) |
| `railway.toml` | Railway build/deploy config |
| `requirements.txt` | Python dependencies |

## Notes

- Use **at least 2 GB RAM** on Railway for TensorFlow + Streamlit.
- Retrain the notebook on the same stock you analyze in the app for best results.
- This app is for education only — not financial advice.
