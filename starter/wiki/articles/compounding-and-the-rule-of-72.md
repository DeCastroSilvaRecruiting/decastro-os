---
title: Compounding and the Rule of 72
domain: Mathematics & Decisions
tags: [compounding, mathematics, investing, time-value-of-money]
confidence: high
summary: Growth multiplies rather than adds; the rule of 72 estimates doubling time, and time in the market matters more than the starting amount.
created: 2026-11-07
updated: 2026-11-07
sources:
  - Richard A. Brealey, Stewart C. Myers & Franklin Allen — Principles of Corporate Finance, ch. 2 (time value of money) [T1]
  - Luca Pacioli — Summa de arithmetica (1494), earliest known statement of the rule of 72 [T1]
---
# Compounding and the Rule of 72

> **Bottom line:** Money growing at rate *r* for *n* years becomes P × (1 + r)ⁿ. Because the exponent is time, the years you stay invested matter more than almost anything else. Divide 72 by the annual percentage return to estimate how many years it takes to double.

## The formula

- Future value: **FV = PV × (1 + r)ⁿ**
- With regular monthly contributions *C* at monthly rate *i = r/12*: **FV = PV(1+i)ᵐ + C × ((1+i)ᵐ − 1) / i**, where *m* is the number of months.
- Exact doubling time: **ln 2 / ln(1 + r)**. Rule of 72 approximation: **72 / (r × 100)**.

| Annual return | Rule of 72 | Exact doubling |
|---|---|---|
| 4% | 18.0 yrs | 17.7 yrs |
| 6% | 12.0 yrs | 11.9 yrs |
| 8% | 9.0 yrs | 9.0 yrs |
| 12% | 6.0 yrs | 6.1 yrs |

## Worked example (AED)

Start with AED 100,000, add AED 5,000 a month, earn 8% a year compounded monthly:

| Years | Invested | Value (approx.) |
|---|---|---|
| 10 | 700,000 | 1.14m |
| 20 | 1.30m | 3.43m |
| 30 | 1.90m | 8.55m |

In years 21–30 the portfolio grows by about AED 5.1m while you add only AED 600k — the growth itself is doing the work. Use the **Compound growth** calculator in the Mastermind Lab to run your own numbers.

## The three enemies of compounding
1. **Interruption** — selling in a panic, withdrawing early, or a loss large enough to reset the base. A 50% loss needs a 100% gain to recover.
2. **Fees and tax drag** — 1% a year of costs over 30 years consumes roughly a quarter of the final value at an 8% gross return.
3. **Inflation** — compound in *real* terms. A nominal 6% with 3% inflation doubles purchasing power in about 24 years, not 12.

## Key takeaways
- Time is the exponent; start early and do not interrupt.
- Rule of 72 is a fast mental check for any return claim.
- Protect the base: avoiding large losses is worth more than chasing high returns.
- Costs compound too — against you.

## What this means for the empire
Ventures, property and portfolio should each be judged on the rate they can compound capital *and* how reliably they avoid resets. A slower, steadier engine often wins over a decade. See [[Empire Principles]] (principles 1 and 4).

## Related
- [[Kelly Criterion and Position Sizing]] — how to size bets so compounding survives
- [[Treasury Liquidity Tiers]] — reserves stop you being forced to interrupt

## Sources
1. Brealey, Myers & Allen — *Principles of Corporate Finance*, ch. 2 [T1]
2. Luca Pacioli — *Summa de arithmetica, geometria, proportioni et proportionalità* (1494) [T1]
