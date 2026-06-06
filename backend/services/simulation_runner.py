import uuid
import random
import json
from collections import defaultdict
from datetime import datetime
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from database import SessionLocal
from models import SimulationJob, SimulationResult
from data.universe import STOCK_UNIVERSE, COMPANY_NAMES, SECTORS, TICKER_SECTOR
from services.market_data import fetch_stock_data
from services.technical import compute_composite_score
from services.fundamental import score_fundamentals_for_candidates
from services.claude_ranker import claude_rank_and_explain

# Global job progress tracker for SSE
_job_progress: dict[str, dict] = {}


def create_job(db: Session, rounds: int = 100, sector: str = None) -> str:
    job_id = str(uuid.uuid4())
    job = SimulationJob(
        id=job_id,
        status="pending",
        rounds_total=rounds,
        rounds_complete=0,
        sector=sector,
    )
    db.add(job)
    db.commit()
    _job_progress[job_id] = {"rounds_complete": 0, "rounds_total": rounds, "status": "pending", "sector": sector}
    return job_id


def get_job_progress(job_id: str) -> dict:
    return _job_progress.get(job_id, {"rounds_complete": 0, "rounds_total": 100, "status": "unknown"})


async def run_simulation(job_id: str, rounds: int = 100, lookback_days: int = 60, sector: str = None):
    db = SessionLocal()
    try:
        _update_job(db, job_id, "running", 0)

        # Determine which tickers to use
        if sector and sector in SECTORS:
            universe = SECTORS[sector]
            print(f"[{job_id}] Sector: {sector} ({len(universe)} tickers)")
        else:
            universe = STOCK_UNIVERSE
            sector = None

        # Stage 1: Fetch price data for all tickers
        print(f"[{job_id}] Fetching price data for {len(universe)} tickers...")
        price_data = {}
        for ticker in universe:
            df = fetch_stock_data(ticker, period_days=lookback_days)
            if df is not None:
                price_data[ticker] = df

        valid_universe = list(price_data.keys())
        print(f"[{job_id}] Valid tickers: {len(valid_universe)}")

        # Stage 2: Compute 5-signal technical scores for each ticker
        tech_scores = {}
        for ticker, df in price_data.items():
            scores = compute_composite_score(df)
            if scores is not None:
                tech_scores[ticker] = scores

        # Stage 3: Run 100 simulation rounds with Gaussian noise to stress-test rankings
        frequency_counter: dict[str, int] = defaultdict(int)
        score_accumulator: dict[str, list] = defaultdict(list)

        for round_num in range(rounds):
            round_scores = {}
            for ticker, scores in tech_scores.items():
                noise = random.gauss(0, 2.5)
                round_scores[ticker] = min(100.0, max(0.0, scores["composite"] + noise))

            top_20 = sorted(round_scores.items(), key=lambda x: x[1], reverse=True)[:20]
            for ticker, score in top_20:
                frequency_counter[ticker] += 1
                score_accumulator[ticker].append(score)

            if (round_num + 1) % 5 == 0 or round_num == rounds - 1:
                _update_job(db, job_id, "running", round_num + 1)

        # Stage 4: Aggregate technical rankings → take top 20 candidates
        final_rankings = []
        for ticker, count in frequency_counter.items():
            avg_score = sum(score_accumulator[ticker]) / len(score_accumulator[ticker])
            final_rankings.append({
                "ticker": ticker,
                "company_name": COMPANY_NAMES.get(ticker, ticker),
                "times_in_top_picks": count,
                "avg_composite_score": round(avg_score, 2),
            })

        final_rankings.sort(
            key=lambda x: (x["times_in_top_picks"], x["avg_composite_score"]),
            reverse=True,
        )
        top_20_candidates = final_rankings[:20]

        # Stage 5: Fetch fundamental data for top 20 (Graham/Buffett/Lynch screening)
        print(f"[{job_id}] Fetching fundamental data for top 20 candidates...")
        fund_data = score_fundamentals_for_candidates(top_20_candidates, delay=0.8)

        # Stage 6: Blend technical (60%) + fundamental (40%) → re-rank to final top 10
        for candidate in top_20_candidates:
            ticker = candidate["ticker"]
            fd = fund_data.get(ticker, {})
            fund_score = fd.get("fundamental_score", 50.0)
            tech_score = candidate["avg_composite_score"]
            candidate["blended_score"] = round(0.60 * tech_score + 0.40 * fund_score, 2)
            candidate["fundamental_score"] = fund_score
            candidate["pe_ratio"] = fd.get("pe_ratio")
            candidate["pb_ratio"] = fd.get("pb_ratio")
            candidate["roe"] = fd.get("roe")
            candidate["profit_margin"] = fd.get("profit_margin")
            candidate["debt_equity"] = fd.get("debt_equity")
            candidate["peg_ratio"] = fd.get("peg_ratio")

        top_20_candidates.sort(key=lambda x: x["blended_score"], reverse=True)
        top_10 = top_20_candidates[:10]

        # Stage 7: Gemini AI reasoning for final top 10
        print(f"[{job_id}] Calling Gemini for top 10 AI analysis...")
        enriched = claude_rank_and_explain(top_10, tech_scores, price_data)

        # Stage 8: Persist results to database
        db.query(SimulationResult).filter(SimulationResult.job_id == job_id).delete()
        for rank, candidate in enumerate(enriched, start=1):
            ticker = candidate["ticker"]
            scores = tech_scores.get(ticker, {})
            df = price_data.get(ticker)
            price_history = []
            latest_price = 0.0
            if df is not None:
                price_history = [
                    {"date": str(d.date()), "close": round(float(c), 2)}
                    for d, c in zip(df.index, df["close"])
                ]
                latest_price = float(df["close"].iloc[-1])

            result = SimulationResult(
                job_id=job_id,
                ticker=ticker,
                company_name=candidate["company_name"],
                times_in_top_picks=candidate["times_in_top_picks"],
                avg_composite_score=candidate["avg_composite_score"],
                latest_price=latest_price,
                claude_reasoning=candidate.get("claude_reasoning", ""),
                claude_confidence=candidate.get("claude_confidence", "MEDIUM"),
                claude_risk=candidate.get("claude_risk", ""),
                price_history_json=json.dumps(price_history),
                rsi_score=scores.get("rsi_score", 0.0),
                macd_score=scores.get("macd_score", 0.0),
                momentum_score=scores.get("momentum_score", 0.0),
                volume_score=scores.get("volume_score", 0.0),
                bollinger_score=scores.get("bollinger_score", 0.0),
                ma_score=scores.get("ma_score", 0.0),
                fundamental_score=candidate.get("fundamental_score", 50.0),
                blended_score=candidate.get("blended_score", 0.0),
                pe_ratio=candidate.get("pe_ratio"),
                pb_ratio=candidate.get("pb_ratio"),
                roe=candidate.get("roe"),
                profit_margin=candidate.get("profit_margin"),
                debt_equity=candidate.get("debt_equity"),
                peg_ratio=candidate.get("peg_ratio"),
                sector=sector or TICKER_SECTOR.get(ticker),
                rank_position=rank,
            )
            db.add(result)

        _update_job(db, job_id, "complete", rounds)
        print(f"[{job_id}] Simulation complete.")

    except Exception as e:
        print(f"[{job_id}] Error: {e}")
        import traceback
        traceback.print_exc()
        _update_job(db, job_id, "failed", 0, str(e))
    finally:
        db.close()


def _update_job(db: Session, job_id: str, status: str, rounds_complete: int, error: str = None):
    job = db.query(SimulationJob).filter(SimulationJob.id == job_id).first()
    if job:
        job.status = status
        job.rounds_complete = rounds_complete
        if status in ("complete", "failed"):
            job.completed_at = datetime.utcnow()
        if error:
            job.error_message = error
        db.commit()

    _job_progress[job_id] = {
        "rounds_complete": rounds_complete,
        "rounds_total": job.rounds_total if job else 100,
        "status": status,
    }
