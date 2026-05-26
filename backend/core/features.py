"""
core/features.py
Shared feature engineering — identical to training notebooks.
Supports US stocks and Indian NSE (.NS) / BSE (.BO) stocks.
"""
import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler
from datetime import datetime, timedelta

LOOKBACK = 150
FEATURES = ['Close', 'Volume', 'RSI', 'MACD']

# ── Indicators ────────────────────────────────────────────────────────────────

def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain  = delta.clip(lower=0).rolling(period).mean()
    loss  = (-delta.clip(upper=0)).rolling(period).mean()
    rs    = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

def compute_macd_hist(close: pd.Series, fast=12, slow=26, signal=9) -> pd.Series:
    ema_f = close.ewm(span=fast,   adjust=False).mean()
    ema_s = close.ewm(span=slow,   adjust=False).mean()
    macd  = ema_f - ema_s
    sig   = macd.ewm(span=signal, adjust=False).mean()
    return macd - sig

def compute_bb(close: pd.Series, period=20, num_std=2):
    mid   = close.rolling(period).mean()
    std   = close.rolling(period).std()
    upper = mid + num_std * std
    lower = mid - num_std * std
    pct   = ((close - lower) / (upper - lower).replace(0, np.nan)).clip(0, 1)
    return upper, mid, lower, pct

def compute_atr(high, low, close, period=14) -> pd.Series:
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low  - close.shift()).abs()
    ], axis=1).max(axis=1)
    return tr.rolling(period).mean()

def compute_roc(close: pd.Series, period=10) -> pd.Series:
    return close.pct_change(periods=period) * 100

# ── Ticker normalization ──────────────────────────────────────────────────────

def normalize_ticker(ticker: str) -> str:
    """
    Ensure Indian NSE stocks have .NS suffix if not already suffixed.
    Handles: RELIANCE → RELIANCE.NS, TCS → TCS.NS
    Already suffixed tickers (.NS, .BO) are returned as-is.
    US tickers (no dot) with <= 5 chars are returned as-is.
    """
    ticker = ticker.strip().upper()
    # Already has exchange suffix
    if '.' in ticker:
        return ticker
    return ticker

# ── Data fetch ────────────────────────────────────────────────────────────────

def fetch_data(ticker: str, start: str, end: str) -> pd.DataFrame:
    ticker = normalize_ticker(ticker)
    df = yf.download(ticker, start=start, end=end,
                     auto_adjust=True, progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    if df.empty:
        raise ValueError(
            f"No data found for '{ticker}'. "
            f"For Indian NSE stocks use suffix .NS (e.g. TCS.NS, RELIANCE.NS). "
            f"For BSE stocks use .BO suffix."
        )
    df.dropna(inplace=True)
    return df

def add_all_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add ALL indicators (used by /indicators endpoint)."""
    df    = df.copy()
    close = df['Close'].squeeze()
    high  = df['High'].squeeze()
    low   = df['Low'].squeeze()

    df['RSI']  = compute_rsi(close)
    df['MACD'] = compute_macd_hist(close)
    df['ATR']  = compute_atr(high, low, close)
    df['ROC']  = compute_roc(close)

    bb_upper, bb_mid, bb_lower, bb_pct = compute_bb(close)
    df['BB_upper'] = bb_upper
    df['BB_mid']   = bb_mid
    df['BB_lower'] = bb_lower
    df['BB_pct']   = bb_pct

    df['MA20']  = close.rolling(20).mean()
    df['MA50']  = close.rolling(50).mean()
    df['MA100'] = close.rolling(100).mean()
    df['MA200'] = close.rolling(200).mean()

    df.dropna(inplace=True)
    return df

def add_model_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add only the 4 features needed by both models."""
    df    = df.copy()
    close = df['Close'].squeeze()
    df['RSI']  = compute_rsi(close)
    df['MACD'] = compute_macd_hist(close)
    df    = df[FEATURES].copy()
    df.dropna(inplace=True)
    return df

# ── Scaling ───────────────────────────────────────────────────────────────────

def fit_scalers_on_train(train_raw: np.ndarray):
    scalers      = {}
    train_scaled = np.zeros_like(train_raw, dtype=np.float32)
    for i, feat in enumerate(FEATURES):
        sc = MinMaxScaler(feature_range=(0.05, 0.95))
        train_scaled[:, i] = sc.fit_transform(
            train_raw[:, i].reshape(-1, 1)).flatten()
        scalers[feat] = sc
    return scalers, train_scaled

def scale_test(scalers: dict, test_raw: np.ndarray) -> np.ndarray:
    test_scaled = np.zeros_like(test_raw, dtype=np.float32)
    for i, feat in enumerate(FEATURES):
        test_scaled[:, i] = scalers[feat].transform(
            test_raw[:, i].reshape(-1, 1)).flatten()
    return test_scaled

# ── Sequence builder ──────────────────────────────────────────────────────────

def build_sequences(scaled: np.ndarray, lookback: int):
    X, y = [], []
    for i in range(lookback, len(scaled)):
        X.append(scaled[i - lookback:i, :])
        y.append(scaled[i, 0])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)

# ── Next trading day ──────────────────────────────────────────────────────────

def next_trading_day(date) -> datetime:
    d = pd.Timestamp(date).to_pydatetime() + timedelta(days=1)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d
