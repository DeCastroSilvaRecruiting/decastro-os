---
title: Kelly Criterion and Position Sizing
domain: Investing
tags: [risk, position-sizing, kelly, mathematics]
confidence: high
summary: Kelly gives the growth-maximising stake for a bet with an edge, but practitioners use half or less because inputs are uncertain and full Kelly is very volatile.
created: 2026-11-07
updated: 2026-11-07
sources:
  - J. L. Kelly Jr — A New Interpretation of Information Rate, Bell System Technical Journal 35(4), 1956 [T1]
  - Edward O. Thorp — The Kelly Criterion in Blackjack, Sports Betting and the Stock Market (2006), in Handbook of Asset and Liability Management [T1]
  - L. C. MacLean, E. O. Thorp & W. T. Ziemba (eds.) — The Kelly Capital Growth Investment Criterion (2011) [T1]
---
# Kelly Criterion and Position Sizing

> **Bottom line:** For a bet that wins *b* times the stake with probability *p* and loses the stake otherwise, the stake that maximises long-run growth is **f* = p − (1 − p)/b** of capital. Because your *p* is an estimate and full Kelly swings wildly, size at half Kelly or less — and never bet when f* ≤ 0.

## The formula
- Simple bet (lose 100% of stake when wrong): **f* = p − q/b**, where q = 1 − p.
- If you lose only a fraction *a* of the stake when wrong: **f* = p/a − q/b**.
- For a continuous investment with excess return μ and volatility σ: **f* ≈ μ / σ²**.

## Worked example
A deal you estimate wins 55% of the time and returns 1.5× what you risk, losing the stake otherwise:
f* = 0.55 − 0.45/1.5 = **0.25** → full Kelly risks 25% of the pool, half Kelly 12.5%, quarter Kelly 6.25%.
On an AED 500,000 risk pool, half Kelly is AED 62,500.

## Why fractional Kelly
- **Estimation error**: overestimating *p* by a few points can turn the optimal bet into an overbet. Overbetting at twice Kelly gives roughly zero long-run growth with huge volatility.
- **Drawdowns**: even at full Kelly, there is a high chance of losing half your capital at some point. Half Kelly keeps about three-quarters of the growth rate with much lower volatility (Thorp; MacLean, Thorp & Ziemba).
- **Real life is not repeated coin flips**: business and property bets are lumpy, correlated and illiquid. That argues for even smaller fractions.

## Key takeaways
- No edge (f* ≤ 0) → no bet.
- Use half Kelly or less as a ceiling, not a target.
- Correlated bets should be sized as one bet.
- The bigger the uncertainty in your estimate, the smaller the stake.

## What this means for the empire
Use Kelly as a sanity check on concentration: if a single venture or property would be more than a quarter-Kelly stake of your deployable capital, either reduce it, find partners, or stage the investment so later tranches depend on validated milestones. Try it in the Mastermind Lab.

## Related
- [[Compounding and the Rule of 72]]
- [[Empire Principles]]
- [[Venture Validation Framework]] — staging capital behind validated assumptions

## Sources
1. Kelly (1956), *Bell System Technical Journal* 35(4) [T1]
2. Thorp (2006), *Handbook of Asset and Liability Management* [T1]
3. MacLean, Thorp & Ziemba (eds., 2011), *The Kelly Capital Growth Investment Criterion* [T1]
