---
title: Procurement Fundamentals: Landed Cost, Incoterms and Negotiation
domain: Business & Ventures
tags: [procurement, sourcing, landed-cost, incoterms, logistics, negotiation, inventory, suppliers]
confidence: medium
summary: Buy on total delivered cost, not unit price: add freight, insurance, duty and handling, know who carries risk under the Incoterm, structure payment to protect your cash, and treat order-quantity maths as a starting point.
created: 2026-11-09
updated: 2026-11-09
pinned: false
sources:
  - U.S. International Trade Administration — Methods of Payment (trade.gov) — https://www.trade.gov/index.php/methods-payment (accessed 2026-11-09) [T1]
  - GW World — Incoterms 2020 summary — https://www.gw-world.com/incoterms (accessed 2026-11-09) [T3]
  - DHL Global Forwarding — Cargo container sizes and types — https://www.dhl.com/us-en/home/global-forwarding/freight-forwarding-education-center/cargo-container-sizes-and-types.html (accessed 2026-11-09) [T3]
  - Lokad — Economic order quantity (EOQ): definition and formula — https://lokad.com/economic-order-quantity-eoq-definition-and-formula (accessed 2026-11-09) [T3]
---
# Procurement Fundamentals: Landed Cost, Incoterms and Negotiation

> **Bottom line:** The cheapest unit price is rarely the cheapest decision. Compare suppliers on **landed cost** (what the goods cost once they are in your store or on your site), know exactly where **risk** passes under the Incoterm you agree, and arrange payment so that a bad delivery costs you a small deposit, not the order. Order-quantity formulas such as EOQ are useful starting points, not answers.

*Confidence is medium. The Incoterms, container and EOQ material comes from secondary sources and the official ICC rules were not reachable, so check the contract wording against the ICC text. The payment-method ranking comes from a US government source (Tier 1). UAE duty and VAT figures are carried over from [[Amazon FBA from China: Model, Rules and Economics]], which rests on secondary sources, and Dubai Customs and the Federal Tax Authority must confirm them for your product. Nothing here is a quote or a live price.*

## Context
The owner is building four ventures that all buy things: leather, canvas and hardware for DCS Golf; fencing, feed and equipment for the Al Ain farm; gifts, print and catering for Wednesday Circuit; and finished products for the Amazon store. The Procurement engine in De Castro OS applies one method to all of them. This article explains the method and where each step can go wrong.

## 1. Landed cost
Landed cost is everything you pay to get the goods to the point where you can use or sell them.

| Component | What it is | Who usually pays (depends on Incoterm) |
|---|---|---|
| Goods | Unit price × quantity | You |
| Origin charges | Pick-up, export clearance, port handling | Seller or you |
| Main freight | Sea, air or road leg | Seller or you |
| Insurance | Cover for the goods in transit | Seller or you |
| Customs duty | A percentage of the customs value (CIF in the UAE for most goods) | You (importer) |
| Import VAT | On goods plus freight plus duty; recoverable if you are VAT-registered | You, then reclaim |
| Destination handling | Port or airport fees, broker, trucking | You |
| Inspection, testing, other | Pre-shipment inspection, certificates | You |

**Worked example (illustrative, not a quote).** Goods AED 10,000 for 1,000 units; sea freight AED 800 and insurance AED 50 (CIF value AED 10,850); duty at 5% of CIF is AED 542.50; destination handling AED 300. **Landed cost AED 11,692.50, or AED 11.69 a unit against a unit price of AED 10.00: a 17% uplift.** Import VAT at 5% on CIF plus duty is AED 569.63. If you are VAT-registered you reclaim it, so it is not a cost, but you must find the cash at the border: about **AED 12,262** in total. The 5% duty and 5% VAT rates are the usual UAE figures as reported by secondary sources in 2026; the duty rate depends on the product's customs code and can differ.

Judgement: when two quotes are within about 10% on unit price, freight, duty and payment terms usually decide the result. The engine's quote comparison therefore converts every quote to landed cost before scoring it.

## 2. Incoterms 2020: who carries what
An Incoterm says where the seller's responsibility ends and who pays for each stage. The table summarises one freight firm's reading of the rules; the official text is the International Chamber of Commerce's Incoterms 2020, which governs.

| Rule | Mode | Risk passes to you | Notes |
|---|---|---|---|
| EXW | Any | When the seller makes the goods available at its premises | You arrange everything, including export clearance |
| FCA | Any | When loaded on your vehicle, or handed to your carrier at the named place | Seller clears export |
| FAS | Sea only | Alongside the ship at the port of shipment | |
| FOB | Sea only | When loaded on the ship at the port of shipment | Common in China sourcing |
| CFR | Sea only | On board the ship at the port of shipment | Seller pays freight to the destination port, **risk has already passed to you** |
| CIF | Sea only | On board the ship at the port of shipment | As CFR, with the seller buying minimum cover (Institute Cargo Clauses C) |
| CPT | Any | When handed to the seller's chosen carrier | Seller pays freight to the destination |
| CIP | Any | When handed to the seller's chosen carrier | As CPT, with comprehensive cover (Institute Cargo Clauses A) |
| DAP | Any | At the named place, ready to unload | Seller pays transport; you handle import clearance |
| DPU | Any | At the named place, once unloaded | Seller also unloads |
| DDP | Any | At the named place, ready to unload, duties paid | Seller handles import clearance and duty |

Three practical points:
- Under CFR, CIF, CPT and CIP the seller pays for the main transport but the risk passes much earlier. **Insure the goods yourself** or make sure the seller's cover names you as beneficiary at a level you accept: CIF's minimum cover is narrow.
- Name the place exactly ("FOB Ningbo", not just "FOB"). The place decides who pays for which charge.
- DDP sounds easy, but a seller importing into the UAE needs its own importer registration. Ask who is the importer of record and who is responsible if customs holds the goods.

## 3. Freight modes and containers
- **Sea** is cheapest per kilo and slowest. Less-than-container-load (LCL) is charged by weight or volume, whichever is greater. A full container is a flat rate, which pays when the shipment fills a good share of it.
- **Air** is faster and costs more per kilo. It is charged on the greater of actual and volumetric weight. The usual convention is 6,000 cm³ per kg for air freight and 5,000 cm³ per kg for express couriers, but carriers set their own: confirm with your forwarder.
- **The break-even** between sea and air is the capital tied up in the goods for the extra days, plus any lost sales while waiting. The engine's Logistics tab compares total cost including interest on stock in transit.

**Containers (approximate, as published by DHL, accessed Nov 2026):** a 20-foot standard container holds about 33 m³ inside with a payload near 28,230 kg; a 40-foot high-cube holds about 76 m³ with a payload near 26,330 kg. Dense goods hit the weight limit before the space limit; bulky goods do the opposite. A 40-foot standard container is not on that page: the app's figure for it is approximate. Carriers and container makers vary, so confirm the figures before you plan a load. Plan on about 85% practical fill.

## 4. Payment terms and protecting your cash
The US International Trade Administration describes four main methods and says that risk moves between buyer and seller as you go along the list:

| Method | How it works | Main risk |
|---|---|---|
| Cash in advance | Buyer pays before the goods ship | **Buyer:** the goods may not ship, or be wrong |
| Letter of credit | Buyer's bank pays the seller once stated documents are presented | Cost and paperwork; relies on bank creditworthiness |
| Documentary collection | Banks pass documents against payment or acceptance | Banks verify nothing and offer limited recourse |
| Open account | Goods ship first, payment follows in 30, 60 or 90 days | **Seller:** the buyer may not pay |

A new buyer of a new supplier's goods is usually the weaker party and will often be asked for cash in advance or a large deposit. Practical protections that follow from the above: keep the deposit small, link the balance to an independent inspection, and use a payment route that gives you recourse. Whether a platform's escrow or buyer-protection scheme applies to your order is something to read in its own terms; this article does not verify any scheme.

**What a term really costs (the engine's Tools tab).**
- A deposit paid long before shipment is a free loan to the supplier: cost ≈ deposit % × your cost of capital × (days ÷ 365).
- An early-payment discount of 2/10 net 30 is worth about **37% a year** (2 ÷ 98 × 365 ÷ 20) to the buyer who takes it. If your cost of capital is lower than that, take the discount.

## 5. Negotiation
Judgement, from standard practice rather than a cited source:
1. **Know the walk-away price** before you speak: the landed cost of your next-best supplier, plus the cost of switching.
2. **Build a should-cost**: estimate material, labour and overhead, add a fair margin, and treat the gap to the quote as a question to ask rather than proof of overcharging.
3. **Trade, don't just push.** Volume commitments, longer contracts, faster payment, simpler specifications and flexible delivery dates are worth money to a supplier. Ask what each is worth to them.
4. **Get at least three comparable quotes** against one written specification, and keep the specification identical.
5. **Put it in writing**: specification and tolerances, inspection rights, ownership of tooling and designs, delivery date and the remedy for being late. A lawyer should review any supply contract of value.

## 6. How much to order
The classic economic order quantity (Wilson) formula is **Q = √(2 × D × S ÷ H)**, where D is annual demand, S the fixed cost of placing an order and H the annual cost of holding one unit. Its assumptions are known, steady demand, a flat ordering cost, a fixed lead time and no price discounts. Reference case: D = 12,000, S = 50, unit cost 10 and holding at 20% give Q ≈ 775, about 15 orders a year.

**Limits.** Real demand is uneven, discounts exist and ordering costs are not always flat. One supplier of inventory software argues that EOQ is dated and should not be used as the main method; the model can still fit where each order triggers a production set-up. Treat EOQ as a sanity check against ordering too often (high handling cost) or too much (cash tied up, ageing stock).

**Reorder point and safety stock (standard textbook form, not separately sourced here).** Reorder point = demand during lead time + safety stock; safety stock ≈ z × σ × √L, where z is the service-level factor (about 1.64 at 95%), σ the daily demand variation and L the lead time in days. Reference case: lead time 30 days, σ = 5 a day gives safety stock of about 45 and a reorder point of about 1,031. The engine's volume-discount tool compares price breaks on total annual cost rather than unit price.

## Key takeaways
- Compare on landed cost; the engine converts each quote before scoring.
- Name the Incoterm and the place, and insure against the risk you hold.
- Keep deposits small and tie the balance to inspection.
- Use EOQ and safety-stock maths as checks, not commands.
- Record every delivery: on-time and quality results are your leverage next time.

## What this means for the empire
- **DCS Golf:** quote leather, canvas, zips and frames from at least two suppliers each against one written specification. Hand-made luxury goods depend on consistent hides and hardware: qualify a second source early, and agree who owns any custom tooling.
- **Al Ain Ostrich Farm:** much equipment and feed may be imported, so landed cost and lead time matter more than catalogue price. Animal, egg and equipment imports carry permits and veterinary conditions: confirm with the authorities and a licensed adviser before any order.
- **Wednesday Circuit:** recurring items (towels, gifts, signage, catering) are where a negotiated annual rate saves the most. Collect two quotes per category before each season.
- **Global Trend Store:** landed cost, duty and payment structure decide whether a product clears the 25% net-margin rule. Use the Logistics and Tools tabs before approving any first order.
- **Treasury:** committed purchase-order payments are known cash outflows: the engine puts them on your deadlines. Fund inventory from the strategic tier, not the reserve (see [[Treasury Liquidity Tiers]]).

## Open questions
- The ICC's own Incoterms 2020 text, to confirm the table above cell by cell (the ICC site could not be fetched).
- UAE customs duty and import VAT treatment by product code, from Dubai Customs and the Federal Tax Authority.
- Typical freight rates and transit times from China and South Africa to Jebel Ali, from forwarder quotes with dates.
- Which supplier-protection schemes apply to which order types, from the schemes' own terms.
- Ostrich-farm import permits and veterinary conditions, from ADAFSA and the Ministry of Climate Change and Environment.

## Related
- [[Amazon FBA from China: Model, Rules and Economics]] — landed cost and UAE duty and VAT applied to a product business
- [[Venture Validation Framework]] — gates before capital is released for stock or equipment
- [[Treasury Liquidity Tiers]] — where purchase commitments should be funded from
- [[Double-Entry Accounting]] — inventory, payables and landed cost in the ledger
- [[UAE Corporate Tax Essentials]] — tax on the margin you earn

## Sources
1. Methods of Payment — U.S. International Trade Administration — https://www.trade.gov/index.php/methods-payment (accessed 2026-11-09) [T1] — the ranking of risk is inferred from the page's descriptions; the page itself gives no explicit ranking
2. Incoterms 2020 — GW World (freight forwarder) — https://www.gw-world.com/incoterms (accessed 2026-11-09) [T3] — a summary; several cells (export clearance for FOB, FAS and the CFR group, and insurance) are not stated on the page and were completed from the ICC rules as generally understood: verify against the ICC text
3. Cargo container sizes and types — DHL Global Forwarding — https://www.dhl.com/us-en/home/global-forwarding/freight-forwarding-education-center/cargo-container-sizes-and-types.html (accessed 2026-11-09) [T3] — carrier education page; lists 20-foot standard and 40-foot high-cube, with payloads labelled approximate
4. Economic order quantity (EOQ): definition and formula — Lokad — https://lokad.com/economic-order-quantity-eoq-definition-and-formula (accessed 2026-11-09) [T3] — a vendor's article that also argues against relying on EOQ
5. Epic Sourcing and BusinessDubai figures on UAE duty and VAT, as cited in [[Amazon FBA from China: Model, Rules and Economics]] [T3] — to be confirmed with Dubai Customs and the Federal Tax Authority
