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
  },
  // Units of base currency per 1 unit of currency. USD is the CBUAE peg.
  fx: { AED: 1, USD: 3.6725 },
  ventures: [
    v('v_dcsgolf', 'DCS Golf', 'Hand-made leather & canvas golf bags and accessories. Luxury positioning, starting from home in the UAE.', ['golf', 'luxury', 'dtc']),
    v('v_wedcircuit', 'Wednesday Circuit', 'C-suite golf networking and corporate events in Dubai/UAE, expanding regionally. Wednesday-morning tee times.', ['golf', 'events', 'network']),
    v('v_ostrich', 'Al Ain Ostrich Farm', 'Greenfield ostrich farm and visitor destination in Al Ain: water hole, craft store, butchery and restaurant, South African expertise.', ['agri', 'tourism', 'f&b']),
  ],
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
