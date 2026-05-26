import os
import numpy as np
import pandas as pd
import yfinance as yf
import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from sklearn.preprocessing import MinMaxScaler
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# ─── Page Config ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Stock Market Predictor",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ─── Custom CSS ──────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .main { background-color: #0e1117; }
    .metric-card {
        background: linear-gradient(135deg, #1e2130, #252940);
        border: 1px solid #2d3250;
        border-radius: 12px;
        padding: 16px 20px;
        text-align: center;
    }
    .metric-card h3 { color: #a0a8c0; font-size: 13px; margin: 0 0 6px 0; }
    .metric-card p  { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; }
    .positive { color: #00d4a0 !important; }
    .negative { color: #ff4d6d !important; }
    .section-title {
        font-size: 20px; font-weight: 600; color: #e0e4f0;
        border-left: 4px solid #5b7cfa; padding-left: 12px;
        margin: 24px 0 12px 0;
    }
    .forecast-box {
        background: linear-gradient(135deg, #1a2540, #1e2d50);
        border: 1px solid #3b5bdb;
        border-radius: 14px;
        padding: 24px 28px;
        margin: 16px 0;
    }
    .forecast-box h2 { color: #a0c4ff; font-size: 15px; margin: 0 0 8px 0;
                       letter-spacing: 1px; text-transform: uppercase; }
    .forecast-price { font-size: 48px; font-weight: 800; margin: 0; }
    .forecast-meta  { color: #8090b0; font-size: 13px; margin-top: 8px; }
    .info-box {
        background: #1a1f35; border-radius: 10px;
        padding: 14px 18px; border: 1px solid #2a3050;
        color: #c0c8e0; font-size: 14px; line-height: 1.6;
    }
    .stSelectbox label, .stTextInput label, .stDateInput label,
    .stSlider label { color: #c0c8e0 !important; }
    h1 { color: #ffffff !important; }
</style>
""", unsafe_allow_html=True)

# ─── Constants — must match your saved model exactly ─────────────────────────
LOOKBACK        = 150
FEATURES        = ['Close', 'Volume', 'RSI', 'MACD']   # (None, 150, 4)

# FIX: lock training range to match notebook — ensures 80/20 split is identical
# Change these only if you retrain the model with different dates
MODEL_TRAIN_START = '2012-01-01'
MODEL_TRAIN_END   = '2025-12-31'

# ─── Markets (must match notebook) ───────────────────────────────────────────
DEFAULT_MARKET = os.environ.get("MARKET", "IN")   # 'IN' or 'US'

INDIAN_STOCKS = {
    "RELIANCE":   "RELIANCE.NS",
    "TCS":        "TCS.NS",
    "INFY":       "INFY.NS",
    "HDFCBANK":   "HDFCBANK.NS",
    "ICICIBANK":  "ICICIBANK.NS",
    "SBIN":       "SBIN.NS",
    "BHARTIARTL": "BHARTIARTL.NS",
    "ITC":        "ITC.NS",
    "WIPRO":      "WIPRO.NS",
    "TATAMOTORS": "TATAMOTORS.NS",
    "NIFTY50":    "^NSEI",
}

US_STOCKS = {
    "GOOGLE": "GOOG",
    "APPLE":  "AAPL",
    "MSFT":   "MSFT",
    "AMZN":   "AMZN",
    "TSLA":   "TSLA",
    "NVDA":   "NVDA",
    "META":   "META",
}


def resolve_ticker(symbol: str, market: str = DEFAULT_MARKET) -> str:
    """Map friendly name → Yahoo Finance ticker (.NS / .BO for India)."""
    symbol = symbol.strip().upper()
    catalog = INDIAN_STOCKS if market.upper() == "IN" else US_STOCKS
    if symbol in catalog:
        return catalog[symbol]
    if market.upper() == "IN" and not (
        symbol.endswith(".NS") or symbol.endswith(".BO") or symbol.startswith("^")
    ):
        return f"{symbol}.NS"
    return symbol


def market_label(market: str) -> str:
    return "India (NSE/BSE)" if market.upper() == "IN" else "United States"


def default_currency(market: str) -> str:
    return "INR" if market.upper() == "IN" else "USD"

# ─── Feature Engineering ─────────────────────────────────────────────────────

def compute_rsi(close, period=14):
    delta = close.diff()
    gain  = delta.clip(lower=0).rolling(period).mean()
    loss  = (-delta.clip(upper=0)).rolling(period).mean()
    rs    = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

def compute_macd_hist(close, fast=12, slow=26, signal=9):
    ema_f = close.ewm(span=fast,   adjust=False).mean()
    ema_s = close.ewm(span=slow,   adjust=False).mean()
    macd  = ema_f - ema_s
    sig   = macd.ewm(span=signal, adjust=False).mean()
    return macd - sig

def compute_bb_pct(close, period=20, num_std=2):
    mid   = close.rolling(period).mean()
    std   = close.rolling(period).std()
    upper = mid + num_std * std
    lower = mid - num_std * std
    return ((close - lower) / (upper - lower).replace(0, np.nan)).clip(0, 1)

def compute_atr(high, low, close, period=14):
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low  - close.shift()).abs()
    ], axis=1).max(axis=1)
    return tr.rolling(period).mean()

def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    close = df['Close'].squeeze()
    high  = df['High'].squeeze()
    low   = df['Low'].squeeze()
    df['RSI']    = compute_rsi(close)
    df['MACD']   = compute_macd_hist(close)
    df['BB_pct'] = compute_bb_pct(close)
    df['ATR']    = compute_atr(high, low, close)
    df['ROC']    = close.pct_change(periods=10) * 100
    df.dropna(inplace=True)
    return df

# ─── Data Loading ─────────────────────────────────────────────────────────────

@st.cache_data(ttl=300)
def load_stock_data(ticker: str, start: str, end: str, market: str = DEFAULT_MARKET) -> pd.DataFrame:
    df = yf.download(ticker, start=start, end=end, auto_adjust=True, progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    if df.empty:
        if market.upper() == "IN":
            hint = "Indian stocks need .NS (NSE) or .BO (BSE), e.g. RELIANCE.NS, TCS.NS"
        else:
            hint = "Use a valid US symbol, e.g. AAPL, MSFT, GOOG"
        raise ValueError(f"No data found for '{ticker}'. {hint}")
    df.dropna(inplace=True)
    return df

@st.cache_data(ttl=3600)
def load_company_info(ticker: str, market: str = DEFAULT_MARKET) -> dict:
    fallback_ccy = default_currency(market)
    try:
        info = yf.Ticker(ticker).info
        return {
            "name":       info.get("longName", ticker),
            "sector":     info.get("sector", "N/A"),
            "currency":   info.get("currency") or fallback_ccy,
            "market_cap": info.get("marketCap", None),
            "52w_high":   info.get("fiftyTwoWeekHigh", None),
            "52w_low":    info.get("fiftyTwoWeekLow",  None),
            "pe_ratio":   info.get("trailingPE", None),
        }
    except Exception:
        return {"name": ticker, "sector": "N/A", "currency": fallback_ccy,
                "market_cap": None, "52w_high": None, "52w_low": None, "pe_ratio": None}

def load_model_safe(path: str):
    try:
        from keras.models import load_model
        return load_model(path)
    except Exception:
        return None

def fmt_number(n, prefix=""):
    if n is None: return "N/A"
    if n >= 1e12: return f"{prefix}{n/1e12:.2f}T"
    if n >= 1e9:  return f"{prefix}{n/1e9:.2f}B"
    if n >= 1e6:  return f"{prefix}{n/1e6:.2f}M"
    return f"{prefix}{n:.2f}"

def metric_card(col, label, value):
    col.markdown(f"""<div class='metric-card'>
        <h3>{label}</h3><p>{value}</p>
    </div>""", unsafe_allow_html=True)

def next_trading_day(date) -> datetime:
    """Returns the next weekday after `date`."""
    d = date + timedelta(days=1)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d

# ─── Scalers ──────────────────────────────────────────────────────────────────

def fit_scalers(train_raw: np.ndarray):
    scalers      = {}
    train_scaled = np.zeros_like(train_raw, dtype=np.float32)
    for i, feat in enumerate(FEATURES):
        sc = MinMaxScaler(feature_range=(0.05, 0.95))
        train_scaled[:, i] = sc.fit_transform(train_raw[:, i].reshape(-1, 1)).flatten()
        scalers[feat] = sc
    return scalers, train_scaled

def scale_with(scalers, raw: np.ndarray) -> np.ndarray:
    scaled = np.zeros_like(raw, dtype=np.float32)
    for i, feat in enumerate(FEATURES):
        scaled[:, i] = scalers[feat].transform(raw[:, i].reshape(-1, 1)).flatten()
    return scaled

# ─── Historical Prediction ────────────────────────────────────────────────────

def build_prediction(model, ticker: str):
    """
    FIX: downloads data using MODEL_TRAIN_START / MODEL_TRAIN_END so the
    80/20 split exactly matches what was used during training.
    Returns (y_pred, y_true, test_dates).
    """
    raw = load_stock_data(ticker, MODEL_TRAIN_START, MODEL_TRAIN_END)
    df  = add_features(raw)

    feature_data = df[FEATURES].values.astype(np.float32)
    split        = int(len(feature_data) * 0.80)
    train_raw    = feature_data[:split]
    test_raw     = feature_data[split:]

    scalers, train_scaled = fit_scalers(train_raw)
    test_scaled           = scale_with(scalers, test_raw)
    close_scaler          = scalers['Close']

    test_ctx = np.concatenate([train_scaled[-LOOKBACK:], test_scaled], axis=0)

    X_test, y_test = [], []
    for i in range(LOOKBACK, len(test_ctx)):
        X_test.append(test_ctx[i - LOOKBACK:i, :])
        y_test.append(test_ctx[i, 0])

    X_test = np.array(X_test, dtype=np.float32)
    y_test = np.array(y_test, dtype=np.float32)

    y_pred_scaled = model.predict(X_test, verbose=0).flatten()
    y_pred_real   = close_scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
    y_true_real   = close_scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()

    test_dates = df.index[split:]
    n = min(len(y_pred_real), len(y_true_real), len(test_dates))
    return y_pred_real[:n], y_true_real[:n], test_dates[:n]

# ─── Next-Day Forecast ────────────────────────────────────────────────────────

def forecast_next_day(model, data: pd.DataFrame):
    """
    Uses the most recent LOOKBACK rows of live data to predict next trading day.
    Returns (pred_price, last_close, next_date, conf_low, conf_high).
    """
    feat_df      = data[FEATURES].copy().dropna()
    feature_data = feat_df.values.astype(np.float32)

    if len(feature_data) < LOOKBACK:
        raise ValueError(f"Need at least {LOOKBACK} rows. Got {len(feature_data)}.")

    # Fit scaler on all available data for live forecasting
    scalers      = {}
    data_scaled  = np.zeros_like(feature_data, dtype=np.float32)
    for i, feat in enumerate(FEATURES):
        sc = MinMaxScaler(feature_range=(0.05, 0.95))
        data_scaled[:, i] = sc.fit_transform(feature_data[:, i].reshape(-1, 1)).flatten()
        scalers[feat] = sc

    close_scaler = scalers['Close']
    last_window  = data_scaled[-LOOKBACK:].reshape(1, LOOKBACK, len(FEATURES))

    pred_scaled = float(model.predict(last_window, verbose=0).flatten()[0])
    pred_price  = float(close_scaler.inverse_transform([[pred_scaled]])[0][0])
    last_close  = float(feat_df['Close'].iloc[-1])

    # Confidence band: ±1 ATR
    recent_atr  = float(data['ATR'].iloc[-1]) if 'ATR' in data.columns else pred_price * 0.02
    conf_low    = pred_price - recent_atr
    conf_high   = pred_price + recent_atr

    next_date   = next_trading_day(feat_df.index[-1].to_pydatetime())

    return pred_price, last_close, next_date, conf_low, conf_high

def forecast_next_month(model, data, days=22):
    """
    Recursive multi-step forecast (~1 trading month).
    Returns future_dates, predicted_prices
    """
    feat_df = data[FEATURES].copy().dropna()
    feature_data = feat_df.values.astype(np.float32)

    if len(feature_data) < LOOKBACK:
        raise ValueError(
            f"Need at least {LOOKBACK} rows. Got {len(feature_data)}."
        )

    # Fit scalers
    scalers = {}
    data_scaled = np.zeros_like(feature_data, dtype=np.float32)

    for i, feat in enumerate(FEATURES):
        sc = MinMaxScaler(feature_range=(0.05, 0.95))
        data_scaled[:, i] = sc.fit_transform(
            feature_data[:, i].reshape(-1, 1)
        ).flatten()
        scalers[feat] = sc

    close_scaler = scalers["Close"]

    # Start from last window
    current_window = data_scaled[-LOOKBACK:].copy()

    future_prices = []
    future_dates = []

    current_date = feat_df.index[-1].to_pydatetime()

    for _ in range(days):
        x_input = current_window.reshape(
            1, LOOKBACK, len(FEATURES)
        )

        pred_scaled = float(
            model.predict(x_input, verbose=0)
            .flatten()[0]
        )

        pred_price = float(
            close_scaler.inverse_transform(
                [[pred_scaled]]
            )[0][0]
        )

        future_prices.append(pred_price)

        # Next trading day
        current_date = next_trading_day(current_date)
        future_dates.append(current_date)

        # Build next feature row
        last_row = current_window[-1].copy()

        # Update Close with prediction
        last_row[0] = pred_scaled

        # Keep Volume/RSI/MACD stable
        new_row = last_row.copy()

        # Roll window
        current_window = np.vstack([
            current_window[1:],
            new_row
        ])

    return future_dates, future_prices


# ─── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## ⚙️ Configuration")
    st.markdown("---")

    market_options = {"India (NSE/BSE)": "IN", "United States": "US"}
    market_labels = list(market_options.keys())
    default_market_idx = 0 if DEFAULT_MARKET.upper() == "IN" else 1
    market_choice = st.selectbox(
        "Market",
        market_labels,
        index=default_market_idx,
    )
    market = market_options[market_choice]
    stock_catalog = INDIAN_STOCKS if market == "IN" else US_STOCKS
    popular_tickers = list(stock_catalog.values())

    default_symbol = "RELIANCE" if market == "IN" else "GOOG"
    symbol_hint = (
        "e.g. RELIANCE, TCS.NS, INFY.BO"
        if market == "IN"
        else "e.g. AAPL, TSLA, MSFT"
    )
    symbol_input = st.text_input(
        "Stock Symbol",
        value=default_symbol,
        placeholder=symbol_hint,
    ).strip()

    popular = st.multiselect(
        "Or pick a popular stock",
        popular_tickers,
        max_selections=1,
    )
    if popular:
        symbol_input = popular[0]

    ticker = resolve_ticker(symbol_input, market)
    if ticker != symbol_input.upper():
        st.caption(f"Yahoo ticker: `{ticker}`")

    st.markdown("---")
    st.markdown("### Chart Date Range")
    col_s, col_e = st.columns(2)
    start_date = col_s.date_input("Start", value=datetime(2015, 1, 1))
    end_date   = col_e.date_input("End",   value=datetime.today())

    st.markdown("---")
    st.markdown("### Model")
    model_path = st.text_input(
        "Model path (.keras / .h5)",
        value=os.environ.get("MODEL_PATH", "Stock Predictions Model.keras"),
    )
    st.caption(
        f"Market: **{market_label(market)}**  \n"
        f"Input: `(batch, {LOOKBACK}, {len(FEATURES)})`  \n"
        f"Features: `{', '.join(FEATURES)}`  \n"
        f"Train range: `{MODEL_TRAIN_START}` → `{MODEL_TRAIN_END}`"
    )

    st.markdown("---")
    st.markdown("### Display Options")
    show_candle  = st.toggle("Candlestick chart",  value=True)
    show_ma      = st.toggle("Moving Averages",    value=True)
    show_bb      = st.toggle("Bollinger Bands",    value=False)
    show_volume  = st.toggle("Volume",             value=True)
    show_rsi     = st.toggle("RSI",                value=True)
    show_macd    = st.toggle("MACD",               value=True)
    show_predict = st.toggle("LSTM Prediction",    value=True)

    st.markdown("---")
    st.caption("Data: Yahoo Finance · Model: Multivariate LSTM (4 features)")


# ─── Main ─────────────────────────────────────────────────────────────────────
st.title("📈 Stock Market Predictor")
st.markdown(
    f"Analysis for **{ticker}** · {market_label(market)} · {start_date} → {end_date}"
)

# Load chart data (user-selected range)
with st.spinner(f"Fetching {ticker} data…"):
    try:
        raw_data = load_stock_data(ticker, str(start_date), str(end_date), market)
        info     = load_company_info(ticker, market)
        data     = add_features(raw_data)
    except ValueError as ve:
        st.error(str(ve)); st.stop()
    except Exception as ex:
        st.error(f"Unexpected error: {ex}"); st.stop()

close    = data['Close'].squeeze()
currency = info.get("currency", default_currency(market))
model    = load_model_safe(model_path)
EXPECTED_MODEL_SHAPE = (None, LOOKBACK, len(FEATURES))

# ─── Company Header ───────────────────────────────────────────────────────────
last_px  = float(close.iloc[-1])
prev_px  = float(close.iloc[-2])
chg      = last_px - prev_px
chg_pct  = chg / prev_px * 100
chg_sign = "+" if chg >= 0 else ""
color    = "positive" if chg >= 0 else "negative"

st.markdown(f"### {info.get('name', ticker)}")
st.markdown(
    f"<span style='font-size:28px;font-weight:700;'>{currency} {last_px:,.2f}</span> "
    f"<span class='{color}' style='font-size:18px;'>"
    f"{chg_sign}{chg:.2f} ({chg_sign}{chg_pct:.2f}%)</span>",
    unsafe_allow_html=True
)

c1, c2, c3, c4, c5 = st.columns(5)
metric_card(c1, "Market Cap",  fmt_number(info.get("market_cap"), prefix=f"{currency} "))
metric_card(c2, "52W High",    f"{info.get('52w_high') or 'N/A'}")
metric_card(c3, "52W Low",     f"{info.get('52w_low')  or 'N/A'}")
metric_card(c4, "P/E Ratio",   f"{info.get('pe_ratio') or 'N/A'}")
metric_card(c5, "Sector",      info.get("sector", "N/A"))
st.markdown("<br>", unsafe_allow_html=True)

# ─── Price Chart ──────────────────────────────────────────────────────────────
subplot_rows  = 1
subplot_specs = [[{"secondary_y": False}]]
row_heights   = [0.6]

if show_volume: subplot_rows += 1; subplot_specs += [[{}]]; row_heights += [0.15]
if show_rsi:    subplot_rows += 1; subplot_specs += [[{}]]; row_heights += [0.12]
if show_macd:   subplot_rows += 1; subplot_specs += [[{}]]; row_heights += [0.13]

fig = make_subplots(rows=subplot_rows, cols=1, shared_xaxes=True,
                    vertical_spacing=0.03, row_heights=row_heights)

if show_candle:
    fig.add_trace(go.Candlestick(
        x=data.index,
        open=data["Open"].squeeze(), high=data["High"].squeeze(),
        low=data["Low"].squeeze(),   close=close, name="OHLC",
        increasing_line_color="#00d4a0", decreasing_line_color="#ff4d6d",
    ), row=1, col=1)
else:
    fig.add_trace(go.Scatter(x=data.index, y=close, name="Close",
                              line=dict(color="#5b7cfa", width=1.5)), row=1, col=1)

if show_ma:
    for ma, clr in [("MA20","#ffd700"),("MA50","#ff8c00"),
                    ("MA100","#00bfff"),("MA200","#ff69b4")]:
        fig.add_trace(go.Scatter(
            x=data.index, y=close.rolling(int(ma[2:])).mean(),
            name=ma, line=dict(color=clr, width=1.2), opacity=0.85
        ), row=1, col=1)

if show_bb:
    bb_mid = close.rolling(20).mean()
    bb_std = close.rolling(20).std()
    fig.add_trace(go.Scatter(x=data.index, y=bb_mid + 2*bb_std, name="BB Upper",
                              line=dict(color="rgba(180,180,255,0.5)", width=1, dash="dash")),
                  row=1, col=1)
    fig.add_trace(go.Scatter(x=data.index, y=bb_mid - 2*bb_std, name="BB Lower",
                              line=dict(color="rgba(180,180,255,0.5)", width=1, dash="dash"),
                              fill="tonexty", fillcolor="rgba(100,100,255,0.05)"), row=1, col=1)

current_row = 2
if show_volume:
    vol_colors = ["#00d4a0" if c >= o else "#ff4d6d"
                  for c, o in zip(data["Close"].squeeze(), data["Open"].squeeze())]
    fig.add_trace(go.Bar(x=data.index, y=data["Volume"].squeeze(),
                          name="Volume", marker_color=vol_colors, opacity=0.6),
                  row=current_row, col=1)
    fig.update_yaxes(title_text="Volume", row=current_row, col=1)
    current_row += 1

if show_rsi:
    fig.add_trace(go.Scatter(x=data.index, y=data["RSI"].squeeze(),
                              name="RSI", line=dict(color="#a78bfa", width=1.5)),
                  row=current_row, col=1)
    fig.add_hline(y=70, line=dict(color="red",   width=1, dash="dot"), row=current_row, col=1)
    fig.add_hline(y=30, line=dict(color="green", width=1, dash="dot"), row=current_row, col=1)
    fig.update_yaxes(title_text="RSI", range=[0, 100], row=current_row, col=1)
    current_row += 1

if show_macd:
    macd_vals = data["MACD"].squeeze()
    fig.add_trace(go.Bar(x=data.index, y=macd_vals, name="MACD Hist",
                          marker_color=["#00d4a0" if v >= 0 else "#ff4d6d" for v in macd_vals],
                          opacity=0.6), row=current_row, col=1)
    fig.update_yaxes(title_text="MACD", row=current_row, col=1)

fig.update_layout(
    height=700, template="plotly_dark",
    paper_bgcolor="#0e1117", plot_bgcolor="#0e1117",
    xaxis_rangeslider_visible=False,
    legend=dict(orientation="h", yanchor="bottom", y=1.01, xanchor="right", x=1),
    margin=dict(l=20, r=20, t=30, b=20),
    font=dict(family="Inter, sans-serif", color="#c0c8e0")
)
fig.update_xaxes(showgrid=True, gridcolor="#1e2540", zeroline=False)
fig.update_yaxes(showgrid=True, gridcolor="#1e2540", zeroline=False)

st.markdown("<div class='section-title'>Price Chart</div>", unsafe_allow_html=True)
st.plotly_chart(fig, use_container_width=True)
st.markdown("#### 📅 1-Month Forecast")

if model is None:
    st.warning(
        f"⚠️ Model not found at `{model_path}`. "
        "Place `Stock Predictions Model.keras` in the same folder as `app.py`."
    )
elif tuple(model.input_shape) != EXPECTED_MODEL_SHAPE:
    st.error(
        f"❌ Model shape mismatch.  \n"
        f"Expected `{EXPECTED_MODEL_SHAPE}` — got `{tuple(model.input_shape)}`."
    )
else:
    try:
        with st.spinner("Generating 1-month forecast…"):
            future_dates, future_prices = forecast_next_month(model, data, days=22)

        future_dates = [pd.Timestamp(d) for d in future_dates]
        recent_data  = data.tail(90)
        last_close   = float(recent_data["Close"].squeeze().iloc[-1])

        month_fig = go.Figure()
        month_fig.add_trace(go.Scatter(
            x=recent_data.index,
            y=recent_data["Close"].squeeze(),
            name="Historical Price",
            line=dict(color="#00d4a0", width=2),
        ))
        month_fig.add_trace(go.Scatter(
            x=future_dates,
            y=future_prices,
            name="1-Month Forecast",
            line=dict(color="#ffcc00", width=3, dash="dash"),
        ))
        month_fig.add_trace(go.Scatter(
            x=[recent_data.index[-1], future_dates[0]],
            y=[last_close, future_prices[0]],
            mode="lines",
            showlegend=False,
            line=dict(color="white", dash="dot"),
        ))
        month_fig.update_layout(
            height=450,
            template="plotly_dark",
            paper_bgcolor="#0e1117",
            plot_bgcolor="#0e1117",
            title="Next 1-Month Stock Forecast",
            yaxis_title=f"Price ({currency})",
            xaxis_title="Date",
        )
        st.plotly_chart(month_fig, use_container_width=True)
    except Exception as e:
        st.error(f"1-month forecast failed: {e}")


# ─── LSTM Section ─────────────────────────────────────────────────────────────
if show_predict:
    st.markdown("<div class='section-title'>🤖 LSTM Prediction</div>", unsafe_allow_html=True)

    if model is None:
        st.warning(
            f"⚠️ Model not found at `{model_path}`.\n\n"
            "Place `Stock Predictions Model.keras` in the same folder as `app.py`."
        )
    else:
        actual = tuple(model.input_shape)
        if actual != EXPECTED_MODEL_SHAPE:
            st.error(
                f"❌ Model shape mismatch.  \n"
                f"Expected `{EXPECTED_MODEL_SHAPE}` — got `{actual}`.  \n"
                f"This app expects **{len(FEATURES)} features**: `{FEATURES}`."
            )
        else:
            # ── Next-Day Forecast ─────────────────────────────────────────────
            st.markdown("#### 🔮 Next-Day Price Forecast")
            try:
                pred_price, last_close, next_date, conf_low, conf_high = \
                    forecast_next_day(model, data)

                price_chg     = pred_price - last_close
                price_chg_pct = price_chg / last_close * 100
                direction     = "▲" if price_chg >= 0 else "▼"
                fc_color      = "#00d4a0" if price_chg >= 0 else "#ff4d6d"
                sign          = "+" if price_chg >= 0 else ""
                next_label    = next_date.strftime("%A, %d %B %Y")

                fa, fb, fc = st.columns([2, 1, 1])
                fa.markdown(f"""
                <div class='forecast-box'>
                    <h2>📅 Forecast for {next_label}</h2>
                    <p class='forecast-price' style='color:{fc_color};'>
                        {direction} {currency} {pred_price:,.2f}
                    </p>
                    <p class='forecast-meta'>
                        vs last close {currency} {last_close:,.2f} &nbsp;|&nbsp;
                        <span style='color:{fc_color};'>{sign}{price_chg:.2f} ({sign}{price_chg_pct:.2f}%)</span>
                    </p>
                    <p class='forecast-meta'>
                        ATR confidence range: {currency} {conf_low:.2f} – {currency} {conf_high:.2f}
                    </p>
                </div>""", unsafe_allow_html=True)

                metric_card(fb, "Forecast Price",  f"{currency} {pred_price:,.2f}")
                metric_card(fc, "Expected Change",
                            f"<span style='color:{fc_color}'>{sign}{price_chg_pct:.2f}%</span>")

            except Exception as e:
                st.error(f"Next-day forecast failed: {e}")
                pred_price, last_close, next_date, conf_low, conf_high = None, None, None, None, None
                fc_color = "#5b7cfa"

            st.markdown("---")

            # ── Historical Prediction ──────────────────────────────────────────
            st.markdown("#### 📊 Historical Test-Set Prediction")
            st.caption(f"Using training range `{MODEL_TRAIN_START}` → `{MODEL_TRAIN_END}` (matches notebook)")

            with st.spinner("Running inference…"):
                try:
                    y_pred, y_true, test_dates = build_prediction(model, ticker)
                    test_dates = pd.to_datetime(test_dates)

                    mae  = np.mean(np.abs(y_pred - y_true))
                    rmse = np.sqrt(np.mean((y_pred - y_true) ** 2))
                    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
                    r2   = 1 - np.sum((y_true - y_pred)**2) / \
                               np.sum((y_true - np.mean(y_true))**2)

                    m1, m2, m3, m4 = st.columns(4)
                    metric_card(m1, "MAE",  f"{currency} {mae:.4f}")
                    metric_card(m2, "RMSE", f"{currency} {rmse:.4f}")
                    metric_card(m3, "MAPE", f"{mape:.2f}%")
                    metric_card(m4, "R²",   f"{r2:.4f}")
                    st.markdown("<br>", unsafe_allow_html=True)

                    # ── Chart ─────────────────────────────────────────────────
                    pred_fig = go.Figure()

                    pred_fig.add_trace(go.Scatter(
                        x=test_dates, y=y_true,
                        name="Actual Price",
                        line=dict(color="#00d4a0", width=2)
                    ))
                    pred_fig.add_trace(go.Scatter(
                        x=test_dates, y=y_pred,
                        name="Predicted Price",
                        line=dict(color="#5b7cfa", width=2, dash="dot")
                    ))
                    pred_fig.add_trace(go.Scatter(
                        x=list(test_dates) + list(test_dates[::-1]),
                        y=list(y_pred * 1.03) + list(y_pred[::-1] * 0.97),
                        fill="toself",
                        fillcolor="rgba(91,124,250,0.07)",
                        line=dict(color="rgba(255,255,255,0)"),
                        name="±3% Band"
                    ))

                    # Next-day forecast star + ATR bar
                    if pred_price is not None:
                        next_ts = pd.Timestamp(next_date)
                        pred_fig.add_trace(go.Scatter(
                            x=[next_ts], y=[pred_price],
                            mode="markers+text",
                            name=f"Forecast ({next_date.strftime('%d %b')})",
                            marker=dict(color=fc_color, size=14, symbol="star",
                                        line=dict(color="white", width=1.5)),
                            text=[f"  {currency} {pred_price:,.2f}"],
                            textposition="middle right",
                            textfont=dict(color=fc_color, size=13)
                        ))
                        pred_fig.add_trace(go.Scatter(
                            x=[next_ts, next_ts],
                            y=[conf_low, conf_high],
                            mode="lines",
                            name="ATR Range",
                            line=dict(color=fc_color, width=3, dash="dot")
                        ))

                        # add_vline breaks with mixed datetime types on the x-axis
                        today_ts = pd.Timestamp(data.index[-1])
                        pred_fig.add_shape(
                            type="line",
                            x0=today_ts, x1=today_ts,
                            y0=0, y1=1, yref="paper",
                            line=dict(color="rgba(255,255,255,0.25)", width=1.5, dash="dash"),
                        )
                        pred_fig.add_annotation(
                            x=today_ts, y=1, yref="paper",
                            text="Today", showarrow=False,
                            xanchor="left", yanchor="bottom",
                            font=dict(color="rgba(255,255,255,0.5)", size=11),
                        )

                    pred_fig.update_layout(
                        height=460, template="plotly_dark",
                        paper_bgcolor="#0e1117", plot_bgcolor="#0e1117",
                        legend=dict(orientation="h", yanchor="bottom", y=1.02),
                        margin=dict(l=20, r=20, t=10, b=20),
                        yaxis_title=f"Price ({currency})",
                        xaxis_title="Date"
                    )
                    pred_fig.update_xaxes(showgrid=True, gridcolor="#1e2540")
                    pred_fig.update_yaxes(showgrid=True, gridcolor="#1e2540")
                    st.plotly_chart(pred_fig, use_container_width=True)

                    st.markdown(
                        "<div class='info-box'>⚠️ <strong>Disclaimer:</strong> "
                        "Forecasts are based on historical price patterns and technical indicators. "
                        "For educational purposes only — not financial advice. "
                        "The next-day confidence range is based on recent ATR (Average True Range).</div>",
                        unsafe_allow_html=True
                    )
                except Exception as e:
                    st.error(f"Prediction failed: {e}")

# ─── Raw Data ─────────────────────────────────────────────────────────────────
with st.expander("📊 View Raw Data"):
    show_cols  = ["Open","High","Low","Close","Volume","RSI","MACD","BB_pct","ATR","ROC"]
    display_df = data[[c for c in show_cols if c in data.columns]].copy()
    display_df = display_df.sort_index(ascending=False).round(4)
    st.dataframe(display_df, use_container_width=True, height=300)
    csv = data.to_csv().encode("utf-8")
    st.download_button("⬇️ Download CSV", csv,
                       file_name=f"{ticker}_data.csv", mime="text/csv")