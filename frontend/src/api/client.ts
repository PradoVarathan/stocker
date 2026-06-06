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
