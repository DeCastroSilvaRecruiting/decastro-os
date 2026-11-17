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
| Nature Farm | An interactive farm estate: six planted growth beds show venture stages, with research cottages, operations barns, farmhouses and studios. Estate view, exploration on foot, optional place labels and expanded view; live sky with warm windows and path lanterns after dusk. Progress layers show Pipeline, Needs you, Done and Empire. |
| Empire progression | XP, eight levels (Founder to Dynasty), weekly streaks, 19 real-world milestones and daily orders, computed only from dated, recorded activity (stage rises, playbook steps, research answered, decisions logged and reviewed, ledger entries, obligations met, suppliers chosen, goods received). Shown on the Tower and the Command Centre |
| Farm exploration | Walk as Matthew or Lizzie, using reference-guided 3D faces, articulated knees and elbows, clothing and wardrobe choices. Visit a workshop to learn, do work, create tasks and review what needs attention. Venture HQ retains the Plan Studio and its business plan sections. |
| Venture plots | Each of the first six ventures has a neighbouring plot linked by ground-level paths. Plots develop with their venture stage. The estate includes vineyard rows, olive orchards, greenhouse, pond and mountain foothills. Use the world map to travel. |
| Art Studio | A queue of 19 artwork slots (Tower title art, portraits of Matthew and Lizzie, every workshop and venture island) with a house style. Each slot has its ChatGPT prompt, **Copy prompt**, **Open ChatGPT** and **Upload**, which fits the image to the slot and commits it to `assets/art` (needs the GitHub token with write access to this repo; otherwise use Upload on GitHub). Claude-drawn placeholders fill every slot until replaced. Optional: the **Generate art** GitHub Action paints slots with the OpenAI API |
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

## Nature Farm world

The `#/engine` route now opens an interactive, grounded nature farm. Venture stages appear as six planted growth beds, departments occupy farm workshops, and neighbouring venture plots connect by ground-level paths. The scene includes an orchard, vineyard, pond, greenhouse and distant hills. Existing tasks, lessons, stage gates, progress layers and wardrobe settings remain available.

Matthew and Lizzie use generated portraits based on supplied reference photos; the original photos are not included. Their procedural 3D avatars have matching broad styling, while the photographic likeness appears in dashboard, department and game portraits.

### Detailed 3D characters and materials

In play mode, **Character view** brings Matthew or Lizzie close to the camera; **Back to farm** restores the walking view. The 3D heads project the existing generated reference portraits onto the face geometry. Skin, linen, hair, timber, plaster, terracotta, gravel, meadow and water use distinct shading. Skin choices and existing wardrobe settings remain available. Trees have leaf canopies; farmhouses include window trim, gutters, foundations and planters, and the pond has reflective water and shoreline details.

The face atlas loads locally from `assets/art/farm-portraits.png` and falls back to shaded features if unavailable. No new network service or dependency is required. Skin uses restrained diffuse shading alongside the generated reference face textures; user-selected skin colors still tint the result. Character Studio isolates the selected character on a neutral floor with soft daylight and a tighter contact-shadow map, so fences and buildings cannot obstruct inspection. Software renderers use reduced shadow resolution and sampling; hardware WebGL retains the higher quality settings. These are detailed procedural models with projected likenesses, not scanned human models. The rebuilt nine-part rig uses a consistent human-scale coordinate system, with distinct body builds, a fitted hair cap and separate upper/lower limbs. Shoulder, elbow, hip and knee pivots remain consistent through the walking cycle.

### Estate controls and validation

The farm now opens directly onto the 3D workspace. **Estate view** restores the overview, **Explore on foot** enters the walking mode, **Place labels** toggles all location names (hover and selection still reveal individual names), and **Expand view** opens a distraction-free, full-window layout without depending on browser fullscreen permissions; press Escape or Close expanded view to return. The welcome panel offers Matthew/Lizzie selection, relevant attention items and workshop destinations; the Empire layer retains detailed XP and milestones.

Buildings face their approach paths. Research cottages have reading verandas, operations use timber barns, property and investment offices use glazed studios, and the main farmhouse has a porch. Windows and path lanterns illuminate at dusk.

For geometry and animation regression checks, run `node tests/scene-smoke.mjs` with Node 22 or later. It covers all wardrobe combinations, generated mesh integrity, joint transforms and workshop routes, collision-aware free exploration and vineyard gates without installing packages. Browser verification additionally checks actual WebGL rendering, face-texture fallback, camera controls, responsive layouts, day/night lighting and workshop arrival.

Free exploration uses local A* routing on open ground. It avoids the pond, growing beds, workshop footprints and fences, with openings through the farm and vineyard. Fixed destinations keep their workshop routes and arrival panels. The sidebar starts with a compact estate welcome view; detailed statistics live in the Empire layer.
