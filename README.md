# De Castro OS

The operating system of the De Castro Empire — one place to originate and execute ventures, compound business knowledge, and run finance, treasury, property, investments, legal and decision mathematics.

**Zero dependencies, zero build step, zero server.** Plain HTML, CSS and JavaScript modules, hosted free on GitHub Pages.

## Modules

| Module | What it does |
|---|---|
| Command Centre | Net worth, liquidity, runway, deadlines, next venture actions, latest research |
| Idea Scout | Opportunities ranked against your skills, network and current ventures; Claude's twice-weekly scout adds sourced business ideas and product leads; one click turns an idea into a venture with its own playbook |
| Venture Engine | Stage pipeline, weighted 100-point scoring, assumption mapping with "test next", tasks, unit economics, one-click diligence from Claude. Each venture has a workspace: a stage-by-stage playbook (who does each step: you, a delegate, Claude or an app tool), stage gates, KPIs and related wiki knowledge |
| Commerce Lab | The China-to-Amazon store workbench: product pipeline and scorecard with red flags, Amazon.ae margin and landed-cost calculator, supplier vetting checklist, automation map (hours you keep vs delegate), 24-month cash forecast, dated rules and fees |
| Procurement | One engine for everything the ventures buy: item catalogue and price book with history, requests for quotes with landed-cost comparison and weighted scoring, purchase orders (payment schedule, shipping, receipt, true landed cost), a shared supplier register with on-time and quality scorecards, logistics (landed cost, freight mode, container fill, Incoterms) and order-quantity, discount and payment-term tools. Payments, arrivals and quote expiries feed the deadlines. Starter lists for each venture carry no prices |
| The Tower | Interactive 3D living building: six stage floors rise from a seed vault to a canopy crown, every module is a pavilion bridged to the floors it powers; stage gates, readiness rings and one-click advance |
| Knowledge Wiki | Sourced, dated, confidence-rated articles with wiki links, backlinks and stale flags |
| Claude Desk | Research queue shared with Claude's scheduled tasks; approve Claude's proposals; copy prompts |
| Treasury | Cash by liquidity tier vs targets, runway, recurring flows, 12-month forecast, FX |
| Investments | Holdings, allocation vs target, drift and rebalance amounts, P&L |
| Property | Portfolio metrics (net yield, CoC, DSCR, LTV) and a full deal analyser with IRR |
| Accounting | Double-entry journal per entity, quick entries, P&L, balance sheet, trial balance, chart of accounts |
| Legal & Entities | Entity register and group structure tree, contract register with notice deadlines, rolling compliance calendar |
| Mastermind Lab | Compound growth, loans, NPV/IRR, DCF, Kelly, expected value, break-even, CAGR; decision journal with Brier calibration; mental models |

## Where data lives

- **Your finances** — in your browser (localStorage), optionally backed up to the vault repo **encrypted** with your passphrase.
- **Knowledge & queue** — in your private vault repo, read and written through the GitHub API with a fine-grained token that only you hold.
- **This app repo** — contains code only. It is safe for it to be public.

## Run locally

ES modules need a web server (opening `index.html` from disk will not work):

```bash
cd decastro-os
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy on GitHub Pages

Repository → Settings → Pages → Source: *Deploy from a branch* → Branch: `main` / root → Save. Your app will be at `https://<username>.github.io/decastro-os/`.

## Structure

```
index.html
assets/css/app.css
assets/js/
  app.js          shell, router, events
  store.js        state, derived metrics, GitHub client, AES vault
  knowledge.js    wiki + queue engine
  fin.js          financial mathematics (pure functions)
  md.js           Markdown + [[wikilinks]] renderer
  ui.js           formatting, modals, forms, tables, charts
  schemas.js      record definitions + generic CRUD
  prompts.js      Claude scheduled-task prompts
  seed.js         initial state and one-time migrations
  playbooks.js    per-venture guided steps and the automation map
  ideabank.js     idea bank and fit scoring
  ecom.js         Amazon unit economics, product scorecard and cash simulation
  views/*.js      one file per module
starter/          a copy of the vault's starter wiki and queue, used in local mode
```

Extending it: add a view in `assets/js/views/`, register it in `ROUTES` and `NAV` in `app.js`. Add a record type by adding a schema in `schemas.js` and a collection in `seed.js`.
