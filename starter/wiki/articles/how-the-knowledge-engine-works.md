---
title: How the Knowledge Engine Works
domain: Mathematics & Decisions
tags: [meta, system, research]
confidence: high
summary: The wiki compounds because every question becomes a sourced, dated, linked article that is re-verified on a schedule.
created: 2026-11-07
updated: 2026-11-07
pinned: true
sources:
  - De Castro Vault — claude/RESEARCH_PROTOCOL.md (internal)
  - De Castro Vault — claude/SOURCE_HIERARCHY.md (internal)
---
# How the Knowledge Engine Works

> **Bottom line:** You ask questions; Claude researches them on a schedule from the best available sources, writes them up here, links them to what the empire already knows, and keeps re-checking them. Knowledge becomes an asset that appreciates instead of a pile of notes that decays.

## The loop

1. **Ask** — from anywhere in De Castro OS. Questions land in `queue/queue.json` in your private vault.
2. **Research** — a scheduled Claude task wakes daily, takes the top items and follows the research protocol: frame the decision, search widely, go to primary sources, verify every number, separate fact from estimate from judgement.
3. **Write** — each answer becomes an article with a bottom line, dated facts, a worked example, key takeaways, implications for the empire, open questions and full citations.
4. **Link** — articles reference each other with wiki links such as [[Empire Principles]] and [[Compounding and the Rule of 72]]. A red link means "we know we don't know this yet".
5. **Compound** — every week Claude re-verifies the weakest articles, merges duplicates, distils new principles and proposes the next questions for your approval. Every month it writes an empire briefing.

## Why it compounds

| Ordinary notes | This wiki |
|---|---|
| Written once, never checked | Re-verified on a schedule |
| No sources | Every claim cited, tiered by quality |
| Isolated | Linked into a graph |
| Undated | Every figure dated; stale articles flagged |
| Generic | Ends with what it means for *your* decisions |

## How to get the most from it

- **Ask decision-shaped questions.** "Should DCS Golf manufacture locally or import leather panels?" beats "Tell me about leather".
- **Say what you'll do with the answer** in the detail box — it focuses the research.
- **Approve Claude's proposals** each week. They are aimed at gaps in what you know.
- **Read the confidence badge.** Low confidence means "starting point", not "answer".

## Related
- [[Empire Principles]] — the distilled rules this knowledge produces
- [[Venture Validation Framework]] — how research feeds venture decisions

## Sources
1. De Castro Vault — `claude/RESEARCH_PROTOCOL.md` (internal)
2. De Castro Vault — `claude/SOURCE_HIERARCHY.md` (internal)
