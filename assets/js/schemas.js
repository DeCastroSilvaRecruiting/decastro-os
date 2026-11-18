// Field schemas for every record type, plus generic CRUD actions.
import * as store from './store.js';
import { uid, openForm } from './ui.js';
import { POLICY_KINDS, POLICY_STATUS, GOV_KINDS } from './dynasty.js';

const ccys = () => store.currencies();
const entities = () => store.get().entities.map((e) => e.name);
const people = () => ['', ...(store.get().family || []).map((p) => p.name)];

export const SCHEMAS = {
  cash: { title: 'Cash account', fields: [
    { k: 'name', label: 'Account name', required: true, placeholder: 'Emirates NBD current' },
    { k: 'institution', label: 'Institution' },
    { k: 'ccy', label: 'Currency', type: 'select', options: ccys },
    { k: 'balance', label: 'Balance', type: 'number', required: true },
    { k: 'tier', label: 'Liquidity tier', type: 'select', options: ['Operating', 'Reserve', 'Strategic'], hint: 'Operating = spending; Reserve = emergency; Strategic = dry powder for opportunities' },
    { k: 'entity', label: 'Owner entity', type: 'select', options: entities },
    { k: 'rate', label: 'Interest rate %', type: 'number' },
    { k: 'asOf', label: 'Balance as of', type: 'date' },
  ] },
  others: { title: 'Asset or liability', fields: [
    { k: 'name', label: 'Name', required: true, placeholder: 'Car, credit card, personal loan…' },
    { k: 'kind', label: 'Kind', type: 'select', options: [{ v: 'asset', l: 'Asset' }, { v: 'liability', l: 'Liability' }] },
    { k: 'category', label: 'Category', type: 'select', options: ['Vehicle', 'Valuables', 'Receivable', 'Business stake', 'Credit card', 'Personal loan', 'Car loan', 'Other'] },
    { k: 'ccy', label: 'Currency', type: 'select', options: ccys },
    { k: 'value', label: 'Value / balance owed', type: 'number', required: true },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ] },
  recurring: { title: 'Recurring cash flow', fields: [
    { k: 'name', label: 'Name', required: true, placeholder: 'Salary, rent, school fees…' },
    { k: 'direction', label: 'Direction', type: 'select', options: [{ v: 'in', l: 'Inflow' }, { v: 'out', l: 'Outflow' }] },
    { k: 'amount', label: 'Amount', type: 'number', required: true },
    { k: 'ccy', label: 'Currency', type: 'select', options: ccys },
    { k: 'frequency', label: 'Frequency', type: 'select', options: ['Monthly', 'Weekly', 'Quarterly', 'Annual', 'One-off'] },
    { k: 'category', label: 'Category', type: 'select', options: ['Salary', 'Business', 'Rental', 'Dividends', 'Housing', 'Living', 'Debt service', 'Education', 'Insurance', 'Investing', 'Other'] },
    { k: 'start', label: 'Start (or the date for one-offs)', type: 'date' },
    { k: 'end', label: 'End', type: 'date' },
  ] },
  properties: { title: 'Property', fields: [
    { k: 'name', label: 'Name', required: true, placeholder: 'Marina 2BR' },
    { k: 'status', label: 'Status', type: 'select', options: ['Owned', 'Off-plan', 'Target'] },
    { k: 'location', label: 'Location / community' },
    { k: 'type', label: 'Type', type: 'select', options: ['Apartment', 'Villa', 'Townhouse', 'Office', 'Retail', 'Warehouse', 'Land', 'Other'] },
    { k: 'ccy', label: 'Currency', type: 'select', options: ccys },
    { k: 'purchasePrice', label: 'Purchase price', type: 'number' },
    { k: 'purchaseDate', label: 'Purchase date', type: 'date' },
    { k: 'currentValue', label: 'Current value', type: 'number' },
    { k: 'cashInvested', label: 'Total cash invested (deposit + fees)', type: 'number' },
    { k: 'mortgageBalance', label: 'Mortgage balance', type: 'number' },
    { k: 'mortgageRate', label: 'Mortgage rate %', type: 'number' },
    { k: 'monthlyPayment', label: 'Monthly mortgage payment', type: 'number' },
    { k: 'monthlyRent', label: 'Monthly rent (actual or market)', type: 'number' },
    { k: 'occupancy', label: 'Occupancy %', type: 'number', default: 100 },
    { k: 'annualCosts', label: 'Annual costs (service charge, maintenance, insurance, management)', type: 'number' },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ] },
  holdings: { title: 'Holding', fields: [
    { k: 'name', label: 'Name', required: true, placeholder: 'Vanguard FTSE All-World' },
    { k: 'ticker', label: 'Ticker / ISIN' },
    { k: 'cls', label: 'Asset class', type: 'select', options: ['Equity', 'Bond', 'Fund / ETF', 'Cash-like', 'Gold', 'Crypto', 'Private', 'Property fund'] },
    { k: 'platform', label: 'Platform / broker' },
    { k: 'ccy', label: 'Currency', type: 'select', options: ccys },
    { k: 'qty', label: 'Quantity', type: 'number', required: true },
    { k: 'price', label: 'Current price', type: 'number', required: true },
    { k: 'costBasis', label: 'Total cost basis', type: 'number' },
    { k: 'priceDate', label: 'Price as of', type: 'date' },
  ] },
  entities: { title: 'Entity', fields: [
    { k: 'name', label: 'Name', required: true, placeholder: 'De Castro Holdings Ltd' },
    { k: 'type', label: 'Type', type: 'select', options: ['Individual', 'Holding company', 'Operating company', 'Foundation', 'Trust', 'SPV', 'Partnership', 'Branch'] },
    { k: 'jurisdiction', label: 'Jurisdiction', placeholder: 'ADGM, DIFC, Dubai Mainland, RAK ICC…' },
    { k: 'status', label: 'Status', type: 'select', options: ['Planned', 'Forming', 'Active', 'Dormant', 'Dissolved'] },
    { k: 'licence', label: 'Licence / registration no.' },
    { k: 'expiry', label: 'Licence expiry', type: 'date' },
    { k: 'ownership', label: 'Your ownership %', type: 'number' },
    { k: 'parent', label: 'Owned by (parent entity)', type: 'select', options: () => ['', ...entities()] },
    { k: 'taxStatus', label: 'Tax status', type: 'select', options: ['', 'QFF transparent', 'CT registered', 'Exempt', 'Pending'], hint: 'QFF = Qualifying Family Foundation (tax-transparent)' },
    { k: 'venture', label: 'Holds this venture', type: 'select', options: () => [{ v: '', l: '—' }, ...store.get().ventures.map((v) => ({ v: v.id, l: v.name }))], hint: 'Ring-fencing: one company per business or property' },
    { k: 'notes', label: 'Notes (directors, agents, bank, tax registrations)', type: 'textarea' },
  ] },
  contracts: { title: 'Contract', fields: [
    { k: 'title', label: 'Title', required: true },
    { k: 'counterparty', label: 'Counterparty' },
    { k: 'type', label: 'Type', type: 'select', options: ['Lease', 'Employment', 'Supplier', 'Customer', 'NDA', 'Partnership / SHA', 'Loan', 'Service', 'Licence', 'Other'] },
    { k: 'entity', label: 'Our entity', type: 'select', options: entities },
    { k: 'start', label: 'Start', type: 'date' }, { k: 'end', label: 'End / renewal', type: 'date' },
    { k: 'noticeDays', label: 'Notice period (days)', type: 'number' },
    { k: 'value', label: 'Annual value', type: 'number' }, { k: 'ccy', label: 'Currency', type: 'select', options: ccys },
    { k: 'status', label: 'Status', type: 'select', options: ['Draft', 'Negotiating', 'Active', 'Expiring', 'Terminated'] },
    { k: 'link', label: 'Document link', placeholder: 'Link to the signed copy (Drive, Dropbox…)' },
    { k: 'notes', label: 'Key terms & obligations', type: 'textarea' },
  ] },
  compliance: { title: 'Compliance item', fields: [
    { k: 'title', label: 'Obligation', required: true },
    { k: 'entity', label: 'Entity', type: 'select', options: entities },
    { k: 'due', label: 'Next due date', type: 'date' },
    { k: 'recurrence', label: 'Recurrence', type: 'select', options: ['One-off', 'Monthly', 'Quarterly', 'Annual'] },
    { k: 'status', label: 'Status', type: 'select', options: ['Open', 'In progress', 'Done'] },
    { k: 'notes', label: 'Notes / authority / adviser', type: 'textarea' },
  ] },
  family: { title: 'Family member', fields: [
    { k: 'name', label: 'Name', required: true },
    { k: 'relation', label: 'Relation', placeholder: 'Self, spouse, son, daughter…' },
    { k: 'birthDate', label: 'Date of birth', type: 'date' },
    { k: 'generation', label: 'Generation', type: 'select', options: [{ v: '1', l: '1 · you and your spouse' }, { v: '2', l: '2 · children' }, { v: '3', l: '3 · grandchildren' }, { v: '0', l: 'Not family (adviser or councillor)' }] },
    { k: 'roles', label: 'Roles in the structure', full: true, placeholder: 'founder, councillor, guardian, beneficiary, director, shareholder', hint: 'Comma-separated' },
    { k: 'residency', label: 'Tax residency', placeholder: 'UAE' },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ] },
  policies: { title: 'Life policy', fields: [
    { k: 'insurer', label: 'Insurer', required: true },
    { k: 'regulator', label: 'Regulator', type: 'select', options: ['CBUAE', 'DFSA', 'FSRA', 'Offshore'] },
    { k: 'kind', label: 'Policy type', type: 'select', options: POLICY_KINDS, hint: 'Key person and business term cover are owned by the business, not the foundation' },
    { k: 'status', label: 'Status', type: 'select', options: POLICY_STATUS },
    { k: 'lifeInsured', label: 'Life insured', type: 'select', options: people },
    { k: 'owner', label: 'Policy owner', type: 'select', options: () => ['', ...entities()] },
    { k: 'beneficiary', label: 'Beneficiary', type: 'select', options: () => ['', ...entities()] },
    { k: 'sumAssured', label: 'Sum assured', type: 'number' },
    { k: 'ccy', label: 'Currency', type: 'select', options: ccys },
    { k: 'premium', label: 'Premium', type: 'number' },
    { k: 'frequency', label: 'Premium frequency', type: 'select', options: ['Annual', 'Quarterly', 'Monthly'] },
    { k: 'start', label: 'Start date', type: 'date' },
    { k: 'nominationReview', label: 'Next nomination review', type: 'date' },
    { k: 'surrender', label: 'Surrender schedule from the illustration', type: 'textarea', placeholder: '1: 0\n5: 120000\n10: 410000', hint: 'One "year: surrender value" per line, copied from the insurer illustration' },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ] },
  familyLoans: { title: 'Family bank loan', fields: [
    { k: 'borrower', label: 'Borrower', type: 'select', options: people, required: true },
    { k: 'venture', label: 'Venture', placeholder: 'What the money is for' },
    { k: 'principal', label: 'Amount', type: 'number', required: true },
    { k: 'ccy', label: 'Currency', type: 'select', options: ccys },
    { k: 'rate', label: 'Interest rate % a year', type: 'number' },
    { k: 'termMonths', label: 'Term (months)', type: 'number', default: 36 },
    { k: 'start', label: 'First payment month starts', type: 'date' },
    { k: 'status', label: 'Status', type: 'select', options: ['Pitched', 'Approved', 'Active', 'Repaid', 'Default', 'Declined'] },
    { k: 'minutes', label: 'Council approval minutes', type: 'select', options: () => [{ v: '', l: '— none yet —' }, ...(store.get().governance || []).filter((g) => g.kind === 'Minutes').map((g) => ({ v: g.id, l: `${g.title || 'Minutes'}${g.signedOn ? ` (${g.signedOn})` : ''}` }))], hint: 'No loan is approved without minutes. Log the meeting under Governance first.' },
    { k: 'pitch', label: 'The pitch', type: 'textarea' },
  ] },
  governance: { title: 'Governance record', fields: [
    { k: 'kind', label: 'Kind', type: 'select', options: GOV_KINDS },
    { k: 'title', label: 'Title', placeholder: 'Foundation charter v1, Q1 council minutes…' },
    { k: 'entity', label: 'Entity', type: 'select', options: entities },
    { k: 'signedOn', label: 'Signed / held on', type: 'date' },
    { k: 'reviewDue', label: 'Review due', type: 'date' },
    { k: 'fileUrl', label: 'Link to the signed copy', placeholder: 'Google Drive, OneDrive…', hint: 'Keep the document in your own storage; the app keeps only the link' },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ] },
  decisions: { title: 'Decision', fields: [
    { k: 'title', label: 'Decision', required: true, full: true, placeholder: 'Buy the Marina 2BR at AED X?' },
    { k: 'date', label: 'Date', type: 'date' },
    { k: 'reviewDate', label: 'Review on', type: 'date', hint: 'When will you know if it was right?' },
    { k: 'context', label: 'Context & what you know', type: 'textarea' },
    { k: 'options', label: 'Options considered', type: 'textarea' },
    { k: 'choice', label: 'Choice made', full: true },
    { k: 'probability', label: 'Probability it works out (%)', type: 'number', hint: 'Your honest forecast. Used to score your calibration.' },
    { k: 'expected', label: 'Expected value (base ccy)', type: 'number' },
    { k: 'killCriteria', label: 'Kill criteria — what would make you reverse?', full: true },
    { k: 'outcome', label: 'Outcome', type: 'select', options: ['Pending', 'Success', 'Failure'] },
    { k: 'lesson', label: 'Lesson learned', type: 'textarea' },
  ] },
};

/** Generic actions: data-act="crudNew|crudEdit" data-coll="..." [data-id] [data-defaults='{json}'] */
export const crudActions = {
  crudNew(el) {
    const coll = el.dataset.coll, sc = SCHEMAS[coll];
    const defaults = { ccy: store.base(), entity: 'Personal', ...(el.dataset.defaults ? JSON.parse(el.dataset.defaults) : {}) };
    openForm({ title: `New ${sc.title.toLowerCase()}`, fields: sc.fields, values: defaults, onSave: (d) => store.upsert(coll, { id: uid(coll.slice(0, 2)), ...d }) });
  },
  crudEdit(el) {
    const coll = el.dataset.coll, sc = SCHEMAS[coll], row = store.byId(coll, el.dataset.id);
    if (!row) return;
    openForm({ title: `Edit ${sc.title.toLowerCase()}`, fields: sc.fields, values: row, onSave: (d) => store.upsert(coll, { ...row, ...d }), onDelete: () => store.remove(coll, row.id) });
  },
};

/** Table rows need data-coll; this wraps tableHTML's act with coll. */
export function crudRows(html, coll) { return html.replace(/data-act="crudEdit"/g, `data-act="crudEdit" data-coll="${coll}"`); }
