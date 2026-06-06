import { useState } from "react";
import { SimulationRunner } from "./components/simulation/SimulationRunner";
import { PortfolioTab } from "./components/portfolio/PortfolioTab";
import { FireTab } from "./components/fire/FireTab";
import { InsightsTab } from "./components/insights/InsightsTab";

type Tab = "simulation" | "portfolio" | "fire" | "insights";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "simulation", label: "Simulation", icon: "📈" },
  { id: "portfolio", label: "My Portfolio", icon: "💼" },
  { id: "fire", label: "FIRE Numbers", icon: "🔥" },
  { id: "insights", label: "How It Works", icon: "🔬" },
];

export default function App() {
  const [active, setActive] = useState<Tab>("simulation");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700/60 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-8 h-14">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <span className="font-bold text-white text-lg tracking-tight">Stocker</span>
            <span className="text-xs text-slate-500 ml-1">Trading Agent</span>
          </div>
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  active === tab.id
                    ? "bg-sky-600/20 text-sky-400 border border-sky-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {active === "simulation" && <SimulationRunner />}
        {active === "portfolio" && <PortfolioTab />}
        {active === "fire" && <FireTab />}
        {active === "insights" && <InsightsTab />}
      </main>
    </div>
  );
}
