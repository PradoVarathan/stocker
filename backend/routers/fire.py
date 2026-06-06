from fastapi import APIRouter
from schemas import FireRequest, FireResponse, YearRow

router = APIRouter()

SAFE_WITHDRAWAL_RATE = 0.04


@router.post("/calculate", response_model=FireResponse)
def calculate_fire(req: FireRequest):
    r = req.expected_return_pct / 100

    fire_number = req.annual_expenses * 25
    conservative_fire_number = req.annual_expenses * 33
    lean_fire_number = req.annual_expenses * 20

    annual_savings = req.current_income * (req.savings_rate_pct / 100)
    general_annual = max(
        0.0,
        annual_savings - req.roth_annual_contribution - req.k401_annual_contribution,
    )

    portfolio = req.current_savings
    roth = req.roth_current_balance
    k401 = req.k401_current_balance

    year_by_year: list[YearRow] = []
    fire_age = None
    years_to_fire = None

    max_age = max(req.target_retirement_age + 30, req.current_age + 50)

    for age in range(req.current_age + 1, max_age + 1):
        portfolio = portfolio * (1 + r) + general_annual
        roth = roth * (1 + r) + req.roth_annual_contribution
        k401 = k401 * (1 + r) + req.k401_annual_contribution + req.k401_employer_match

        total = portfolio + roth + k401
        year_by_year.append(
            YearRow(
                age=age,
                portfolio=round(portfolio, 2),
                roth=round(roth, 2),
                k401=round(k401, 2),
                total=round(total, 2),
            )
        )

        if fire_age is None and total >= fire_number:
            fire_age = age
            years_to_fire = age - req.current_age

    retirement_row = next((row for row in year_by_year if row.age == req.target_retirement_age), None)
    if retirement_row is None and year_by_year:
        retirement_row = year_by_year[-1]

    total_at_retirement = retirement_row.total if retirement_row else 0.0
    annual_safe_withdrawal = total_at_retirement * SAFE_WITHDRAWAL_RATE
    monthly_income = annual_safe_withdrawal / 12

    is_achievable = fire_age is not None and fire_age <= req.target_retirement_age

    return FireResponse(
        fire_number=round(fire_number, 2),
        conservative_fire_number=round(conservative_fire_number, 2),
        lean_fire_number=round(lean_fire_number, 2),
        years_to_fire=years_to_fire,
        fire_age=fire_age,
        is_fire_achievable=is_achievable,
        projected_total_at_retirement=round(total_at_retirement, 2),
        projected_portfolio_at_retirement=round(retirement_row.portfolio if retirement_row else 0, 2),
        projected_roth_at_retirement=round(retirement_row.roth if retirement_row else 0, 2),
        projected_401k_at_retirement=round(retirement_row.k401 if retirement_row else 0, 2),
        monthly_income_in_retirement=round(monthly_income, 2),
        annual_safe_withdrawal=round(annual_safe_withdrawal, 2),
        year_by_year=year_by_year,
    )
