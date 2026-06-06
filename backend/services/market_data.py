import yfinance as yf
import pandas as pd
import time
from typing import Optional

_cache: dict[str, tuple[float, pd.DataFrame]] = {}
CACHE_TTL = 900  # 15 minutes


def fetch_stock_data(ticker: str, period_days: int = 60) -> Optional[pd.DataFrame]:
    cache_key = f"{ticker}_{period_days}"
    now = time.time()

    if cache_key in _cache:
        cached_time, cached_df = _cache[cache_key]
        if now - cached_time < CACHE_TTL:
            return cached_df

    try:
        period = f"{period_days}d"
        df = yf.download(ticker, period=period, progress=False, auto_adjust=True)
        if df is None or len(df) < 20:
            return None
        # Flatten MultiIndex before lowercasing (yfinance 1.x returns MultiIndex for single tickers)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df.columns = [c.lower() for c in df.columns]
        df = df[["open", "high", "low", "close", "volume"]].dropna()
        if len(df) < 20:
            return None
        _cache[cache_key] = (now, df)
        return df
    except Exception:
        return None


def get_current_price(ticker: str) -> float:
    try:
        t = yf.Ticker(ticker)
        info = t.fast_info
        price = getattr(info, "last_price", None)
        if price is None or price == 0:
            df = fetch_stock_data(ticker, period_days=5)
            if df is not None and len(df) > 0:
                return float(df["close"].iloc[-1])
        return float(price) if price else 0.0
    except Exception:
        return 0.0


def get_sparkline(ticker: str, days: int = 14) -> list[float]:
    df = fetch_stock_data(ticker, period_days=days)
    if df is None:
        return []
    return [round(float(p), 2) for p in df["close"].tolist()]


def get_price_change_today(ticker: str) -> float:
    try:
        df = fetch_stock_data(ticker, period_days=5)
        if df is None or len(df) < 2:
            return 0.0
        prev_close = float(df["close"].iloc[-2])
        curr_close = float(df["close"].iloc[-1])
        if prev_close == 0:
            return 0.0
        return round((curr_close - prev_close) / prev_close * 100, 2)
    except Exception:
        return 0.0


def clear_cache():
    _cache.clear()
