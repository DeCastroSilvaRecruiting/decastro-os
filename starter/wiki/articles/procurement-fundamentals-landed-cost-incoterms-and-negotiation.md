---
title: Procurement Fundamentals: Landed Cost, Incoterms and Negotiation
domain: Business & Ventures
tags: [procurement, sourcing, landed-cost, incoterms, logistics, negotiation, inventory, suppliers, customs, import-vat, containers]
confidence: medium
summary: Buy on total delivered cost, not unit price. Add freight, insurance, 5% duty on CIF and handling. Know where risk passes under the Incoterm (ICC says FOB and CIF do not suit containers; FCA does). Register for VAT so import VAT goes through the return rather than out of your cash at the border. Structure payment to protect your cash, and treat order-quantity maths as a starting point.
created: 2026-11-09
updated: 2026-11-16
pinned: false
sources:
  - U.S. International Trade Administration — Methods of Payment (trade.gov) — https://www.trade.gov/index.php/methods-payment (accessed 2026-11-09) [T1]
  - U.S. International Trade Administration — Know Your Incoterms (print version) — https://www.trade.gov/print/pdf/node/79 (accessed 2026-11-16) [T1]
  - ICC Academy — Insider thoughts: Bob Ronai on Incoterms 2020 rules, what are they about — https://academy.iccwbo.org/incoterms/article/insider-thoughts-bob-ronai-on-incoterms-2020-rules-what-are-they-about (accessed 2026-11-16) [T1]
  - ICC Knowledge 2 Go library — Incoterms 2020 vs 2010 — https://library.iccwbo.org/clp/clp-incoterms-2020vs2010.htm (accessed 2026-11-16) [T1]
  - Dubai Customs — FAQ — https://www.dubaicustoms.gov.ae/en/mobile/Pages/faq.aspx (accessed 2026-11-16) [T1]
  - UAE Ministry of Justice eLaws — Federal Decree-Law No. 8 of 2017 on VAT, Arts. 35, 48, 49 — https://elaws.moj.gov.ae/UAE-MOJ_LC-En/00_TAXES/UAE-LC-En_2017-08-23_00008_Markait.html?val=EL1 (accessed 2026-11-16) [T1]
  - UAE Government portal / FTA — VAT guide for importers — https://u.ae/-/media/Information-and-services/Finance-and-Investment/VAt-guidelines/fta-importers-Eng.pdf (undated; accessed 2026-11-16) [T1]
  - Maersk — What is the weight limit for the cargo? — https://www.maersk.com/support/faqs/cargo-weight-limit (accessed 2026-11-16) [T2]
  - Zoho Books UAE — Imports under VAT FAQ — https://www.zoho.com/ae/books/vat/faq/imports (accessed 2026-11-16) [T3]
  - GW World — Incoterms 2020 summary — https://www.gw-world.com/incoterms (accessed 2026-11-09) [T3]
  - DHL Global Forwarding — Cargo container sizes and types — https://www.dhl.com/us-en/home/global-forwarding/freight-forwarding-education-center/cargo-container-sizes-and-types.html (accessed 2026-11-09) [T3]
  - Lokad — Economic order quantity (EOQ): definition and formula — https://lokad.com/economic-order-quantity-eoq-definition-and-formula (accessed 2026-11-09) [T3]
---
# Procurement Fundamentals: Landed Cost, Incoterms and Negotiation

> **Bottom line:** The cheapest unit price is rarely the cheapest decision. Compare suppliers on **landed cost** (what the goods cost once they are in your store or on your site). In Dubai that means adding **5% customs duty on the CIF value** [5]. Know exactly where **risk** passes under the Incoterm you agree. For container cargo the ICC itself steers buyers away from FOB and CIF and towards FCA [3]. **Register for VAT before you import:** a registered importer accounts for import VAT in its return instead of paying it at the border [6][7]. Then arrange payment so that a bad delivery costs you a small deposit, not the whole order.

*Confidence is medium. The 16 Nov 2026 review checked the Incoterms table, the UAE duty rate and valuation basis, the import VAT base and timing, and the container figures against Tier 1 or carrier sources (see the verification log). Freight rates, the EOQ material and the negotiation section are still secondary or judgement. Nothing here is a quote or a live price.*

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
| Customs duty | **5% of the CIF value** for most goods in Dubai; 50% on alcohol and 100% on cigarettes (Dubai Customs, accessed Nov 2026) [5] | You (importer) |
| Import VAT | 5% of the customs value (incl. freight and insurance) plus customs duties and fees and any excise tax (VAT Law Art. 35) [6] | You; a registrant accounts for it in the return [6][7] |
| Destination handling | Port or airport fees, broker, trucking | You |
| Inspection, testing, other | Pre-shipment inspection, certificates | You |

**Worked example (illustrative, not a quote).** Goods AED 10,000 for 1,000 units; sea freight AED 800 and insurance AED 50 (CIF value AED 10,850). Duty at 5% of CIF is AED 542.50. Destination handling is AED 300. **Landed cost is AED 11,692.50, or AED 11.69 a unit, against a unit price of AED 10.00: a 17% uplift.**

Import VAT is 5% × (10,850 + 542.50) = **AED 569.63** [6]. What it costs you depends on whether you are registered:

| | VAT-registered importer (TRN linked to customs code) | Unregistered importer |
|---|---|---|
| Paid at the border | Duty only: AED 542.50 | Duty + VAT: AED 1,112.13 [6][7] |
| Import VAT | Declared in the return due 28 days after the tax period [7], and normally recovered as input tax in the same return (Art. 48) [6] | Paid at import (Art. 49) [6]; **not recoverable** |
| Landed cost per unit | AED 11.69 | **AED 12.26** (+4.9%) |

*Correction (16 Nov 2026):* the 9 Nov version said every importer must "find the cash at the border" for import VAT. That holds only for an unregistered importer. It was already corrected in [[Amazon FBA from China: Model, Rules and Economics]] and is now consistent here. In practice the deferral depends on your customs code being linked to your TRN; [[UAE E-commerce Seller Set-up: Licence, VAT and Corporate Tax]] covers that step. The duty rate depends on the product's customs code: a small number of goods are exempt or carry other rates. Confirm the code with your broker before you price.

Judgement: when two quotes are within about 10% on unit price, freight, duty and payment terms usually decide the result. The engine's quote comparison therefore converts every quote to landed cost before scoring it.

## 2. Incoterms 2020: who carries what
An Incoterm says where the seller's responsibility ends and who pays for each stage. The ICC's Incoterms 2020 text governs. The table below is now checked against the ICC's own material [3][4] and the US International Trade Administration [2].

| Rule | Mode [2] | Delivery, and so risk, passes to you [3] | Notes |
|---|---|---|---|
| EXW | Any | When the seller makes the goods available at its premises | The only rule where **you** handle export clearance [3] |
| FCA | Any | When the seller hands the goods to your carrier at the named place | Seller clears export. You can ask your carrier to issue an on-board bill of lading to the seller, which helps with letters of credit [4] |
| FAS | Sea only | Alongside the ship at the port of shipment | |
| FOB | Sea only | On board the ship at the port of shipment | Common in China quotes, but see below |
| CFR | Sea only | On board the ship at the port of shipment | Seller pays freight to the destination port, but **risk has already passed to you** |
| CIF | Sea only | On board the ship at the port of shipment | As CFR, plus the seller buys minimum cover (Institute Cargo Clauses C) [4] |
| CPT | Any | When handed to the seller's chosen carrier | Seller pays freight to the destination |
| CIP | Any | When handed to the seller's chosen carrier | As CPT, plus the seller must buy wider cover (Institute Cargo Clauses A, raised from C in 2020) [4] |
| DAP | Any | At the named place, ready for unloading; **you** unload [3] | Seller pays transport; you handle import clearance |
| DPU | Any | At the named place, once the seller has unloaded [3] | Replaces the 2010 rule DAT [2][4] |
| DDP | Any | At the named place, ready for unloading, duties paid | The only rule where the **seller** handles import clearance [3] |

Four practical points:
- **For containers, prefer FCA to FOB.** The ICC describes FAS, FOB, CFR and CIF as rules for port-to-port bulk and break-bulk cargo, "not suitable for container shipments in their current form" [3]. The reason is that a container is handed over at a depot or terminal days before it is loaded. Under FOB the goods are then in limbo, still at the seller's risk but outside its control. Our view: FOB still dominates China price lists. You can accept a FOB price and contract **FCA (named container yard or your forwarder's warehouse)**, or at least know that a loss before loading will be argued over.
- **Only CIF and CIP oblige the seller to insure your risk** [3]. Under CFR, CIF, CPT and CIP the seller pays for the main transport, but the risk passes to you at origin. CIF's default cover (Clauses C) is narrow, so **insure the goods yourself** or require Clauses A cover that names you.
- **Name the place exactly** ("FCA Ningbo, [forwarder's warehouse address]", not just "FCA"). The place decides who pays for which charge.
- **DDP sounds easy**, but a seller importing into the UAE needs its own importer registration. Ask who is the importer of record and who is responsible if customs holds the goods. Incoterms do not decide when ownership (title) passes [2]: put that in the contract.

## 3. Freight modes and containers
- **Sea** is cheapest per kilo and slowest. Less-than-container-load (LCL) is charged by weight or volume, whichever is greater. A full container is a flat rate, which pays when the shipment fills a good share of it.
- **Air** is faster and costs more per kilo. It is charged on the greater of actual and volumetric weight. The usual convention is 6,000 cm³ per kg for air freight and 5,000 cm³ per kg for express couriers, but carriers set their own (not verified first-hand this run): confirm with your forwarder.
- **The break-even** between sea and air is the capital tied up in the goods for the extra days, plus any lost sales while waiting. The engine's Logistics tab compares total cost including interest on stock in transit.
- **2026 caveat.** Since early March 2026 the Strait of Hormuz has been effectively closed to container shipping, and it still was in early November. China–UAE boxes are landing at Khor Fakkan, Fujairah or Sohar and trucking to Dubai, with higher freight and longer transit. Figures and sources are in [[China Sourcing Playbook for UAE Private-Label Importers]]. This run could not open a newer status page. Ask every forwarder to name the discharge port and whether trucking is included.

**Containers (Maersk dry steel equipment, accessed Nov 2026) [8]:**

| Container | Internal capacity | Max payload | Practical fill at 85% (Judgement) |
|---|---|---|---|
| 20-foot standard | 33.2 m³ | 28,300 kg | ~28 m³ |
| 40-foot standard | 67.7 m³ | 28,870 kg | ~58 m³ |
| 40-foot high-cube | 76.4 m³ | 28,690 kg | ~65 m³ |

DHL's education page gives a lower 40-foot high-cube payload, about 26,330 kg. Payloads differ by box and builder, and Maersk notes that road weight limits vary by country [8]. For anything dense, plan to the lower figure and get your forwarder's limit for the route. The UAE leg now often includes trucking from an east-coast port, so road limits may bind before the box does. Dense goods hit the weight limit before the space limit; bulky goods do the opposite.

## 4. Payment terms and protecting your cash
The US International Trade Administration describes four main methods [1]. Risk moves between buyer and seller as you go down the list:

| Method | How it works | Main risk |
|---|---|---|
| Cash in advance | Buyer pays before the goods ship | **Buyer:** the goods may not ship, or be wrong |
| Letter of credit | Buyer's bank pays the seller once stated documents are presented | Cost and paperwork; relies on bank creditworthiness |
| Documentary collection | Banks pass documents against payment or acceptance | Banks verify nothing and offer limited recourse |
| Open account | Goods ship first, payment follows in 30, 60 or 90 days | **Seller:** the buyer may not pay |

A new buyer of a new supplier's goods is usually the weaker party and will often be asked for cash in advance or a large deposit. Practical protections that follow from the above: keep the deposit small, link the balance to an independent inspection, and use a payment route that gives you recourse. Whether a platform's escrow or buyer-protection scheme applies to your order is something to read in its own terms; this article does not verify any scheme.

**What a term really costs (the engine's Tools tab).**
- A deposit paid long before shipment is a free loan to the supplier: cost ≈ deposit % × your cost of capital × (days ÷ 365). Example: a 30% deposit on AED 10,000 paid 45 days before shipment, at a 6% cost of capital, costs 3,000 × 6% × 45 ÷ 365 ≈ **AED 22**. That is small next to the risk the deposit carries, which is why the size of the deposit matters more than its timing.
- An early-payment discount of 2/10 net 30 is worth about **37% a year** (2 ÷ 98 × 365 ÷ 20) to the buyer who takes it. If your cost of capital is lower than that, take the discount.

## 5. Negotiation
Judgement, from standard practice rather than a cited source:
1. **Know the walk-away price** before you speak: the landed cost of your next-best supplier, plus the cost of switching.
2. **Build a should-cost**: estimate material, labour and overhead, add a fair margin, and treat the gap to the quote as a question to ask rather than proof of overcharging.
3. **Trade, don't just push.** Volume commitments, longer contracts, faster payment, simpler specifications and flexible delivery dates are worth money to a supplier. Ask what each is worth to them.
4. **Get at least three comparable quotes** against one written specification, and keep the specification identical. Ask for each quote under the **same Incoterm and named place**, or convert them all to landed cost before comparing.
5. **Put it in writing**: specification and tolerances, inspection rights, ownership of tooling and designs, the Incoterm and place, when title passes, delivery date and the remedy for being late. A lawyer should review any supply contract of value.

## 6. How much to order
The classic economic order quantity (Wilson) formula is **Q = √(2 × D × S ÷ H)**, where D is annual demand, S the fixed cost of placing an order and H the annual cost of holding one unit. Its assumptions are known, steady demand, a flat ordering cost, a fixed lead time and no price discounts. Reference case: D = 12,000, S = 50, unit cost 10 and holding at 20% give Q ≈ 775, about 15 orders a year.

**Limits.** Real demand is uneven, discounts exist and ordering costs are not always flat. One supplier of inventory software argues that EOQ is dated and should not be used as the main method; the model can still fit where each order triggers a production set-up. Treat EOQ as a sanity check against ordering too often (high handling cost) or too much (cash tied up, ageing stock). For imports from China, the real "ordering cost" includes inspection (about USD 268–298 a man-day, per the playbook) and freight minimums, which pushes the sensible order size up.

**Reorder point and safety stock (standard textbook form, not separately sourced here).** Reorder point = demand during lead time + safety stock; safety stock ≈ z × σ × √L, where z is the service-level factor (about 1.64 at 95%), σ the daily demand variation and L the lead time in days. Reference case: lead time 30 days, σ = 5 a day gives safety stock of about 45 and a reorder point of about 1,031. With Hormuz rerouting, use the longer lead time: at 60 days, safety stock rises to about 64 and the reorder point to about 2,036. The engine's volume-discount tool compares price breaks on total annual cost rather than unit price.

## Key takeaways
- Compare on landed cost, with 5% duty on CIF; the engine converts each quote before scoring.
- Register for VAT and link your TRN to your customs code before the first import: unregistered, import VAT is a 5%-plus cash cost you cannot recover.
- For container cargo, contract FCA at a named place rather than FOB, and insure the risk you hold.
- Keep deposits small and tie the balance to inspection.
- Use EOQ and safety-stock maths as checks, not commands, and size safety stock to the 2026 lead times.

## What this means for the empire
- **DCS Golf:** quote leather, canvas, zips and frames from at least two suppliers each against one written specification. Hand-made luxury goods depend on consistent hides and hardware: qualify a second source early, and agree who owns any custom tooling. Imported hides and hardware pay 5% duty on CIF. That is a true cost, so price it into the bag's margin. Finished leather goods of Indian origin can enter at 0% under the India–UAE CEPA (with a certificate of origin), so ask Indian workshops for quotes too; see [[Venture Dossier: DCS Golf]].
- **Al Ain Ostrich Farm:** much equipment and feed may be imported, so landed cost and lead time matter more than catalogue price. Animal, egg and equipment imports carry permits and veterinary conditions: confirm with the authorities and a licensed adviser before any order. Feed is dense, so the container weight limit and the road limit will bind before the volume does.
- **Wednesday Circuit:** recurring items (towels, gifts, signage, catering) are where a negotiated annual rate saves the most. Collect two quotes per category before each season.
- **Global Trend Store:** landed cost, duty and payment structure decide whether a product clears the 25% net-margin rule. On the worked example, an unregistered importer's landed cost is about 5% higher. That alone can sink a marginal product, so register for VAT (voluntary above AED 187,500) before the first shipment if the numbers are tight; see [[UAE E-commerce Seller Set-up: Licence, VAT and Corporate Tax]] for the trade-off. Ask for FCA quotes alongside FOB.
- **Treasury:** committed purchase-order payments are known cash outflows: the engine puts them on your deadlines. Fund inventory from the strategic tier, not the reserve (see [[Treasury Liquidity Tiers]]).

## Verification log (16 Nov 2026)

| Claim in the 9 Nov version | Result |
|---|---|
| Duty 5% of CIF | **Confirmed** by Dubai Customs [5]; added the alcohol (50%) and cigarette (100%) exceptions |
| Import VAT on goods + freight + duty | **Confirmed and refined:** the base is the customs value including insurance and freight, plus customs duties and fees and excise tax (Art. 35) [6] |
| Import VAT cash "at the border" for all importers | **Corrected:** registrants account in the return (Art. 48; FTA guide) [6][7]; only unregistered importers pay at import (Art. 49) |
| Incoterms delivery points, clearance, insurance | **Confirmed** against ICC [3][4] and ITA [2]. Added that CIP was raised to Clauses A in 2020, that DPU replaced DAT, and the FCA on-board bill of lading option |
| FOB "common in China sourcing" | Kept, with the ICC's warning that FOB and CIF do not suit containers [3] |
| Container figures | **Updated** to Maersk's figures [8]; added the 40-foot standard; noted that DHL's lower high-cube payload disagrees |
| Air volumetric divisors 6,000/5,000 | **Not verified** this run |

## Open questions
- Whether any of the owner's first products fall under an exempt or non-5% customs code. Get an HS-code ruling or ask a broker; Dubai Customs' tariff search is the Tier 1 source.
- Whether the 2017 VAT text quoted here has been renumbered or changed by later amendments, which this run did not check. A tax adviser should confirm the article references before they go in any filing.
- Typical freight rates and transit times from China and South Africa to Dubai under the Hormuz rerouting, from dated forwarder quotes (proposed item "China to UAE freight rates, transit times and forwarder charges: benchmarks").
- Which supplier-protection schemes apply to which order types, from the schemes' own terms.
- Ostrich-farm import permits and veterinary conditions, from ADAFSA and the Ministry of Climate Change and Environment.

## Related
- [[China Sourcing Playbook for UAE Private-Label Importers]] — supplier verification, 30/70 payment and inspection, Hormuz freight, and FOB versus other terms for China orders
- [[Amazon FBA from China: Model, Rules and Economics]] — landed cost and UAE duty and VAT applied to a product business
- [[UAE E-commerce Seller Set-up: Licence, VAT and Corporate Tax]] — VAT registration, TRN and customs-code linking
- [[Venture Validation Framework]] — gates before capital is released for stock or equipment
- [[Treasury Liquidity Tiers]] — where purchase commitments should be funded from
- [[Double-Entry Accounting]] — inventory, payables and landed cost in the ledger
- [[UAE Corporate Tax Essentials]] — tax on the margin you earn
- [[Venture Dossier: Al Ain Ostrich Farm]] — landed cost of imported breeding birds, hatching eggs and feed, and MOCCAE import permits

## Sources
1. Methods of Payment — U.S. International Trade Administration — https://www.trade.gov/index.php/methods-payment (accessed 2026-11-09) [T1] — the ranking of risk is inferred from the page's descriptions; the page itself gives no explicit ranking
2. Know Your Incoterms — U.S. International Trade Administration — https://www.trade.gov/print/pdf/node/79 (no page date; accessed 2026-11-16) [T1] — rule list by mode, DPU replacing DAT, Incoterms do not govern title
3. Insider thoughts: Bob Ronai on Incoterms 2020 rules — ICC Academy — https://academy.iccwbo.org/incoterms/article/insider-thoughts-bob-ronai-on-incoterms-2020-rules-what-are-they-about (accessed 2026-11-16) [T1] — delivery points, clearance, insurance obligation, FAS/FOB/CFR/CIF "not suitable for container shipments"
4. Incoterms 2020 vs 2010 — ICC Knowledge 2 Go library — https://library.iccwbo.org/clp/clp-incoterms-2020vs2010.htm (accessed 2026-11-16) [T1] — CIF Clauses C vs CIP Clauses A, FCA on-board bill of lading, DAT renamed DPU
5. FAQ — Dubai Customs — https://www.dubaicustoms.gov.ae/en/mobile/Pages/faq.aspx (accessed 2026-11-16) [T1] — 5% of CIF, alcohol 50%, cigarettes 100%; customs value based on CIF
6. Federal Decree-Law No. 8 of 2017 on Value Added Tax, Arts. 35, 48, 49 — UAE Ministry of Justice eLaws — https://elaws.moj.gov.ae/UAE-MOJ_LC-En/00_TAXES/UAE-LC-En_2017-08-23_00008_Markait.html?val=EL1 (accessed 2026-11-16) [T1] — original 2017 text; later amendments not checked
7. VAT guide for importers — Federal Tax Authority, via u.ae — https://u.ae/-/media/Information-and-services/Finance-and-Investment/VAt-guidelines/fta-importers-Eng.pdf (undated, written for the 2018 launch; accessed 2026-11-16) [T1] — registrants pay via the return 28 days after the period; unregistered mainland importers pay on import
8. What is the weight limit for the cargo? — Maersk — https://www.maersk.com/support/faqs/cargo-weight-limit (accessed 2026-11-16) [T2] — carrier's own equipment data; "specific weight limits can vary by country"
9. Imports under VAT FAQ — Zoho Books UAE — https://www.zoho.com/ae/books/vat/faq/imports (accessed 2026-11-16) [T3] — supports the reverse-charge treatment; its AED 1,000 low-value split is not adopted here (not found at Tier 1)
10. Incoterms 2020 — GW World (freight forwarder) — https://www.gw-world.com/incoterms (accessed 2026-11-09) [T3] — original table source, now superseded by [2]–[4]
11. Cargo container sizes and types — DHL Global Forwarding — https://www.dhl.com/us-en/home/global-forwarding/freight-forwarding-education-center/cargo-container-sizes-and-types.html (accessed 2026-11-09) [T3] — 40-foot high-cube payload ~26,330 kg, lower than Maersk's
12. Economic order quantity (EOQ): definition and formula — Lokad — https://lokad.com/economic-order-quantity-eoq-definition-and-formula (accessed 2026-11-09) [T3] — a vendor's article that also argues against relying on EOQ
