# Artwork slots

Drop a PNG with one of these exact file names into this folder and De Castro OS shows it automatically. A missing file simply stays hidden. Prompts for each slot, and the shared style, are in `slots.json`.

| File | Where it appears | Best size |
|---|---|---|
| `title.png` | Tower page banner | 1536x640 |
| `matthew.png` | Matthew character portrait | 1024x1024 |
| `lizzie.png` | Lizzie character portrait | 1024x1024 |
| `ws-hq.png` | Venture HQ · Plan Studio | 1536x640 |
| `ws-wiki.png` | Knowledge Wiki · Learning Centre | 1536x640 |
| `ws-claude.png` | Claude Desk | 1536x640 |
| `ws-math.png` | Mastermind Lab | 1536x640 |
| `ws-legal.png` | Legal & Entities | 1536x640 |
| `ws-treasury.png` | Treasury | 1536x640 |
| `ws-finance.png` | Finance & Accounting | 1536x640 |
| `ws-investments.png` | Investments | 1536x640 |
| `ws-property.png` | Property | 1536x640 |
| `ws-procure.png` | Procurement Yard | 1536x640 |
| `ws-commerce.png` | Commerce Hub | 1536x640 |
| `island-atelier.png` | DCS Golf island (Golf Atelier) | 1536x640 |
| `island-course.png` | Wednesday Circuit island (Circuit Course) | 1536x640 |
| `island-farm.png` | Al Ain Ostrich Farm island | 1536x640 |
| `island-port.png` | Global Trend Store island (Trade Port) | 1536x640 |
| `island-generic.png` | Any other venture island | 1536x640 |

Every slot starts with a placeholder illustration drawn by Claude (`placeholders.json` records their sizes so the Art Studio can tell them apart from your own art).

## Ways to add art

0. **Art Studio in the app (no credits).** Open **Art Studio**, copy a slot's prompt into ChatGPT on your normal plan, then tap **Upload** on the slot.

1. **Upload by hand.** Make the image in ChatGPT, save it as PNG with the file name above, then on github.com open this folder, choose **Add file → Upload files** and commit.
2. **Generate art (automatic).** In the repository's **Actions** tab choose **Generate art → Run workflow**, pick a slot, optionally type your own description, and run. It paints the image with OpenAI's image model, commits it here and republishes the site. Needs the repository secret `OPENAI_API_KEY` (an OpenAI API key, billed by OpenAI per image).
3. **ChatGPT's Codex.** With GitHub connected to ChatGPT, ask Codex to add or replace a file in `assets/art/` and open a pull request; merge it to publish.

## Rules

- PNG, no text or logos in the image. Keep one style across all slots: Photorealistic architectural editorial photography, warm Dubai daylight, travertine, walnut, bronze and olive accents, natural adult proportions, no text or logos.
- This repository is **public**. Never upload personal photos here. Make the portraits of Matthew and Lizzie inside ChatGPT from your photo, and upload only the finished generated portrait.

## Private office cast

`office-cast.png` is generated artwork showing six fictional personas, ordered Matthew, Lizzie, Researcher, Capital Steward, Counsel and Operator. These are character interpretations, not verified likenesses or live agents. The dashboard, department introductions and playable-character cards use this local asset; no image service or credentials are needed at runtime. `assets/js/personas.js` defines role labels, navigation and portrait positions. Keep the six people equally spaced when replacing this image so the responsive portrait crops remain aligned.
