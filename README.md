# Stocker — AI-Powered Stock Simulation Dashboard

A personal trading agent dashboard that runs Monte Carlo simulations with technical + fundamental analysis, powered by **Gemini AI** (free tier). Pick a sector, run 100 simulated rounds, and get AI-ranked stock picks with full reasoning.

> **Live demo preview:** [demo/index.html](demo/index.html)

---

## Features

| Tab | What it does |
|---|---|
| **Simulation** | 100-round Monte Carlo across 275 stocks in 14 sectors; blended technical + fundamental scoring; Gemini AI final reasoning |
| **Portfolio** | Track stocks from simulation results; live price + % change since tracked |
| **FIRE Numbers** | Retirement calculator with year-by-year projection, Roth, 401k, and safe withdrawal rate |
| **How It Works** | Visual explanations of every signal, investor frameworks (Graham / Buffett / Lynch), and per-stock radar charts |

---

## Algorithm Overview

### Stage 1 — Technical Scoring (5 signals)
| Signal | Weight | Based on |
|---|---|---|
| MACD | 25% | Trend momentum |
| RSI | 20% | Overbought / oversold |
| Volume | 20% | Breakout confirmation |
| MA Crossover (10/20 EMA) | 20% | Short-term trend |
| Bollinger Bands | 15% | Volatility / mean reversion |

*Weights from Brock, Lakonishok & LeBaron (1992) academic research.*

### Stage 2 — Monte Carlo (100 rounds)
Each round adds Gaussian noise (σ = 2.5) to every composite score, then picks the **top 20** stocks. Frequency across 100 rounds = signal **consistency**, not just a single snapshot.

### Stage 3 — Fundamental Screening (top 20 candidates)
| Framework | Rules |
|---|---|
| **Graham** | P/E ≤ 15, P/B ≤ 1.5 |
| **Buffett** | ROE ≥ 15%, Profit Margin ≥ 10%, D/E ≤ 0.5 |
| **Lynch** | PEG ≤ 1.0 |

### Stage 4 — Blended Score & AI Ranking
`blended = 0.6 × technical + 0.4 × fundamental`

Top 10 candidates are then passed to **Gemini 2.5 Flash Lite** (free, 1 000 req/day) for final reasoning, confidence rating (HIGH / MEDIUM / LOW), and risk summary.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11 · FastAPI · SQLAlchemy · SQLite |
| Market data | yfinance ≥ 1.4.1 |
| AI reasoning | Google Gemini API (free tier) |
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS |
| Charts | Recharts |
| State | Zustand |

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- A free **Gemini API key** — get one at [aistudio.google.com](https://aistudio.google.com/app/apikey)

### 1 — Clone the repo
```bash
git clone https://github.com/pradeepvarathan/stocker.git
cd stocker
```

### 2 — Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create your .env from the example
cp .env.example .env
# Edit .env and paste your Gemini API key
```

### 3 — Frontend setup
```bash
cd ../frontend
npm install
```

### 4 — Run both servers

**Terminal 1 — backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
stocker/
├── backend/
│   ├── data/
│   │   ├── universe.py          # 14 sectors × ~20 tickers = 275 stocks
│   │   └── stocker.db           # SQLite (gitignored — auto-created on first run)
│   ├── routers/
│   │   ├── simulation.py        # POST /api/simulate/run, SSE progress, GET results
│   │   ├── portfolio.py         # Portfolio CRUD
│   │   └── fire.py              # FIRE calculator
│   ├── services/
│   │   ├── simulation_runner.py # 8-stage pipeline orchestrator
│   │   ├── technical.py         # RSI, MACD, Volume, MA, Bollinger
│   │   ├── fundamental.py       # Graham / Buffett / Lynch scoring
│   │   ├── market_data.py       # yfinance wrapper (MultiIndex-safe)
│   │   └── claude_ranker.py     # Gemini AI ranking (name kept for history)
│   ├── main.py
│   ├── models.py                # SQLAlchemy ORM models
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── database.py
│   ├── requirements.txt
│   └── .env.example             # Copy → .env, add your Gemini key
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── simulation/      # SimulationRunner, ResultsTable, StockResultCard
│       │   ├── portfolio/       # PortfolioTab, StockRow
│       │   ├── fire/            # FireTab, FireChart
│       │   └── insights/        # InsightsTab (How It Works)
│       ├── api/client.ts
│       ├── store/               # Zustand stores
│       └── types/index.ts
├── demo/
│   └── index.html               # Static HTML preview of the dashboard
└── README.md
```

---

## Sector Universe (275 stocks across 14 sectors)

Technology · Software & Cloud · Healthcare & Pharma · Medical Devices · Banks & Financials · Insurance & Asset Mgmt · Energy & Oil · Consumer Discretionary · Consumer Staples · Industrials · Communication & Media · Real Estate · Clean Energy · Crypto & Fintech

---

## Cost

**Zero.** This project uses only free tiers:

- **yfinance** — free Yahoo Finance data, no key needed
- **Gemini API** — 1 000 free requests/day (more than enough for daily simulations)
- **SQLite** — local file, no server

---

## Contact

**Pradeep Varathan**
- Email: [pradeepvarathanpugalenthi@gmail.com](mailto:pradeepvarathanpugalenthi@gmail.com)
- GitHub: [@pradeepvarathan](https://github.com/pradeepvarathan)

---

## License

MIT — free to use, modify, and distribute.
