from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from routers import predict, indicators, compare, health
from core.model_manager import model_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models once at startup — not on every request."""
    print("🚀 Loading models...")
    model_manager.load_all()
    print("✅ Models ready.")
    yield
    print("🛑 Shutting down.")


app = FastAPI(
    title="Stock Market Predictor API",
    description="""
## 📈 Stock Market Prediction API

Serves two LSTM models (TensorFlow + PyTorch) trained on historical stock data.

### Endpoints
- **`/predict`** — Historical test-set prediction
- **`/forecast`** — Next-day price forecast
- **`/indicators`** — Technical indicators (RSI, MACD, BB, ATR, Volume)
- **`/compare`** — TensorFlow vs PyTorch metrics side by side
- **`/health`** — API + model health check
    """,
    version="1.0.0",
    lifespan=lifespan
)

# ── CORS — allow React frontend (localhost:3000 + production domain) ──────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.amplifyapp.com",   # AWS Amplify
        "*"                           # open during dev — restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router,      tags=["Health"])
app.include_router(predict.router,     tags=["Prediction"])
app.include_router(indicators.router,  tags=["Indicators"])
app.include_router(compare.router,     tags=["Comparison"])


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Stock Market Predictor API",
        "docs":    "/docs",
        "health":  "/health"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
