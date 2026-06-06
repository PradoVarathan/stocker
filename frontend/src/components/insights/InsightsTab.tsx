import { useState } from "react";
import { useSimulationStore } from "../../store/simulationStore";
import type { StockResult } from "../../types";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, ReferenceLine, Area, AreaChart,
} from "recharts";

// ─── Educational data ─────────────────────────────────────────────────────────

const TECHNICAL_LEARN = [
  {
    key: "rsi",
    name: "RSI",
    full: "Relative Strength Index",
    weight: "20%",
    color: "#3b82f6",
    pitch: "Measures how fast price is moving — above 70 means overbought, below 30 means oversold.",
    rule: "Sweet spot: 50–70 (momentum without being overbought)",
    investopedia: "https://www.investopedia.com/terms/r/rsi.asp",
    youtube: "https://www.youtube.com/c/Tradingwithrrayner",
    ytLabel: "Rayner Teo on YouTube",
    visual: "rsi",
  },
  {
    key: "macd",
    name: "MACD",
    full: "Moving Avg. Convergence Divergence",
    weight: "25%",
    color: "#a855f7",
    pitch: "Shows if short-term momentum is speeding up or slowing down vs the longer trend.",
    rule: "Histogram above 0 and growing = strong bullish momentum",
    investopedia: "https://www.investopedia.com/terms/m/macd.asp",
    youtube: "https://school.stockcharts.com/doku.php?id=technical_indicators:moving_average_convergence_divergence_macd",
    ytLabel: "StockCharts School",
    visual: "macd",
  },
  {
    key: "volume",
    name: "Volume",
    full: "Volume Surge Analysis",
    weight: "20%",
    color: "#14b8a6",
    pitch: "Price moves on high volume are more reliable. Low-volume breakouts often fail.",
    rule: "5-day avg ≥ 1.5× the 20-day avg = high-conviction move",
    investopedia: "https://www.investopedia.com/terms/v/volumeanalysis.asp",
    youtube: "https://school.stockcharts.com/doku.php?id=technical_indicators:on_balance_volume_obv",
    ytLabel: "StockCharts OBV Guide",
    visual: "volume",
  },
  {
    key: "ma",
    name: "MA Cross",
    full: "Moving Average Crossover",
    weight: "20%",
    color: "#f59e0b",
    pitch: "When the 10-day EMA crosses above the 20-day EMA, it signals a bullish trend shift.",
    rule: "Golden cross (short > long) = bullish. Death cross = bearish.",
    investopedia: "https://www.investopedia.com/terms/g/goldencross.asp",
    youtube: "https://corporatefinanceinstitute.com/resources/career-map/sell-side/capital-markets/golden-cross/",
    ytLabel: "CFI: Golden Cross Explained",
    visual: "ma",
  },
  {
    key: "bollinger",
    name: "Bollinger",
    full: "Bollinger Bands",
    weight: "15%",
    color: "#38bdf8",
    pitch: "Volatility envelopes around price. Sweet spot is trending in the upper half of the band.",
    rule: "Price in upper half of band (0.5–0.8) = healthy uptrend. Above upper band = overbought.",
    investopedia: "https://www.investopedia.com/terms/b/bollingerbands.asp",
    youtube: "https://www.youtube.com/c/Tradingwithrrayner",
    ytLabel: "Rayner Teo on YouTube",
    visual: "bollinger",
  },
];

const FUNDAMENTAL_LEARN = [
  {
    key: "pe",
    name: "P/E Ratio",
    full: "Price-to-Earnings",
    who: "Graham",
    color: "#3b82f6",
    pitch: "How much investors pay for $1 of earnings. High P/E = priced for growth; low P/E = potential value.",
    rule: "Graham says ≤ 15 for a bargain. Above 40 is usually speculation.",
    good: "≤ 15",
    investopedia: "https://www.investopedia.com/terms/p/price-earningsratio.asp",
    learn2: "https://www.khanacademy.org/economics-finance-domain/core-finance/stock-and-bonds/valuation-and-investing/v/introduction-to-the-price-to-earnings-ratio",
    learn2Label: "Khan Academy: P/E Ratio",
  },
  {
    key: "pb",
    name: "P/B Ratio",
    full: "Price-to-Book",
    who: "Graham",
    color: "#6366f1",
    pitch: "Compares market price to the company's net asset value. Below 1.0 = trading below book value.",
    rule: "Graham target: ≤ 1.5. Above 5 means you're paying a big premium over assets.",
    good: "≤ 1.5",
    investopedia: "https://www.investopedia.com/terms/p/price-to-bookratio.asp",
    learn2: "https://www.schwab.com/learn/story/five-key-financial-ratios-stock-analysis",
    learn2Label: "Schwab: 5 Key Ratios",
  },
  {
    key: "roe",
    name: "ROE",
    full: "Return on Equity",
    who: "Buffett",
    color: "#f59e0b",
    pitch: "How efficiently the company turns shareholders' money into profit. Buffett's primary quality signal.",
    rule: "Buffett wants ≥ 15% consistently. 30%+ is exceptional. Negative ROE is a red flag.",
    good: "≥ 15%",
    investopedia: "https://www.investopedia.com/terms/r/returnonequity.asp",
    learn2: "https://www.schwab.com/learn/story/five-key-financial-ratios-stock-analysis",
    learn2Label: "Schwab: 5 Key Ratios",
  },
  {
    key: "margin",
    name: "Profit Margin",
    full: "Net Profit Margin",
    who: "Buffett",
    color: "#22c55e",
    pitch: "What percentage of revenue actually becomes profit. High margins signal pricing power and moat.",
    rule: "Buffett looks for ≥ 10%, prefers 20%+. Thin margins mean any cost shock can wipe profits.",
    good: "≥ 10%",
    investopedia: "https://www.investopedia.com/terms/n/net_margin.asp",
    learn2: "https://www.schwab.com/learn/story/five-key-financial-ratios-stock-analysis",
    learn2Label: "Schwab: 5 Key Ratios",
  },
  {
    key: "de",
    name: "Debt/Equity",
    full: "Debt-to-Equity Ratio",
    who: "Buffett",
    color: "#ef4444",
    pitch: "How much debt vs equity the company uses. High debt amplifies both gains and losses.",
    rule: "Buffett wants ≤ 0.5. Above 2.0 is risky. Net cash (negative D/E) is ideal.",
    good: "≤ 0.5",
    investopedia: "https://www.investopedia.com/terms/d/debtequityratio.asp",
    learn2: "https://www.schwab.com/learn/story/five-key-financial-ratios-stock-analysis",
    learn2Label: "Schwab: 5 Key Ratios",
  },
  {
    key: "peg",
    name: "PEG Ratio",
    full: "Price/Earnings-to-Growth",
    who: "Lynch",
    color: "#10b981",
    pitch: "P/E divided by earnings growth rate. Fixes P/E's blind spot by accounting for how fast the company grows.",
    rule: "Lynch: PEG ≤ 1.0 = growth at a reasonable price. Above 2.0 = overpaying for growth.",
    good: "≤ 1.0",
    investopedia: "https://www.investopedia.com/terms/p/pegratio.asp",
    learn2: "https://www.schwab.com/learn/story/how-to-value-company-stocks-pe-peg-and-pb-ratios",
    learn2Label: "Schwab: P/E, PEG & P/B",
  },
];

// ─── Mini chart examples ──────────────────────────────────────────────────────

function RSIVisual() {
  const data = [
    { x: 1, rsi: 45 }, { x: 2, rsi: 52 }, { x: 3, rsi: 61 }, { x: 4, rsi: 68 },
    { x: 5, rsi: 74 }, { x: 6, rsi: 71 }, { x: 7, rsi: 64 }, { x: 8, rsi: 58 },
  ];
  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
        <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
        <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
        <ReferenceLine y={50} stroke="#64748b" strokeDasharray="2 2" strokeWidth={1} />
        <Line dataKey="rsi" stroke="#3b82f6" dot={false} strokeWidth={2} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#64748b" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MACDVisual() {
  const data = [
    { x: 1, h: -0.5 }, { x: 2, h: -0.2 }, { x: 3, h: 0.1 }, { x: 4, h: 0.4 },
    { x: 5, h: 0.7 }, { x: 6, h: 0.9 }, { x: 7, h: 0.6 }, { x: 8, h: 0.3 },
  ];
  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
        <ReferenceLine y={0} stroke="#64748b" />
        <Bar dataKey="h" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.h >= 0 ? "#a855f7" : "#ef4444"} />
          ))}
        </Bar>
        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function VolumeVisual() {
  const data = [
    { x: 1, v: 0.8 }, { x: 2, v: 0.9 }, { x: 3, v: 1.0 }, { x: 4, v: 1.2 },
    { x: 5, v: 1.8 }, { x: 6, v: 2.1 }, { x: 7, v: 1.6 }, { x: 8, v: 1.1 },
  ];
  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
        <ReferenceLine y={1.5} stroke="#14b8a6" strokeDasharray="3 3" strokeWidth={1} label={{ value: "1.5×", fontSize: 8, fill: "#14b8a6" }} />
        <Bar dataKey="v" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.v >= 1.5 ? "#14b8a6" : "#334155"} />
          ))}
        </Bar>
        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MAVisual() {
  const data = [
    { x: 1, ema10: 98, ema20: 100 }, { x: 2, ema10: 99, ema20: 100 },
    { x: 3, ema10: 100.5, ema20: 100 }, { x: 4, ema10: 102, ema20: 100.5 },
    { x: 5, ema10: 104, ema20: 101 }, { x: 6, ema10: 106, ema20: 102 },
    { x: 7, ema10: 108, ema20: 103 }, { x: 8, ema10: 110, ema20: 104 },
  ];
  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
        <Line dataKey="ema10" stroke="#f59e0b" dot={false} strokeWidth={2} name="10 EMA" />
        <Line dataKey="ema20" stroke="#64748b" dot={false} strokeWidth={2} strokeDasharray="4 2" name="20 EMA" />
        <YAxis domain={[95, 115]} tick={{ fontSize: 9, fill: "#64748b" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function BollingerVisual() {
  const data = [
    { x: 1, price: 100, upper: 106, lower: 94, mid: 100 },
    { x: 2, price: 102, upper: 107, lower: 93, mid: 100 },
    { x: 3, price: 104, upper: 108, lower: 92, mid: 100 },
    { x: 4, price: 105, upper: 109, lower: 91, mid: 100 },
    { x: 5, price: 107, upper: 110, lower: 90, mid: 100 },
    { x: 6, price: 106, upper: 110, lower: 90, mid: 100 },
    { x: 7, price: 108, upper: 111, lower: 89, mid: 100 },
    { x: 8, price: 109, upper: 112, lower: 88, mid: 100 },
  ];
  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
        <Line dataKey="upper" stroke="#334155" dot={false} strokeWidth={1} strokeDasharray="3 2" />
        <Line dataKey="lower" stroke="#334155" dot={false} strokeWidth={1} strokeDasharray="3 2" />
        <Line dataKey="mid" stroke="#475569" dot={false} strokeWidth={1} strokeDasharray="2 2" />
        <Line dataKey="price" stroke="#38bdf8" dot={false} strokeWidth={2} />
        <YAxis domain={[85, 115]} tick={{ fontSize: 9, fill: "#64748b" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const VISUALS: Record<string, React.ReactNode> = {
  rsi: <RSIVisual />, macd: <MACDVisual />, volume: <VolumeVisual />,
  ma: <MAVisual />, bollinger: <BollingerVisual />,
};

// ─── Indicator card ───────────────────────────────────────────────────────────

function IndicatorCard({ item }: { item: typeof TECHNICAL_LEARN[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 rounded-full" style={{ backgroundColor: item.color }} />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{item.name}</span>
              <span className="text-xs text-slate-500">{item.full}</span>
              <span className="text-xs font-mono text-sky-400 bg-sky-900/20 px-1.5 py-0.5 rounded">{item.weight}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{item.pitch}</p>
          </div>
        </div>
        <span className="text-slate-500 text-xs ml-4">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual */}
            <div>
              <div className="text-xs text-slate-500 mb-2">Example chart pattern:</div>
              <div className="bg-slate-900 rounded-lg p-2">
                {VISUALS[item.visual]}
              </div>
              <div className="text-xs text-slate-500 mt-2 p-2 bg-slate-900/50 rounded border border-slate-700/40">
                <span className="text-slate-300 font-medium">Our rule: </span>{item.rule}
              </div>
            </div>
            {/* Links */}
            <div>
              <div className="text-xs text-slate-500 mb-2">Learn more:</div>
              <div className="space-y-2">
                <a
                  href={item.investopedia}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-slate-900 hover:bg-slate-700/60 rounded-lg border border-slate-700/40 transition-colors group"
                >
                  <span className="text-lg">📖</span>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white">Investopedia</div>
                    <div className="text-xs text-slate-500">{item.name} — full explanation with examples</div>
                  </div>
                  <span className="ml-auto text-slate-600 group-hover:text-slate-400">↗</span>
                </a>
                <a
                  href={item.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-slate-900 hover:bg-slate-700/60 rounded-lg border border-slate-700/40 transition-colors group"
                >
                  <span className="text-lg">🎥</span>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white">{item.ytLabel}</div>
                    <div className="text-xs text-slate-500">Visual walkthrough</div>
                  </div>
                  <span className="ml-auto text-slate-600 group-hover:text-slate-400">↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FundamentalCard({ item }: { item: typeof FUNDAMENTAL_LEARN[0] }) {
  const [open, setOpen] = useState(false);
  const whoColor: Record<string, string> = {
    Graham: "text-blue-400 bg-blue-900/20 border-blue-700/30",
    Buffett: "text-amber-400 bg-amber-900/20 border-amber-700/30",
    Lynch: "text-green-400 bg-green-900/20 border-green-700/30",
  };
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 rounded-full" style={{ backgroundColor: item.color }} />
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">{item.name}</span>
              <span className="text-xs text-slate-500">{item.full}</span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${whoColor[item.who]}`}>
                {item.who}
              </span>
              <span className="text-xs font-mono text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded">
                Good: {item.good}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{item.pitch}</p>
          </div>
        </div>
        <span className="text-slate-500 text-xs ml-4">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          <div className="mt-4 space-y-3">
            <div className="text-xs text-slate-400 p-3 bg-slate-900/60 rounded-lg border border-slate-700/40">
              <span className="text-slate-300 font-medium">Investor rule: </span>{item.rule}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={item.investopedia}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-slate-900 hover:bg-slate-700/60 rounded-lg border border-slate-700/40 transition-colors group"
              >
                <span className="text-lg">📖</span>
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white">Investopedia</div>
                  <div className="text-xs text-slate-500">{item.name} — full definition</div>
                </div>
                <span className="ml-auto text-slate-600 group-hover:text-slate-400">↗</span>
              </a>
              <a
                href={item.learn2}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-slate-900 hover:bg-slate-700/60 rounded-lg border border-slate-700/40 transition-colors group"
              >
                <span className="text-lg">🎓</span>
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white">{item.learn2Label}</div>
                  <div className="text-xs text-slate-500">Deep-dive resource</div>
                </div>
                <span className="ml-auto text-slate-600 group-hover:text-slate-400">↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pipeline Step ────────────────────────────────────────────────────────────

function PipelineStep({
  step, icon, title, description, signals, last = false,
}: {
  step: number; icon: string; title: string; description: string;
  signals: { label: string; detail: string }[]; last?: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      {!last && <div className="absolute left-5 top-12 w-0.5 h-full bg-slate-700" />}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-lg z-10">
        {icon}
      </div>
      <div className="pb-8 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-sky-400">Step {step}</span>
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <p className="text-slate-400 text-xs mb-3">{description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {signals.map((s) => (
            <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2">
              <div className="text-xs font-semibold text-slate-200">{s.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stock radar ──────────────────────────────────────────────────────────────

function StockRadar({ stock }: { stock: StockResult }) {
  const data = [
    { subject: "RSI", score: stock.rsi_score },
    { subject: "MACD", score: stock.macd_score },
    { subject: "Volume", score: stock.volume_score },
    { subject: "Bollinger", score: stock.bollinger_score },
    { subject: "MA Cross", score: stock.ma_score },
    { subject: "Fundamental", score: stock.fundamental_score },
  ];
  const color = { HIGH: "#4ade80", MEDIUM: "#facc15", LOW: "#f87171" }[stock.claude_confidence];
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="font-bold text-white text-sm">{stock.ticker}</span>
          <span className="text-slate-500 text-xs ml-2">{stock.sector ?? ""}</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ color, background: `${color}18` }}>
          {stock.claude_confidence}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data} margin={{ top: 8, right: 18, bottom: 8, left: 18 }}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="score" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} strokeWidth={1.5} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="space-y-1 mt-2">
        {[
          { label: "Technical", value: stock.avg_composite_score, color: "#38bdf8" },
          { label: "Fundamental", value: stock.fundamental_score, color: "#a78bfa" },
          { label: "Blended", value: stock.blended_score, color: "#4ade80" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-20">{item.label}</span>
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
            </div>
            <span className="text-xs font-mono text-slate-300 w-8 text-right">{item.value.toFixed(0)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {stock.pe_ratio != null && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono border ${stock.pe_ratio <= 20 ? "bg-green-900/20 border-green-700/30 text-green-400" : "bg-orange-900/20 border-orange-700/30 text-orange-400"}`}>
            P/E {stock.pe_ratio.toFixed(1)}
          </span>
        )}
        {stock.roe != null && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono border ${stock.roe >= 0.15 ? "bg-green-900/20 border-green-700/30 text-green-400" : "bg-orange-900/20 border-orange-700/30 text-orange-400"}`}>
            ROE {(stock.roe * 100).toFixed(0)}%
          </span>
        )}
        {stock.peg_ratio != null && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono border ${stock.peg_ratio <= 1 ? "bg-green-900/20 border-green-700/30 text-green-400" : "bg-orange-900/20 border-orange-700/30 text-orange-400"}`}>
            PEG {stock.peg_ratio.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Frequency chart ──────────────────────────────────────────────────────────

function FrequencyChart({ stocks }: { stocks: StockResult[] }) {
  const data = [...stocks].sort((a, b) => b.times_in_top_picks - a.times_in_top_picks)
    .map((s) => ({ ticker: s.ticker, rounds: s.times_in_top_picks }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <XAxis dataKey="ticker" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
          labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
          formatter={(v: number) => [`${v} / 100 rounds`, "Frequency"]} />
        <Bar dataKey="rounds" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? "#38bdf8" : i < 3 ? "#818cf8" : "#6366f1"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function InsightsTab() {
  const { results } = useSimulationStore();
  const stocks: StockResult[] = results?.top_stocks ?? [];
  const [activeLearn, setActiveLearn] = useState<"technical" | "fundamental">("technical");

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">How It Works</h2>
        <p className="text-slate-400 text-sm mt-1">
          Algorithm pipeline, scoring formula, and learning resources for every signal we use.
        </p>
      </div>

      {/* Pipeline */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">4-Stage Algorithm Pipeline</h3>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <PipelineStep step={1} icon="📡" title="Data Collection"
            description="Fetch 60-day OHLCV price history from Yahoo Finance for up to 275 stocks across 14 sectors."
            signals={[
              { label: "Universe", detail: "14 sectors — from pharma to crypto" },
              { label: "Data", detail: "Open, High, Low, Close, Volume — 60 days" },
              { label: "Cache", detail: "15-min cache prevents redundant fetches" },
              { label: "Filter", detail: "Tickers with <20 days of data are dropped" },
            ]} />
          <PipelineStep step={2} icon="📊" title="5-Signal Technical Scoring"
            description="Five independent indicators scored 0-100, combined with research-backed weights from Brock/Lakonishok/LeBaron (1992)."
            signals={[
              { label: "MACD (25%)", detail: "Widening bullish histogram = top score" },
              { label: "RSI (20%)", detail: "Sweet spot 50-70; >75 penalized" },
              { label: "Volume (20%)", detail: "5-day avg vs 20-day avg; 1.5x+ = max" },
              { label: "MA Crossover (20%)", detail: "10 EMA vs 20 EMA golden cross" },
              { label: "Bollinger (15%)", detail: "Upper-half band position = bullish" },
            ]} />
          <PipelineStep step={3} icon="🎲" title="100-Round Monte Carlo Simulation"
            description="Each round adds Gaussian noise (σ=2.5) to every stock's score and picks top 20. Frequency across 100 rounds = signal consistency."
            signals={[
              { label: "Rounds", detail: "100 parallel noisy scenarios" },
              { label: "Noise", detail: "σ=2.5 Gaussian — simulates variability" },
              { label: "Frequency", detail: "Appears in top 20 how often?" },
              { label: "Top 20", detail: "Most consistent stocks advance to Stage 4" },
            ]} />
          <PipelineStep step={4} icon="🔬" title="Fundamental Screening + AI"
            description="Top 20 screened against Graham/Buffett/Lynch rules. Blended score = 60% technical + 40% fundamental. Final top 10 go to Gemini AI."
            signals={[
              { label: "Graham Rules", detail: "P/E ≤ 15, P/B ≤ 1.5" },
              { label: "Buffett Rules", detail: "ROE ≥ 15%, margin ≥ 10%, D/E ≤ 0.5" },
              { label: "Lynch Rules", detail: "PEG ≤ 1.0 (growth at fair price)" },
              { label: "Gemini AI", detail: "Synthesizes all data into plain-English thesis" },
            ]}
            last />
        </div>
      </section>

      {/* Learning resources */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Learn the Signals
          </h3>
          <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
            <button
              onClick={() => setActiveLearn("technical")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeLearn === "technical" ? "bg-sky-600/20 text-sky-300" : "text-slate-400 hover:text-slate-200"}`}
            >
              📊 Technical (5)
            </button>
            <button
              onClick={() => setActiveLearn("fundamental")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeLearn === "fundamental" ? "bg-violet-600/20 text-violet-300" : "text-slate-400 hover:text-slate-200"}`}
            >
              📈 Fundamental (6)
            </button>
          </div>
        </div>

        {activeLearn === "technical" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Click any indicator to see an example chart pattern, our exact scoring rule, and learning links.</p>
            {TECHNICAL_LEARN.map((item) => <IndicatorCard key={item.key} item={item} />)}
          </div>
        )}
        {activeLearn === "fundamental" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">These ratios come from Benjamin Graham, Warren Buffett, and Peter Lynch. Click to see the rule and links.</p>
            {FUNDAMENTAL_LEARN.map((item) => <FundamentalCard key={item.key} item={item} />)}
          </div>
        )}
      </section>

      {/* Per-stock breakdown after simulation */}
      {stocks.length > 0 && (
        <>
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
              Last Simulation — Per-Stock Signal Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {stocks.map((s) => <StockRadar key={s.ticker} stock={s} />)}
            </div>
          </section>
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
              Round Frequency — Monte Carlo Consistency
            </h3>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-500 mb-4">
                Out of 100 noisy rounds, how often did each stock appear in the top 20? Higher = more consistent signal.
              </p>
              <FrequencyChart stocks={stocks} />
            </div>
          </section>
        </>
      )}

      {stocks.length === 0 && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">🎲</div>
          <p className="text-slate-400 text-sm">Run a simulation first to see per-stock signal breakdowns here.</p>
        </div>
      )}

      {/* Investor reference */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Investor Rules at a Glance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "Benjamin Graham", book: "The Intelligent Investor", accent: "text-blue-400", border: "border-blue-500/30 bg-blue-900/10",
              rules: ["P/E ≤ 15 — don't overpay for earnings", "P/B ≤ 1.5 — buy near asset value", "Current ratio ≥ 2.0 — liquidity buffer", "Margin of safety ≥ 33% below intrinsic value"],
              link: "https://www.investopedia.com/terms/i/intelligentinvestor.asp" },
            { name: "Warren Buffett", book: "Quality + Moat Framework", accent: "text-amber-400", border: "border-amber-500/30 bg-amber-900/10",
              rules: ["ROE ≥ 15% consistently", "Net profit margin ≥ 10%", "Debt/Equity ≤ 0.5", "FCF positive and growing YoY"],
              link: "https://www.investopedia.com/articles/01/071801.asp" },
            { name: "Peter Lynch", book: "One Up on Wall Street", accent: "text-green-400", border: "border-green-500/30 bg-green-900/10",
              rules: ["PEG ≤ 1.0 — growth at fair price", "Earnings growth 15-30%", "D/E ≤ 0.35 for small caps", "Cash > Debt (net cash positive)"],
              link: "https://www.investopedia.com/terms/p/pegratio.asp" },
          ].map((inv) => (
            <div key={inv.name} className={`border rounded-xl p-4 ${inv.border}`}>
              <div className={`font-bold text-sm mb-0.5 ${inv.accent}`}>{inv.name}</div>
              <div className="text-xs text-slate-500 mb-3 italic">{inv.book}</div>
              <ul className="space-y-1.5 mb-3">
                {inv.rules.map((r) => (
                  <li key={r} className="text-xs text-slate-300 flex gap-2">
                    <span className={`${inv.accent} flex-shrink-0 mt-0.5`}>›</span>{r}
                  </li>
                ))}
              </ul>
              <a href={inv.link} target="_blank" rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">
                Read on Investopedia ↗
              </a>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
