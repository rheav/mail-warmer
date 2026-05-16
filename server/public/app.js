// Status dashboard — fetches /api/status and /api/newsletters, renders them.

const el = {
  cards: document.getElementById('cards'),
  rows: document.getElementById('rows'),
  rowCount: document.getElementById('rowCount'),
  filter: document.getElementById('filter'),
  footer: document.getElementById('footer'),
  refresh: document.getElementById('refresh'),
  status: document.getElementById('serverStatus'),
};

let allNewsletters = []; // cached for client-side filtering

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
    const [status, list] = await Promise.all([
      fetch('/api/status').then((r) => r.json()),
      fetch('/api/newsletters').then((r) => r.json()),
    ]);
    renderStatus(status);
    allNewsletters = list.newsletters;
    applyFilter();
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

el.refresh.addEventListener('click', load);
el.filter.addEventListener('input', applyFilter);
load();
