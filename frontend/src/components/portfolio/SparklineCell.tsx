import { LineChart, Line, ResponsiveContainer } from "recharts";

export function SparklineCell({ data }: { data: number[] }) {
  if (!data || data.length < 2) return <span className="text-slate-600 text-xs">—</span>;
  const chartData = data.map((v, i) => ({ i, v }));
  const trend = data[data.length - 1] >= data[0];
  return (
    <ResponsiveContainer width={80} height={30}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={trend ? "#4ade80" : "#f87171"}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
