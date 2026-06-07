import axios from "axios";
import type {
  SimulationResultsResponse,
  PortfolioStock,
  FireRequest,
  FireResponse,
} from "../types";

const api = axios.create({ baseURL: "/api" });

export const simulationApi = {
  run: (rounds = 100, lookback_days = 60, sector?: string) =>
    api.post<{ job_id: string; status: string; message: string }>("/simulate/run", {
      rounds,
      lookback_days,
      sector: sector || null,
    }),

  getResults: (jobId: string) =>
    api.get<SimulationResultsResponse>(`/simulate/results/${jobId}`),

  getLatest: () =>
    api.get<{ job_id: string | null; status: string }>("/simulate/latest"),
};

export const portfolioApi = {
  get: () =>
    api.get<{ stocks: PortfolioStock[] }>("/portfolio"),

  add: (ticker: string, company_name = "") =>
    api.post("/portfolio", { ticker, company_name }),

  remove: (ticker: string) =>
    api.delete(`/portfolio/${ticker}`),
};

export const fireApi = {
  calculate: (data: FireRequest) =>
    api.post<FireResponse>("/fire/calculate", data),
};

export const optimizerApi = {
  run: (start_year: number, end_year: number, intervals: string[], n_rounds = 10) =>
    api.post<{ job_id: string; start_year: number; end_year: number }>("/optimizer/run", {
      start_year, end_year, intervals, n_rounds,
    }),

  getResults: (jobId: string) =>
    api.get<{ status: string; results: import("../types").OptimizerResults | null }>(
      `/optimizer/results/${jobId}`
    ),
};

export const evaluateApi = {
  run: (backtest_date: string, sector?: string, rounds = 100) =>
    api.post<{ job_id: string; backtest_date: string }>("/evaluate/run", {
      backtest_date,
      sector: sector || null,
      rounds,
    }),

  getResults: (jobId: string) =>
    api.get<{ status: string; results: import("../types").BacktestResults | null }>(
      `/evaluate/results/${jobId}`
    ),
};
