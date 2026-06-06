import { create } from "zustand";
import type { FireRequest, FireResponse } from "../types";
import { fireApi } from "../api/client";

interface FireState {
  inputs: FireRequest;
  result: FireResponse | null;
  loading: boolean;
  setInput: <K extends keyof FireRequest>(key: K, value: FireRequest[K]) => void;
  calculate: () => Promise<void>;
}

const defaultInputs: FireRequest = {
  current_age: 30,
  target_retirement_age: 55,
  current_income: 120000,
  annual_expenses: 72000,
  current_savings: 45000,
  savings_rate_pct: 20,
  expected_return_pct: 7,
  roth_annual_contribution: 7000,
  roth_current_balance: 15000,
  k401_annual_contribution: 23000,
  k401_employer_match: 5000,
  k401_current_balance: 80000,
};

export const useFireStore = create<FireState>((set, get) => ({
  inputs: defaultInputs,
  result: null,
  loading: false,

  setInput: (key, value) =>
    set((state) => ({ inputs: { ...state.inputs, [key]: value } })),

  calculate: async () => {
    set({ loading: true });
    try {
      const res = await fireApi.calculate(get().inputs);
      set({ result: res.data });
    } finally {
      set({ loading: false });
    }
  },
}));
