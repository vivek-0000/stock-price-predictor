from fastapi import APIRouter, HTTPException, Query
from core.features import fetch_data, add_all_features
from datetime import datetime

router = APIRouter()


@router.get("/indicators")
def indicators(
    ticker: str = Query("GOOG",       description="Stock ticker symbol"),
    start:  str = Query("2020-01-01", description="Start date YYYY-MM-DD"),
    end:    str = Query("",           description="End date YYYY-MM-DD (default: today)")
):
    """
    Returns OHLCV + all technical indicators for the requested date range.
    Used by the React chart components.
    """
    ticker = ticker.upper()
    end    = end or datetime.today().strftime("%Y-%m-%d")

    try:
        raw = fetch_data(ticker, start, end)
        df  = add_all_features(raw)

        close = df["Close"].squeeze()

        return {
            "ticker": ticker,
            "start":  str(df.index[0].date()),
            "end":    str(df.index[-1].date()),
            "count":  len(df),

            # OHLCV — for candlestick chart
            "candlestick": [
                {
                    "date":   str(d.date()),
                    "open":   round(float(df["Open"].iloc[i]),   4),
                    "high":   round(float(df["High"].iloc[i]),   4),
                    "low":    round(float(df["Low"].iloc[i]),    4),
                    "close":  round(float(close.iloc[i]),        4),
                    "volume": int(df["Volume"].iloc[i]),
                }
                for i, d in enumerate(df.index)
            ],

            # Moving Averages
            "ma": {
                "dates": [str(d.date()) for d in df.index],
                "ma20":  [round(float(v), 4) if not __import__("math").isnan(v) else None
                          for v in df["MA20"]],
                "ma50":  [round(float(v), 4) if not __import__("math").isnan(v) else None
                          for v in df["MA50"]],
                "ma100": [round(float(v), 4) if not __import__("math").isnan(v) else None
                          for v in df["MA100"]],
                "ma200": [round(float(v), 4) if not __import__("math").isnan(v) else None
                          for v in df["MA200"]],
            },

            # Bollinger Bands
            "bollinger": {
                "dates":    [str(d.date()) for d in df.index],
                "upper":    [round(float(v), 4) for v in df["BB_upper"]],
                "mid":      [round(float(v), 4) for v in df["BB_mid"]],
                "lower":    [round(float(v), 4) for v in df["BB_lower"]],
                "pct":      [round(float(v), 4) for v in df["BB_pct"]],
            },

            # RSI
            "rsi": {
                "dates":  [str(d.date()) for d in df.index],
                "values": [round(float(v), 4) for v in df["RSI"]],
            },

            # MACD
            "macd": {
                "dates":     [str(d.date()) for d in df.index],
                "histogram": [round(float(v), 4) for v in df["MACD"]],
            },

            # ATR
            "atr": {
                "dates":  [str(d.date()) for d in df.index],
                "values": [round(float(v), 4) for v in df["ATR"]],
            },

            # ROC
            "roc": {
                "dates":  [str(d.date()) for d in df.index],
                "values": [round(float(v), 4) for v in df["ROC"]],
            },

            # Summary stats
            "summary": {
                "last_close":    round(float(close.iloc[-1]), 4),
                "prev_close":    round(float(close.iloc[-2]), 4),
                "change":        round(float(close.iloc[-1] - close.iloc[-2]), 4),
                "change_pct":    round(float((close.iloc[-1] - close.iloc[-2]) /
                                              close.iloc[-2] * 100), 4),
                "rsi_last":      round(float(df["RSI"].iloc[-1]), 2),
                "atr_last":      round(float(df["ATR"].iloc[-1]), 4),
                "bb_pct_last":   round(float(df["BB_pct"].iloc[-1]), 4),
                "52w_high":      round(float(df["High"].squeeze().tail(252).max()), 4),
                "52w_low":       round(float(df["Low"].squeeze().tail(252).min()), 4),
            }
        }

    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Indicator fetch failed: {e}")
