import type { StockResult } from "../../types";
import { PriceChart } from "../shared/PriceChart";

function FundBadge({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-md font-mono border ${
        good
          ? "bg-green-900/20 border-green-700/30 text-green-400"
          : "bg-orange-900/20 border-orange-700/30 text-orange-400"
      }`}
    >
      {label}: {value}
    </span>
  );
}

export function StockResultCard({ stock }: { stock: StockResult }) {
  const technicalBars = [
    { label: "MACD", value: stock.macd_score, color: "bg-purple-500" },
    { label: "RSI", value: stock.rsi_score, color: "bg-blue-500" },
    { label: "Volume", value: stock.volume_score, color: "bg-teal-500" },
    { label: "MA Cross", value: stock.ma_score, color: "bg-amber-500" },
    { label: "Bollinger", value: stock.bollinger_score, color: "bg-sky-400" },
  ];

  const confidenceColor = {
    HIGH: "text-green-400",
    MEDIUM: "text-yellow-400",
    LOW: "text-red-400",
  }[stock.claude_confidence];

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">#{stock.rank_position}</span>
            <h3 className="text-xl font-bold text-white">{stock.ticker}</h3>
            <span className={`text-sm font-semibold ${confidenceColor}`}>
              {stock.claude_confidence} confidence
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">{stock.company_name}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">${stock.latest_price.toFixed(2)}</div>
          <div className="text-slate-400 text-xs">Current price</div>
        </div>
      </div>

      {/* Blended score banner */}
      <div className="flex gap-3 mb-5 p-3 bg-slate-900/60 rounded-lg border border-slate-700/40">
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Technical</div>
          <div className="text-lg font-bold text-sky-400">{stock.avg_composite_score.toFixed(1)}</div>
        </div>
        <div className="w-px bg-slate-700" />
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Fundamental</div>
          <div className="text-lg font-bold text-violet-400">{stock.fundamental_score.toFixed(1)}</div>
        </div>
        <div className="w-px bg-slate-700" />
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Blended</div>
          <div className="text-lg font-bold text-green-400">{stock.blended_score.toFixed(1)}</div>
        </div>
        <div className="w-px bg-slate-700" />
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Rounds</div>
          <div className="text-lg font-bold text-white">{stock.times_in_top_picks}/100</div>
        </div>
      </div>

      {/* Fundamental badges */}
      {(stock.pe_ratio != null || stock.roe != null || stock.profit_margin != null) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {stock.pe_ratio != null && (
            <FundBadge label="P/E" value={stock.pe_ratio.toFixed(1)} good={stock.pe_ratio <= 20} />
          )}
          {stock.pb_ratio != null && (
            <FundBadge label="P/B" value={stock.pb_ratio.toFixed(1)} good={stock.pb_ratio <= 3} />
          )}
          {stock.roe != null && (
            <FundBadge label="ROE" value={`${(stock.roe * 100).toFixed(0)}%`} good={stock.roe >= 0.15} />
          )}
          {stock.profit_margin != null && (
            <FundBadge label="Margin" value={`${(stock.profit_margin * 100).toFixed(0)}%`} good={stock.profit_margin >= 0.10} />
          )}
          {stock.debt_equity != null && (
            <FundBadge label="D/E" value={stock.debt_equity.toFixed(2)} good={stock.debt_equity <= 0.5} />
          )}
          {stock.peg_ratio != null && (
            <FundBadge label="PEG" value={stock.peg_ratio.toFixed(2)} good={stock.peg_ratio <= 1.0} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: scores + AI analysis */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Technical Signals
          </h4>
          <div className="space-y-2">
            {technicalBars.map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{bar.label}</span>
                  <span className="text-slate-300 font-mono">{bar.value.toFixed(1)}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bar.color} rounded-full transition-all`}
                    style={{ width: `${Math.min(100, bar.value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              AI Analysis
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">{stock.claude_reasoning}</p>
          </div>
          <div className="mt-3 p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Risk</h4>
            <p className="text-slate-400 text-xs leading-relaxed">{stock.claude_risk}</p>
          </div>
        </div>

        {/* Right: price chart */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            60-Day Price History
          </h4>
          <PriceChart data={stock.price_history} height={200} />
        </div>
      </div>
    </div>
  );
}
