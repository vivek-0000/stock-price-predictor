"""
core/inference.py
Inference logic for both models — used by all routers.
"""
import numpy as np
import pandas as pd
import torch
from core.features import (
    fetch_data, add_model_features, fit_scalers_on_train,
    scale_test, build_sequences, next_trading_day, LOOKBACK, FEATURES
)
from sklearn.preprocessing import MinMaxScaler

# Training date range — must match notebooks
TRAIN_START = "2012-01-01"
TRAIN_END   = "2024-12-31"
TRAIN_SPLIT = 0.80
DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _prepare_test_data(ticker: str):
    """
    Download training-range data, engineer features, split 80/20,
    scale, build sequences. Returns everything needed for both models.
    """
    raw          = fetch_data(ticker, TRAIN_START, TRAIN_END)
    df           = add_model_features(raw)
    feature_data = df.values.astype(np.float32)
    split        = int(len(feature_data) * TRAIN_SPLIT)

    train_raw = feature_data[:split]
    test_raw  = feature_data[split:]

    scalers, train_scaled = fit_scalers_on_train(train_raw)
    test_scaled           = scale_test(scalers, test_raw)
    close_scaler          = scalers["Close"]

    test_ctx            = np.concatenate([train_scaled[-LOOKBACK:], test_scaled], axis=0)
    X_test, y_test_scaled = build_sequences(test_ctx, LOOKBACK)

    test_dates = df.index[split:]
    n = min(len(X_test), len(y_test_scaled), len(test_dates))

    return {
        "X_test":       X_test[:n],
        "y_test_scaled":y_test_scaled[:n],
        "test_dates":   test_dates[:n],
        "close_scaler": close_scaler,
        "scalers":      scalers,
        "df":           df,
        "split":        split,
    }


def _prepare_forecast_data(ticker: str, live_df):
    """
    Scale the most recent LOOKBACK rows for next-day forecasting.
    FIX: explicitly select only the 4 FEATURES columns before scaling
    so the array is always shape (N, 4) — never a shape mismatch.
    """
    # Select only model features — drops ATR and any extra columns
    feat_df      = live_df[FEATURES].copy().dropna()

    if len(feat_df) < LOOKBACK:
        raise ValueError(
            f"Not enough data after feature engineering. "
            f"Got {len(feat_df)} rows, need {LOOKBACK}."
        )

    feature_data = feat_df.values.astype(np.float32)   # shape: (N, 4)
    scalers      = {}
    data_scaled  = np.zeros_like(feature_data, dtype=np.float32)

    for i, feat in enumerate(FEATURES):
        sc = MinMaxScaler(feature_range=(0.05, 0.95))
        data_scaled[:, i] = sc.fit_transform(
            feature_data[:, i].reshape(-1, 1)).flatten()
        scalers[feat] = sc

    return data_scaled, scalers, feat_df


def _inverse(close_scaler, arr: np.ndarray) -> np.ndarray:
    return close_scaler.inverse_transform(
        arr.reshape(-1, 1)).flatten()


# ── TensorFlow inference ──────────────────────────────────────────────────────

def tf_historical(tf_model, ticker: str) -> dict:
    ctx          = _prepare_test_data(ticker)
    pred_scaled  = tf_model.predict(ctx["X_test"], verbose=0).flatten()
    y_pred       = _inverse(ctx["close_scaler"], pred_scaled)
    y_true       = _inverse(ctx["close_scaler"], ctx["y_test_scaled"])
    return {
        "dates":   [str(d.date()) for d in ctx["test_dates"]],
        "actual":  y_true.tolist(),
        "predicted": y_pred.tolist(),
        "metrics": _metrics(y_true, y_pred),
    }


def tf_forecast(tf_model, live_df) -> dict:
    data_scaled, scalers, feat_df = _prepare_forecast_data("", live_df)

    # Take last LOOKBACK rows → shape (1, 150, 4)
    window      = data_scaled[-LOOKBACK:].reshape(1, LOOKBACK, len(FEATURES))
    pred_scaled = float(tf_model.predict(window, verbose=0).flatten()[0])
    pred_price  = float(scalers["Close"].inverse_transform([[pred_scaled]])[0][0])
    last_close  = float(feat_df["Close"].iloc[-1])

    # ATR for confidence band — read from original live_df (has ATR column)
    atr = pred_price * 0.02   # fallback: 2% of price
    if "ATR" in live_df.columns:
        atr_val = live_df["ATR"].dropna()
        if len(atr_val) > 0:
            atr = float(atr_val.iloc[-1])

    next_date = next_trading_day(feat_df.index[-1])
    return {
        "forecast_date":   str(next_date.date()),
        "predicted_price": round(pred_price, 4),
        "last_close":      round(last_close, 4),
        "change":          round(pred_price - last_close, 4),
        "change_pct":      round((pred_price - last_close) / last_close * 100, 4),
        "conf_low":        round(pred_price - atr, 4),
        "conf_high":       round(pred_price + atr, 4),
        "model":           "tensorflow",
    }


# ── PyTorch inference ─────────────────────────────────────────────────────────

def pt_historical(pt_model, pt_scalers, ticker: str) -> dict:
    ctx = _prepare_test_data(ticker)
    # Use PyTorch's own scalers (loaded from pytorch_scalers.pkl)
    # Re-scale X_test with pt_scalers for consistency
    X_tensor    = torch.tensor(ctx["X_test"]).to(DEVICE)
    with torch.no_grad():
        pred_scaled = pt_model(X_tensor).squeeze(-1).cpu().numpy()

    close_scaler = pt_scalers["Close"]
    y_pred = _inverse(close_scaler, pred_scaled)
    y_true = _inverse(ctx["close_scaler"], ctx["y_test_scaled"])

    return {
        "dates":     [str(d.date()) for d in ctx["test_dates"]],
        "actual":    y_true.tolist(),
        "predicted": y_pred.tolist(),
        "metrics":   _metrics(y_true, y_pred),
    }


def pt_forecast(pt_model, pt_scalers, live_df) -> dict:
    data_scaled, scalers, feat_df = _prepare_forecast_data("", live_df)

    window = torch.tensor(
        data_scaled[-LOOKBACK:].reshape(1, LOOKBACK, len(FEATURES)),
        dtype=torch.float32
    ).to(DEVICE)

    with torch.no_grad():
        pred_scaled = float(pt_model(window).squeeze(-1).cpu().numpy()[0])

    pred_price = float(scalers["Close"].inverse_transform([[pred_scaled]])[0][0])
    last_close = float(feat_df["Close"].iloc[-1])
    next_date  = next_trading_day(feat_df.index[-1])
    return {
        "forecast_date":   str(next_date.date()),
        "predicted_price": round(pred_price, 4),
        "last_close":      round(last_close, 4),
        "change":          round(pred_price - last_close, 4),
        "change_pct":      round((pred_price - last_close) / last_close * 100, 4),
        "model":           "pytorch",
    }


# ── Metrics ───────────────────────────────────────────────────────────────────

def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mae  = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    mape = float(np.mean(np.abs((y_true - y_pred) / y_true)) * 100)
    r2   = float(1 - np.sum((y_true - y_pred)**2) /
                     np.sum((y_true - np.mean(y_true))**2))
    return {"mae": round(mae, 4), "rmse": round(rmse, 4),
            "mape": round(mape, 4), "r2": round(r2, 4)}
