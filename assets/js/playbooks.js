// Playbooks give every venture its own guided path: what to do at each stage, who does it
// (You, a delegate, Claude, or an app tool) and what can be automated. A venture picks one playbook.
// step.mode: 'You' = only you can decide/sign; 'Delegate' = hand to a person/agency; 'Claude' = scheduled research; 'Tool' = use an app module.

export const MODES = {
  You: { label: 'You', cls: 'gold' },
  Delegate: { label: 'Delegate', cls: 'blue' },
  Claude: { label: 'Claude', cls: 'violet' },
  Tool: { label: 'App tool', cls: 'green' },
};

const R = (title, question, domain = 'Business & Ventures') => ({ title, question, domain });

export const PLAYBOOKS = {
  generic: {
    name: 'Venture playbook',
    blurb: 'The default path every venture follows: prove demand, prove the model, then build the machine.',
    kpis: [
      ['Revenue this month', 'AED'], ['Net profit this month', 'AED'], ['Customers', ''], ['Hours per week you spend', 'h'],
    ],
    steps: {
      Idea: [
        { id: 'g1', title: 'Write the problem and the customer in one paragraph each', why: 'If you cannot name who pays and for what pain, nothing else matters yet.', mode: 'You', link: 'thesis' },
        { id: 'g2', title: 'List the 5 things that must be true, ranked by risk', why: 'The riskiest assumption decides the cheapest first test.', mode: 'You', link: 'assumptions' },
        { id: 'g3', title: 'Commission Claude diligence on market, competitors and rules', why: 'Sourced research before you spend a dirham.', mode: 'Claude', research: R('Due diligence', 'Market size and demand evidence in the UAE/GCC, competitors and pricing, licensing, unit economics benchmarks, capital needed and the three riskiest assumptions with the cheapest test for each.') },
        { id: 'g4', title: 'Talk to 10 people who would pay', why: 'Conversations beat spreadsheets at this stage.', mode: 'You' },
      ],
      Validate: [
        { id: 'g5', title: 'Run the cheapest test of the riskiest assumption', why: 'A test that can fail is worth more than a plan that cannot.', mode: 'You', link: 'assumptions' },
        { id: 'g6', title: 'Get a pre-order, deposit or signed letter of intent', why: 'Money or a signature is evidence. Compliments are not.', mode: 'You' },
        { id: 'g7', title: 'Model the unit economics', why: 'Price, cost, acquisition cost and lifetime decide whether growth helps or hurts.', mode: 'Tool', link: 'unit' },
        { id: 'g8', title: 'Log the go / no-go decision with expected value', why: 'Writing the odds down makes you calibrated over time.', mode: 'Tool', href: '#/math/decisions' },
      ],
      Plan: [
        { id: 'g9', title: 'Choose the legal entity and licence', why: 'Structure affects tax, liability and banking.', mode: 'Tool', href: '#/legal/entities' },
        { id: 'g10', title: 'Confirm the capital and where it comes from', why: 'Fund from the strategic cash tier, never the reserve.', mode: 'Tool', href: '#/treasury' },
        { id: 'g11', title: 'Write a dated 90-day plan', why: 'Tasks with dates feed your Command Centre.', mode: 'You', link: 'tasks' },
        { id: 'g12', title: 'Name the one thing that, once automated or delegated, removes you from the day-to-day', why: 'Design for as little input as possible from the start.', mode: 'You' },
      ],
      Build: [
        { id: 'g13', title: 'Form the entity and open the books', why: 'If it is not in the ledger, it did not happen.', mode: 'Tool', href: '#/finance' },
        { id: 'g14', title: 'Build the minimum version a paying customer can use', why: 'Ship the smallest thing that earns.', mode: 'You' },
        { id: 'g15', title: 'Register the key contracts', why: 'Notice dates are tracked for you.', mode: 'Tool', href: '#/legal/contracts' },
      ],
      Launch: [
        { id: 'g16', title: 'Win the first 10 paying customers and record what each cost', why: 'This gives you a real acquisition cost.', mode: 'You' },
        { id: 'g17', title: 'Write the standard operating procedures', why: 'What is written down can be delegated.', mode: 'You' },
        { id: 'g18', title: 'Log the scale decision with a forecast', why: 'Compare outcome to forecast later.', mode: 'Tool', href: '#/math/decisions' },
      ],
      Scale: [
        { id: 'g19', title: 'Delegate everything repeatable', why: 'Your time goes to decisions and relationships.', mode: 'Delegate' },
        { id: 'g20', title: 'Review quarterly in the compliance calendar', why: 'Ventures drift without a rhythm.', mode: 'Tool', href: '#/legal/compliance' },
      ],
    },
  },

  ecom: {
    name: 'China-to-Amazon store',
    blurb: 'Private-label products sourced from vetted Chinese factories, sold on Amazon.ae through FBA, run by systems and a small team. Passive after setup, never zero-input.',
    kpis: [
      ['Net revenue this month', 'AED'], ['Net profit this month', 'AED'], ['Live products', ''], ['Average net margin', '%'],
      ['Ad cost of sales (TACoS)', '%'], ['Weeks of stock cover', 'wk'], ['Average star rating', ''], ['Hours per week you spend', 'h'],
    ],
    steps: {
      Idea: [
        { id: 'e1', title: 'Decide the compliant model: private label, wholesale or retail arbitrage', why: 'Amazon requires you to be the seller of record. Buying from a supplier who ships a branded parcel to your customer is the prohibited kind of drop shipping.', mode: 'You', href: '#/wiki/amazon-fba-from-china-model-rules-and-economics' },
        { id: 'e2', title: 'Pick the beachhead: 2 or 3 categories where you have an edge', why: 'Golf accessories, home, pets and travel are examples. Choose small, light, durable products with no certification burden.', mode: 'You', href: '#/commerce/pipeline' },
        { id: 'e3', title: 'Capture 10 product leads', why: 'Use the weekly Claude scout leads and your own browsing of Amazon.ae best-seller and new-release pages.', mode: 'Tool', href: '#/commerce/pipeline' },
        { id: 'e4', title: 'Ask Claude for the Amazon.ae rulebook and a category demand scan', why: 'Fees, restrictions, licence and VAT, with sources and dates.', mode: 'Claude', research: R('Amazon.ae seller rulebook', 'Current Amazon.ae seller requirements, fee schedule, restricted and gated categories, Brand Registry rules, FBA inbound rules for sellers importing from China, and UAE trade licence, VAT and customs requirements. Cite official pages and give dates.', 'Business & Ventures') },
      ],
      Validate: [
        { id: 'e5', title: 'Score each lead and kill any with a red flag', why: 'Brand, patent, gated, certified or fragile products are the usual account-killers.', mode: 'Tool', href: '#/commerce/pipeline' },
        { id: 'e6', title: 'Run the margin calculator: need 3x price-to-cost and 25% net margin after ads', why: 'A product that only works at best-case ad costs is not a product.', mode: 'Tool', href: '#/commerce/calc/scratch' },
        { id: 'e7', title: 'Request quotes from 3 suppliers per finalist and vet them with the checklist', why: 'Factories beat trading companies on price and control; check licences, audits and references.', mode: 'Tool', href: '#/commerce/suppliers' },
        { id: 'e8', title: 'Order samples and inspect them yourself', why: 'Quality, packaging and the real weight and size drive every cost on the calculator.', mode: 'You' },
        { id: 'e9', title: 'Research the competitor set for each finalist', why: 'Reviews, complaints and gaps tell you what to specify to the factory.', mode: 'Claude', research: R('Competitor teardown for the finalist product', 'For the finalist product on Amazon.ae and Noon: price ladder, review counts and ratings, the most common complaints, and what a better version would change. Note demand evidence and seasonality.', 'Markets & Macro') },
      ],
      Plan: [
        { id: 'e10', title: 'Set up the licence and entity (UAE trade licence with e-commerce activity)', why: 'Amazon.ae requires a valid UAE trade licence. A free zone or mainland route changes tax and customs. Confirm with an adviser.', mode: 'Tool', href: '#/legal/entities' },
        { id: 'e11', title: 'Register for the importer code with customs and choose a freight forwarder', why: 'Amazon does not import for you; without an importer code goods cannot clear.', mode: 'Delegate' },
        { id: 'e12', title: 'Decide on VAT registration and the corporate tax position', why: 'Mandatory VAT registration starts at AED 375,000 of taxable supplies over 12 months; B2C sales may not qualify for free zone 0%.', mode: 'Claude', research: R('VAT and corporate tax for an Amazon.ae seller', 'VAT registration thresholds and import VAT recovery, corporate tax treatment of B2C e-commerce income in a UAE free zone versus mainland, and Small Business Relief. Cite FTA and Ministry of Finance pages.', 'Legal & Structuring') },
        { id: 'e13', title: 'Register the brand name and trademark', why: 'Brand Registry needs a trademark; it protects the listing from hijackers.', mode: 'Delegate' },
        { id: 'e14', title: 'Confirm the first-order capital is fundable from the strategic cash tier', why: 'Inventory ties up cash for 2 to 4 months before it returns.', mode: 'Tool', href: '#/commerce/forecast' },
      ],
      Build: [
        { id: 'e15', title: 'Open the Amazon.ae seller account and verify identity', why: 'Verification takes days. Start early.', mode: 'You' },
        { id: 'e16', title: 'Place a pilot order on escrow or Trade Assurance and book a pre-shipment inspection', why: 'Never pay in full upfront and never ship unseen.', mode: 'Delegate' },
        { id: 'e17', title: 'Commission packaging, labels and the listing (title, images, A+ content)', why: 'Images and copy decide conversion. Agencies and AI can do 90% of it.', mode: 'Delegate' },
        { id: 'e18', title: 'Create the FBA shipment and arrange door-to-FBA freight', why: 'A forwarder who delivers to the Amazon fulfilment centre removes the heavy lifting.', mode: 'Delegate' },
        { id: 'e19', title: 'Open the books for the entity and record the purchase order, freight and duty', why: 'You need true landed cost to know the real margin.', mode: 'Tool', href: '#/finance' },
      ],
      Launch: [
        { id: 'e20', title: 'Launch with a fixed ad budget, a launch price and compliant review programmes', why: 'Use only Amazon-approved ways to get reviews. Incentivised or fake reviews end accounts.', mode: 'Delegate' },
        { id: 'e21', title: 'Switch on the automations: repricing rules, ad rules, low-stock alerts', why: 'This is where input falls to hours, not days.', mode: 'Tool', href: '#/commerce/automation' },
        { id: 'e22', title: 'Start the 30-minute weekly review ritual and log the KPIs', why: 'Sell-through, margin, ad cost, stock cover and rating.', mode: 'You' },
        { id: 'e23', title: 'After 8 to 12 weeks decide: winner, tweak or drop', why: 'Cut losers fast; put cash behind winners.', mode: 'Tool', href: '#/commerce/pipeline' },
      ],
      Scale: [
        { id: 'e24', title: 'Set the reorder rhythm: reorder when 60 days of stock remain', why: 'Stock-outs wreck rank; overstock burns cash.', mode: 'Tool', href: '#/commerce/forecast' },
        { id: 'e25', title: 'Launch the next product every few weeks from the pipeline', why: 'A portfolio of winners beats one hit.', mode: 'Tool', href: '#/commerce/pipeline' },
        { id: 'e26', title: 'Expand to Amazon.sa, Noon and your own store', why: 'Same products, new audiences. Check KSA licensing and customs first.', mode: 'Claude', research: R('Expansion channels beyond Amazon.ae', 'Rules, costs and conformity requirements for selling the same products on Amazon.sa, Noon and a Shopify store from a UAE entity, including shipping and customs between GCC countries.', 'Business & Ventures') },
        { id: 'e27', title: 'Hand listings, ads, customer service and bookkeeping to a small team with written SOPs', why: 'What is written down can be delegated.', mode: 'Delegate' },
        { id: 'e28', title: 'Spin off the sourcing know-how as a sourcing desk for other UAE sellers', why: 'Knowledge compounds. The Idea Scout lists this as a follow-on.', mode: 'You', href: '#/ideas' },
      ],
    },
  },
};

export const playbookOf = (v) => PLAYBOOKS[v.playbook] || PLAYBOOKS.generic;
export const stepsFor = (v, stage) => (playbookOf(v).steps[stage] || []);
export function playbookProgress(v) {
  const pb = playbookOf(v);
  const all = Object.values(pb.steps).flat();
  const done = all.filter((s) => v.steps?.[s.id]?.done).length;
  return { done, total: all.length, pct: all.length ? done / all.length : 0 };
}

// ---------- Automation map (ecom): who does each recurring function ----------
// Weekly hours are what it would cost YOU if you did it all yourself; the level scales it down.
export const LEVELS = { You: 1, Delegate: 0.15, Automated: 0.05 };
export const AUTOMATION = [
  { id: 'sourcing', name: 'Product research & scouting', hours: 4, level: 'Automated', how: 'Claude scout weekly leads, then your 15-minute review of the shortlist.', cost: 'Free (your Claude scheduled task)' },
  { id: 'suppliers', name: 'Supplier search, vetting & negotiation', hours: 3, level: 'Delegate', how: 'A sourcing agent in China or a sourcing service; you approve the final supplier.', cost: 'Agent commission or fixed fee: get quotes' },
  { id: 'qc', name: 'Quality inspection', hours: 1, level: 'Delegate', how: 'Third-party pre-shipment inspection per order.', cost: 'Per-inspection fee: get quotes' },
  { id: 'freight', name: 'Freight, customs & delivery to FBA', hours: 2, level: 'Delegate', how: 'Door-to-FBA forwarder with a customs broker.', cost: 'Per-shipment: get quotes' },
  { id: 'listing', name: 'Listings, images & A+ content', hours: 3, level: 'Delegate', how: 'Freelancer or agency with AI drafting; refreshed twice a year.', cost: 'Per-listing fee: get quotes' },
  { id: 'ads', name: 'Advertising (PPC) management', hours: 4, level: 'Delegate', how: 'Agency or Amazon ad automation rules with weekly caps.', cost: 'Agency fee or % of ad spend: get quotes' },
  { id: 'pricing', name: 'Repricing', hours: 1, level: 'Automated', how: 'Amazon automated pricing rules within your floor and ceiling.', cost: 'Included' },
  { id: 'inventory', name: 'Inventory & reorder planning', hours: 2, level: 'Automated', how: 'Low-stock alerts and the reorder rhythm in the Forecast tab.', cost: 'Included' },
  { id: 'fulfilment', name: 'Pick, pack, ship, returns & customer service', hours: 10, level: 'Automated', how: 'Fulfilment by Amazon handles it (fee per unit).', cost: 'Inside the FBA fee' },
  { id: 'reviews', name: 'Reviews & feedback', hours: 1, level: 'Automated', how: 'Only Amazon-approved programmes. Never incentivised reviews.', cost: 'Included' },
  { id: 'books', name: 'Bookkeeping & VAT returns', hours: 2, level: 'Delegate', how: 'Accountant with this app\'s ledger as the source.', cost: 'Monthly retainer: get quotes' },
  { id: 'compliance', name: 'Licences, renewals & tax dates', hours: 0.5, level: 'Automated', how: 'The compliance calendar in Legal & Entities.', cost: 'Included' },
  { id: 'strategy', name: 'Weekly review & decisions', hours: 1, level: 'You', how: 'Your 30-minute ritual: KPIs, winners, losers, next launch.', cost: 'Your time' },
];
export const weeklyHours = (levels = {}) => AUTOMATION.reduce((t, f) => t + f.hours * LEVELS[levels[f.id] || f.level], 0);
