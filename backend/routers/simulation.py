import asyncio
import json
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import SimulationJob, SimulationResult
from schemas import SimulateRequest, SimulateStartResponse, SimulationResultsResponse, StockResult
from services.simulation_runner import create_job, run_simulation, get_job_progress

router = APIRouter()


@router.post("/run", response_model=SimulateStartResponse)
async def start_simulation(
    request: SimulateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    job_id = create_job(db, rounds=request.rounds, sector=request.sector)
    background_tasks.add_task(run_simulation, job_id, request.rounds, request.lookback_days, request.sector)
    sector_label = f" [{request.sector}]" if request.sector else ""
    return SimulateStartResponse(
        job_id=job_id,
        status="running",
        message=f"Simulation started with {request.rounds} rounds{sector_label}.",
    )


@router.get("/progress/{job_id}")
async def stream_progress(job_id: str):
    async def event_generator():
        while True:
            progress = get_job_progress(job_id)
            data = json.dumps(progress)
            yield f"data: {data}\n\n"

            if progress["status"] in ("complete", "failed"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/results/{job_id}", response_model=SimulationResultsResponse)
def get_results(job_id: str, db: Session = Depends(get_db)):
    job = db.query(SimulationJob).filter(SimulationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    results = (
        db.query(SimulationResult)
        .filter(SimulationResult.job_id == job_id)
        .order_by(SimulationResult.rank_position)
        .all()
    )

    top_stocks = []
    for r in results:
        try:
            price_history = json.loads(r.price_history_json or "[]")
        except Exception:
            price_history = []

        top_stocks.append(
            StockResult(
                ticker=r.ticker,
                company_name=r.company_name or r.ticker,
                rank_position=r.rank_position,
                times_in_top_picks=r.times_in_top_picks,
                avg_composite_score=r.avg_composite_score,
                latest_price=r.latest_price,
                claude_reasoning=r.claude_reasoning or "",
                claude_confidence=r.claude_confidence or "MEDIUM",
                claude_risk=r.claude_risk or "",
                price_history=price_history,
                rsi_score=r.rsi_score or 0.0,
                macd_score=r.macd_score or 0.0,
                momentum_score=r.momentum_score or 0.0,
                volume_score=r.volume_score or 0.0,
                bollinger_score=r.bollinger_score or 0.0,
                ma_score=r.ma_score or 0.0,
                fundamental_score=r.fundamental_score or 50.0,
                blended_score=r.blended_score or 0.0,
                pe_ratio=r.pe_ratio,
                pb_ratio=r.pb_ratio,
                roe=r.roe,
                profit_margin=r.profit_margin,
                debt_equity=r.debt_equity,
                peg_ratio=r.peg_ratio,
                sector=r.sector,
            )
        )

    return SimulationResultsResponse(
        job_id=job_id,
        status=job.status,
        rounds_complete=job.rounds_complete,
        rounds_total=job.rounds_total,
        sector=job.sector,
        top_stocks=top_stocks,
    )


@router.get("/latest")
def get_latest_job(db: Session = Depends(get_db)):
    job = (
        db.query(SimulationJob)
        .filter(SimulationJob.status == "complete")
        .order_by(SimulationJob.completed_at.desc())
        .first()
    )
    if not job:
        return {"job_id": None, "status": "none"}
    return {"job_id": job.id, "status": job.status, "completed_at": job.completed_at}
