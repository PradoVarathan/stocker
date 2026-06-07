"""
Strategy Optimizer: replays the technical algorithm across a date range at multiple
holding-period intervals (2w, 1m, 3m, 6m, 1y) to find which time frame performs best.

Key design decisions:
- Downloads all price history ONCE, then slices in memory (no repeated network calls)
- Pure technical scoring only (fundamental ratios not available historically)
- 10 MC rounds per window instead of 100 (speed; direction matters more than precision)
- Top 5 picks per window to keep results clean
- All returns compared against SPY as benchmark
"""

import asyncio
import random
from collections import defaultdict
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import yfinance as yf

from data.universe import STOCK_UNIVERSE
from services.technical import compute_composite_score

_optimizer_jobs: dict[str, dict] = {}

INTERVAL_DEFS = [
    {"key": "2w",  "label": "2 Weeks",   "days": 14},
    {"key": "1m",  "label": "1 Month",   "days": 30},
    {"key": "3m",  "label": "3 Months",  "days": 90},
    {"key": "6m",  "label": "6 Months",  "days": 180},
    {"key": "1y",  "label": "1 Year",    "days": 365},
]


def get_optimizer_progress(job_id: str) -> dict:
    return _optimizer_jobs.get(job_id, {"status": "unknown", "stage": "", "pct": 0})


def _set(job_id: str, status: str, stage: str, pct: int, detail: str = ""):
    _optimizer_jobs[job_id] = {"status": status, "stage": stage, "pct": pct, "detail": detail}


def _annualize(avg_return_pct: float, interval_days: int) -> float:
    r = avg_return_pct / 100
    try:
        return round(((1 + r) ** (365 / interval_days) - 1) * 100, 2)
    except Exception:
        return 0.0


def _download_bulk(tickers: list[str], start: str, end: str) -> dict[str, pd.DataFrame]:
    """Download all tickers in batches; returns {ticker: OHLCV DataFrame}."""
    result = {}
    batch_size = 60
    batches = [tickers[i:i + batch_size] for i in range(0, len(tickers), batch_size)]

    for batch in batches:
        try:
            raw = yf.download(
                batch, start=start, end=end,
                auto_adjust=True, progress=False, threads=True
            )
            if raw is None or raw.empty:
                continue

            if isinstance(raw.columns, pd.MultiIndex):
                for ticker in batch:
                    try:
                        t_df = pd.DataFrame({
                            "open":   raw["Open"][ticker],
                            "high":   raw["High"][ticker],
                            "low":    raw["Low"][ticker],
                            "close":  raw["Close"][ticker],
                            "volume": raw["Volume"][ticker],
                        }).dropna()
                        if len(t_df) > 30:
                            result[ticker] = t_df
                    except Exception:
                        pass
            else:
                # yfinance returned single-ticker format
                ticker = batch[0]
                cols = {c.lower(): c for c in raw.columns}
                if "close" in cols:
                    t_df = raw.rename(columns=str.lower)[["open", "high", "low", "close", "volume"]].dropna()
                    if len(t_df) > 30:
                        result[ticker] = t_df
        except Exception as e:
            print(f"Batch download error: {e}")

    return result


def _pick_return(all_data: dict, ticker: str, from_dt: datetime, to_dt: datetime) -> float | None:
    df = all_data.get(ticker)
    if df is None:
        return None
    period = df.loc[(df.index >= from_dt) & (df.index <= to_dt)]
    if len(period) < 2:
        return None
    p_start = float(period["close"].iloc[0])
    p_end   = float(period["close"].iloc[-1])
    if p_start <= 0:
        return None
    return (p_end - p_start) / p_start * 100


def _run_window(all_data: dict, valid_tickers: list[str],
                win_start: datetime, lookback_days: int, n_rounds: int) -> list[str]:
    """Score tickers up to win_start, return top-5 picks."""
    lookback_start = win_start - timedelta(days=lookback_days + 14)
    tech_scores = {}

    for ticker in valid_tickers:
        df = all_data[ticker]
        sl = df.loc[(df.index >= lookback_start) & (df.index < win_start)]
        if len(sl) < 20:
            continue
        scores = compute_composite_score(sl)
        if scores is not None:
            tech_scores[ticker] = scores

    if len(tech_scores) < 3:
        return []

    freq: dict[str, int] = defaultdict(int)
    score_acc: dict[str, list] = defaultdict(list)

    for _ in range(n_rounds):
        rnd = {t: min(100.0, max(0.0, s["composite"] + random.gauss(0, 2.5)))
               for t, s in tech_scores.items()}
        for t, sc in sorted(rnd.items(), key=lambda x: x[1], reverse=True)[:5]:
            freq[t] += 1
            score_acc[t].append(sc)

    return sorted(freq, key=lambda t: (freq[t], sum(score_acc[t]) / len(score_acc[t])), reverse=True)[:5]


async def run_optimizer(
    job_id: str,
    start_year: int = 2000,
    end_year: int = 2020,
    selected_intervals: list[str] | None = None,
    n_rounds: int = 10,
    lookback_days: int = 60,
):
    try:
        intervals = [i for i in INTERVAL_DEFS
                     if selected_intervals is None or i["key"] in selected_intervals]

        # --- Stage 1: bulk download (1 year before start for lookback buffer) ---
        dl_start = f"{start_year - 1}-01-01"
        dl_end   = f"{end_year}-12-31"
        tickers_to_dl = STOCK_UNIVERSE + ["SPY"]

        batches = [tickers_to_dl[i:i + 60] for i in range(0, len(tickers_to_dl), 60)]
        all_data: dict[str, pd.DataFrame] = {}

        for bi, batch in enumerate(batches):
            pct = 2 + int(bi / len(batches) * 22)
            _set(job_id, "running",
                 f"Downloading historical data — batch {bi + 1}/{len(batches)}", pct)
            try:
                chunk = _download_bulk(batch, dl_start, dl_end)
                all_data.update(chunk)
            except Exception as e:
                print(f"Batch {bi} error: {e}")
            await asyncio.sleep(0.2)

        valid_tickers = [t for t in STOCK_UNIVERSE if t in all_data]
        spy_data = all_data.get("SPY")
        print(f"[{job_id}] {len(valid_tickers)} tickers with data, SPY={'yes' if spy_data is not None else 'no'}")

        if not valid_tickers:
            _set(job_id, "failed", "No historical data available.", 0)
            return

        # --- Stage 2: run each interval ---
        interval_results = []
        n_int = len(intervals)

        for int_idx, interval in enumerate(intervals):
            int_days  = interval["days"]
            int_key   = interval["key"]
            int_label = interval["label"]

            base_pct = 25 + int(int_idx / n_int * 70)
            _set(job_id, "running", f"Backtesting {int_label} intervals ({start_year}–{end_year})...", base_pct)

            # Generate non-overlapping windows
            start_dt = datetime(start_year, 1, 1)
            end_dt   = datetime(end_year, 12, 31)
            windows: list[tuple[datetime, datetime]] = []
            cur = start_dt
            while cur + timedelta(days=int_days) <= end_dt:
                windows.append((cur, cur + timedelta(days=int_days)))
                cur += timedelta(days=int_days)

            portfolio_value = 10_000.0
            spy_value       = 10_000.0
            window_results  = []
            yearly_snap: dict[int, dict] = {}

            for wi, (win_start, win_end) in enumerate(windows):
                # Progress update every 15 windows
                if wi % 15 == 0:
                    wpct = base_pct + int(wi / len(windows) * (70 // n_int))
                    _set(job_id, "running",
                         f"{int_label}: {win_start.strftime('%Y-%m')} ({wi + 1}/{len(windows)})", wpct)

                picks = _run_window(all_data, valid_tickers, win_start, lookback_days, n_rounds)
                if not picks:
                    await asyncio.sleep(0)
                    continue

                # Actual returns for this period
                pick_returns = [r for t in picks if (r := _pick_return(all_data, t, win_start, win_end)) is not None]
                if not pick_returns:
                    await asyncio.sleep(0)
                    continue

                avg_ret  = sum(pick_returns) / len(pick_returns)
                accuracy = sum(1 for r in pick_returns if r > 0) / len(pick_returns) * 100

                spy_ret = _pick_return(all_data, "SPY", win_start, win_end) or 0.0

                portfolio_value *= 1 + avg_ret / 100
                spy_value       *= 1 + spy_ret / 100

                row = {
                    "date":            win_start.strftime("%Y-%m-%d"),
                    "year":            win_start.year,
                    "return_pct":      round(avg_ret, 3),
                    "spy_return_pct":  round(spy_ret, 3),
                    "alpha":           round(avg_ret - spy_ret, 3),
                    "accuracy":        round(accuracy, 1),
                    "portfolio_value": round(portfolio_value, 2),
                    "spy_value":       round(spy_value, 2),
                }
                window_results.append(row)
                yearly_snap[win_start.year] = {
                    "portfolio": round(portfolio_value, 2),
                    "spy":       round(spy_value, 2),
                }

                if wi % 5 == 0:
                    await asyncio.sleep(0)

            if not window_results:
                continue

            rets     = [w["return_pct"]     for w in window_results]
            spy_rets = [w["spy_return_pct"] for w in window_results]
            accs     = [w["accuracy"]       for w in window_results]

            avg_return  = round(sum(rets) / len(rets), 3)
            avg_spy_ret = round(sum(spy_rets) / len(spy_rets), 3)
            std_dev     = round(float(np.std(rets)), 3) if len(rets) > 1 else 0.0
            sharpe      = round(avg_return / std_dev, 3) if std_dev > 0 else 0.0
            ann_ret     = _annualize(avg_return, int_days)
            ann_spy     = _annualize(avg_spy_ret, int_days)

            # Build yearly chart series (one point per calendar year)
            yearly_series = [
                {"year": yr, "portfolio": snap["portfolio"], "spy": snap["spy"]}
                for yr, snap in sorted(yearly_snap.items())
            ]

            interval_results.append({
                "key":                  int_key,
                "label":                int_label,
                "interval_days":        int_days,
                "windows_tested":       len(window_results),
                "avg_return_pct":       avg_return,
                "avg_spy_return_pct":   avg_spy_ret,
                "avg_alpha_pct":        round(avg_return - avg_spy_ret, 3),
                "avg_accuracy_pct":     round(sum(accs) / len(accs), 1),
                "annualized_return_pct": ann_ret,
                "spy_annualized_pct":   ann_spy,
                "alpha_annualized_pct": round(ann_ret - ann_spy, 2),
                "std_dev":              std_dev,
                "sharpe":               sharpe,
                "portfolio_final":      round(portfolio_value, 2),
                "spy_final":            round(spy_value, 2),
                "yearly":               yearly_series,
                # Full timeline omitted from main result to keep payload small;
                # available via timeline endpoint if needed
            })

        best = max(interval_results, key=lambda x: x["alpha_annualized_pct"]) if interval_results else None

        _optimizer_jobs[job_id] = {
            "status":  "complete",
            "stage":   "Done",
            "pct":     100,
            "results": {
                "job_id":        job_id,
                "start_year":    start_year,
                "end_year":      end_year,
                "tickers_used":  len(valid_tickers),
                "best_interval": best["key"] if best else None,
                "intervals":     interval_results,
            },
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        _optimizer_jobs[job_id] = {"status": "failed", "stage": str(e), "pct": 0}
