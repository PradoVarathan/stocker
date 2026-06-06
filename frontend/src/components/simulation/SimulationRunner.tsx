import { useRef, useState } from "react";
import { simulationApi } from "../../api/client";
import { useSimulationStore } from "../../store/simulationStore";
import { usePortfolioStore } from "../../store/portfolioStore";
import { Spinner } from "../shared/Spinner";
import { ResultsTable } from "./ResultsTable";

const SECTORS = [
  "Technology", "Software & Cloud", "Healthcare & Pharma", "Medical Devices",
  "Banks & Financials", "Insurance & Asset Mgmt", "Energy & Oil",
  "Consumer Discretionary", "Consumer Staples", "Industrials",
  "Communication & Media", "Real Estate", "Clean Energy", "Crypto & Fintech",
];

const SECTOR_ICONS: Record<string, string> = {
  "Technology": "💻", "Software & Cloud": "☁️", "Healthcare & Pharma": "💊",
  "Medical Devices": "🏥", "Banks & Financials": "🏦", "Insurance & Asset Mgmt": "🛡️",
  "Energy & Oil": "🛢️", "Consumer Discretionary": "🛍️", "Consumer Staples": "🧴",
  "Industrials": "⚙️", "Communication & Media": "📡", "Real Estate": "🏢",
  "Clean Energy": "🌱", "Crypto & Fintech": "🪙",
};

export function SimulationRunner() {
  const { status, progress, results, setJobId, setStatus, setProgress, setResults, reset } =
    useSimulationStore();
  const { addStock } = usePortfolioStore();
  const esRef = useRef<EventSource | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  async function startSimulation() {
    reset();
    setStatus("running");

    try {
      const res = await simulationApi.run(100, 60, selectedSector ?? undefined);
      const jobId = res.data.job_id;
      setJobId(jobId);

      const es = new EventSource(`/api/simulate/progress/${jobId}`);
      esRef.current = es;

      es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setProgress(data);
        if (data.status === "complete" || data.status === "failed") {
          es.close();
          if (data.status === "complete") {
            fetchResults(jobId);
          } else {
            setStatus("failed");
          }
        }
      };

      es.onerror = () => {
        es.close();
        setStatus("failed");
      };
    } catch {
      setStatus("failed");
    }
  }

  async function fetchResults(jobId: string) {
    try {
      const res = await simulationApi.getResults(jobId);
      setResults(res.data.top_stocks);
      setStatus("complete");
    } catch {
      setStatus("failed");
    }
  }

  const pct = progress.rounds_total > 0
    ? Math.round((progress.rounds_complete / progress.rounds_total) * 100)
    : 0;

  const activeLabel = selectedSector
    ? `${SECTOR_ICONS[selectedSector] ?? "📊"} ${selectedSector}`
    : "All Sectors";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Stock Simulation Engine</h1>
        <p className="text-slate-400 text-sm">
          100-round Monte Carlo simulation using 5 technical signals + Graham/Buffett/Lynch fundamental screening. Pick a sector or run across all 275 stocks.
        </p>
      </div>

      {/* Sector picker */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Select Sector
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSector(null)}
            disabled={status === "running"}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              selectedSector === null
                ? "bg-sky-600/20 border-sky-500/40 text-sky-300"
                : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
            }`}
          >
            📊 All Sectors
          </button>
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSector(s)}
              disabled={status === "running"}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                selectedSector === s
                  ? "bg-sky-600/20 border-sky-500/40 text-sky-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              {SECTOR_ICONS[s] ?? "📈"} {s}
            </button>
          ))}
        </div>
      </div>

      {/* Run button + status */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={startSimulation}
          disabled={status === "running"}
          className="px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          {status === "running" && <Spinner size="sm" />}
          {status === "running"
            ? `Running ${activeLabel}...`
            : `Run 100 Simulations — ${activeLabel}`}
        </button>
        {status === "complete" && (
          <span className="text-green-400 text-sm font-medium">
            Complete — {activeLabel}
          </span>
        )}
        {status === "failed" && (
          <span className="text-red-400 text-sm font-medium">Simulation failed — check backend</span>
        )}
      </div>

      {/* Progress bar */}
      {status === "running" && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>
              {progress.rounds_complete < progress.rounds_total
                ? `Rounds: ${progress.rounds_complete} / ${progress.rounds_total}`
                : "Fetching fundamentals (Graham/Buffett/Lynch)..."}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {progress.rounds_complete < progress.rounds_total
              ? "Fetching prices, computing RSI/MACD/Bollinger/MA/Volume signals, running 100 noisy rounds..."
              : "Screening top 20 candidates against fundamental ratios, then asking Gemini AI..."}
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <ResultsTable
          stocks={results}
          onTrack={(ticker, companyName) => addStock(ticker, companyName)}
        />
      )}
    </div>
  );
}
