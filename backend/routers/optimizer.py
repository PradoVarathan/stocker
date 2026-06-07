import asyncio
import json
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.historical_backtest import (
    run_optimizer, get_optimizer_progress, _optimizer_jobs, INTERVAL_DEFS
)

router = APIRouter(prefix="/api/optimizer", tags=["optimizer"])


class OptimizerRequest(BaseModel):
    start_year: int = 2000
    end_year: int = 2020
    intervals: Optional[list[str]] = None   # e.g. ["2w","1m","3m","6m","1y"]
    n_rounds: int = 10
    lookback_days: int = 60


@router.post("/run")
async def start_optimizer(req: OptimizerRequest, background_tasks: BackgroundTasks):
    selected = req.intervals or [i["key"] for i in INTERVAL_DEFS]
    job_id = str(uuid.uuid4())
    _optimizer_jobs[job_id] = {"status": "pending", "stage": "Queued...", "pct": 0}

    background_tasks.add_task(
        run_optimizer,
        job_id=job_id,
        start_year=req.start_year,
        end_year=req.end_year,
        selected_intervals=selected,
        n_rounds=req.n_rounds,
        lookback_days=req.lookback_days,
    )
    return {"job_id": job_id, "start_year": req.start_year, "end_year": req.end_year}


@router.get("/progress/{job_id}")
async def optimizer_progress_sse(job_id: str):
    async def gen():
        while True:
            prog = get_optimizer_progress(job_id)
            yield f"data: {json.dumps(prog)}\n\n"
            if prog["status"] in ("complete", "failed"):
                break
            await asyncio.sleep(2)

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.get("/results/{job_id}")
async def get_optimizer_results(job_id: str):
    job = _optimizer_jobs.get(job_id, {})
    if job.get("status") != "complete":
        return {"status": job.get("status", "unknown"), "results": None}
    return {"status": "complete", "results": job.get("results")}
