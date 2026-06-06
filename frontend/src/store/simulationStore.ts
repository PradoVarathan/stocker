import { create } from "zustand";
import type { StockResult, SimulationProgress } from "../types";

interface SimulationState {
  jobId: string | null;
  status: "idle" | "running" | "complete" | "failed";
  progress: SimulationProgress;
  results: StockResult[];
  setJobId: (id: string) => void;
  setStatus: (s: SimulationState["status"]) => void;
  setProgress: (p: SimulationProgress) => void;
  setResults: (r: StockResult[]) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  jobId: null,
  status: "idle",
  progress: { rounds_complete: 0, rounds_total: 100, status: "idle" },
  results: [],
  setJobId: (id) => set({ jobId: id }),
  setStatus: (s) => set({ status: s }),
  setProgress: (p) => set({ progress: p }),
  setResults: (r) => set({ results: r }),
  reset: () =>
    set({
      jobId: null,
      status: "idle",
      progress: { rounds_complete: 0, rounds_total: 100, status: "idle" },
      results: [],
    }),
}));
