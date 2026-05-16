// Status dashboard — fetches /api/status and /api/newsletters, renders them.

const el = {
  cards: document.getElementById('cards'),
  rows: document.getElementById('rows'),
  rowCount: document.getElementById('rowCount'),
  filter: document.getElementById('filter'),
  footer: document.getElementById('footer'),
  refresh: document.getElementById('refresh'),
  status: document.getElementById('serverStatus'),
  analyticsCards: document.getElementById('analyticsCards'),
  analyticsRows: document.getElementById('analyticsRows'),
  pulseRows: document.getElementById('pulseRows'),
  // Editor
  editList: document.getElementById('editList'),
  editor: document.getElementById('editor'),
  editorClose: document.getElementById('editorClose'),
  editorCancel: document.getElementById('editorCancel'),
  editorSave: document.getElementById('editorSave'),
  editorRows: document.getElementById('editorRows'),
  addRow: document.getElementById('addRow'),
  adminToken: document.getElementById('adminToken'),
  editorMsg: document.getElementById('editorMsg'),
};

let allNewsletters = []; // cached for client-side filtering
const TOKEN_KEY = 'mw_admin_token'; // admin token cached in localStorage

// Human-readable "time ago" for ISO timestamps.
function ago(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function fmtUptime(s) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// One stat card: icon + label on top, big value below.
function card(icon, label, value, small = false) {
  return `<div class="card">
    <div class="card-top">
      <span class="material-symbols-outlined">${icon}</span>
      <span class="label">${label}</span>
    </div>
    <div class="value${small ? ' small' : ''}">${value}</div>
  </div>`;
}

function setStatus(state, text) {
  el.status.className = `gm-status ${state}`;
  el.status.querySelector('.status-text').textContent = text;
}

function renderStatus(s) {
  const types = Object.entries(s.types)
    .map(([t, n]) => `${t} ${n}`)
    .join(' · ');
  el.cards.innerHTML = [
    card('tag', 'List version', s.version),
    card('mail', 'Newsletters', s.count),
    card('category', 'By type', types || '—', true),
    card('edit_calendar', 'List updated', ago(s.updatedAt), true),
    card('sync', 'Server reloaded', ago(s.loadedAt), true),
    card('timer', 'Uptime', fmtUptime(s.uptimeSeconds), true),
    card('fingerprint', 'ETag', s.etag.replace(/"/g, '').slice(0, 10) + '…', true),
  ].join('');
  // Show the editor button only when the server has editing enabled.
  el.editList.hidden = !s.editable;
}

function renderRows(list) {
  el.rowCount.textContent = `${list.length} shown`;
  if (list.length === 0) {
    el.rows.innerHTML = '<tr class="empty-row"><td colspan="4">No matches.</td></tr>';
    return;
  }
  el.rows.innerHTML = list
    .map((n, i) => {
      const target = n.slug || n.host || n.url || '—';
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="name">${escapeHtml(n.name)}</td>
        <td><span class="tag ${n.type}">${escapeHtml(n.type)}</span></td>
        <td class="target">${escapeHtml(target)}</td>
      </tr>`;
    })
    .join('');
}

// --- Analytics ---------------------------------------------------------------

function rateClass(pct) {
  if (pct >= 70) return '';
  if (pct >= 40) return 'mid';
  return 'low';
}

function rateCell(pct) {
  return `<td><div class="rate">
    <div class="track"><div class="fill ${rateClass(pct)}" style="width:${pct}%"></div></div>
    <span class="pct">${pct}%</span>
  </div></td>`;
}

function renderAnalytics(a) {
  const t = a.totals;
  const attempted = t.success + t.failure + t.skipped;
  const overall = attempted ? Math.round((t.success / attempted) * 100) : 0;
  el.analyticsCards.innerHTML = [
    card('play_circle', 'Runs', t.runs),
    card('devices', 'Installs', t.installs),
    card('check_circle', 'Successes', t.success),
    card('cancel', 'Failures', t.failure),
    card('percent', 'Success rate', `${overall}%`),
    card('podcasts', 'Last pulse', ago(t.lastPulseAt), true),
  ].join('');

  // Per-newsletter table.
  if (a.perNewsletter.length === 0) {
    el.analyticsRows.innerHTML =
      '<tr class="empty-row"><td colspan="7">No pulses received yet.</td></tr>';
  } else {
    el.analyticsRows.innerHTML = a.perNewsletter
      .map((r) => `<tr>
        <td class="name">${escapeHtml(r.newsletter)}</td>
        <td><span class="tag ${r.type || ''}">${escapeHtml(r.type || '—')}</span></td>
        <td class="num">${r.attempts}</td>
        <td class="num ok">${r.success}</td>
        <td class="num fail">${r.failure}</td>
        <td class="num skip">${r.skipped}</td>
        ${rateCell(r.successRate)}
      </tr>`)
      .join('');
  }

  // Recent pulses.
  if (a.recent.length === 0) {
    el.pulseRows.innerHTML =
      '<tr class="empty-row"><td colspan="6">No pulses received yet.</td></tr>';
  } else {
    el.pulseRows.innerHTML = a.recent
      .map((p) => `<tr>
        <td class="mono">${escapeHtml(p.install)}</td>
        <td>${escapeHtml(p.extVersion || '—')}</td>
        <td>${escapeHtml(ago(new Date(p.runAt).toISOString()))}</td>
        <td class="num ok">${p.success}</td>
        <td class="num fail">${p.failure}</td>
        <td class="num skip">${p.skipped}</td>
      </tr>`)
      .join('');
  }
}

function applyFilter() {
  const q = el.filter.value.trim().toLowerCase();
  const list = q
    ? allNewsletters.filter((n) => n.name.toLowerCase().includes(q))
    : allNewsletters;
  renderRows(list);
}

async function load() {
  setStatus('', 'Loading…');
  try {
    const [status, list, analytics] = await Promise.all([
      fetch('/api/status').then((r) => r.json()),
      fetch('/api/newsletters').then((r) => r.json()),
      fetch('/api/analytics').then((r) => r.json()),
    ]);
    renderStatus(status);
    allNewsletters = list.newsletters;
    applyFilter();
    renderAnalytics(analytics);
    setStatus('online', 'Online');
    el.footer.textContent = `Last loaded ${new Date().toLocaleString()}`;
  } catch (err) {
    setStatus('offline', 'Offline');
    el.cards.innerHTML =
      `<div class="error">
        <span class="material-symbols-outlined">error</span>
        Failed to load: ${escapeHtml(err.message)}
      </div>`;
  }
}

// --- Editor ------------------------------------------------------------------

// Each row has one "mode" that fixes both the type and which target field is
// used, so the single target input is never ambiguous.
const MODES = {
  'substack-slug': { type: 'substack', field: 'slug', hint: 'e.g. lennysnewsletter' },
  'substack-host': { type: 'substack', field: 'host', hint: 'e.g. www.slowboring.com' },
  'form-url': { type: 'form', field: 'url', hint: 'e.g. https://tldr.tech/signup' },
};

function modeOf(n) {
  if (n.type === 'form') return 'form-url';
  return n.host ? 'substack-host' : 'substack-slug';
}

// Builds one editable <tr>. `n` is an existing entry, or {} for a blank row.
function buildEditorRow(n = {}) {
  const tr = document.createElement('tr');

  const nameTd = document.createElement('td');
  const name = document.createElement('input');
  name.className = 'js-name';
  name.placeholder = 'Newsletter name';
  name.value = n.name || '';
  nameTd.appendChild(name);

  const typeTd = document.createElement('td');
  typeTd.className = 't-type';
  const sel = document.createElement('select');
  sel.className = 'js-mode';
  for (const [val, m] of Object.entries(MODES)) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = m.type === 'form' ? 'Form (url)' : `Substack (${m.field})`;
    sel.appendChild(opt);
  }
  sel.value = modeOf(n);
  typeTd.appendChild(sel);

  const targetTd = document.createElement('td');
  const target = document.createElement('input');
  target.className = 'js-target';
  target.value = n.slug || n.host || n.url || '';
  targetTd.appendChild(target);

  const delTd = document.createElement('td');
  delTd.className = 't-del';
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'gm-row-del';
  del.title = 'Remove';
  del.innerHTML = '<span class="material-symbols-outlined">delete</span>';
  del.addEventListener('click', () => tr.remove());
  delTd.appendChild(del);

  const syncHint = () => { target.placeholder = MODES[sel.value].hint; };
  sel.addEventListener('change', syncHint);
  syncHint();

  tr.append(nameTd, typeTd, targetTd, delTd);
  return tr;
}

function setEditorMsg(text, kind = '') {
  el.editorMsg.textContent = text;
  el.editorMsg.className = `gm-editor-msg ${kind}`;
}

function openEditor() {
  el.editorRows.innerHTML = '';
  allNewsletters.forEach((n) => el.editorRows.appendChild(buildEditorRow(n)));
  el.adminToken.value = localStorage.getItem(TOKEN_KEY) || '';
  setEditorMsg(`${allNewsletters.length} newsletters`);
  el.editor.hidden = false;
}

function closeEditor() {
  el.editor.hidden = true;
}

// Reads the editor rows back into an array of newsletter entries.
function collectRows() {
  return [...el.editorRows.children].map((tr) => {
    const name = tr.querySelector('.js-name').value.trim();
    const mode = MODES[tr.querySelector('.js-mode').value];
    const target = tr.querySelector('.js-target').value.trim();
    return { name, type: mode.type, [mode.field]: target };
  });
}

async function saveList() {
  const token = el.adminToken.value.trim();
  if (!token) return setEditorMsg('Enter the admin token to save.', 'error');

  const newsletters = collectRows();
  if (newsletters.some((n) => !n.name)) {
    return setEditorMsg('Every row needs a name.', 'error');
  }

  el.editorSave.disabled = true;
  setEditorMsg('Saving…');
  try {
    const res = await fetch('/api/newsletters', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
      body: JSON.stringify({ newsletters }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setEditorMsg(body.error || `Save failed (${res.status})`, 'error');
      return;
    }
    localStorage.setItem(TOKEN_KEY, token); // remember a token that worked
    setEditorMsg(`Saved — list is now version ${body.version}.`, 'success');
    await load();
    setTimeout(closeEditor, 900);
  } catch (err) {
    setEditorMsg(`Save failed: ${err.message}`, 'error');
  } finally {
    el.editorSave.disabled = false;
  }
}

el.editList.addEventListener('click', openEditor);
el.editorClose.addEventListener('click', closeEditor);
el.editorCancel.addEventListener('click', closeEditor);
el.addRow.addEventListener('click', () => {
  el.editorRows.appendChild(buildEditorRow());
});
el.editorSave.addEventListener('click', saveList);
el.editor.addEventListener('click', (e) => {
  if (e.target === el.editor) closeEditor(); // click backdrop to dismiss
});

el.refresh.addEventListener('click', load);
el.filter.addEventListener('input', applyFilter);
load();
