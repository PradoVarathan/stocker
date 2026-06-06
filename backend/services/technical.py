import pandas as pd
import numpy as np
from typing import Optional


def compute_rsi(close: pd.Series, period: int = 14) -> float:
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    val = rsi.iloc[-1]
    return float(val) if not np.isnan(val) else 50.0


def rsi_to_score(rsi: float) -> float:
    # Bullish zone 50-70 scores highest; >75 overbought penalty; <30 downtrend penalty
    if rsi < 30:
        return max(0, rsi)
    elif rsi < 45:
        return 20 + (rsi - 30) * 2
    elif rsi < 55:
        return 50 + (rsi - 45) * 2
    elif rsi < 70:
        return 70 + (rsi - 55) * 2
    else:
        return max(0, 100 - (rsi - 70) * 3)


def compute_macd(close: pd.Series) -> dict:
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    histogram = macd_line - signal_line
    curr_hist = float(histogram.iloc[-1])
    prev_hist = float(histogram.iloc[-2]) if len(histogram) > 1 else 0.0
    return {"histogram": curr_hist, "prev_histogram": prev_hist}


def macd_to_score(macd_data: dict) -> float:
    h = macd_data["histogram"]
    ph = macd_data["prev_histogram"]
    if h > 0 and h > ph:      # widening bullish momentum
        return min(100, 70 + h * 10)
    elif h > 0:               # bullish but narrowing
        return 55.0
    elif h < 0 and h < ph:    # widening bearish momentum
        return max(0, 20 + h * 5)
    else:                     # bearish but narrowing (potential reversal)
        return 30.0


def compute_momentum(close: pd.Series, period: int = 10) -> float:
    if len(close) < period + 1:
        return 0.0
    old_price = float(close.iloc[-(period + 1)])
    new_price = float(close.iloc[-1])
    if old_price == 0:
        return 0.0
    return (new_price - old_price) / old_price * 100


def momentum_to_score(momentum_pct: float) -> float:
    score = 50 + momentum_pct * 10
    return max(0.0, min(100.0, score))


def compute_volume_surge(volume: pd.Series) -> float:
    if len(volume) < 20:
        return 1.0
    avg_20 = float(volume.rolling(20).mean().iloc[-1])
    recent_5 = float(volume.iloc[-5:].mean())
    if avg_20 == 0:
        return 1.0
    return recent_5 / avg_20


def volume_to_score(vol_ratio: float) -> float:
    if vol_ratio >= 1.5:
        return 100.0
    elif vol_ratio >= 1.0:
        return 50 + (vol_ratio - 1.0) * 100
    elif vol_ratio >= 0.7:
        return (vol_ratio - 0.7) / 0.3 * 50
    else:
        return 0.0


def compute_bollinger(close: pd.Series, period: int = 20) -> dict:
    """Bollinger Band position: 0=at lower band, 1=at upper band, 0.5=at midline."""
    if len(close) < period:
        return {"position": 0.5, "bandwidth": 0.0}
    ma = close.rolling(period).mean().iloc[-1]
    std = close.rolling(period).std().iloc[-1]
    upper = ma + 2 * std
    lower = ma - 2 * std
    price = float(close.iloc[-1])
    bandwidth = float((upper - lower) / ma) if ma > 0 else 0.0
    position = float((price - lower) / (upper - lower)) if (upper - lower) > 0 else 0.5
    return {"position": position, "bandwidth": bandwidth}


def bollinger_to_score(bb: dict) -> float:
    """
    Sweet spot is 0.5-0.8 (trending up, not overbought).
    Above upper band (>1.0) → overbought penalty.
    Below midline (<0.5) → bearish.
    """
    pos = bb["position"]
    if pos > 1.0:
        return max(0.0, 60 - (pos - 1.0) * 120)
    elif pos >= 0.8:
        return 70 + (pos - 0.8) * 150   # 70-100
    elif pos >= 0.5:
        return 55 + (pos - 0.5) * 50    # 55-70
    elif pos >= 0.2:
        return 20 + (pos - 0.2) * 116   # 20-55
    else:
        return max(0.0, pos * 100)


def compute_ma_crossover(close: pd.Series) -> dict:
    """10 EMA vs 20 EMA golden/death cross signal."""
    if len(close) < 20:
        return {"gap_pct": 0.0, "crossover_recent": False, "bullish": False}
    ema10 = close.ewm(span=10, adjust=False).mean()
    ema20 = close.ewm(span=20, adjust=False).mean()
    diff = ema10 - ema20
    curr = float(diff.iloc[-1])
    prev = float(diff.iloc[-6]) if len(diff) > 5 else curr
    crossover_recent = (curr > 0) != (prev > 0)
    last_price = float(close.iloc[-1])
    gap_pct = curr / last_price * 100 if last_price != 0 else 0.0
    return {
        "gap_pct": round(gap_pct, 4),
        "crossover_recent": crossover_recent,
        "bullish": curr > 0,
    }


def ma_to_score(ma_data: dict) -> float:
    """
    Bullish (10EMA > 20EMA): base 65, up to 100 with gap size + fresh crossover bonus.
    Bearish (10EMA < 20EMA): base 35, down to 0.
    """
    if ma_data["bullish"]:
        base = 65.0
        gap_bonus = min(25.0, abs(ma_data["gap_pct"]) * 25)
        cross_bonus = 10.0 if ma_data["crossover_recent"] else 0.0
        return min(100.0, base + gap_bonus + cross_bonus)
    else:
        base = 35.0
        gap_penalty = min(25.0, abs(ma_data["gap_pct"]) * 25)
        cross_penalty = 10.0 if ma_data["crossover_recent"] else 0.0
        return max(0.0, base - gap_penalty - cross_penalty)


def compute_composite_score(df: pd.DataFrame) -> Optional[dict]:
    """
    Five-signal composite using research-backed weights:
      MACD 25% | RSI 20% | Volume 20% | MA crossover 20% | Bollinger 15%
    """
    try:
        close = df["close"]
        volume = df["volume"]

        rsi_val = compute_rsi(close)
        macd_data = compute_macd(close)
        momentum_pct = compute_momentum(close)
        vol_ratio = compute_volume_surge(volume)
        bb = compute_bollinger(close)
        ma_data = compute_ma_crossover(close)

        rsi_s = rsi_to_score(rsi_val)
        macd_s = macd_to_score(macd_data)
        momentum_s = momentum_to_score(momentum_pct)
        volume_s = volume_to_score(vol_ratio)
        bollinger_s = bollinger_to_score(bb)
        ma_s = ma_to_score(ma_data)

        composite = (
            0.25 * macd_s +
            0.20 * rsi_s +
            0.20 * volume_s +
            0.20 * ma_s +
            0.15 * bollinger_s
        )

        return {
            "composite": round(composite, 2),
            "rsi": round(rsi_val, 2),
            "rsi_score": round(rsi_s, 2),
            "macd_histogram": round(macd_data["histogram"], 4),
            "macd_score": round(macd_s, 2),
            "momentum_pct": round(momentum_pct, 2),
            "momentum_score": round(momentum_s, 2),
            "volume_ratio": round(vol_ratio, 2),
            "volume_score": round(volume_s, 2),
            "bollinger_position": round(bb["position"], 3),
            "bollinger_score": round(bollinger_s, 2),
            "ma_bullish": ma_data["bullish"],
            "ma_crossover_recent": ma_data["crossover_recent"],
            "ma_score": round(ma_s, 2),
        }
    except Exception:
        return None
