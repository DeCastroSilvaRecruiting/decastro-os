---
title: Dubai Property Purchase Costs and Rental Yield Data
domain: Property
tags: [dubai, property, dld, transfer-fee, mortgage, rental-index, yield, ejari, service-charges]
confidence: medium
summary: Budget about 7% of the price on top of the deposit for a mortgaged Dubai resale purchase (DLD 4%, agent 2% + VAT, trustee, mortgage registration 0.25%), and build net yields from DLD's own transaction, Ejari, rental-index and service-charge data rather than listing-based "ROI" figures.
created: 2026-11-08
updated: 2026-11-08
queue_id: q_seed_dxbfees
sources:
  - Dubai Land Department — Request for sale registration (fees) — https://dubailand.gov.ae/en/eservices/request-for-sale-registration (page updated 3 Nov 2026; accessed 2026-11-08) [T1]
  - Dubai Land Department — Request for mortgage registration — https://dubailand.gov.ae/en/eservices/request-for-mortgage-registration/ (updated 3 Nov 2026; accessed 2026-11-08) [T1]
  - Central Bank of the UAE — Regulations Regarding Mortgage Loans (Circular 31/2013) — https://rulebook.centralbank.ae/node/2856 (effective 28 Dec 2013; accessed 2026-11-08) [T1]
  - Central Bank of the UAE — Retail banking fees, Regulation 29/2011 Appendix 2 as amended — https://rulebook.centralbank.ae/node/4067 (effective 8 Oct 2019; accessed 2026-11-08) [T1]
  - Dubai Land Department — Smart Rental Index announcement — https://dubailand.gov.ae/en/news-media/smart-rental-index-announcement (2 Jan 2025; accessed 2026-11-08) [T1]
  - Dubai Land Department — Smart Rental Index explainer — https://dubailand.gov.ae/media/thwlcxn4/smart_rental_index_en.pdf (2025; accessed 2026-11-08) [T1]
  - Government of Dubai — Decree No. 43 of 2013 on rent increases — https://dlp.dubai.gov.ae (in force 18 Dec 2013; accessed 2026-11-08) [T1]
  - Dubai Land Department — Real Estate Data (open data) — https://dubailand.gov.ae/en/open-data/real-estate-data (accessed 2026-11-08) [T1]
  - Dubai Land Department — Service Charge Index — https://dubailand.gov.ae/en/eservices/service-charge-index-overview/ (accessed 2026-11-08) [T1]
  - Cavendish Maxwell / Property Monitor — Dubai residential market Q1 2026 (accessed 2026-11-08) [T2]
  - The National — Banks stop financing DLD fee and agency commission (25 Jan 2025; accessed 2026-11-08) [T2]
  - Entrepreneur Middle East — Bayut H1 2026 Dubai sales report (20 Jul 2026; accessed 2026-11-08) [T2/T3, listing-based]
  - Hadef & Partners — FTA guide on real estate investment for natural persons — https://hadefpartners.com/news-insights/insights/federal-tax-authority-releases-guide-on-real-estate-investment-for-natural-persons-issued-october-2024/ (1 Nov 2024; accessed 2026-11-08) [T2]
  - Property Finder — DLD fees in Dubai — https://www.propertyfinder.ae/blog/dld-fees-dubai/ (modified 3 Jul 2026; accessed 2026-11-08) [T3]
---
# Dubai Property Purchase Costs and Rental Yield Data

> **Bottom line:** On a mortgaged resale purchase, budget roughly **7% of the price in cash on top of the deposit** — mainly the 4% DLD transfer fee, 2% + VAT agency commission, trustee fees and 0.25% mortgage registration — and since February 2025 banks no longer lend against these costs. For yields, ignore listing-based "ROI" headlines: pull actual sale prices and Ejari rents from DLD's open data, subtract the RERA-approved service charge from DLD's Service Charge Index, and compute net yield on *total* cost.

## Context
Decision informed: whether a given Dubai unit earns enough to buy, and how much cash a purchase really ties up. Feeds the inputs of [[Property Investment Metrics]] and the app's Deal analyser.

## Purchase costs (as of Nov 2026)
| Cost | Amount | Who pays | Source |
|---|---|---|---|
| DLD transfer fee | 4% of price — officially **2% seller + 2% buyer**; by market convention the buyer usually pays all 4% (negotiable in the contract) | Contract | [1] T1; [14] T3 |
| Title deed certificate | AED 250 | Buyer | [1] |
| Map fee | AED 225 (DM unified map) or AED 100 (land outside DM) | Buyer | [1] |
| "Villas and apartments" line | AED 250 (unexplained on DLD page) | Buyer | [1] |
| Knowledge + innovation fees | AED 10 + AED 10 | Buyer | [1] |
| Registration trustee (service partner) | AED 4,000 + VAT (price ≥ AED 500k); AED 2,000 + VAT (below) | Buyer | [1] |
| Mortgage registration | 0.25% of loan + AED 250 per deed + AED 20; service partner AED 4,000 + VAT (AED 5,000 + VAT for off-plan/Oqood) | Buyer | [2] |
| Agency commission | Typically 2% + 5% VAT — convention, not regulated | Buyer | [14] T3 |
| Bank valuation | ~AED 2,500–3,500 | Buyer | [14] T3, unverified |
| Developer NOC (resale) | ~AED 500–5,000 + VAT | Seller usually | [14] T3, unverified |

Notes:
- The widely quoted "AED 580 admin fee" and "AED 290 mortgage admin fee" do **not** appear on DLD's fee pages; use DLD's line items. Secondary sources disagree on small fees (The National quotes different trustee figures) — the DLD page wins.
- No Central Bank cap on mortgage **arrangement** fees was found in the retail fees schedule; the cap that exists is on **early settlement**: 1% of outstanding balance or AED 10,000, whichever is lower [4].
- **From 1 Feb 2025** banks stopped financing the DLD fee and agency commission, and LTV applies to property value only [11]. Circular number not found — verify at T1.

### Mortgage limits — Central Bank of the UAE [3]
| Borrower | First home ≤ AED 5m | First home > AED 5m | Second / investment | Off-plan |
|---|---|---|---|---|
| Expat | 80% | 70% | 60% | 50% |
| UAE national | 85% | 75% | 65% | 50% |
Also: debt-burden ratio ≤ 50% of income; max term 25 years. (Some law-firm summaries quote lower draft figures; the Central Bank rulebook text above prevails.)

## Worked example — total cash required (illustrative AED)
Resale apartment, AED 1,500,000, owner buying as an expat **investment** property (60% LTV → loan AED 900,000), buyer pays the full 4%.

| Item | AED |
|---|---|
| Deposit (40%) | 600,000 |
| DLD transfer fee 4% | 60,000 |
| Trustee 4,000 + VAT | 4,200 |
| Title deed + knowledge/innovation | 270 |
| Agency 2% + VAT | 31,500 |
| Mortgage registration 0.25% × 900,000 + 270 | 2,520 |
| Mortgage trustee 4,000 + VAT | 4,200 |
| Valuation (estimate) | 3,000 |
| **Total cash** | **≈ 705,690** |

Transaction costs ≈ **AED 105,700 = 7.0% of price**. If the price only grows 3%/yr, it takes over two years of growth just to recover entry costs — one reason short holds rarely pay in Dubai.

## Rental data — where to get it
1. **Smart Rental Index (DLD, launched 2 Jan 2025)** — built from registered rental contracts with outliers removed; rates buildings on structure, finishes, maintenance, location and services; covers residential areas including free zones but **excludes DIFC**; updated annually; access via the "Rental Index" e-service on dubailand.gov.ae or the Dubai REST app [5][6].
2. **Rent-increase caps** remain those of Decree 43 of 2013, measured against the index average for similar units [7]:

| Current rent vs index average | Max increase on renewal |
|---|---|
| Up to 10% below | 0% |
| 11–20% below | 5% |
| 21–30% below | 10% |
| 31–40% below | 15% |
| > 40% below | 20% |

   DLD's own announcement page cites "Decree 34" and misdescribes the top band — the decree text is authoritative. The 90-day notice rule (Law 26/2007 as amended) was not re-verified this run.
3. **DLD Real Estate Data (open data)** — tabs for Transactions (sales, mortgages, gifts), Rents (Ejari contracts, new vs renewal), Projects, Valuations, Buildings, Units; filter by area, property type, freehold, ready/off-plan; CSV download [8]. Dubai Pulse's transaction dataset page showed a last update of Apr 2024 — check freshness before relying on it.
4. **Service Charge Index (Mollak)** — RERA-approved service charges per project and year, free, on DLD website and Dubai REST [9].

## Yield benchmarks (secondary, as of 2026)
- **Cavendish Maxwell / Property Monitor, Q1 2026:** citywide gross yield **7.2% apartments, 5.0% villas**; rents AED 76.1/sq ft (+10.2% y/y); prices AED 1,683/sq ft (+9.6% y/y, slowest since 2022–23). Highest apartment yields in International City and Downtown Jebel Ali; villas in Al Barari, Dubai Industrial City, DAMAC Hills 2 [10].
- **Bayut H1 2026 (listing-based "projected ROI"):** apartments Discovery Gardens 9.06%, Al Furjan 7.69%, Sobha Hartland 6.41%; villas DAMAC Hills 2 5.97%, Jumeirah Golf Estates 6.04% [12]. Listing-based — use only to shortlist.
- Our view: rents (+10.2%) and prices (+9.6%) grew at almost the same pace, so gross yields were roughly flat in Q1 2026. Because renewals are capped by the index bands, in-place rent on an existing tenancy can lag market rent for years — model renewals, not asking rents.

## Method: net yield by community from DLD data
1. Pull 12 months of **sales** for the building/community (Transactions tab) → median AED/sq ft.
2. Pull 12 months of **Ejari rents** for the same building and unit type (Rents tab, prefer "New" contracts for market rent).
3. Look up the **service charge** (AED/sq ft) in the Service Charge Index.
4. Net yield = (rent × (1 − vacancy) − service charge − maintenance − management − insurance) ÷ (price + ~7% acquisition costs).
5. Cross-check against the Smart Rental Index average to see where renewal caps will bite.

Example (illustrative): 1,000 sq ft at AED 1,500/sq ft = AED 1.5m; Ejari median AED 108,000 (7.2% gross); service charge AED 18/sq ft = 18,000; 5% vacancy, 5% management, AED 3,000 maintenance → NOI ≈ 102,600 − 18,000 − 5,130 − 3,000 = **AED 76,470** → **5.1% on price, 4.8% on total cost** (1,605,690).

## Running costs and tax
- **Housing fee:** tenants pay 5% of annual Ejari rent via DEWA; owner-occupiers pay on the index rental value (T3 source only — verify).
- **Tax:** an individual's rental income from UAE property is outside Corporate Tax at any amount when no licence is needed; Ejari is not a licence, but a holiday-home permit is [13]. See [[UAE Corporate Tax Essentials]] and [[UAE Holding Structures]].

## Key takeaways
- Cash needed ≈ deposit + ~7% of price; costs can no longer be financed.
- The official DLD transfer fee is 2% + 2%; who pays the 4% is negotiable.
- Investment LTV for expats is 60% — plan 40% deposit.
- Use DLD Ejari + transaction + service charge data; listing "ROI" figures overstate.
- Renewal caps under Decree 43 mean in-place rent can trail market rent.

## What this means for the empire
- Size property cash reserves for **47% of price** (40% deposit + 7% costs) on any investment purchase, kept separate from venture capital per [[Treasury Liquidity Tiers]].
- Only buy where **net yield on total cost** exceeds the mortgage rate plus a margin — at today's rates the 4.8% example is thin.
- Negotiate the seller paying their official 2% in a buyer's market — on AED 1.5m that is AED 30,000 saved.
- Hold personally unless there is a structuring reason (see [[UAE Holding Structures]]).

## Open questions
- Current mortgage rates (EIBOR + margin) for investment loans — not covered this run.
- Oqood (off-plan) registration fee percentage and developer admin fees at T1.
- Central Bank circular behind the Feb 2025 fee-financing change.
- Whether Dubai Pulse is still updated or replaced by data.dubai.

## Related
- [[Property Investment Metrics]] — the formulas these inputs feed
- [[UAE Holding Structures]] — whether to buy personally or via an entity
- [[UAE Corporate Tax Essentials]] — rental income and licensing
- [[Treasury Liquidity Tiers]] — where deposit and reserve cash sits

## Sources
1. Dubai Land Department — Request for sale registration — https://dubailand.gov.ae/en/eservices/request-for-sale-registration (updated 3 Nov 2026; accessed 2026-11-08) [T1]
2. Dubai Land Department — Request for mortgage registration — https://dubailand.gov.ae/en/eservices/request-for-mortgage-registration/ (updated 3 Nov 2026; accessed 2026-11-08) [T1]
3. Central Bank of the UAE — Regulations Regarding Mortgage Loans, Art. 3 — https://rulebook.centralbank.ae/node/2856 (effective 28 Dec 2013; accessed 2026-11-08) [T1]
4. Central Bank of the UAE — Retail banking fees schedule — https://rulebook.centralbank.ae/node/4067 (effective 8 Oct 2019; accessed 2026-11-08) [T1]
5. Dubai Land Department — Smart Rental Index announcement — https://dubailand.gov.ae/en/news-media/smart-rental-index-announcement (2 Jan 2025; accessed 2026-11-08) [T1]
6. Dubai Land Department — Smart Rental Index explainer — https://dubailand.gov.ae/media/thwlcxn4/smart_rental_index_en.pdf (accessed 2026-11-08) [T1]
7. Government of Dubai — Decree No. 43 of 2013 — https://dlp.dubai.gov.ae (accessed 2026-11-08) [T1]
8. Dubai Land Department — Real Estate Data — https://dubailand.gov.ae/en/open-data/real-estate-data (accessed 2026-11-08) [T1]
9. Dubai Land Department — Service Charge Index — https://dubailand.gov.ae/en/eservices/service-charge-index-overview/ (accessed 2026-11-08) [T1]
10. Cavendish Maxwell with Property Monitor — Dubai residential market performance Q1 2026 (accessed 2026-11-08) [T2]
11. The National — Dubai mortgage rule change on fees (25 Jan 2025; accessed 2026-11-08) [T2]
12. Entrepreneur Middle East — Bayut H1 2026 report (20 Jul 2026; accessed 2026-11-08) [T2/T3, listing-based]
13. Hadef & Partners — FTA real estate investment guide — https://hadefpartners.com/news-insights/insights/federal-tax-authority-releases-guide-on-real-estate-investment-for-natural-persons-issued-october-2024/ (1 Nov 2024; accessed 2026-11-08) [T2]
14. Property Finder — DLD fees in Dubai — https://www.propertyfinder.ae/blog/dld-fees-dubai/ (3 Jul 2026; accessed 2026-11-08) [T3]
