// The Idea Scout's engine. A curated bank of opportunities is scored against YOUR edge (skills, network, assets)
// and against the ventures you already run, so ideas that compound what you have rise to the top.
// Claude's scheduled scout adds researched ideas on top of these (see claude/IDEA_SCOUT.md in the vault).

export const EDGE = [
  ['network', 'C-suite network'], ['headhunting', 'Headhunting skills'], ['golf', 'Golf world'], ['dubai', 'Based in Dubai'],
  ['southafrica', 'South African ties & expertise'], ['leather', 'Leather craft (DCS Golf)'], ['agri', 'Farm & land (Al Ain)'],
  ['sourcing', 'China sourcing know-how'], ['research', 'Research engine (this vault)'], ['ecommerce', 'E-commerce operations'],
];
export const DEFAULT_EDGE = ['network', 'headhunting', 'golf', 'dubai', 'southafrica', 'leather', 'agri', 'research'];

const A = (text, test, risk = 3) => ({ text, test, risk, status: 'Untested' });

export const BANK = [
  {
    id: 'idea_sapantry', kind: 'business', title: 'South African pantry & braai, delivered across the UAE',
    pitch: 'Biltong, rusks, sauces and braai gear for the large South African community and curious locals, sold on Amazon.ae and Noon, your own store, and in bulk to offices and clubs.',
    leverage: ['southafrica', 'dubai', 'ecommerce'], synergy: ['ecom', 'ostrich', 'agri'],
    passive: 5, capitalLight: 6, speed: 6, playbook: 'ecom',
    why: 'You know the product, the customer and the suppliers. Dubai has a dense South African expat base, and ostrich biltong links directly to the Al Ain farm.',
    firstTest: 'Pre-sell 30 hampers to your own network and two WhatsApp communities before importing anything.',
    risks: 'Food import approvals and labelling (Dubai Municipality, MoIAT), shelf life, halal certification for meat. Confirm before ordering.',
    assumptions: [A('Enough repeat buyers will pay a premium for authentic South African products', 'Pre-sell 30 hampers; track repeat orders in month two', 5), A('Meat and food imports can be licensed at reasonable cost and speed', 'Ask a food-import broker for the permit path and timeline', 5), A('A landed margin of 40% or more survives cold-chain and fees', 'Cost two best-selling SKUs on the Commerce calculator', 4)],
    tasks: ['Contact a UAE food-import broker for permit requirements', 'List 10 best-selling South African products and their wholesale suppliers', 'Pre-sell 30 hampers to your network'],
  },
  {
    id: 'idea_ostrichleather', kind: 'business', title: 'Ostrich-leather luxury line: bags, golf accessories and gifts',
    pitch: 'A premium range in ostrich leather made through DCS Golf and sourced, in time, from the Al Ain farm. Scarcity and craft support luxury pricing.',
    leverage: ['leather', 'agri', 'southafrica', 'golf'], synergy: ['golf', 'ostrich', 'agri', 'leather'],
    passive: 3, capitalLight: 5, speed: 3, playbook: 'generic',
    why: 'Joins two of your ventures into one vertically integrated story. South African tanneries are an established source while the farm is built.',
    firstTest: 'Commission 3 prototype pieces from a South African tannery supplier and show them to 10 prospective luxury buyers.',
    risks: 'Exotic-leather trade rules and documentation, tannery lead times, brand-building cost. Verify import and export permits for skins before ordering.',
    assumptions: [A('Luxury buyers will pay ostrich-leather prices for a new brand', 'Show prototypes and take 10 deposits or price-point reactions', 5), A('Skins can be sourced legally with full paperwork at stable quality', 'Get two tannery quotes and the permit path in writing', 5), A('Craft capacity can deliver consistent quality', 'Make three identical prototypes and inspect', 3)],
    tasks: ['Request two tannery quotes for ostrich skins', 'Research exotic-leather import documentation', 'Sketch a 5-piece capsule collection'],
  },
  {
    id: 'idea_circuittalent', kind: 'business', title: 'Executive search for the Wednesday Circuit network',
    pitch: 'Retained and contingent search for C-suite roles, sourced from the golf circuit\'s members and their companies. Placement fees are large and need no inventory.',
    leverage: ['headhunting', 'network', 'golf', 'dubai'], synergy: ['events', 'network', 'circuit'],
    passive: 2, capitalLight: 10, speed: 8, playbook: 'generic',
    why: 'Uses your strongest skill and the network you are already building. It earns while the events grow.',
    firstTest: 'Offer one no-risk search to a member who is already hiring; deliver a shortlist in 21 days.',
    risks: 'Check your employment contract for outside-business clauses before starting. A recruitment activity may need a specific licence. Fees are lumpy and time-intensive, so this is the least passive idea here.',
    assumptions: [A('Members will give you retained searches, not just introductions', 'Ask five members what they are hiring for in the next 6 months', 4), A('A placement fee of 20% or more of annual pay is accepted in the UAE market', 'Ask three HR leaders what they currently pay agencies', 3), A('You can run searches without conflicting with your current employer', 'Read your employment contract and ask your employer in writing', 5)],
    tasks: ['Read your employment contract for outside-business and non-compete clauses', 'Ask 5 Circuit members what they are hiring for', 'Check recruitment-agency licensing for the chosen entity'],
  },
  {
    id: 'idea_gifting', kind: 'business', title: 'Corporate gifting and event merchandise',
    pitch: 'Branded leather and golf goods for UAE corporates, event sponsors and client-gift programmes. One relationship produces repeat annual orders.',
    leverage: ['leather', 'network', 'golf', 'dubai'], synergy: ['golf', 'events', 'leather', 'circuit'],
    passive: 4, capitalLight: 7, speed: 7, playbook: 'generic',
    why: 'Your Circuit sponsors and members are the first buyers. DCS Golf supplies the product and the story.',
    firstTest: 'Quote a 50-piece branded gift run for one sponsor, deposit up front.',
    risks: 'Order lumpiness, long sampling cycles, thin margin if you resell generic goods. Stay with differentiated made-to-order pieces.',
    assumptions: [A('Corporates will pay a premium for hand-made, personalised gifts', 'Quote three companies and record price feedback', 4), A('Production time and quality meet corporate deadlines', 'Make a 20-piece pilot and time it', 4)],
    tasks: ['Draft a 3-product gifting catalogue', 'Quote one Circuit sponsor for 50 pieces'],
  },
  {
    id: 'idea_sourcingdesk', kind: 'business', title: 'Sourcing desk for UAE sellers and small businesses',
    pitch: 'Turn what you learn running the China-to-Amazon store into a service: find, vet, sample and inspect factories for other UAE sellers for a fee or commission.',
    leverage: ['sourcing', 'ecommerce', 'network', 'dubai'], synergy: ['ecom'],
    passive: 3, capitalLight: 9, speed: 5, playbook: 'generic',
    why: 'It compounds the store: every supplier you vet and every mistake you make becomes a saleable process.',
    firstTest: 'After your first successful pilot order, offer to source one product for a seller you know at cost plus a fee.',
    risks: 'Needs a track record first. Liability if a sourced product fails. Do this after the store reaches Validate or later.',
    assumptions: [A('Sellers will pay for vetting and inspection rather than doing it themselves', 'Offer the service to five sellers and count the yeses', 4), A('Your process is repeatable by someone else', 'Write the process and have a delegate follow it once', 3)],
    tasks: ['Document your supplier-vetting process step by step', 'Offer one paid sourcing job to a known seller'],
  },
  {
    id: 'idea_golfprivatelabel', kind: 'business', title: 'Private-label golf accessories on Amazon',
    pitch: 'Towels, ball markers, divot tools, gloves and travel organisers under your own brand, sold to a global golf audience that buys year-round.',
    leverage: ['golf', 'ecommerce', 'sourcing'], synergy: ['ecom', 'golf'],
    passive: 6, capitalLight: 7, speed: 6, playbook: 'ecom',
    why: 'You know the buyer better than most Amazon sellers. Light, durable products with repeat potential suit the model, and the audience cross-sells to DCS Golf.',
    firstTest: 'Score five accessory leads on the Commerce scorecard; order samples for the best two.',
    risks: 'Crowded category and ad costs. Avoid branded or patented designs. Can run as the first category of the China-to-Amazon store rather than a separate venture.',
    assumptions: [A('Golf accessories can reach 25% net margin after Amazon fees and ads', 'Run three leads through the calculator with real quotes', 5), A('A better bundle or design can win reviews against incumbents', 'Teardown the top 10 listings for complaints', 4)],
    tasks: ['Capture 5 golf accessory leads in the Commerce pipeline', 'Request quotes and samples for the top two'],
  },
  {
    id: 'idea_propertysignals', kind: 'business', title: 'Dubai investor intelligence: a paid briefing built from your wiki',
    pitch: 'A monthly, sourced briefing on Dubai and UAE property data, rules and yields for investors, sold as a subscription or club. Your research engine produces the raw material.',
    leverage: ['research', 'dubai', 'network'], synergy: ['property', 'research'],
    passive: 6, capitalLight: 9, speed: 6, playbook: 'generic',
    why: 'You already compound this knowledge for yourself; the marginal cost of publishing is small.',
    firstTest: 'Send one free briefing to 30 investors in your network and ask who would pay.',
    risks: 'Property and investment promotion rules apply; present research, not advice, and check what needs a licence. Credibility takes time.',
    assumptions: [A('Investors will pay a monthly fee for curated, sourced analysis', 'Send a free issue; offer a paid tier to the responders', 4), A('Publishing does not need a regulated licence in this form', 'Ask a UAE adviser before charging', 5)],
    tasks: ['Draft one sample briefing from the wiki', 'Ask a UAE adviser whether paid property research needs a licence'],
  },
  {
    id: 'idea_usedgolf', kind: 'business', title: 'Premium used-golf-equipment arbitrage into the Gulf',
    pitch: 'Buy graded used clubs and bags where supply is deep and sell where premium kit is scarce, using your golf network as the demand base.',
    leverage: ['golf', 'sourcing', 'network'], synergy: ['golf'],
    passive: 3, capitalLight: 5, speed: 7, playbook: 'generic',
    why: 'Fast to test with a handful of items. Buyers are the same people who attend the Circuit.',
    firstTest: 'Buy three premium used sets, grade them honestly and sell through your network within 30 days.',
    risks: 'Authenticity, grading disputes, shipping and duty on heavy goods. Margins depend on buying well.',
    assumptions: [A('Gulf buyers pay enough above source price to cover shipping, duty and your time', 'Buy and sell three sets, keep every cost', 4)],
    tasks: ['Price five premium used items at source and in the Gulf', 'Buy and resell one set as a test'],
  },
  {
    id: 'idea_toolkit', kind: 'business', title: 'UAE founder finance toolkit: templates and calculators',
    pitch: 'Package the calculators, checklists and templates you build for yourself (unit economics, property analyser, compliance calendar) into a digital product for UAE founders and investors.',
    leverage: ['research', 'dubai'], synergy: ['research'],
    passive: 8, capitalLight: 10, speed: 5, playbook: 'generic',
    why: 'Built once, sold repeatedly. This app is the prototype.',
    firstTest: 'Share one template free with 20 founders and ask what they would pay for the full set.',
    risks: 'Credibility and liability for errors; present as tools, not advice. Revenue is slow at first.',
    assumptions: [A('UAE founders will pay for ready-made tools with local rules built in', 'Give one template away and offer a paid pack to those who use it', 4)],
    tasks: ['List the 5 tools you use most and could package', 'Share one template with 20 founders'],
  },
];

/** Score an idea 0-100 against the owner's edge and active ventures. */
export function scoreIdea(idea, { edge = DEFAULT_EDGE, ventures = [] } = {}) {
  if (idea.source === 'claude' && Number.isFinite(+idea.score) && !idea.leverage?.length) return { total: Math.round(+idea.score), fit: NaN, synergy: NaN, notes: [] };
  const lev = idea.leverage || [];
  const matched = lev.filter((t) => edge.includes(t));
  const fit = lev.length ? matched.length / lev.length : 0.5;
  const live = ventures.filter((v) => v.stage !== 'Parked');
  const tagsOf = (v) => [...(v.tags || []), v.playbook, ...(v.name || '').toLowerCase().split(/\W+/)].filter(Boolean).map((x) => String(x).toLowerCase());
  const syn = idea.synergy || [];
  const linked = live.filter((v) => syn.some((t) => tagsOf(v).includes(t)));
  const synergy = Math.min(1, linked.length * 0.5);
  const total = Math.round(100 * (0.30 * fit + 0.25 * synergy + 0.15 * (idea.passive ?? 5) / 10 + 0.15 * (idea.capitalLight ?? 5) / 10 + 0.15 * (idea.speed ?? 5) / 10));
  const notes = [];
  if (matched.length) notes.push(`Uses your edge: ${matched.map((t) => (EDGE.find((e) => e[0] === t) || [t, t])[1]).join(', ')}`);
  if (linked.length) notes.push(`Compounds: ${linked.map((v) => v.name).join(', ')}`);
  return { total, fit, synergy, notes };
}
