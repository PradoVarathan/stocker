import asyncio
import json
import uuid
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.backtest_runner import run_backtest, get_backtest_progress, _backtest_progress

router = APIRouter(prefix="/api/evaluate", tags=["evaluate"])


class BacktestRequest(BaseModel):
    backtest_date: str          # "YYYY-MM-DD"
    sector: Optional[str] = None
    rounds: int = 100
    lookback_days: int = 60


@router.post("/run")
async def start_backtest(req: BacktestRequest, background_tasks: BackgroundTasks):
    # Default to 2 weeks ago if date looks invalid
    try:
        date.fromisoformat(req.backtest_date)
    except ValueError:
        req.backtest_date = (date.today() - timedelta(weeks=2)).strftime("%Y-%m-%d")

    job_id = str(uuid.uuid4())
    _backtest_progress[job_id] = {"status": "pending", "step": "Starting...", "pct": 0}

    background_tasks.add_task(
        run_backtest,
        job_id=job_id,
        backtest_date=req.backtest_date,
        rounds=req.rounds,
        lookback_days=req.lookback_days,
        sector=req.sector,
    )
    return {"job_id": job_id, "backtest_date": req.backtest_date}


@router.get("/progress/{job_id}")
async def backtest_progress_sse(job_id: str):
    async def generator():
        while True:
            prog = get_backtest_progress(job_id)
            yield f"data: {json.dumps(prog)}\n\n"
            if prog["status"] in ("complete", "failed"):
                break
            await asyncio.sleep(1.5)

    return StreamingResponse(generator(), media_type="text/event-stream")


@router.get("/results/{job_id}")
async def get_backtest_results(job_id: str):
    prog = _backtest_progress.get(job_id, {})
    if prog.get("status") != "complete":
        return {"status": prog.get("status", "unknown"), "results": None}
    return {"status": "complete", "results": prog.get("results")}
