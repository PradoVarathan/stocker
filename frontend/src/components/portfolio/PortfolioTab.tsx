import { useEffect } from "react";
import { usePortfolioStore } from "../../store/portfolioStore";
import { Spinner } from "../shared/Spinner";
import { SparklineCell } from "./SparklineCell";

function PctBadge({ value }: { value: number }) {
  const color = value >= 0 ? "text-green-400" : "text-red-400";
  const sign = value >= 0 ? "+" : "";
  return <span className={`font-mono font-semibold ${color}`}>{sign}{value.toFixed(2)}%</span>;
}

export function PortfolioTab() {
  const { stocks, loading, fetch, removeStock } = usePortfolioStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Tracked Stocks</h1>
          <p className="text-slate-400 text-sm">
            Stocks you're watching. Track stocks from the Simulation tab.
          </p>
        </div>
        <button
          onClick={fetch}
          disabled={loading}
          className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {loading && <Spinner size="sm" />}
          Refresh
        </button>
      </div>

      {loading && stocks.length === 0 && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && stocks.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg">No stocks tracked yet.</p>
          <p className="text-sm mt-1">Run a simulation and click "Track" on any stock.</p>
        </div>
      )}

      {stocks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700 text-left">
                <th className="py-2 px-3">Ticker</th>
                <th className="py-2 px-3 text-right">Current</th>
                <th className="py-2 px-3 text-right">Buy Price</th>
                <th className="py-2 px-3 text-right">Today</th>
                <th className="py-2 px-3 text-right">Since Tracked</th>
                <th className="py-2 px-3 text-center">14-Day Trend</th>
                <th className="py-2 px-3 text-right">Tracked Since</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <tr
                  key={stock.ticker}
                  className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="font-bold text-white">{stock.ticker}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[160px]">
                      {stock.company_name}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-200">
                    ${stock.current_price.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-400">
                    ${stock.price_at_track.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <PctBadge value={stock.pct_change_today} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <PctBadge value={stock.pct_change_since_tracked} />
                  </td>
                  <td className="py-3 px-3 flex justify-center">
                    <SparklineCell data={stock.sparkline} />
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 text-xs">
                    {new Date(stock.tracked_since).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => removeStock(stock.ticker)}
                      className="px-3 py-1 text-xs rounded bg-red-900/40 hover:bg-red-800/60 text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
