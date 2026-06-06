import { useState } from "react";
import type { StockResult } from "../../types";
import { StockResultCard } from "./StockResultCard";

interface Props {
  stocks: StockResult[];
  onTrack: (ticker: string, companyName: string) => void;
}

export function ResultsTable({ stocks, onTrack }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Set<string>>(new Set());

  function handleTrack(ticker: string, companyName: string) {
    onTrack(ticker, companyName);
    setTracked((s) => new Set(s).add(ticker));
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">
        Top 10 Ranked Stocks
        <span className="ml-2 text-sm font-normal text-slate-400">
          ranked by simulation frequency + composite score
        </span>
      </h2>

      {/* Summary table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2 px-3 w-8">#</th>
              <th className="text-left py-2 px-3">Ticker</th>
              <th className="text-right py-2 px-3">Price</th>
              <th className="text-right py-2 px-3">Score</th>
              <th className="text-right py-2 px-3">Frequency</th>
              <th className="text-center py-2 px-3">Confidence</th>
              <th className="text-center py-2 px-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <StockRowSummary
                key={stock.ticker}
                stock={stock}
                isExpanded={expanded === stock.ticker}
                isTracked={tracked.has(stock.ticker)}
                onToggle={() =>
                  setExpanded((e) => (e === stock.ticker ? null : stock.ticker))
                }
                onTrack={() => handleTrack(stock.ticker, stock.company_name)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded detail card */}
      {expanded && (
        <StockResultCard
          stock={stocks.find((s) => s.ticker === expanded)!}
        />
      )}
    </div>
  );
}

function StockRowSummary({
  stock,
  isExpanded,
  isTracked,
  onToggle,
  onTrack,
}: {
  stock: StockResult;
  isExpanded: boolean;
  isTracked: boolean;
  onToggle: () => void;
  onTrack: () => void;
}) {
  const confidenceColor = {
    HIGH: "text-green-400 bg-green-900/30",
    MEDIUM: "text-yellow-400 bg-yellow-900/30",
    LOW: "text-red-400 bg-red-900/30",
  }[stock.claude_confidence];

  const scoreColor =
    stock.avg_composite_score >= 70
      ? "text-green-400"
      : stock.avg_composite_score >= 50
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <tr
      className={`border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors ${
        isExpanded ? "bg-slate-800/50" : ""
      }`}
      onClick={onToggle}
    >
      <td className="py-3 px-3 text-slate-500 font-mono">{stock.rank_position}</td>
      <td className="py-3 px-3">
        <div className="font-bold text-white">{stock.ticker}</div>
        <div className="text-xs text-slate-500 truncate max-w-[160px]">{stock.company_name}</div>
      </td>
      <td className="py-3 px-3 text-right font-mono text-slate-300">
        ${stock.latest_price.toFixed(2)}
      </td>
      <td className={`py-3 px-3 text-right font-bold ${scoreColor}`}>
        {stock.avg_composite_score.toFixed(1)}
      </td>
      <td className="py-3 px-3 text-right text-slate-400 font-mono">
        {stock.times_in_top_picks}/100
      </td>
      <td className="py-3 px-3 text-center">
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${confidenceColor}`}>
          {stock.claude_confidence}
        </span>
      </td>
      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onTrack}
          disabled={isTracked}
          className="px-3 py-1 text-xs rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          {isTracked ? "Tracked" : "Track"}
        </button>
      </td>
    </tr>
  );
}
