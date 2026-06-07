import { useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import { optimizerApi } from "../../api/client";
import type { OptimizerResults, IntervalResult, OptimizerProgress } from "../../types";
import { Spinner } from "../shared/Spinner";

const ALL_INTERVALS = [
  { key: "2w", label: "2 Weeks",   days: 14 },
  { key: "1m", label: "1 Month",   days: 30 },
  { key: "3m", label: "3 Months",  days: 90 },
  { key: "6m", label: "6 Months",  days: 180 },
  { key: "1y", label: "1 Year",    days: 365 },
];

// Distinct colours per interval
const COLORS: Record<string, string> = {
  "2w": "#38bdf8",   // sky
  "1m": "#a78bfa",   // violet
  "3m": "#34d399",   // emerald
  "6m": "#fb923c",   // orange
  "1y": "#f472b6",   // pink
  "SPY": "#64748b",  // slate
};

function fmt(n: number, dp = 2) { return n.toFixed(dp); }
function fmtDollar(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ── Merged chart data: one row per year, columns per interval + SPY ──────────
function buildChartData(intervals: IntervalResult[]) {
  const yearSet = new Set<number>();
  intervals.forEach(iv => iv.yearly.forEach(y => yearSet.add(y.year)));
  const years = Array.from(yearSet).sort();

  return years.map(yr => {
    const row: Record<string, number | string> = { year: yr };
    let spyAdded = false;
    intervals.forEach(iv => {
      const point = iv.yearly.find(y => y.year === yr);
      if (point) {
        row[iv.key] = point.portfolio;
        if (!spyAdded) { row["SPY"] = point.spy; spyAdded = true; }
      }
    });
    return row;
  });
}

// ── Accuracy bar chart data ───────────────────────────────────────────────────
function buildAccuracyData(intervals: IntervalResult[]) {
  return intervals.map(iv => ({
    label: iv.label,
    accuracy: iv.avg_accuracy_pct,
    key: iv.key,
  }));
}

// ── Summary table row ─────────────────────────────────────────────────────────
function SummaryRow({ iv, isBest }: { iv: IntervalResult; isBest: boolean }) {
  const alphaPos = iv.alpha_annualized_pct >= 0;
  return (
    <tr className={`border-b border-slate-700/40 transition-colors ${
      isBest ? "bg-sky-950/40" : "hover:bg-slate-700/20"
    }`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: COLORS[iv.key] }} />
          <span className="font-semibold text-white">{iv.label}</span>
          {isBest && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full
                             bg-sky-500/20 text-sky-300 border border-sky-500/30">
              BEST
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center text-slate-400 tabular-nums">{iv.windows_tested}</td>
      <td className="px-4 py-3 text-center font-semibold tabular-nums">
        <span className={iv.avg_accuracy_pct >= 55 ? "text-green-400" : iv.avg_accuracy_pct >= 45 ? "text-amber-400" : "text-red-400"}>
          {fmt(iv.avg_accuracy_pct, 1)}%
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <span className={iv.annualized_return_pct >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
          {iv.annualized_return_pct >= 0 ? "+" : ""}{fmt(iv.annualized_return_pct)}%
        </span>
      </td>
      <td className="px-4 py-3 text-right text-slate-400 tabular-nums">
        {iv.spy_annualized_pct >= 0 ? "+" : ""}{fmt(iv.spy_annualized_pct)}%
      </td>
      <td className="px-4 py-3 text-right font-bold tabular-nums">
        <span className={alphaPos ? "text-sky-400" : "text-red-400"}>
          {alphaPos ? "+" : ""}{fmt(iv.alpha_annualized_pct)}%
        </span>
      </td>
      <td className="px-4 py-3 text-center text-slate-400 tabular-nums">{fmt(iv.sharpe, 3)}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        <div className={iv.portfolio_final >= 10_000 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
          {fmtDollar(iv.portfolio_final)}
        </div>
        <div className="text-xs text-slate-500">vs {fmtDollar(iv.spy_final)} SPY</div>
      </td>
    </tr>
  );
}

// ── Custom tooltip for cumulative chart ───────────────────────────────────────
function CumulativeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <div className="font-bold text-white mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.dataKey.toUpperCase()}</span>
          <span className="text-white font-semibold">{fmtDollar(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function OptimizerTab() {
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>(
    ALL_INTERVALS.map(i => i.key)
  );
  const [startYear, setStartYear] = useState(2000);
  const [endYear, setEndYear]     = useState(2020);
  const [status, setStatus]       = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [progress, setProgress]   = useState<OptimizerProgress>({ status: "idle", stage: "", pct: 0 });
  const [results, setResults]     = useState<OptimizerResults | null>(null);
  const esRef = useRef<EventSource | null>(null);

  function toggleInterval(key: string) {
    setSelectedIntervals(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function startOptimizer() {
    if (!selectedIntervals.length) return;
    setStatus("running");
    setResults(null);
    setProgress({ status: "running", stage: "Starting...", pct: 0 });

    try {
      const res = await optimizerApi.run(startYear, endYear, selectedIntervals, 10);
      const { job_id } = res.data;

      esRef.current?.close();
      const es = new EventSource(`/api/optimizer/progress/${job_id}`);
      esRef.current = es;

      es.onmessage = (e) => {
        const data: OptimizerProgress = JSON.parse(e.data);
        setProgress(data);
        if (data.status === "complete" || data.status === "failed") {
          es.close();
          if (data.status === "complete") fetchResults(job_id);
          else setStatus("failed");
        }
      };

      es.onerror = () => { es.close(); setStatus("failed"); };
    } catch {
      setStatus("failed");
    }
  }

  async function fetchResults(jobId: string) {
    try {
      const res = await optimizerApi.getResults(jobId);
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

  const chartData = results ? buildChartData(results.intervals) : [];
  const accData   = results ? buildAccuracyData(results.intervals) : [];
  const bestKey   = results?.best_interval;

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Strategy Optimizer</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Replay the technical algorithm at every window from {startYear}–{endYear} across
          multiple holding periods. Finds which rebalancing frequency (2 weeks → 1 year) generated
          the highest returns, accuracy, and alpha vs the S&P 500.
        </p>
        <div className="mt-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 inline-block">
          ⚠ Pure technical signals only — historical fundamental data not available via yfinance free tier
        </div>
      </div>

      {/* Config panel */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">

        {/* Year range */}
        <div className="flex flex-wrap gap-6 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">From Year</label>
            <select
              value={startYear}
              onChange={e => setStartYear(Number(e.target.value))}
              disabled={status === "running"}
              className="bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-sky-500 disabled:opacity-50"
            >
              {[2000,2005,2010].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">To Year</label>
            <select
              value={endYear}
              onChange={e => setEndYear(Number(e.target.value))}
              disabled={status === "running"}
              className="bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-sky-500 disabled:opacity-50"
            >
              {[2010,2015,2020,2024].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="self-end text-xs text-slate-500">
            ~{Math.round(
              selectedIntervals.reduce((sum, k) => {
                const iv = ALL_INTERVALS.find(i => i.key === k);
                return sum + (iv ? Math.floor((endYear - startYear) * 365 / iv.days) : 0);
              }, 0) * 0.4 / 60
            )} min estimate
          </div>
        </div>

        {/* Interval toggles */}
        <div className="mb-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Holding Periods to Test
          </div>
          <div className="flex flex-wrap gap-3">
            {ALL_INTERVALS.map(iv => {
              const on = selectedIntervals.includes(iv.key);
              return (
                <button
                  key={iv.key}
                  onClick={() => toggleInterval(iv.key)}
                  disabled={status === "running"}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all
                    disabled:opacity-50 ${on
                      ? "border-transparent text-white"
                      : "border-slate-600 text-slate-400 hover:border-slate-400"
                    }`}
                  style={on ? { background: COLORS[iv.key] + "33", borderColor: COLORS[iv.key] + "88", color: COLORS[iv.key] } : {}}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: on ? COLORS[iv.key] : "#475569" }}
                  />
                  {iv.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Run button */}
        <div className="flex items-center gap-4">
          <button
            onClick={startOptimizer}
            disabled={status === "running" || !selectedIntervals.length}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50
                       disabled:cursor-not-allowed text-white font-semibold rounded-lg
                       transition-colors flex items-center gap-2"
          >
            {status === "running" && <Spinner size="sm" />}
            {status === "running"
              ? "Optimizer running..."
              : `▶ Run Optimizer — ${startYear}–${endYear}`}
          </button>
          {status === "complete" && (
            <span className="text-green-400 text-sm font-medium">
              ✓ Done — {results?.tickers_used} stocks, {results?.intervals.reduce((s, i) => s + i.windows_tested, 0)} total windows
            </span>
          )}
          {status === "failed" && (
            <span className="text-red-400 text-sm font-medium">✗ Failed — check backend logs</span>
          )}
        </div>
      </div>

      {/* Progress */}
      {status === "running" && (
        <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>{progress.stage || "Initialising..."}</span>
            <span>{progress.pct}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-700"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            This takes 8–12 minutes — downloading 20 years of history once, then running
            the algorithm on every window in memory. Progress updates every 30 seconds.
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Winner banner */}
          {bestKey && (() => {
            const best = results.intervals.find(i => i.key === bestKey)!;
            return (
              <div className="mb-8 rounded-2xl p-6 border"
                   style={{ background: COLORS[bestKey] + "1a", borderColor: COLORS[bestKey] + "55" }}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest mb-1"
                         style={{ color: COLORS[bestKey] }}>
                      🏆 Best Holding Period ({results.start_year}–{results.end_year})
                    </div>
                    <div className="text-2xl font-black text-white">{best.label}</div>
                    <div className="text-slate-400 text-sm mt-1">
                      {best.windows_tested} trading windows · {best.avg_accuracy_pct.toFixed(1)}% picks went up
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Annualised Return</div>
                      <div className="text-2xl font-bold text-green-400">
                        +{fmt(best.annualized_return_pct)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Alpha vs SPY</div>
                      <div className="text-2xl font-bold" style={{ color: COLORS[bestKey] }}>
                        +{fmt(best.alpha_annualized_pct)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">$10k grew to</div>
                      <div className="text-2xl font-bold text-white">
                        {fmtDollar(best.portfolio_final)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Summary table */}
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Side-by-Side Comparison
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden mb-10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Interval</th>
                  <th className="px-4 py-3 text-center">Windows</th>
                  <th className="px-4 py-3 text-center">Accuracy</th>
                  <th className="px-4 py-3 text-right">Annualised Return</th>
                  <th className="px-4 py-3 text-right">SPY Return</th>
                  <th className="px-4 py-3 text-right">Alpha</th>
                  <th className="px-4 py-3 text-center">Sharpe</th>
                  <th className="px-4 py-3 text-right">$10k Final</th>
                </tr>
              </thead>
              <tbody>
                {results.intervals
                  .sort((a, b) => b.alpha_annualized_pct - a.alpha_annualized_pct)
                  .map(iv => (
                    <SummaryRow key={iv.key} iv={iv} isBest={iv.key === bestKey} />
                  ))}
              </tbody>
            </table>
          </div>

          {/* Cumulative portfolio growth chart */}
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            $10,000 Portfolio Growth — {results.start_year} → {results.end_year}
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-10">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis
                  tickFormatter={v => fmtDollar(v)}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  width={80}
                />
                <Tooltip content={<CumulativeTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={(value) => {
                    if (value === "SPY") return "SPY (benchmark)";
                    const iv = ALL_INTERVALS.find(i => i.key === value);
                    return iv ? iv.label : value;
                  }}
                />
                <ReferenceLine y={10000} stroke="#475569" strokeDasharray="4 4" />

                {/* SPY line first (background) */}
                <Line
                  dataKey="SPY"
                  stroke={COLORS["SPY"]}
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls
                />

                {results.intervals.map(iv => (
                  <Line
                    key={iv.key}
                    dataKey={iv.key}
                    stroke={COLORS[iv.key]}
                    strokeWidth={iv.key === bestKey ? 2.5 : 1.5}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy bar chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
                Avg Pick Accuracy by Interval
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={accData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "Accuracy"]}
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                  />
                  <ReferenceLine y={50} stroke="#475569" strokeDasharray="4 4" label={{ value: "50% (coin flip)", fill: "#64748b", fontSize: 10 }} />
                  <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                    {accData.map(d => (
                      <Cell key={d.key} fill={COLORS[d.key] ?? "#64748b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
                Annualised Alpha vs SPY
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={results.intervals.map(iv => ({
                    label: iv.label,
                    key: iv.key,
                    alpha: iv.alpha_annualized_pct,
                  }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(2)}%`, "Alpha"]}
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                  />
                  <ReferenceLine y={0} stroke="#475569" />
                  <Bar dataKey="alpha" radius={[6, 6, 0, 0]}>
                    {results.intervals.map(iv => (
                      <Cell
                        key={iv.key}
                        fill={iv.alpha_annualized_pct >= 0 ? COLORS[iv.key] : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Methodology note */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-500">
            <strong className="text-slate-400">How it works:</strong> For each window the algorithm
            scores all available stocks using 5 technical signals (MACD, RSI, Volume, MA crossover,
            Bollinger Bands), runs {10} Monte Carlo rounds with Gaussian noise, picks the top 5 most
            consistent stocks, and measures actual returns over the next holding period.
            Starting portfolio: $10,000. Benchmark: SPY (S&P 500 ETF). {results.tickers_used} stocks
            from Stocker's universe had sufficient historical data.
          </div>
        </>
      )}
    </div>
  );
}
