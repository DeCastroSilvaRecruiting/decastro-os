// Art Studio — the queue for artwork made with ChatGPT on a normal subscription (no API credits).
// Each slot shows its prompt, a button to open ChatGPT, and an upload that commits the image to the site repo.
import * as store from '../store.js';
import { esc, icon, toast, copyText } from '../ui.js';
import { ART_SLOTS, ART_STYLE } from '../art.js';

let status = {};          // file -> 'mine' | 'placeholder' | 'empty'
let placeholderSizes = null;
let checking = false;
const SITE_REPO = () => (store.get().settings.art && store.get().settings.art.repo) || `${store.get().settings.github.owner || 'DeCastroSilvaRecruiting'}/decastro-os`;
const square = (f) => /^(matthew|lizzie)\.png$/.test(f);
const fullPrompt = (s) => `${s.prompt}. ${ART_STYLE}. ${square(s.file) ? 'Square image, 1:1. If I attach a photo, base the likeness on it.' : 'Wide landscape banner, about 12:5 (for example 1536x640), subject centred with space at the top and bottom.'} Give me a PNG.`;

async function check() {
  if (checking) return; checking = true;
  try {
    if (!placeholderSizes) { try { placeholderSizes = (await (await fetch(`assets/art/placeholders.json?t=${Date.now()}`, { cache: 'no-store' })).json()).sizes || {}; } catch { placeholderSizes = {}; } }
    await Promise.all(ART_SLOTS.map(async (s) => {
      try {
        const r = await fetch(`assets/art/${s.file}?t=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
        if (!r.ok) { status[s.file] = 'empty'; return; }
        const len = +r.headers.get('content-length');
        status[s.file] = len && placeholderSizes[s.file] === len ? 'placeholder' : 'mine';
      } catch { status[s.file] = 'empty'; }
    }));
  } finally { checking = false; }
  const box = document.getElementById('art-studio');
  if (box) box.innerHTML = studioHTML();
}

const BADGE = { mine: ['green', 'Your art'], placeholder: ['gold', 'Claude placeholder'], empty: ['', 'Empty'] };
function card(s, big = false) {
  const st = status[s.file] || 'checking';
  const [tone, label] = BADGE[st] || ['', 'Checking…'];
  return `<div class="card art-card ${big ? 'art-next' : ''}">
    <div class="art-thumb ${square(s.file) ? 'sq' : ''}">${st !== 'empty' ? `<img src="assets/art/${s.file}?v=${Date.now() % 100000}" alt="${esc(s.where)}" decoding="async">` : `<div class="art-empty">${icon('spark')}</div>`}</div>
    <div class="card-head" style="margin-top:10px"><h3>${esc(s.where)}</h3><div class="right"><span class="badge ${tone}">${label}</span></div></div>
    <div class="small muted"><code>${esc(s.file)}</code> · ${esc(s.size)}</div>
    <details style="margin:8px 0"><summary class="small">Prompt</summary><p class="small" style="margin:6px 0 0;white-space:pre-wrap">${esc(fullPrompt(s))}</p></details>
    <div class="row" style="gap:6px;flex-wrap:wrap">
      <button class="btn sm ${big ? 'primary' : ''}" data-act="copyPrompt" data-file="${s.file}">${icon('copy')} Copy prompt</button>
      <a class="btn sm" href="https://chatgpt.com/" target="_blank" rel="noopener">Open ChatGPT ${icon('arrow')}</a>
      <label class="btn sm">${icon('upload')} Upload<input type="file" accept="image/*" data-change="uploadArt" data-file="${s.file}" hidden></label>
    </div></div>`;
}

function studioHTML() {
  const counts = { mine: 0, placeholder: 0, empty: 0 };
  ART_SLOTS.forEach((s) => { if (status[s.file]) counts[status[s.file]]++; });
  const order = { empty: 0, placeholder: 1, mine: 2 };
  const queue = ART_SLOTS.slice().sort((a, b) => (order[status[a.file]] ?? 1) - (order[status[b.file]] ?? 1));
  const next = queue.find((s) => status[s.file] !== 'mine');
  const can = store.ghConfigured();
  return `
    <div class="grid g3"><div class="card kpi hero"><div class="label">Your art</div><div class="value gold">${counts.mine}/${ART_SLOTS.length}</div><div class="delta">made in ChatGPT and uploaded</div></div>
      <div class="card kpi"><div class="label">Placeholders</div><div class="value">${counts.placeholder}</div><div class="delta">drawn by Claude, ready to replace</div></div>
      <div class="card kpi"><div class="label">Empty</div><div class="value">${counts.empty}</div><div class="delta">hidden in the app until filled</div></div></div>
    ${can ? '' : `<div class="callout gold small mt">Uploads from here need the GitHub token in <a href="#/settings">Settings &amp; Sync</a> with access to <b>${esc(SITE_REPO())}</b> (Contents: read and write). Until then, use <a href="https://github.com/${esc(SITE_REPO())}/upload/main/assets/art" target="_blank" rel="noopener">Upload on GitHub</a> and name the file exactly as shown.</div>`}
    ${next ? `<h2 class="mt" style="font-size:18px">Next in your queue</h2><div class="grid g2">${card(next, true)}<div class="card"><div class="card-head"><h3>How to do one</h3></div><ol class="small" style="margin:0;padding-left:18px">
      <li style="margin-bottom:6px">Tap <b>Copy prompt</b>, then <b>Open ChatGPT</b> and paste it. For the portraits, attach your photo too.</li>
      <li style="margin-bottom:6px">Ask for changes until you like it, then save the image.</li>
      <li style="margin-bottom:6px">Tap <b>Upload</b> on the slot and choose the image. It is resized and committed to your site for you.</li>
      <li>The site republishes in a few minutes; the art then appears in the Tower and the game.</li></ol>
      <p class="small muted" style="margin:10px 0 0">This uses your normal ChatGPT plan, no API credits. Your photos stay in ChatGPT: only the finished artwork is uploaded, and the site repository is public.</p></div></div>` : '<div class="callout green mt">Every slot has your own art. New slots will appear here as the world grows.</div>'}
    <h2 class="mt" style="font-size:18px">All slots</h2>
    <div class="grid g3">${queue.map((s) => card(s)).join('')}</div>`;
}

/** Fit any image to the slot's shape (cover), export PNG and commit it with the GitHub contents API. */
async function uploadArt(file, slot) {
  const s = ART_SLOTS.find((x) => x.file === slot);
  const [w, h] = s.size.split('x').map(Number);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const k = Math.max(w / img.width, h / img.height), dw = img.width * k, dh = img.height * k;
  c.getContext('2d').drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  const b64 = c.toDataURL('image/png').split(',')[1];
  const g = store.get().settings.github, repo = SITE_REPO();
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${g.token}`, 'X-GitHub-Api-Version': '2022-11-28' };
  const url = `https://api.github.com/repos/${repo}/contents/assets/art/${slot}`;
  const cur = await fetch(`${url}?ref=main&t=${Date.now()}`, { headers, cache: 'no-store' });
  const sha = cur.ok ? (await cur.json()).sha : undefined;
  const r = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ message: `art: ${slot} from the Art Studio`, content: b64, branch: 'main', ...(sha ? { sha } : {}) }) });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.json().catch(() => ({}))).message || r.statusText}`);
}

export default {
  title: 'Art Studio',
  render() {
    setTimeout(check, 0);
    return `<div class="page-head"><div><div class="eyebrow">Build</div><h1>Art Studio</h1>
      <p>Your queue of artwork for the Tower world: title art, portraits of you and Lizzie, every workshop and every venture island. Make each piece in ChatGPT with the prompt here, upload it, and it appears in the app.</p></div>
      <div class="actions"><button class="btn" data-act="copyStyle">${icon('copy')} Copy house style</button><button class="btn" data-act="recheck">${icon('sync')} Refresh</button><a class="btn primary" href="https://chatgpt.com/" target="_blank" rel="noopener">Open ChatGPT ${icon('arrow')}</a></div></div>
      <div id="art-studio">${studioHTML()}</div>`;
  },
  actions: {
    copyPrompt(el) { const s = ART_SLOTS.find((x) => x.file === el.dataset.file); copyText(fullPrompt(s)); toast('Prompt copied: paste it into ChatGPT', 'ok'); },
    copyStyle() { copyText(`For every image in this chat use this style: ${ART_STYLE}.`); toast('House style copied', 'ok'); },
    recheck() { placeholderSizes = null; check(); },
    async uploadArt(el) {
      const f = el.files && el.files[0], slot = el.dataset.file; if (!f) return;
      if (!store.ghConfigured()) { toast('Add your GitHub token in Settings & Sync first, or use Upload on GitHub', 'error'); window.open(`https://github.com/${SITE_REPO()}/upload/main/assets/art`, '_blank', 'noopener'); return; }
      toast(`Uploading ${slot}…`, 'ok');
      try { await uploadArt(f, slot); status[slot] = 'mine'; toast('Uploaded. Your site republishes in a few minutes.', 'ok'); const box = document.getElementById('art-studio'); if (box) box.innerHTML = studioHTML(); }
      catch (e) { toast(`Upload failed: ${e.message}. Check that the token can write to ${SITE_REPO()}.`, 'error'); }
    },
  },
};
