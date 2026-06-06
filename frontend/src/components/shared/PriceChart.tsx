import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface PriceChartProps {
  data: { date: string; close: number }[];
  height?: number;
}

export function PriceChart({ data, height = 120 }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 text-xs"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const minPrice = Math.min(...data.map((d) => d.close));
  const maxPrice = Math.max(...data.map((d) => d.close));
  const trend = data[data.length - 1].close >= data[0].close;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#64748b", fontSize: 10 }}
          tickFormatter={(d) => d.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice * 0.98, maxPrice * 1.02]}
          tick={{ fill: "#64748b", fontSize: 10 }}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          width={45}
        />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6 }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: trend ? "#4ade80" : "#f87171" }}
          formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
        />
        <Line
          type="monotone"
          dataKey="close"
          stroke={trend ? "#4ade80" : "#f87171"}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
