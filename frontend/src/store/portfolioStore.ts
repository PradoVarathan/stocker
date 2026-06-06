import { create } from "zustand";
import type { PortfolioStock } from "../types";
import { portfolioApi } from "../api/client";

interface PortfolioState {
  stocks: PortfolioStock[];
  loading: boolean;
  fetch: () => Promise<void>;
  addStock: (ticker: string, companyName: string) => Promise<void>;
  removeStock: (ticker: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  stocks: [],
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const res = await portfolioApi.get();
      set({ stocks: res.data.stocks });
    } finally {
      set({ loading: false });
    }
  },

  addStock: async (ticker, companyName) => {
    await portfolioApi.add(ticker, companyName);
    await get().fetch();
  },

  removeStock: async (ticker) => {
    await portfolioApi.remove(ticker);
    set((state) => ({
      stocks: state.stocks.filter((s) => s.ticker !== ticker),
    }));
  },
}));
