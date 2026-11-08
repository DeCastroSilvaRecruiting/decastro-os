# De Castro Empire — Start Here

You have two folders. Each becomes one GitHub repository.

| Folder | Repository | Visibility | What it holds |
|---|---|---|---|
| `decastro-os/` | `decastro-os` | Public (free GitHub Pages) | The web app — code only, no data |
| `decastro-vault/` | `decastro-vault` | **Private** | Your wiki, research queue, Claude's manual and your encrypted finances |

Why two? GitHub Pages is free for public repositories, but your research questions and knowledge should stay private. The app holds no data — it reads your private vault with a token only you have.

---

## Step 1 — Create the vault (private)

1. github.com → **New repository** → name `decastro-vault` → **Private** → Create.
2. **Add file → Upload files** → drag in everything *inside* the `decastro-vault` folder (including the `claude`, `queue`, `wiki`, `vault`, `scripts` folders and `CLAUDE.md`) → Commit.

## Step 2 — Publish the app

1. **New repository** → name `decastro-os` → **Public** → Create.
2. Upload everything inside the `decastro-os` folder → Commit.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → Save.
4. After a minute your app is live at `https://<your-username>.github.io/decastro-os/`. Bookmark it on your phone and laptop.

## Step 3 — Give the app a key to your vault

1. GitHub → your avatar → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name: `De Castro OS`. Expiration: 1 year. **Repository access: Only select repositories → `decastro-vault`**.
3. **Permissions → Repository permissions → Contents: Read and write.** Nothing else.
4. Generate and copy the token.
5. In the app: **Settings & Sync** → owner = your username, repository = `decastro-vault`, branch = `main`, paste the token → **Save & test**. The sidebar dot turns green.

The token lives only in that browser. Repeat step 5 on each device (or create one token per device).

## Step 4 — Turn on Claude's research schedule

No API key needed — scheduled tasks run on your Claude subscription in the cloud.

1. Make sure GitHub is connected to your Claude account (Settings → Connectors in claude.ai) with access to `decastro-vault`.
2. In a Claude chat, say: **"Set up the De Castro scheduled tasks for my decastro-vault repo"**, or create them yourself using the three prompts in `decastro-vault/claude/SCHEDULES.md` (also shown in the app under Claude Desk → Scheduled tasks):
   - **Daily research run** — processes up to 3 queued questions each morning
   - **Weekly compounding review** — Sundays: re-verifies, links, distils principles, proposes new questions
   - **Monthly empire briefing** — 1st of the month

Six starter questions are already queued (holding structures, Dubai property costs, Corporate Tax, and diligence on all three ventures), so the first run has work to do.

## Step 5 — Make it yours (first week)

- **Treasury** — add bank accounts (with liquidity tier) and recurring income/outflows → runway and reserves appear.
- **Investments / Property** — add holdings and properties.
- **Legal** — add entities, contracts and compliance dates.
- **Venture Engine** — write each venture's thesis, score it, and list assumptions.
- **Settings → Encrypted vault backup** — choose a long passphrase, store it in your password manager, push.

## Daily rhythm

- **Morning (2 min):** Command Centre — deadlines, next actions, what Claude found overnight.
- **Whenever a question comes up:** *Ask the wiki* — don't google it, compound it.
- **Sunday (15 min):** approve Claude's proposals, update balances, move ventures forward.
- **1st of the month:** read the briefing, record a net-worth snapshot.

---

*The legal, tax and investment content produced by this system is research to inform your own decisions. Confirm regulated matters with a licensed UAE adviser.*
