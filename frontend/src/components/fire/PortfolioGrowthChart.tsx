import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import type { FireResponse } from "../../types";

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function PortfolioGrowthChart({ result }: { result: FireResponse }) {
  const data = result.year_by_year.map((row) => ({
    age: row.age,
    "General Savings": Math.round(row.portfolio),
    "Roth IRA": Math.round(row.roth),
    "401(k)": Math.round(row.k401),
    Total: Math.round(row.total),
  }));

  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Portfolio Growth by Age
      </h4>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="cSavings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cRoth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="c401k" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="age" tick={{ fill: "#64748b", fontSize: 10 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={fmt} width={55} />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6 }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(v: number) => [fmt(v)]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
          <ReferenceLine
            y={result.fire_number}
            stroke="#f97316"
            strokeDasharray="5 3"
            label={{ value: "FIRE", fill: "#f97316", fontSize: 10 }}
          />
          <ReferenceLine
            y={result.lean_fire_number}
            stroke="#f97316"
            strokeDasharray="2 4"
            strokeOpacity={0.4}
            label={{ value: "Lean", fill: "#f97316", fontSize: 9 }}
          />
          <Area
            type="monotone"
            dataKey="General Savings"
            stackId="1"
            stroke="#0ea5e9"
            fill="url(#cSavings)"
          />
          <Area
            type="monotone"
            dataKey="Roth IRA"
            stackId="1"
            stroke="#a78bfa"
            fill="url(#cRoth)"
          />
          <Area
            type="monotone"
            dataKey="401(k)"
            stackId="1"
            stroke="#34d399"
            fill="url(#c401k)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
