from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models import Portfolio
from schemas import PortfolioAddRequest, PortfolioResponse, PortfolioStock
from services.market_data import get_current_price, get_sparkline, get_price_change_today
from data.universe import COMPANY_NAMES

router = APIRouter()


@router.get("", response_model=PortfolioResponse)
def get_portfolio(db: Session = Depends(get_db)):
    stocks = db.query(Portfolio).order_by(Portfolio.tracked_since.desc()).all()
    result = []
    for stock in stocks:
        current_price = get_current_price(stock.ticker)
        pct_today = get_price_change_today(stock.ticker)
        sparkline = get_sparkline(stock.ticker, days=14)

        pct_since_tracked = 0.0
        if stock.price_at_track and stock.price_at_track > 0 and current_price > 0:
            pct_since_tracked = round(
                (current_price - stock.price_at_track) / stock.price_at_track * 100, 2
            )

        result.append(
            PortfolioStock(
                ticker=stock.ticker,
                company_name=stock.company_name or COMPANY_NAMES.get(stock.ticker, stock.ticker),
                price_at_track=stock.price_at_track,
                tracked_since=stock.tracked_since,
                current_price=current_price,
                pct_change_today=pct_today,
                pct_change_since_tracked=pct_since_tracked,
                sparkline=sparkline,
            )
        )
    return PortfolioResponse(stocks=result)


@router.post("")
def add_to_portfolio(request: PortfolioAddRequest, db: Session = Depends(get_db)):
    existing = db.query(Portfolio).filter(Portfolio.ticker == request.ticker.upper()).first()
    if existing:
        return {"success": True, "ticker": request.ticker.upper(), "already_tracked": True}

    current_price = get_current_price(request.ticker.upper())
    company_name = request.company_name or COMPANY_NAMES.get(request.ticker.upper(), request.ticker.upper())

    stock = Portfolio(
        ticker=request.ticker.upper(),
        company_name=company_name,
        price_at_track=current_price,
    )
    db.add(stock)
    db.commit()
    return {
        "success": True,
        "ticker": request.ticker.upper(),
        "price_at_track": current_price,
        "already_tracked": False,
    }


@router.delete("/{ticker}")
def remove_from_portfolio(ticker: str, db: Session = Depends(get_db)):
    stock = db.query(Portfolio).filter(Portfolio.ticker == ticker.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not in portfolio")
    db.delete(stock)
    db.commit()
    return {"success": True, "ticker": ticker.upper()}
