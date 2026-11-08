// Standing instructions for Claude's scheduled tasks. Mirrored in the vault at claude/SCHEDULES.md.
export const SCHEDULES = [
  {
    key: 'daily',
    name: 'De Castro — Daily research run',
    when: 'Every day, early morning (Dubai)',
    cron: 'CRON_TZ=Asia/Dubai 47 5 * * *',
    prompt: `You are running the De Castro Empire DAILY RESEARCH RUN in the decastro-vault repository.

1. Read CLAUDE.md, then follow claude/RESEARCH_PROTOCOL.md exactly.
2. Open queue/queue.json. Take up to 3 items with status "queued", highest priority first (High > Normal > Low), oldest first within a priority. Ignore "proposed" items — the owner has not approved them.
3. For each item: set status "in-progress", research it per the protocol and claude/SOURCE_HIERARCHY.md, then write or update the wiki article under wiki/articles/ using claude/WIKI_STYLE.md. Prefer updating an existing article over creating a near-duplicate.
4. Mark each item "done" with result.article (the slug) and result.summary (one sentence), and set "updated" to the current ISO timestamp.
5. Run: node scripts/rebuild-index.mjs
6. Write wiki/digests/YYYY-MM-DD.md summarising what you learned today and the single most important implication for the owner.
7. Commit with message "research: <short summary>" and push to the default branch.

If the queue is empty, do the protocol's "idle" step instead (strengthen the weakest article). Never invent sources. If you cannot verify a figure, say so in the article and lower confidence.`,
  },
  {
    key: 'weekly',
    name: 'De Castro — Weekly compounding review',
    when: 'Sundays, early morning (Dubai)',
    cron: 'CRON_TZ=Asia/Dubai 37 6 * * 0',
    prompt: `You are running the De Castro Empire WEEKLY COMPOUNDING REVIEW in the decastro-vault repository.

1. Read CLAUDE.md, then follow claude/COMPOUNDING_REVIEW.md exactly.
2. In short: re-verify the 3 stalest or lowest-confidence articles, merge duplicates, add missing [[links]], distil new principles into wiki/articles/empire-principles.md, and propose up to 5 new research questions in queue/queue.json with status "proposed" and requestedBy "claude".
3. Run: node scripts/rebuild-index.mjs
4. Write wiki/digests/week-YYYY-WW.md.
5. Commit with message "review: weekly compounding <date>" and push.`,
  },
  {
    key: 'monthly',
    name: 'De Castro — Monthly empire briefing',
    when: '1st of each month (Dubai)',
    cron: 'CRON_TZ=Asia/Dubai 23 7 1 * *',
    prompt: `You are writing the De Castro Empire MONTHLY BRIEFING in the decastro-vault repository.

1. Read CLAUDE.md, then follow claude/MONTHLY_BRIEFING.md exactly.
2. Research what changed last month that matters to the owner's domains (UAE regulation and tax, Dubai property market, rates and FX, markets relevant to the holdings themes in the wiki, and each active venture's sector).
3. Write wiki/digests/briefing-YYYY-MM.md and update any wiki articles whose facts changed.
4. Run: node scripts/rebuild-index.mjs
5. Commit with message "briefing: <YYYY-MM>" and push.`,
  },
];
