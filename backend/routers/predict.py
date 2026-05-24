from fastapi import APIRouter, HTTPException, Query
from core.model_manager import model_manager
from core.features import fetch_data, add_model_features, add_all_features, next_trading_day
from core.inference import tf_historical, tf_forecast, pt_historical, pt_forecast
from typing import Literal

router = APIRouter()

MODEL_TRAIN_START = "2012-01-01"
MODEL_TRAIN_END   = "2024-12-31"


def _get_models(model: str):
    if model == "tensorflow" and not model_manager.ready["tf"]:
        raise HTTPException(503, "TensorFlow model not loaded.")
    if model == "pytorch" and not model_manager.ready["pt"]:
        raise HTTPException(503, "PyTorch model not loaded.")


# ── /predict ──────────────────────────────────────────────────────────────────

@router.get("/predict")
def predict(
    ticker: str = Query("GOOG", description="Stock ticker symbol e.g. GOOG, AAPL"),
    model:  Literal["tensorflow", "pytorch"] = Query("tensorflow", description="Which model to use")
):
    """
    Historical test-set prediction (80/20 split on 2012–2024 data).
    Returns actual vs predicted prices for the test period.
    """
    _get_models(model)
    ticker = ticker.upper()

    try:
        if model == "tensorflow":
            result = tf_historical(model_manager.tf_model, ticker)
        else:
            result = pt_historical(
                model_manager.pt_model,
                model_manager.pt_scalers,
                ticker
            )
        result["ticker"] = ticker
        result["model"]  = model
        return result

    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {e}")


# ── /forecast ─────────────────────────────────────────────────────────────────

@router.get("/forecast")
def forecast(
    ticker: str = Query("GOOG", description="Stock ticker symbol"),
    model:  Literal["tensorflow", "pytorch", "both"] = Query(
        "both", description="Which model — 'both' returns both forecasts")
):
    """
    Next-day closing price forecast using the most recent 150 days of live data.
    Includes ATR-based confidence range.
    """
    ticker = ticker.upper()

    try:
        # Fetch live data (last 2 years is enough for 150-day window)
        raw     = fetch_data(ticker, "2023-01-01", "2099-01-01")
        live_df = add_model_features(raw)

        # Also get ATR for confidence band
        full_df = add_all_features(raw)

        if len(live_df) < 150:
            raise HTTPException(400, f"Not enough data for {ticker}. Need 150+ rows.")

        # Attach ATR to live_df for confidence range
        live_df["ATR"] = full_df["ATR"]

        result = {"ticker": ticker}

        if model in ("tensorflow", "both") and model_manager.ready["tf"]:
            result["tensorflow"] = tf_forecast(model_manager.tf_model, live_df)

        if model in ("pytorch", "both") and model_manager.ready["pt"]:
            result["pytorch"] = pt_forecast(
                model_manager.pt_model,
                model_manager.pt_scalers,
                live_df
            )

        # Best forecast — use TF if available (better metrics)
        if "tensorflow" in result:
            result["recommended"] = result["tensorflow"]
            result["recommended"]["source"] = "tensorflow (lower MAPE)"
        elif "pytorch" in result:
            result["recommended"] = result["pytorch"]
            result["recommended"]["source"] = "pytorch"

        return result

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Forecast failed: {e}")
