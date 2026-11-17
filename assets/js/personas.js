// Fictional visual personas: navigation companions, not live agents or staff.
import { esc, icon } from './ui.js';

export const PERSONAS = [
  { id: 'matthew', name: 'Matthew', role: 'Founder & venture builder', area: 'Venture studio', route: 'ventures', position: 0, note: 'Turn the next promising idea into a business.', routes: ['ventures', 'engine', 'settings'] },
  { id: 'lizzie', name: 'Lizzie', role: 'Creative & brand lead', area: 'Brand & commerce', route: 'commerce', position: 20, note: 'Shape products, experiences and the brands behind them.', routes: ['commerce', 'art'] },
  { id: 'research', name: 'The Researcher', role: 'Research & intelligence', area: 'Intelligence desk', route: 'wiki', position: 40, note: 'Find the evidence. Build conviction before committing.', routes: ['wiki', 'claude', 'ideas'] },
  { id: 'finance', name: 'The Capital Steward', role: 'Finance & investment', area: 'Capital office', route: 'treasury', position: 60, note: 'Protect liquidity and put capital to productive work.', routes: ['treasury', 'finance', 'investments', 'math'] },
  { id: 'legal', name: 'The Counsel', role: 'Legal & governance', area: 'Legal chambers', route: 'legal', position: 80, note: 'Build on sound structures and keep obligations in view.', routes: ['legal'] },
  { id: 'operations', name: 'The Operator', role: 'Property & procurement', area: 'Operations office', route: 'procure', position: 100, note: 'Bring plans into the real world, from suppliers to property.', routes: ['procure', 'property'] },
];

export function personaPortrait(p, cls = '') {
  return `<span class="persona-portrait ${cls}" style="--portrait-x:${p.position}%" role="img" aria-label="${esc(p.name)}, ${esc(p.role)}"></span>`;
}

export function personaHeader(route) {
  if (route === 'dashboard') return `
    <section class="headquarters" aria-labelledby="hq-title">
      <div class="hq-photo" role="img" aria-label="Fictional De Castro team in a contemporary Dubai headquarters"></div>
      <div class="hq-copy"><span class="hq-kicker">DE CASTRO / PRIVATE OFFICE</span><h2 id="hq-title">Big ambitions.<br>Real-world foundations.</h2><p>Your ventures, capital and knowledge.<br>One office. A shared direction.</p><a class="hq-link" href="#/engine">Enter the Tower ${icon('arrow')}</a></div>
      <span class="hq-caption">THE PEOPLE BEHIND THE EMPIRE</span>
    </section>
    <section class="persona-team" aria-label="Your office personas">
      <div class="team-heading"><div><span class="office-label">YOUR INNER CIRCLE</span><h2>A different perspective. A shared ambition.</h2></div><span class="team-note">Character guides to your workspace</span></div>
      <div class="persona-roster">${PERSONAS.map(p => `<a class="persona-card" href="#/${p.route}">${personaPortrait(p)}<span class="persona-card-copy"><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span><small>${esc(p.area)} ${icon('arrow')}</small></span></a>`).join('')}</div>
    </section>`;
  const p = PERSONAS.find(p => p.routes.includes(route));
  if (!p) return '';
  return `<aside class="department-persona" aria-label="Workspace persona">${personaPortrait(p)}<div><span class="office-label">${esc(p.area)}</span><div class="persona-intro"><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span></div><p>${esc(p.note)}</p></div><a href="#/dashboard" class="office-return">Meet the office ${icon('arrow')}</a></aside>`;
}
