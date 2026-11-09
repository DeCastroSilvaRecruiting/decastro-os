// Initial state for a fresh install. Financial collections start empty on purpose:
// the system should only ever show numbers you have entered.

export const STAGES = ['Idea', 'Validate', 'Plan', 'Build', 'Launch', 'Scale', 'Parked'];

export const DOMAINS = [
  'Investing', 'Property', 'Business & Ventures', 'Finance & Accounting',
  'Treasury', 'Legal & Structuring', 'Mathematics & Decisions', 'Markets & Macro',
];

// Scoring rubric for ventures. Weights sum to 100. "Inverse" criteria are phrased so that 10 is always good.
export const RUBRIC = [
  { k: 'market', label: 'Market size & demand', w: 18 },
  { k: 'edge', label: 'Unfair advantage', w: 16 },
  { k: 'fit', label: 'Founder fit & network', w: 12 },
  { k: 'speed', label: 'Speed to first cash', w: 12 },
  { k: 'capital', label: 'Capital efficiency', w: 12 },
  { k: 'margin', label: 'Margin potential', w: 12 },
  { k: 'scale', label: 'Scalability / leverage', w: 10 },
  { k: 'risk', label: 'Downside protection', w: 8 },
];

const v = (id, name, summary, tags) => ({
  id, name, stage: 'Idea', summary, tags,
  thesis: '', customer: '', problem: '', revenueModel: '', capitalRequired: '', entity: '',
  scores: Object.fromEntries(RUBRIC.map((r) => [r.k, 5])),
  assumptions: [], tasks: [], notes: '',
  unit: { price: '', cogs: '', cac: '', lifetimeMonths: '', purchasesPerMonth: '' },
  created: '2026-11-07', updated: '2026-11-07',
});

const task = (id, text, due) => ({ id, text, done: false, due, owner: '' });
const asm = (id, text, test, risk) => ({ id, text, test, risk, status: 'Untested', evidence: '' });

/** The China-to-Amazon store. Added once to existing installs by the migration in store.js. */
export const ECOM_VENTURE = {
  id: 'v_amazon', name: 'Global Trend Store (China to Amazon)', stage: 'Idea', playbook: 'ecom',
  summary: 'An automated Amazon.ae private-label store: trending products from vetted Chinese factories, fulfilled by Amazon, run by systems and a small team with minimal weekly input.',
  tags: ['ecommerce', 'amazon', 'sourcing', 'passive'],
  problem: 'Shoppers everywhere buy well-made everyday products on Amazon, but most new sellers choose products on hype, skip supplier vetting, run out of cash on inventory, or lose their account to compliance mistakes.',
  customer: 'Amazon.ae shoppers across the UAE first; then Amazon.sa, Noon and a global audience through the same products.',
  thesis: 'Winning is a process, not a product. Pick small, light, uncertified products with proven demand; specify a better version to a vetted factory; let Amazon fulfil; and run on systems (a weekly Claude scout, sourcing and inspection agents, pricing and ad rules). The edge is the compounding knowledge base and the discipline to kill weak products fast.',
  revenueModel: 'Margin between landed cost (factory price, freight, duty) and the Amazon selling price, after referral and FBA fees, advertising and returns. Targets: price at least 3x landed cost and 25% or more net margin after ads.',
  capitalRequired: '', entity: '',
  scores: { market: 7, edge: 5, fit: 5, speed: 6, capital: 6, margin: 6, scale: 8, risk: 4 },
  assumptions: [
    asm('as_e1', 'We can find products that keep a 25% net margin after Amazon fees, returns and advertising', 'Run 10 leads through the Commerce calculator with real supplier quotes', 5),
    asm('as_e2', 'Suppliers deliver the sample quality consistently at production scale', 'Pilot order plus a third-party pre-shipment inspection', 4),
    asm('as_e3', 'A new product can win ranking without unsustainable ad spend', 'Cap the launch budget and measure total ad cost of sales after 8 weeks', 5),
    asm('as_e4', 'The Amazon account stays in good standing (IP, compliance, review rules)', 'Pre-check IP and certification for every product before ordering', 5),
    asm('as_e5', 'Weekly input can fall below about 5 hours with delegates and automation', 'Log your hours weekly for the first 3 months', 3),
    asm('as_e6', 'The UAE licence, VAT and customs path is workable and affordable', 'Adviser consultation plus a customs broker quote', 3),
  ],
  tasks: [
    task('t_e1', 'Read the wiki article on the Amazon model, rules and economics', '2026-11-12'),
    task('t_e2', 'Capture 10 product leads in the Commerce pipeline', '2026-11-19'),
    task('t_e3', 'Ask a UAE adviser about licence, VAT and corporate tax for an Amazon.ae seller', '2026-11-26'),
    task('t_e4', 'Shortlist 3 suppliers for the best-scoring lead and request quotes and samples', '2026-12-03'),
  ],
  steps: {}, kpis: {}, automation: {}, automationCost: {},
  notes: '',
  unit: { price: '', cogs: '', cac: '', lifetimeMonths: '', purchasesPerMonth: '' },
  created: '2026-11-08', updated: '2026-11-08',
};

export const SEED = {
  version: 1,
  meta: { created: new Date().toISOString(), updated: new Date().toISOString() },
  settings: {
    owner: 'Matthew De Castro Silva',
    empire: 'De Castro',
    baseCcy: 'AED',
    monthlyBurn: '',
    reserveMonths: 12,
    operatingMonths: 3,
    theme: 'dark',
    github: { owner: '', repo: '', branch: 'main', token: '' },
    lastSync: '',
    migrated: [],
    edge: ['network', 'headhunting', 'golf', 'dubai', 'southafrica', 'leather', 'agri', 'research'],
    ecom: { vatRegistered: false, dutyRate: 0.05, vatRate: 0.05, storageRate: 2 },
    procure: { dutyRate: 0.05, vatRate: 0.05, vatRecoverable: true, capitalRate: 0.1, fxChecked: '' },
    tower: { sky: 'live', layer: 'pipeline' },
  },
  // Units of base currency per 1 unit of currency. USD is the CBUAE peg.
  fx: { AED: 1, USD: 3.6725, CNY: 0.52 },
  ventures: [
    v('v_dcsgolf', 'DCS Golf', 'Hand-made leather & canvas golf bags and accessories. Luxury positioning, starting from home in the UAE.', ['golf', 'luxury', 'dtc']),
    v('v_wedcircuit', 'Wednesday Circuit', 'C-suite golf networking and corporate events in Dubai/UAE, expanding regionally. Wednesday-morning tee times.', ['golf', 'events', 'network']),
    v('v_ostrich', 'Al Ain Ostrich Farm', 'Greenfield ostrich farm and visitor destination in Al Ain: water hole, craft store, butchery and restaurant, South African expertise.', ['agri', 'tourism', 'f&b']),
  ],
  // Idea Scout and Commerce
  ideas: [],       // owner and Claude ideas: {id, kind: business|product, title, pitch, status: new|promoted|dismissed, ...}
  products: [],    // Commerce product pipeline
  suppliers: [],   // supplier register with vetting checklist (shared by Commerce and Procurement)
  catalog: [],     // Procurement: items you buy
  prices: [],      // Procurement: price observations (quotes, invoices, market checks)
  rfqs: [],        // Procurement: requests for quotation with supplier quotes
  orders: [],      // Procurement: purchase orders
  // Personal wealth
  cash: [],        // {id, name, institution, ccy, balance, tier, entity}
  others: [],      // {id, name, kind: asset|liability, category, ccy, value}
  recurring: [],   // {id, name, direction: in|out, amount, ccy, frequency, start, end, entity}
  properties: [],  // see schemas
  holdings: [],    // see schemas
  snapshots: [],   // {date, netWorth, liquid}
  // Accounting
  entities: [
    { id: 'e_personal', name: 'Personal', jurisdiction: 'UAE', type: 'Individual', status: 'Active', licence: '', expiry: '', ownership: 100, notes: '' },
  ],
  coa: [
    ['1000', 'Cash on hand', 'asset'], ['1100', 'Bank accounts', 'asset'], ['1200', 'Accounts receivable', 'asset'],
    ['1300', 'Inventory', 'asset'], ['1500', 'Investments', 'asset'], ['1600', 'Property', 'asset'], ['1700', 'Equipment', 'asset'],
    ['2000', 'Accounts payable', 'liability'], ['2100', 'Credit cards', 'liability'], ['2200', 'VAT payable', 'liability'],
    ['2500', 'Loans & mortgages', 'liability'],
    ['3000', "Owner's capital", 'equity'], ['3100', 'Retained earnings', 'equity'], ['3200', 'Drawings', 'equity'],
    ['4000', 'Sales revenue', 'income'], ['4100', 'Rental income', 'income'], ['4200', 'Investment income', 'income'], ['4300', 'Other income', 'income'],
    ['5000', 'Cost of goods sold', 'expense'], ['6000', 'General & admin', 'expense'], ['6100', 'Salaries & staff', 'expense'],
    ['6200', 'Rent & utilities', 'expense'], ['6300', 'Marketing', 'expense'], ['6400', 'Professional fees', 'expense'],
    ['6500', 'Interest expense', 'expense'], ['6600', 'Licences & government fees', 'expense'], ['6700', 'Travel', 'expense'],
  ].map(([code, name, type]) => ({ id: 'a_' + code, code, name, type })),
  journal: [],     // {id, date, entity, memo, ref, lines:[{account, debit, credit}]}
  // Legal
  contracts: [],   // {id, title, counterparty, type, entity, start, end, noticeDays, value, ccy, status, notes}
  compliance: [
    { id: 'c_nw', title: 'Quarterly empire review (net worth, ventures, wiki)', entity: 'Personal', due: '', recurrence: 'Quarterly', status: 'Open', notes: 'Record a net-worth snapshot and review every venture score.' },
    { id: 'c_ct', title: 'Confirm UAE Corporate Tax registration & filing obligations for each entity', entity: 'Personal', due: '', recurrence: 'Annual', status: 'Open', notes: 'Verify current rules on tax.gov.ae / with an adviser before relying on any date.' },
  ],
  // Mastermind
  decisions: [],   // {id, date, title, context, options, choice, probability, confidence, expected, reviewDate, outcome, lesson}
  // Claude
  queue: [],       // mirrors queue/queue.json in the vault repo
};
