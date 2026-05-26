from fastapi import APIRouter, HTTPException, Query
from core.model_manager import model_manager
from core.features import fetch_data, add_model_features, add_all_features
from core.inference import (
    tf_historical, pt_historical,
    tf_forecast, pt_forecast,
    tf_monthly_forecast, pt_monthly_forecast
)
from typing import Literal

router = APIRouter()

MODEL_TRAIN_START = "2012-01-01"
MODEL_TRAIN_END   = "2024-12-31"


def _get_live_df(ticker: str):
    raw     = fetch_data(ticker, "2023-01-01", "2099-01-01")
    live_df = add_model_features(raw)
    full_df = add_all_features(raw)
    if len(live_df) < 150:
        raise HTTPException(400, f"Not enough data for {ticker}.")
    live_df["ATR"] = full_df["ATR"]
    return live_df


# ── /predict ──────────────────────────────────────────────────────────────────

@router.get("/predict")
def predict(
    ticker: str = Query("GOOG"),
    model:  Literal["tensorflow", "pytorch"] = Query("tensorflow")
):
    """Historical test-set prediction (80/20 split on 2012–2024)."""
    ticker = ticker.upper()
    if model == "tensorflow" and not model_manager.ready["tf"]:
        raise HTTPException(503, "TensorFlow model not loaded.")
    if model == "pytorch" and not model_manager.ready["pt"]:
        raise HTTPException(503, "PyTorch model not loaded.")
    try:
        if model == "tensorflow":
            result = tf_historical(model_manager.tf_model, ticker)
        else:
            result = pt_historical(model_manager.pt_model, model_manager.pt_scalers, ticker)
        result["ticker"] = ticker
        result["model"]  = model
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {e}")


# ── /forecast (next-day) ──────────────────────────────────────────────────────

@router.get("/forecast")
def forecast(
    ticker: str = Query("GOOG"),
    model:  Literal["tensorflow", "pytorch", "both"] = Query("both")
):
    """Next-day closing price forecast."""
    ticker = ticker.upper()
    try:
        live_df = _get_live_df(ticker)
        result  = {"ticker": ticker}

        if model in ("tensorflow", "both") and model_manager.ready["tf"]:
            result["tensorflow"] = tf_forecast(model_manager.tf_model, live_df)

        if model in ("pytorch", "both") and model_manager.ready["pt"]:
            result["pytorch"] = pt_forecast(model_manager.pt_model, model_manager.pt_scalers, live_df)

        if "tensorflow" in result:
            result["recommended"] = {**result["tensorflow"], "source": "tensorflow (lower MAPE)"}
        elif "pytorch" in result:
            result["recommended"] = {**result["pytorch"], "source": "pytorch"}

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Forecast failed: {e}")


# ── /forecast/monthly ─────────────────────────────────────────────────────────

@router.get("/forecast/monthly")
def forecast_monthly(
    ticker: str = Query("GOOG", description="Stock ticker symbol"),
    days:   int = Query(30,     description="Number of trading days to forecast (max 60)", ge=1, le=60),
    model:  Literal["tensorflow", "pytorch", "both"] = Query("both")
):
    """
    Multi-step recursive forecast for the next N trading days.
    Each predicted day feeds the next — confidence band widens over time.
    """
    ticker = ticker.upper()
    try:
        live_df = _get_live_df(ticker)
        result  = {"ticker": ticker, "days": days}

        if model in ("tensorflow", "both") and model_manager.ready["tf"]:
            result["tensorflow"] = tf_monthly_forecast(model_manager.tf_model, live_df, days)

        if model in ("pytorch", "both") and model_manager.ready["pt"]:
            result["pytorch"] = pt_monthly_forecast(
                model_manager.pt_model, live_df, days
            )

        if not result.get("tensorflow") and not result.get("pytorch"):
            raise HTTPException(503, "No models loaded.")

        # Recommended = TF if available
        if "tensorflow" in result:
            result["recommended"] = result["tensorflow"]
        else:
            result["recommended"] = result["pytorch"]

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Monthly forecast failed: {e}")
