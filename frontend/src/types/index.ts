export interface StockResult {
  ticker: string;
  company_name: string;
  rank_position: number;
  times_in_top_picks: number;
  avg_composite_score: number;
  latest_price: number;
  claude_reasoning: string;
  claude_confidence: "HIGH" | "MEDIUM" | "LOW";
  claude_risk: string;
  price_history: { date: string; close: number }[];

  // Technical scores
  rsi_score: number;
  macd_score: number;
  momentum_score: number;
  volume_score: number;
  bollinger_score: number;
  ma_score: number;

  // Fundamental scores
  fundamental_score: number;
  blended_score: number;
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe: number | null;
  profit_margin: number | null;
  debt_equity: number | null;
  peg_ratio: number | null;
  sector: string | null;
}

export interface SimulationResultsResponse {
  job_id: string;
  status: string;
  rounds_complete: number;
  rounds_total: number;
  sector: string | null;
  top_stocks: StockResult[];
}

export interface SimulationProgress {
  rounds_complete: number;
  rounds_total: number;
  status: string;
}

export interface PortfolioStock {
  ticker: string;
  company_name: string;
  price_at_track: number;
  tracked_since: string;
  current_price: number;
  pct_change_today: number;
  pct_change_since_tracked: number;
  sparkline: number[];
}

export interface FireRequest {
  current_age: number;
  target_retirement_age: number;
  current_income: number;
  annual_expenses: number;
  current_savings: number;
  savings_rate_pct: number;
  expected_return_pct: number;
  roth_annual_contribution: number;
  roth_current_balance: number;
  k401_annual_contribution: number;
  k401_employer_match: number;
  k401_current_balance: number;
}

export interface YearRow {
  age: number;
  portfolio: number;
  roth: number;
  k401: number;
  total: number;
}

export interface FireResponse {
  fire_number: number;
  conservative_fire_number: number;
  lean_fire_number: number;
  years_to_fire: number | null;
  fire_age: number | null;
  is_fire_achievable: boolean;
  projected_total_at_retirement: number;
  projected_portfolio_at_retirement: number;
  projected_roth_at_retirement: number;
  projected_401k_at_retirement: number;
  monthly_income_in_retirement: number;
  annual_safe_withdrawal: number;
  year_by_year: YearRow[];
}
