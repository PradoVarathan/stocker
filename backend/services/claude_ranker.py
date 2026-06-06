import os
import json
from google import genai


def claude_rank_and_explain(
    top_candidates: list[dict],
    tech_scores: dict,
    price_data: dict,
) -> list[dict]:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return [_fallback_reasoning(c) for c in top_candidates]

    candidates_summary = []
    for i, candidate in enumerate(top_candidates):
        ticker = candidate["ticker"]
        scores = tech_scores.get(ticker, {})
        df = price_data.get(ticker)
        recent_prices = []
        if df is not None:
            recent_prices = [round(float(p), 2) for p in df["close"].tail(10).tolist()]

        # Format fundamental data
        fund_parts = []
        if candidate.get("pe_ratio") is not None:
            fund_parts.append(f"P/E={candidate['pe_ratio']:.1f}")
        if candidate.get("pb_ratio") is not None:
            fund_parts.append(f"P/B={candidate['pb_ratio']:.1f}")
        if candidate.get("roe") is not None:
            fund_parts.append(f"ROE={candidate['roe']*100:.1f}%")
        if candidate.get("profit_margin") is not None:
            fund_parts.append(f"margin={candidate['profit_margin']*100:.1f}%")
        if candidate.get("debt_equity") is not None:
            fund_parts.append(f"D/E={candidate['debt_equity']:.2f}")
        if candidate.get("peg_ratio") is not None:
            fund_parts.append(f"PEG={candidate['peg_ratio']:.2f}")
        fund_str = ", ".join(fund_parts) if fund_parts else "no fundamental data"

        candidates_summary.append(
            f"{i+1}. {ticker} ({candidate.get('company_name', ticker)}): "
            f"blended_score={candidate.get('blended_score', candidate['avg_composite_score']):.1f}, "
            f"tech_score={candidate['avg_composite_score']:.1f}, "
            f"fundamental_score={candidate.get('fundamental_score', 50):.1f}, "
            f"frequency={candidate['times_in_top_picks']}/100 rounds, "
            f"RSI={scores.get('rsi', 'N/A')}, "
            f"MACD_histogram={scores.get('macd_histogram', 'N/A')}, "
            f"momentum_10d={scores.get('momentum_pct', 'N/A')}%, "
            f"volume_ratio={scores.get('volume_ratio', 'N/A')}x, "
            f"bollinger_position={scores.get('bollinger_position', 'N/A')}, "
            f"ma_bullish={scores.get('ma_bullish', 'N/A')}, "
            f"fundamentals=[{fund_str}], "
            f"recent_prices={recent_prices}"
        )

    prompt = f"""You are a quantitative stock analyst combining technical momentum signals with fundamental value investing principles (Graham, Buffett, Lynch).

Below are the top 10 stocks ranked by a blended score: 60% technical analysis (RSI, MACD, Bollinger Bands, MA crossover, volume) and 40% fundamental screening (P/E, P/B, ROE, profit margin, D/E ratio, PEG ratio).

Stocks:
{chr(10).join(candidates_summary)}

For each stock, provide:
1. confidence: HIGH, MEDIUM, or LOW — based on both technical momentum AND fundamental quality
2. reasoning: A 2-3 sentence thesis integrating both the technical signals and fundamental picture. Be specific about which metrics stand out.
3. risk: One sentence on the primary risk factor — could be technical (overbought, weak volume) or fundamental (high valuation, debt).

Respond with ONLY a JSON array, no markdown, no other text:
[
  {{
    "ticker": "AAPL",
    "confidence": "HIGH",
    "reasoning": "...",
    "risk": "..."
  }}
]"""

    try:
        client = genai.Client(api_key=api_key)
        for model in ["gemini-2.5-flash-lite", "gemini-2.5-flash"]:
            try:
                response = client.models.generate_content(model=model, contents=prompt)
                break
            except Exception:
                continue
        else:
            raise RuntimeError("All Gemini models unavailable")

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)

        gemini_map = {item["ticker"]: item for item in parsed}
        enriched = []
        for candidate in top_candidates:
            ticker = candidate["ticker"]
            data = gemini_map.get(ticker, {})
            enriched.append({
                **candidate,
                "claude_reasoning": data.get("reasoning", _fallback_reasoning(candidate)["claude_reasoning"]),
                "claude_confidence": data.get("confidence", "MEDIUM"),
                "claude_risk": data.get("risk", "Monitor general market conditions."),
            })
        return enriched
    except Exception as e:
        print(f"Gemini API error: {e}")
        return [_fallback_reasoning(c) for c in top_candidates]


def _fallback_reasoning(candidate: dict) -> dict:
    score = candidate.get("blended_score", candidate.get("avg_composite_score", 50))
    freq = candidate.get("times_in_top_picks", 0)
    fund_score = candidate.get("fundamental_score", 50)

    if score > 70:
        reasoning = (
            f"Strong combined signal: appeared in top picks {freq}/100 rounds "
            f"with blended score {score:.1f} (fundamental score: {fund_score:.0f}/100). "
            "Technical momentum and fundamental quality both align bullishly."
        )
        confidence = "HIGH"
    elif score > 55:
        reasoning = (
            f"Moderate signal: appeared {freq}/100 rounds "
            f"with blended score {score:.1f} (fundamental score: {fund_score:.0f}/100). "
            "Mixed signals — some indicators bullish but watch for confirmation."
        )
        confidence = "MEDIUM"
    else:
        reasoning = (
            f"Weak signal: appeared {freq}/100 rounds "
            f"with blended score {score:.1f} (fundamental score: {fund_score:.0f}/100). "
            "Indicators not aligned — high risk without clear directional bias."
        )
        confidence = "LOW"

    return {
        **candidate,
        "claude_reasoning": reasoning,
        "claude_confidence": confidence,
        "claude_risk": "Monitor market-wide volatility and sector rotation risk.",
    }
