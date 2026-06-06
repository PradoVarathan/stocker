import { useFireStore } from "../../store/fireStore";
import { Spinner } from "../shared/Spinner";
import { PortfolioGrowthChart } from "./PortfolioGrowthChart";

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        highlight
          ? "bg-orange-900/20 border-orange-700/40"
          : "bg-slate-800/50 border-slate-700"
      }`}
    >
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div
        className={`text-xl font-bold ${highlight ? "text-orange-400" : "text-white"}`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function FireResults() {
  const { result, loading } = useFireStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        Enter your numbers and click Calculate FIRE.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FIRE status banner */}
      <div
        className={`p-4 rounded-xl border ${
          result.is_fire_achievable
            ? "bg-green-900/20 border-green-700/40 text-green-400"
            : "bg-yellow-900/20 border-yellow-700/40 text-yellow-400"
        }`}
      >
        {result.is_fire_achievable ? (
          <span className="font-semibold">
            FIRE achievable at age {result.fire_age} — {result.years_to_fire} years away
          </span>
        ) : result.fire_age ? (
          <span className="font-semibold">
            FIRE achievable at age {result.fire_age} — {result.years_to_fire} years away (after target retirement age)
          </span>
        ) : (
          <span className="font-semibold">
            FIRE not achievable with current savings rate — increase savings or reduce expenses
          </span>
        )}
      </div>

      {/* Key numbers grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="FIRE Number (4% SWR)" value={fmt(result.fire_number)} highlight sub="25× annual expenses" />
        <StatCard label="Lean FIRE (5% SWR)" value={fmt(result.lean_fire_number)} sub="20× annual expenses" />
        <StatCard label="Conservative FIRE (3%)" value={fmt(result.conservative_fire_number)} sub="33× annual expenses" />
        <StatCard label="Monthly Income at Retirement" value={`$${result.monthly_income_in_retirement.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} sub="4% safe withdrawal" />
      </div>

      {/* Retirement projections */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          At Target Retirement Age
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="General Portfolio" value={fmt(result.projected_portfolio_at_retirement)} />
          <StatCard label="Roth IRA" value={fmt(result.projected_roth_at_retirement)} />
          <StatCard label="401(k)" value={fmt(result.projected_401k_at_retirement)} />
        </div>
        <div className="mt-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
          <div className="text-xs text-slate-400">Total Portfolio at Retirement</div>
          <div className="text-3xl font-bold text-white mt-1">
            {fmt(result.projected_total_at_retirement)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Annual safe withdrawal: {fmt(result.annual_safe_withdrawal)}
          </div>
        </div>
      </div>

      {/* Growth chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <PortfolioGrowthChart result={result} />
      </div>
    </div>
  );
}
