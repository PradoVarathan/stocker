from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from database import Base


class SimulationJob(Base):
    __tablename__ = "simulation_jobs"

    id = Column(String(36), primary_key=True)
    status = Column(String(20), default="pending")
    rounds_total = Column(Integer, default=100)
    rounds_complete = Column(Integer, default=0)
    sector = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(36), ForeignKey("simulation_jobs.id"), nullable=False)
    ticker = Column(String(10), nullable=False)
    company_name = Column(String(100), default="")
    times_in_top_picks = Column(Integer, default=0)
    avg_composite_score = Column(Float, default=0.0)
    latest_price = Column(Float, default=0.0)
    claude_reasoning = Column(Text, default="")
    claude_confidence = Column(String(10), default="MEDIUM")
    claude_risk = Column(Text, default="")
    price_history_json = Column(Text, default="[]")

    # Technical scores
    rsi_score = Column(Float, default=0.0)
    macd_score = Column(Float, default=0.0)
    momentum_score = Column(Float, default=0.0)
    volume_score = Column(Float, default=0.0)
    bollinger_score = Column(Float, default=0.0)
    ma_score = Column(Float, default=0.0)

    # Fundamental scores (Graham/Buffett/Lynch)
    fundamental_score = Column(Float, default=50.0)
    blended_score = Column(Float, default=0.0)
    pe_ratio = Column(Float, nullable=True)
    pb_ratio = Column(Float, nullable=True)
    roe = Column(Float, nullable=True)
    profit_margin = Column(Float, nullable=True)
    debt_equity = Column(Float, nullable=True)
    peg_ratio = Column(Float, nullable=True)

    rank_position = Column(Integer, default=0)
    sector = Column(String(50), nullable=True)


class Portfolio(Base):
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(10), unique=True, nullable=False)
    company_name = Column(String(100), default="")
    price_at_track = Column(Float, default=0.0)
    tracked_since = Column(DateTime, server_default=func.now())
