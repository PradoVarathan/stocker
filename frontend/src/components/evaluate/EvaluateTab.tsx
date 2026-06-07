import { useRef, useState } from "react";
import { evaluateApi } from "../../api/client";
import type { BacktestResults, BacktestPick, BacktestProgress } from "../../types";
import { Spinner } from "../shared/Spinner";

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

function twoWeeksAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString().slice(0, 10);
}

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function ReturnBadge({ pct }: { pct: number }) {
  const pos = pct >= 0;
  return (
    <span className={`font-bold tabular-nums ${pos ? "text-green-400" : "text-red-400"}`}>
      {pos ? "+" : ""}{fmt(pct)}%
    </span>
  );
}

function ScoreCard({ results }: { results: BacktestResults }) {
  const { accuracy, avg_return_pct, spy_return_pct, alpha_pct, backtest_date, evaluated_on, sector } = results;
  const good = accuracy >= 7;
  const neutral = accuracy >= 5;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 mb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Backtest Period</div>
          <div className="text-white font-semibold">
            {backtest_date} → {evaluated_on}
            {sector && <span className="ml-2 text-sky-400">· {SECTOR_ICONS[sector]} {sector}</span>}
          </div>
        </div>
        <div className={`text-4xl font-black ${good ? "text-green-400" : neutral ? "text-amber-400" : "text-red-400"}`}>
          {accuracy}/10 correct
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox
          label="Accuracy"
          value={`${accuracy * 10}%`}
          sub="picks that went up"
          color={good ? "green" : neutral ? "amber" : "red"}
        />
        <StatBox
          label="Avg Return"
          value={`${avg_return_pct >= 0 ? "+" : ""}${fmt(avg_return_pct)}%`}
          sub="across all 10 picks"
          color={avg_return_pct >= 0 ? "green" : "red"}
        />
        <StatBox
          label="Market (SPY)"
          value={`${spy_return_pct >= 0 ? "+" : ""}${fmt(spy_return_pct)}%`}
          sub="S&P 500 benchmark"
          color="sky"
        />
        <StatBox
          label="Alpha"
          value={`${alpha_pct >= 0 ? "+" : ""}${fmt(alpha_pct)}%`}
          sub="vs market"
          color={alpha_pct >= 0 ? "green" : "red"}
        />
      </div>

      {/* Verdict */}
      <div className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium border ${
        good
          ? "bg-green-500/10 border-green-500/30 text-green-300"
          : neutral
          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
          : "bg-red-500/10 border-red-500/30 text-red-300"
      }`}>
        {good
          ? `Strong signal — the algorithm correctly predicted ${accuracy}/10 stocks and ${alpha_pct >= 0 ? "beat" : "matched"} the S&P 500 by ${fmt(Math.abs(alpha_pct))}% over this period.`
          : neutral
          ? `Mixed results — ${accuracy}/10 picks rose. The algorithm ${alpha_pct >= 0 ? "outperformed" : "underperformed"} SPY by ${fmt(Math.abs(alpha_pct))}%.`
          : `Weak period — only ${accuracy}/10 picks rose. Markets may have been driven by macro factors the technical signals couldn't capture.`
        }
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    green: "text-green-400", red: "text-red-400", amber: "text-amber-400", sky: "text-sky-400",
  };
  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colors[color] ?? "text-white"}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

function PickRow({ pick, spy_return }: { pick: BacktestPick; spy_return: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-slate-700/40 hover:bg-slate-700/20 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank */}
        <td className="px-4 py-3 text-slate-400 text-sm font-mono">#{pick.predicted_rank}</td>

        {/* Ticker */}
        <td className="px-4 py-3">
          <div className="font-bold text-white">{pick.ticker}</div>
          <div className="text-xs text-slate-500 truncate max-w-32">{pick.company_name}</div>
        </td>

        {/* Sector */}
        <td className="px-4 py-3 hidden md:table-cell">
          <span className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-full">
            {SECTOR_ICONS[pick.sector ?? ""] ?? "📊"} {pick.sector ?? "—"}
          </span>
        </td>

        {/* Blended score */}
        <td className="px-4 py-3 text-center">
          <span className="text-sky-300 font-semibold tabular-nums">{fmt(pick.blended_score)}</span>
        </td>

        {/* Price then */}
        <td className="px-4 py-3 text-right text-slate-300 tabular-nums text-sm">
          ${fmt(pick.price_on_date)}
        </td>

        {/* Price now */}
        <td className="px-4 py-3 text-right text-slate-300 tabular-nums text-sm">
          ${fmt(pick.price_now)}
        </td>

        {/* Actual return */}
        <td className="px-4 py-3 text-right">
          <ReturnBadge pct={pick.actual_return_pct} />
        </td>

        {/* Beat SPY */}
        <td className="px-4 py-3 text-center text-sm">
          {pick.beat_spy
            ? <span className="text-green-400 font-semibold">✓ Yes</span>
            : <span className="text-red-400 font-semibold">✗ No</span>}
        </td>

        {/* Correct */}
        <td className="px-4 py-3 text-center text-xl">
          {pick.was_correct ? "✅" : "❌"}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-slate-700/40 bg-slate-800/30">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
              <MiniStat label="MACD" value={fmt(pick.macd_score)} />
              <MiniStat label="RSI" value={fmt(pick.rsi_score)} />
              <MiniStat label="Volume" value={fmt(pick.volume_score)} />
              <MiniStat label="MA Cross" value={fmt(pick.ma_score)} />
              <MiniStat label="Bollinger" value={fmt(pick.bollinger_score)} />
              <MiniStat label="Fundamental" value={fmt(pick.fundamental_score)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {pick.pe_ratio != null && <FundBadge label={`P/E ${fmt(pick.pe_ratio, 1)}`} pass={pick.pe_ratio <= 15} />}
              {pick.pb_ratio != null && <FundBadge label={`P/B ${fmt(pick.pb_ratio, 1)}`} pass={pick.pb_ratio <= 1.5} />}
              {pick.roe != null && <FundBadge label={`ROE ${fmt(pick.roe * 100, 0)}%`} pass={pick.roe >= 0.15} />}
              {pick.profit_margin != null && <FundBadge label={`Margin ${fmt(pick.profit_margin * 100, 0)}%`} pass={pick.profit_margin >= 0.10} />}
              {pick.debt_equity != null && <FundBadge label={`D/E ${fmt(pick.debt_equity, 1)}`} pass={pick.debt_equity <= 0.5} />}
              {pick.peg_ratio != null && <FundBadge label={`PEG ${fmt(pick.peg_ratio, 2)}`} pass={pick.peg_ratio <= 1.0} />}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/60 rounded-lg px-3 py-2 text-center">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-sky-300 font-semibold text-sm">{value}</div>
    </div>
  );
}

function FundBadge({ label, pass }: { label: string; pass: boolean }) {
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
      pass
        ? "bg-green-500/10 text-green-400 border-green-500/30"
        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
    }`}>
      {label} {pass ? "✓" : "▲"}
    </span>
  );
}

export function EvaluateTab() {
  const [backtestDate, setBacktestDate] = useState(twoWeeksAgo());
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [progress, setProgress] = useState<BacktestProgress>({ status: "idle", step: "", pct: 0 });
  const [results, setResults] = useState<BacktestResults | null>(null);
  const esRef = useRef<EventSource | null>(null);

  async function startBacktest() {
    setStatus("running");
    setResults(null);
    setProgress({ status: "running", step: "Starting...", pct: 0 });

    try {
      const res = await evaluateApi.run(backtestDate, selectedSector ?? undefined);
      const { job_id } = res.data;

      const es = new EventSource(`/api/evaluate/progress/${job_id}`);
      esRef.current = es;

      es.onmessage = (e) => {
        const data: BacktestProgress = JSON.parse(e.data);
        setProgress(data);
        if (data.status === "complete" || data.status === "failed") {
          es.close();
          if (data.status === "complete") {
            fetchResults(job_id);
          } else {
            setStatus("failed");
          }
        }
      };

      es.onerror = () => { es.close(); setStatus("failed"); };
    } catch {
      setStatus("failed");
    }
  }

  async function fetchResults(jobId: string) {
    try {
      const res = await evaluateApi.getResults(jobId);
      if (res.data.results) {
        setResults(res.data.results);
        setStatus("complete");
      } else {
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
    }
  }

  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Backtest Evaluator</h1>
        <p className="text-slate-400 text-sm">
          Pick a past date, replay the simulation using only data available on that day,
          then see what actually happened. Scored against the S&P 500.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap gap-6 items-end">
          {/* Date picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Predict As Of
            </label>
            <input
              type="date"
              value={backtestDate}
              max={maxDate}
              onChange={(e) => setBacktestDate(e.target.value)}
              disabled={status === "running"}
              className="bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">Algorithm uses only data up to this date</p>
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Quick Select
            </label>
            <div className="flex gap-2">
              {[
                { label: "1 wk ago", days: 7 },
                { label: "2 wks ago", days: 14 },
                { label: "1 mo ago", days: 30 },
                { label: "3 mo ago", days: 90 },
              ].map(({ label, days }) => {
                const d = new Date();
                d.setDate(d.getDate() - days);
                const val = d.toISOString().slice(0, 10);
                return (
                  <button
                    key={days}
                    onClick={() => setBacktestDate(val)}
                    disabled={status === "running"}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                      ${backtestDate === val
                        ? "bg-sky-600/20 border-sky-500/40 text-sky-300"
                        : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white"
                      } disabled:opacity-50`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sector filter */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Sector (optional)
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSector(null)}
              disabled={status === "running"}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
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

        {/* Run button */}
        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={startBacktest}
            disabled={status === "running"}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {status === "running" && <Spinner size="sm" />}
            {status === "running" ? "Running backtest..." : `▶ Run Backtest — ${backtestDate}`}
          </button>
          {status === "complete" && <span className="text-green-400 text-sm font-medium">✓ Evaluation complete</span>}
          {status === "failed" && <span className="text-red-400 text-sm font-medium">✗ Backtest failed — check backend</span>}
        </div>
      </div>

      {/* Progress bar */}
      {status === "running" && (
        <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>{progress.step || "Initialising..."}</span>
            <span>{progress.pct}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Replaying algorithm using only data from {backtestDate} and earlier...
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          <ScoreCard results={results} />

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Pick-by-Pick Results — click any row to expand signals
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Stock</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Sector</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-right">Price Then</th>
                  <th className="px-4 py-3 text-right">Price Now</th>
                  <th className="px-4 py-3 text-right">Return</th>
                  <th className="px-4 py-3 text-center">Beat SPY</th>
                  <th className="px-4 py-3 text-center">Correct</th>
                </tr>
              </thead>
              <tbody>
                {results.picks.map((pick) => (
                  <PickRow key={pick.ticker} pick={pick} spy_return={results.spy_return_pct} />
                ))}
              </tbody>
            </table>
          </div>

          {/* SPY comparison bar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <div className="text-sm font-semibold text-white mb-4">Returns vs S&P 500</div>
            <div className="space-y-2">
              {/* SPY row */}
              <div className="flex items-center gap-3">
                <div className="w-24 text-xs text-slate-400 font-medium shrink-0">SPY (benchmark)</div>
                <div className="flex-1 bg-slate-700 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-2 text-xs font-bold ${
                      results.spy_return_pct >= 0 ? "bg-sky-600" : "bg-slate-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.abs(results.spy_return_pct) * 5 + 5)}%` }}
                  >
                    {results.spy_return_pct >= 0 ? "+" : ""}{fmt(results.spy_return_pct)}%
                  </div>
                </div>
              </div>
              {/* Each pick */}
              {results.picks.map((pick) => (
                <div key={pick.ticker} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-slate-400 font-mono shrink-0">{pick.ticker}</div>
                  <div className="flex-1 bg-slate-700 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full flex items-center justify-end pr-2 text-xs font-bold ${
                        pick.actual_return_pct >= 0 ? "bg-green-600" : "bg-red-600/80"
                      }`}
                      style={{ width: `${Math.min(100, Math.abs(pick.actual_return_pct) * 5 + 5)}%` }}
                    >
                      {pick.actual_return_pct >= 0 ? "+" : ""}{fmt(pick.actual_return_pct)}%
                    </div>
                  </div>
                  <div className="text-xs w-8 text-center">
                    {pick.beat_spy ? "✅" : "❌"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
