import time
import yfinance as yf
from typing import Optional


def fetch_fundamental_data(ticker: str) -> dict:
    try:
        info = yf.Ticker(ticker).info
        return {
            "pe_ratio": info.get("trailingPE"),
            "pb_ratio": info.get("priceToBook"),
            "roe": info.get("returnOnEquity"),
            "profit_margin": info.get("profitMargins"),
            "debt_equity": info.get("debtToEquity"),
            "peg_ratio": info.get("pegRatio"),
        }
    except Exception:
        return {}


def _score_roe(roe: float) -> float:
    """Buffett rule: ROE >= 15% consistently. 30%+ → 100, 15% → 75, 0% → 0."""
    if roe >= 0.30:
        return 100.0
    elif roe >= 0.15:
        return 75.0 + (roe - 0.15) / 0.15 * 25.0
    elif roe >= 0:
        return roe / 0.15 * 75.0
    else:
        return max(0.0, 50.0 + roe * 200.0)


def _score_profit_margin(margin: float) -> float:
    """Buffett rule: net profit margin >= 10%, 20%+ is excellent."""
    if margin >= 0.20:
        return 100.0
    elif margin >= 0.10:
        return 70.0 + (margin - 0.10) / 0.10 * 30.0
    elif margin >= 0:
        return margin / 0.10 * 70.0
    else:
        return max(0.0, margin * 200.0)


def _score_debt_equity(de: float) -> float:
    """Buffett rule: D/E <= 0.5. Net cash (<=0) is best."""
    if de <= 0:
        return 100.0
    elif de <= 0.5:
        return 100.0 - de / 0.5 * 30.0   # 100 → 70
    elif de <= 1.0:
        return 70.0 - (de - 0.5) / 0.5 * 40.0  # 70 → 30
    else:
        return max(0.0, 30.0 - (de - 1.0) * 15.0)


def _score_pe(pe: float) -> float:
    """Graham rule: P/E <= 15. Higher = overvalued = lower score."""
    if pe <= 10:
        return 100.0
    elif pe <= 15:
        return 80.0 + (15.0 - pe) / 5.0 * 20.0
    elif pe <= 25:
        return 50.0 + (25.0 - pe) / 10.0 * 30.0
    elif pe <= 40:
        return 20.0 + (40.0 - pe) / 15.0 * 30.0
    else:
        return max(0.0, 20.0 - (pe - 40.0) * 0.5)


def _score_pb(pb: float) -> float:
    """Graham rule: P/B <= 1.5. Lower = closer to asset value."""
    if pb <= 1.0:
        return 100.0
    elif pb <= 1.5:
        return 80.0
    elif pb <= 3.0:
        return 60.0 - (pb - 1.5) / 1.5 * 30.0
    elif pb <= 5.0:
        return 30.0 - (pb - 3.0) / 2.0 * 20.0
    else:
        return max(0.0, 10.0 - (pb - 5.0) * 2.0)


def _score_peg(peg: float) -> float:
    """Lynch rule: PEG <= 1.0 means growth at a reasonable price."""
    if peg <= 0.5:
        return 100.0
    elif peg <= 1.0:
        return 80.0 + (1.0 - peg) / 0.5 * 20.0
    elif peg <= 1.5:
        return 50.0 + (1.5 - peg) / 0.5 * 30.0
    elif peg <= 2.0:
        return 20.0 + (2.0 - peg) / 0.5 * 30.0
    else:
        return max(0.0, 20.0 - (peg - 2.0) * 10.0)


# Weight of each rule when data is available
_RULE_WEIGHTS = {
    "roe": 0.25,           # Buffett's primary quality signal
    "profit_margin": 0.25, # Buffett's moat indicator
    "debt_equity": 0.20,   # Buffett's safety signal
    "pe_ratio": 0.15,      # Graham valuation
    "pb_ratio": 0.15,      # Graham asset value
    "peg_ratio": 0.20,     # Lynch GARP signal (replaces pb if both present → normalize)
}


def score_fundamentals(data: dict) -> tuple[float, dict]:
    """
    Returns (score 0-100, breakdown dict of individual rule scores).
    Weights normalize dynamically based on which fields are available.
    """
    candidates = []

    roe = data.get("roe")
    if roe is not None:
        candidates.append(("roe", _score_roe(float(roe)), _RULE_WEIGHTS["roe"]))

    margin = data.get("profit_margin")
    if margin is not None:
        candidates.append(("profit_margin", _score_profit_margin(float(margin)), _RULE_WEIGHTS["profit_margin"]))

    de = data.get("debt_equity")
    if de is not None:
        candidates.append(("debt_equity", _score_debt_equity(float(de)), _RULE_WEIGHTS["debt_equity"]))

    pe = data.get("pe_ratio")
    if pe is not None and float(pe) > 0:
        candidates.append(("pe_ratio", _score_pe(float(pe)), _RULE_WEIGHTS["pe_ratio"]))

    pb = data.get("pb_ratio")
    if pb is not None and float(pb) > 0:
        candidates.append(("pb_ratio", _score_pb(float(pb)), _RULE_WEIGHTS["pb_ratio"]))

    peg = data.get("peg_ratio")
    if peg is not None and float(peg) > 0:
        candidates.append(("peg_ratio", _score_peg(float(peg)), _RULE_WEIGHTS["peg_ratio"]))

    if not candidates:
        return 50.0, {}

    total_weight = sum(w for _, _, w in candidates)
    weighted_sum = sum(s * w for _, s, w in candidates)
    composite = round(weighted_sum / total_weight, 2)

    breakdown = {name: round(score, 2) for name, score, _ in candidates}
    return composite, breakdown


def score_fundamentals_for_candidates(
    candidates: list[dict],
    delay: float = 0.8,
) -> dict[str, dict]:
    """
    Fetch fundamental data and score each candidate ticker.
    Returns dict of ticker → {fundamental_score, pe_ratio, pb_ratio, ...}
    """
    results = {}
    for c in candidates:
        ticker = c["ticker"]
        raw = fetch_fundamental_data(ticker)
        score, breakdown = score_fundamentals(raw)
        results[ticker] = {
            "fundamental_score": score,
            "fundamental_breakdown": breakdown,
            "pe_ratio": raw.get("pe_ratio"),
            "pb_ratio": raw.get("pb_ratio"),
            "roe": raw.get("roe"),
            "profit_margin": raw.get("profit_margin"),
            "debt_equity": raw.get("debt_equity"),
            "peg_ratio": raw.get("peg_ratio"),
        }
        time.sleep(delay)
    return results
