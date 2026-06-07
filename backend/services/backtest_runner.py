"""
Backtest runner: replays the simulation algorithm using price data capped at a
historical date, then fetches actual post-date returns to evaluate accuracy.
Gemini AI is skipped — this is a pure algorithmic evaluation.
"""

import random
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, date

import yfinance as yf
import pandas as pd

from data.universe import STOCK_UNIVERSE, COMPANY_NAMES, SECTORS, TICKER_SECTOR
from services.market_data import fetch_stock_data
from services.technical import compute_composite_score
from services.fundamental import score_fundamentals_for_candidates

# In-memory job store for backtest progress
_backtest_progress: dict[str, dict] = {}


def get_backtest_progress(job_id: str) -> dict:
    return _backtest_progress.get(job_id, {"status": "unknown", "step": "", "pct": 0})


def _update_progress(job_id: str, status: str, step: str, pct: int):
    _backtest_progress[job_id] = {"status": status, "step": step, "pct": pct}


def _fetch_actual_returns(tickers: list[str], from_date: str) -> dict[str, float]:
    """Fetch price on from_date and today, return actual % return per ticker."""
    today = date.today().strftime("%Y-%m-%d")
    end_str = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
    returns = {}
    try:
        df = yf.download(tickers, start=from_date, end=end_str, progress=False, auto_adjust=True)
        if df is None or df.empty:
            return returns

        if isinstance(df.columns, pd.MultiIndex):
            close = df["Close"]
        else:
            close = df[["Close"]] if "Close" in df.columns else df

        for ticker in tickers:
            try:
                if isinstance(close, pd.DataFrame) and ticker in close.columns:
                    series = close[ticker].dropna()
                elif not isinstance(close, pd.DataFrame):
                    series = close.dropna()
                else:
                    continue
                if len(series) < 2:
                    continue
                price_then = float(series.iloc[0])
                price_now = float(series.iloc[-1])
                if price_then > 0:
                    returns[ticker] = round((price_now - price_then) / price_then * 100, 2)
                    returns[f"{ticker}_price_then"] = round(price_then, 2)
                    returns[f"{ticker}_price_now"] = round(price_now, 2)
            except Exception:
                continue
    except Exception:
        pass
    return returns


async def run_backtest(job_id: str, backtest_date: str, rounds: int = 100,
                       lookback_days: int = 60, sector: str = None):
    """
    Full pipeline replay using historical data up to backtest_date.
    Returns results stored in _backtest_progress[job_id]['results'].
    """
    try:
        _update_progress(job_id, "running", "Fetching historical price data...", 5)

        universe = SECTORS[sector] if sector and sector in SECTORS else STOCK_UNIVERSE

        # Stage 1: Fetch historical price data capped at backtest_date
        price_data = {}
        for ticker in universe:
            df = fetch_stock_data(ticker, period_days=lookback_days, end_date=backtest_date)
            if df is not None:
                price_data[ticker] = df

        valid = list(price_data.keys())
        if not valid:
            _update_progress(job_id, "failed", "No price data available for that date.", 0)
            return

        _update_progress(job_id, "running", f"Scoring {len(valid)} stocks...", 15)

        # Stage 2: Technical scores
        tech_scores = {}
        for ticker, df in price_data.items():
            scores = compute_composite_score(df)
            if scores is not None:
                tech_scores[ticker] = scores

        _update_progress(job_id, "running", f"Running {rounds} Monte Carlo rounds...", 25)

        # Stage 3: Monte Carlo
        frequency_counter: dict[str, int] = defaultdict(int)
        score_accumulator: dict[str, list] = defaultdict(list)

        for r in range(rounds):
            round_scores = {}
            for ticker, scores in tech_scores.items():
                noise = random.gauss(0, 2.5)
                round_scores[ticker] = min(100.0, max(0.0, scores["composite"] + noise))
            top_20 = sorted(round_scores.items(), key=lambda x: x[1], reverse=True)[:20]
            for ticker, score in top_20:
                frequency_counter[ticker] += 1
                score_accumulator[ticker].append(score)
            if (r + 1) % 20 == 0:
                pct = 25 + int((r + 1) / rounds * 30)
                _update_progress(job_id, "running", f"Monte Carlo: {r+1}/{rounds} rounds...", pct)

        # Stage 4: Aggregate
        final_rankings = []
        for ticker, count in frequency_counter.items():
            avg_score = sum(score_accumulator[ticker]) / len(score_accumulator[ticker])
            final_rankings.append({
                "ticker": ticker,
                "company_name": COMPANY_NAMES.get(ticker, ticker),
                "times_in_top_picks": count,
                "avg_composite_score": round(avg_score, 2),
            })
        final_rankings.sort(key=lambda x: (x["times_in_top_picks"], x["avg_composite_score"]), reverse=True)
        top_20 = final_rankings[:20]

        _update_progress(job_id, "running", "Fetching fundamental ratios for top 20...", 60)

        # Stage 5: Fundamental scoring
        fund_data = score_fundamentals_for_candidates(top_20, delay=0.5)

        # Stage 6: Blend
        for c in top_20:
            ticker = c["ticker"]
            fd = fund_data.get(ticker, {})
            fund_score = fd.get("fundamental_score", 50.0)
            c["blended_score"] = round(0.60 * c["avg_composite_score"] + 0.40 * fund_score, 2)
            c["fundamental_score"] = fund_score
            c["pe_ratio"] = fd.get("pe_ratio")
            c["pb_ratio"] = fd.get("pb_ratio")
            c["roe"] = fd.get("roe")
            c["profit_margin"] = fd.get("profit_margin")
            c["debt_equity"] = fd.get("debt_equity")
            c["peg_ratio"] = fd.get("peg_ratio")

        top_20.sort(key=lambda x: x["blended_score"], reverse=True)
        top_10 = top_20[:10]

        _update_progress(job_id, "running", "Fetching actual post-date returns...", 80)

        # Stage 7: Fetch actual returns since backtest_date
        pick_tickers = [c["ticker"] for c in top_10]
        actual = _fetch_actual_returns(pick_tickers + ["SPY"], backtest_date)

        spy_return = actual.get("SPY", 0.0)

        _update_progress(job_id, "running", "Computing evaluation scores...", 90)

        picks = []
        for rank, c in enumerate(top_10, start=1):
            ticker = c["ticker"]
            scores = tech_scores.get(ticker, {})
            df = price_data.get(ticker)
            price_on_date = actual.get(f"{ticker}_price_then") or (float(df["close"].iloc[-1]) if df is not None else 0.0)
            price_now = actual.get(f"{ticker}_price_now", price_on_date)
            actual_return = actual.get(ticker, 0.0)

            picks.append({
                "predicted_rank": rank,
                "ticker": ticker,
                "company_name": c["company_name"],
                "sector": sector or TICKER_SECTOR.get(ticker),
                "blended_score": c["blended_score"],
                "avg_composite_score": c["avg_composite_score"],
                "fundamental_score": c["fundamental_score"],
                "times_in_top_picks": c["times_in_top_picks"],
                "price_on_date": price_on_date,
                "price_now": price_now,
                "actual_return_pct": actual_return,
                "was_correct": actual_return > 0,
                "beat_spy": actual_return > spy_return,
                "pe_ratio": c.get("pe_ratio"),
                "pb_ratio": c.get("pb_ratio"),
                "roe": c.get("roe"),
                "profit_margin": c.get("profit_margin"),
                "debt_equity": c.get("debt_equity"),
                "peg_ratio": c.get("peg_ratio"),
                "rsi_score": scores.get("rsi_score", 0.0),
                "macd_score": scores.get("macd_score", 0.0),
                "volume_score": scores.get("volume_score", 0.0),
                "bollinger_score": scores.get("bollinger_score", 0.0),
                "ma_score": scores.get("ma_score", 0.0),
            })

        accuracy = sum(1 for p in picks if p["was_correct"])
        avg_return = round(sum(p["actual_return_pct"] for p in picks) / len(picks), 2) if picks else 0.0
        alpha = round(avg_return - spy_return, 2)

        _backtest_progress[job_id] = {
            "status": "complete",
            "step": "Done",
            "pct": 100,
            "results": {
                "job_id": job_id,
                "backtest_date": backtest_date,
                "evaluated_on": date.today().strftime("%Y-%m-%d"),
                "sector": sector,
                "spy_return_pct": spy_return,
                "accuracy": accuracy,
                "avg_return_pct": avg_return,
                "alpha_pct": alpha,
                "picks": picks,
            },
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        _backtest_progress[job_id] = {"status": "failed", "step": str(e), "pct": 0}
