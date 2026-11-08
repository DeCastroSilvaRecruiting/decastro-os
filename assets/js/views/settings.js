import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, toast, confirmBox, modal, fmtDate, num } from '../ui.js';

export default {
  title: 'Settings & Sync',
  render(s) {
    const g = s.settings.github;
    return `<div class="page-head"><div><div class="eyebrow">System</div><h1>Settings & Sync</h1><p>Your data lives in this browser. Connect your private vault on GitHub so Claude can work on your knowledge base, and keep an encrypted backup of your finances there.</p></div></div>
    <div class="grid g2">
      <div class="card"><div class="card-head"><h3>Profile</h3></div>
        <div class="form">
          <div class="field"><label>Your name</label><input data-change="set" data-k="owner" value="${esc(s.settings.owner)}"></div>
          <div class="field"><label>Empire name</label><input data-change="set" data-k="empire" value="${esc(s.settings.empire)}"></div>
          <div class="field"><label>Base currency</label><select data-change="set" data-k="baseCcy">${store.currencies().map((c) => `<option ${c === s.settings.baseCcy ? 'selected' : ''}>${c}</option>`).join('')}</select><div class="hint">Add currencies in Treasury → FX rates.</div></div>
          <div class="field"><label>Monthly burn override</label><input type="number" data-change="set" data-k="monthlyBurn" value="${esc(s.settings.monthlyBurn)}" placeholder="from recurring outflows"></div>
          <div class="field"><label>Operating cash target (months)</label><input type="number" data-change="set" data-k="operatingMonths" value="${esc(s.settings.operatingMonths)}"></div>
          <div class="field"><label>Reserve target (months)</label><input type="number" data-change="set" data-k="reserveMonths" value="${esc(s.settings.reserveMonths)}"></div>
        </div></div>

      <div class="card"><div class="card-head"><h3>Knowledge vault (GitHub)</h3><div class="right"><span class="badge ${K.mode() === 'connected' ? 'green' : ''}">${K.mode() === 'connected' ? 'Connected' : 'Not connected'}</span></div></div>
        <div class="form">
          <div class="field"><label>Owner (GitHub username)</label><input id="gh-owner" value="${esc(g.owner)}" placeholder="your-username"></div>
          <div class="field"><label>Vault repository</label><input id="gh-repo" value="${esc(g.repo)}" placeholder="decastro-vault"></div>
          <div class="field"><label>Branch</label><input id="gh-branch" value="${esc(g.branch || 'main')}"></div>
          <div class="field"><label>Fine-grained token</label><input id="gh-token" type="password" value="${esc(g.token)}" placeholder="github_pat_…" autocomplete="off"></div>
        </div>
        <div class="row mt"><button class="btn primary" data-act="saveGh">${icon('lock')} Save & test</button>${g.token ? '<button class="btn ghost" data-act="forgetGh">Disconnect</button>' : ''}</div>
        <p class="small muted">Create the token at GitHub → Settings → Developer settings → Fine-grained tokens. Give it access to <b>only</b> the vault repository with <b>Contents: Read and write</b>. It is stored in this browser only and is never put into backups or the encrypted vault.</p></div>

      <div class="card"><div class="card-head"><h3>Encrypted vault backup</h3></div>
        <p class="small muted" style="margin-top:0">Encrypts all your financial, legal and venture data with a passphrase (AES-256-GCM) and stores it as <code>vault/vault.enc.json</code> in your vault repo. Use it to back up and to move between devices. Without the passphrase the file is unreadable — including to Claude and to GitHub. ${s.settings.lastVaultPush ? `Last pushed ${fmtDate(s.settings.lastVaultPush, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.` : ''}</p>
        <div class="row"><button class="btn" data-act="pushVault" ${K.mode() !== 'connected' ? 'disabled' : ''}>${icon('upload')} Encrypt & push</button><button class="btn" data-act="pullVault" ${K.mode() !== 'connected' ? 'disabled' : ''}>${icon('download')} Pull & decrypt</button></div>
        <div class="callout red small mt">There is no passphrase recovery. Store it in your password manager.</div></div>

      <div class="card"><div class="card-head"><h3>Local backup</h3></div>
        <p class="small muted" style="margin-top:0">Download everything as a JSON file, or restore from one. The GitHub token is excluded.</p>
        <div class="row"><button class="btn" data-act="export">${icon('download')} Export JSON</button><label class="btn">${icon('upload')} Import JSON<input type="file" accept="application/json" data-change="import" hidden></label></div>
        <hr><button class="btn danger" data-act="reset">${icon('trash')} Reset everything</button></div>
    </div>`;
  },
  actions: {
    set(el) { const k = el.dataset.k; store.update((s) => { s.settings[k] = el.type === 'number' ? (el.value === '' ? '' : num(el.value)) : el.value; }); },
    async saveGh() {
      const v = (id) => document.getElementById(id).value.trim();
      store.update((s) => { s.settings.github = { owner: v('gh-owner'), repo: v('gh-repo'), branch: v('gh-branch') || 'main', token: v('gh-token') }; }, { render: false });
      if (!store.ghConfigured()) { toast('Fill in owner, repository and token', 'error'); return; }
      try {
        const info = await store.gh().repoInfo();
        if (!info.private) toast('Warning: this repository is PUBLIC. Make it private to keep your research and queue confidential.', 'error');
        const q = await store.gh().getFile('queue/queue.json');
        if (!q) toast('Connected, but queue/queue.json was not found. Did you upload the vault template?', 'error');
        else { K.clearCache(); await K.syncQueue(); toast(`Connected to ${info.full_name}`, 'ok'); }
      } catch (e) { toast(e.message, 'error'); }
      store.update(() => {});
    },
    forgetGh() { store.update((s) => { s.settings.github.token = ''; }); K.clearCache(); toast('Disconnected. Token removed from this browser.'); },
    pushVault() { passphrase('Encrypt & push', async (pass) => {
      const env = await store.encryptVault(store.vaultPayload(), pass);
      const api = store.gh(); const cur = await api.getFile('vault/vault.enc.json');
      await api.putFile('vault/vault.enc.json', JSON.stringify(env, null, 2) + '\n', 'vault: encrypted backup', cur?.sha);
      store.update((s) => { s.settings.lastVaultPush = new Date().toISOString(); });
      toast('Encrypted vault pushed', 'ok');
    }, true); },
    pullVault() { passphrase('Pull & decrypt', async (pass) => {
      const f = await store.gh().getFile('vault/vault.enc.json');
      if (!f) throw new Error('No vault/vault.enc.json in the repository yet');
      let data; try { data = await store.decryptVault(JSON.parse(f.text), pass); } catch { throw new Error('Wrong passphrase or corrupted file'); }
      if (!(await confirmBox('Replace the data in this browser with the decrypted vault?', 'Replace'))) return;
      data.settings.github = store.get().settings.github; store.replaceState(data); toast('Vault restored', 'ok');
    }); },
    export() {
      const blob = new Blob([JSON.stringify(store.vaultPayload(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `decastro-os-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
    },
    async import(el) {
      const file = el.files[0]; if (!file) return;
      try { const data = JSON.parse(await file.text()); if (!data.settings || !data.ventures) throw new Error('Not a De Castro OS backup');
        if (await confirmBox('Replace all data in this browser with this backup?', 'Replace')) { store.replaceState(data); toast('Backup restored', 'ok'); } }
      catch (e) { toast(e.message, 'error'); }
    },
    async reset() { if (await confirmBox('Erase all data in this browser and start fresh? Export a backup first.', 'Erase everything')) { store.resetAll(); toast('Reset complete'); } },
  },
};

function passphrase(title, fn, confirm = false) {
  const { el, close } = modal({ title, body: `<div class="form"><div class="field full"><label>Vault passphrase</label><input type="password" id="pp1" autocomplete="new-password"></div>${confirm ? '<div class="field full"><label>Repeat passphrase</label><input type="password" id="pp2" autocomplete="new-password"></div>' : ''}</div>${confirm ? '<p class="small muted">Use at least 12 characters. A long sentence is best.</p>' : ''}`,
    foot: `<button class="btn right" data-close>Cancel</button><button class="btn primary" data-go>${icon('lock')} Continue</button>` });
  el.querySelector('[data-go]').addEventListener('click', async () => {
    const p = el.querySelector('#pp1').value;
    if (confirm && (p.length < 12 || p !== el.querySelector('#pp2').value)) { toast(p.length < 12 ? 'Use at least 12 characters' : 'Passphrases do not match', 'error'); return; }
    if (!p) return;
    const btn = el.querySelector('[data-go]'); btn.disabled = true; btn.textContent = 'Working…';
    try { await fn(p); close(); } catch (e) { toast(e.message, 'error'); btn.disabled = false; btn.textContent = 'Continue'; }
  });
}
