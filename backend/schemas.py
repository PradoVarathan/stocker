from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SimulateRequest(BaseModel):
    rounds: int = 100
    lookback_days: int = 60
    sector: Optional[str] = None  # None = all sectors


class SimulateStartResponse(BaseModel):
    job_id: str
    status: str
    message: str


class StockResult(BaseModel):
    ticker: str
    company_name: str
    rank_position: int
    times_in_top_picks: int
    avg_composite_score: float
    latest_price: float
    claude_reasoning: str
    claude_confidence: str
    claude_risk: str
    price_history: list

    # Technical scores
    rsi_score: float
    macd_score: float
    momentum_score: float
    volume_score: float
    bollinger_score: float
    ma_score: float

    # Fundamental scores
    fundamental_score: float
    blended_score: float
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    roe: Optional[float] = None
    profit_margin: Optional[float] = None
    debt_equity: Optional[float] = None
    peg_ratio: Optional[float] = None
    sector: Optional[str] = None


class SimulationResultsResponse(BaseModel):
    job_id: str
    status: str
    rounds_complete: int
    rounds_total: int
    sector: Optional[str] = None
    top_stocks: list[StockResult]


class PortfolioAddRequest(BaseModel):
    ticker: str
    company_name: str = ""


class PortfolioStock(BaseModel):
    ticker: str
    company_name: str
    price_at_track: float
    tracked_since: datetime
    current_price: float
    pct_change_today: float
    pct_change_since_tracked: float
    sparkline: list[float]


class PortfolioResponse(BaseModel):
    stocks: list[PortfolioStock]


class FireRequest(BaseModel):
    current_age: int
    target_retirement_age: int
    current_income: float
    annual_expenses: float
    current_savings: float
    savings_rate_pct: float
    expected_return_pct: float
    roth_annual_contribution: float = 7000
    roth_current_balance: float = 0
    k401_annual_contribution: float = 23000
    k401_employer_match: float = 0
    k401_current_balance: float = 0


class YearRow(BaseModel):
    age: int
    portfolio: float
    roth: float
    k401: float
    total: float


class FireResponse(BaseModel):
    fire_number: float
    conservative_fire_number: float
    lean_fire_number: float
    years_to_fire: Optional[int]
    fire_age: Optional[int]
    is_fire_achievable: bool
    projected_total_at_retirement: float
    projected_portfolio_at_retirement: float
    projected_roth_at_retirement: float
    projected_401k_at_retirement: float
    monthly_income_in_retirement: float
    annual_safe_withdrawal: float
    year_by_year: list[YearRow]
