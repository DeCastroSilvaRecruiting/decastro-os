// art.js — named artwork slots. Drop a PNG with the slot's file name into assets/art/ (by hand, from ChatGPT,
// or with the "Generate art" GitHub Action) and it appears in the app. Missing files simply stay hidden.
export const ART_SLOTS = [
  { file: 'title.png', where: 'Tower page banner', size: '1536x640', prompt: 'Panoramic title art of a floating island city: a gold-and-glass living tower rising from a garden island, smaller themed islands joined by arched sky-bridges, warm Dubai sunset, teal and gold accents' },
  { file: 'matthew.png', where: 'Matthew character portrait', size: '1024x1024', prompt: 'Cartoon portrait of Matthew from the reference photo, chibi proportions, navy golf polo, gold golf cap, friendly smile, head and shoulders, transparent background' },
  { file: 'lizzie.png', where: 'Lizzie character portrait', size: '1024x1024', prompt: 'Cartoon portrait of Lizzie from the reference photo, chibi proportions, rose summer dress, sunglasses on head, warm smile, head and shoulders, transparent background' },
  { file: 'ws-hq.png', where: 'Venture HQ · Plan Studio', size: '1536x640', prompt: 'Interior of a futuristic venture headquarters plan studio, blueprints glowing on a large table, gold and teal light, floor-to-ceiling windows over a sky island' },
  { file: 'ws-wiki.png', where: 'Knowledge Wiki · Learning Centre', size: '1536x640', prompt: 'A crystal library tower interior with glowing books and floating knowledge panels, calm blue light' },
  { file: 'ws-claude.png', where: 'Claude Desk', size: '1536x640', prompt: 'A research observatory desk with holographic research notes and a telescope, soft blue and gold light' },
  { file: 'ws-math.png', where: 'Mastermind Lab', size: '1536x640', prompt: 'A strategy war room with glowing probability charts and decision trees on glass walls' },
  { file: 'ws-legal.png', where: 'Legal & Entities', size: '1536x640', prompt: 'Elegant legal chambers with green roof garden, contracts and seals, violet accent light' },
  { file: 'ws-treasury.png', where: 'Treasury', size: '1536x640', prompt: 'A domed treasury vault with three tiers of glowing gold reserves, green accent light' },
  { file: 'ws-finance.png', where: 'Finance & Accounting', size: '1536x640', prompt: 'A bright accounting hall with balanced ledgers and glowing double-entry columns, green accents' },
  { file: 'ws-investments.png', where: 'Investments', size: '1536x640', prompt: 'A modern investment observatory with a growing compounding curve sculpture, green and gold' },
  { file: 'ws-property.png', where: 'Property', size: '1536x640', prompt: 'A property gallery with architectural models of villas and apartments in Dubai, warm light' },
  { file: 'ws-procure.png', where: 'Procurement Yard', size: '1536x640', prompt: 'A tidy container yard with a gantry crane and colourful shipping containers at golden hour' },
  { file: 'ws-commerce.png', where: 'Commerce Hub', size: '1536x640', prompt: 'A parcel warehouse with a delivery drone landing on the roof and neatly stacked boxes' },
  { file: 'island-atelier.png', where: 'DCS Golf island (Golf Atelier)', size: '1536x640', prompt: 'A luxury leather golf-bag atelier boutique on a floating garden island, hand-made leather and canvas bags on display, putting green with gold flag' },
  { file: 'island-course.png', where: 'Wednesday Circuit island (Circuit Course)', size: '1536x640', prompt: 'A championship golf hole on a floating island at sunrise, white golf carts, elegant clubhouse, executives teeing off' },
  { file: 'island-farm.png', where: 'Al Ain Ostrich Farm island', size: '1536x640', prompt: 'A desert ostrich farm on a floating sand island, ostriches in a wooden pen, palm-ringed water hole, farm restaurant with thatched roof, Al Ain mountains in the distance' },
  { file: 'island-port.png', where: 'Global Trend Store island (Trade Port)', size: '1536x640', prompt: 'A floating trade port island with stacked shipping containers, gantry crane and a cargo airship delivering a container' },
  { file: 'island-generic.png', where: 'Any other venture island', size: '1536x640', prompt: 'A floating island venture quarter with a modern headquarters building rising from scaffolding' },
];
export const ART_STYLE = 'Stylised semi-realistic 3D illustration, soft global illumination, warm Dubai light, gold (#c9a54c) and teal (#2ea6a0) accents, clean composition, no text, no logos, no brand names';

/** An <img> for a slot that stays hidden unless the file exists. */
export function artImg(file, cls = 'art-banner', alt = '') {
  return `<img class="${cls}" src="assets/art/${file}" alt="${alt.replace(/"/g, '&quot;')}" decoding="async" style="display:none" onload="this.style.display=''" onerror="this.remove()">`;
}
