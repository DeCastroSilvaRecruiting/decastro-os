# De Castro OS

The operating system of the De Castro Empire — one place to originate and execute ventures, compound business knowledge, and run finance, treasury, property, investments, legal and decision mathematics.

**Zero dependencies, zero build step, zero server.** Plain HTML, CSS and JavaScript modules, hosted free on GitHub Pages.

## Modules

| Module | What it does |
|---|---|
| Command Centre | Net worth, liquidity, runway, deadlines, next venture actions, latest research |
| Venture Engine | Stage pipeline, weighted 100-point scoring, assumption mapping with "test next", tasks, unit economics, one-click diligence from Claude |
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
  seed.js         initial state
  views/*.js      one file per module
starter/          a copy of the vault's starter wiki and queue, used in local mode
```

Extending it: add a view in `assets/js/views/`, register it in `ROUTES` and `NAV` in `app.js`. Add a record type by adding a schema in `schemas.js` and a collection in `seed.js`.
