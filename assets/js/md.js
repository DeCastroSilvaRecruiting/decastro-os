// Small, safe Markdown renderer with [[wikilinks]] and YAML-lite frontmatter.
import { esc } from './ui.js';

export function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta = {}; let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const li = /^\s+-\s+(.*)$/.exec(line);
    if (li && key) { if (!Array.isArray(meta[key])) meta[key] = []; meta[key].push(unq(li[1])); continue; }
    const kv = /^([A-Za-z0-9_\-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    key = kv[1]; const v = kv[2].trim();
    if (v === '') meta[key] = [];
    else if (/^\[.*\]$/.test(v)) meta[key] = v.slice(1, -1).split(',').map((s) => unq(s.trim())).filter(Boolean);
    else meta[key] = unq(v);
  }
  return { meta, body: src.slice(m[0].length) };
}
const unq = (s) => s.replace(/^["']|["']$/g, '');

export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

function inline(s, ctx) {
  // protect code spans
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const slug = slugify(target);
    const exists = !ctx.known || ctx.known.has(slug);
    return `<a class="wikilink ${exists ? '' : 'missing'}" href="#/wiki/${slug}" title="${exists ? '' : 'Not written yet — click to request research'}">${label || target}</a>`;
  });
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => /^(https?:|\.?\/)/.test(src) ? `<img alt="${alt}" src="${src}" style="max-width:100%">` : '');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => {
    const safe = /^(https?:|mailto:|#)/i.test(href.replace(/&amp;/g, '&')) ? href : '#';
    const ext = /^https?:/i.test(safe);
    return `<a href="${safe}" ${ext ? 'target="_blank" rel="noopener noreferrer"' : ''}>${t}</a>`;
  });
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
  return s;
}

export function renderMarkdown(src, ctx = {}) {
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  let html = '', i = 0;
  const para = [];
  const flush = () => { if (para.length) { html += `<p>${inline(para.join(' '), ctx)}</p>`; para.length = 0; } };
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flush(); const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; html += `<pre><code>${esc(buf.join('\n'))}</code></pre>`; continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { flush(); const lvl = h[1].length; html += `<h${lvl} id="${slugify(h[2])}">${inline(h[2], ctx)}</h${lvl}>`; i++; continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flush(); html += '<hr>'; i++; continue; }
    if (/^>\s?/.test(line)) {
      flush(); const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      html += `<blockquote>${renderMarkdown(buf.join('\n'), ctx)}</blockquote>`; continue;
    }
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flush();
      const row = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = row(line); i += 2; const body = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) body.push(row(lines[i++]));
      html += `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c, ctx)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c, ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      continue;
    }
    const li = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      flush();
      const ordered = /\d/.test(li[2]); const items = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (m) { items.push({ ind: m[1].length, text: m[3] }); i++; }
        else if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; }
        else break;
      }
      const base = items[0].ind; let out = ''; let open = false;
      for (const it of items) {
        const task = /^\[( |x)\]\s+(.*)$/i.exec(it.text);
        const txt = task ? `<input type="checkbox" disabled ${task[1].toLowerCase() === 'x' ? 'checked' : ''}> ${inline(task[2], ctx)}` : inline(it.text, ctx);
        if (it.ind > base) { if (!open) { out = out.replace(/<\/li>$/, ''); out += '<ul>'; open = true; } out += `<li>${txt}</li>`; }
        else { if (open) { out += '</ul></li>'; open = false; } out += `<li>${txt}</li>`; }
      }
      if (open) out += '</ul></li>';
      html += ordered ? `<ol>${out}</ol>` : `<ul>${out}</ul>`;
      continue;
    }
    if (/^\s*$/.test(line)) { flush(); i++; continue; }
    para.push(line.trim()); i++;
  }
  flush();
  return html;
}

export function extractWikilinks(src) {
  const out = new Set(); const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g; let m;
  while ((m = re.exec(src))) out.add(slugify(m[1]));
  return [...out];
}
