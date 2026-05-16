// Status dashboard — fetches /api/status and /api/newsletters, renders them.

const el = {
  cards: document.getElementById('cards'),
  rows: document.getElementById('rows'),
  filter: document.getElementById('filter'),
  footer: document.getElementById('footer'),
  refresh: document.getElementById('refresh'),
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

function card(label, value, small = false) {
  return `<div class="card">
    <div class="label">${label}</div>
    <div class="value${small ? ' small' : ''}">${value}</div>
  </div>`;
}

function renderStatus(s) {
  const types = Object.entries(s.types)
    .map(([t, n]) => `${t}: ${n}`)
    .join(' · ');
  el.cards.innerHTML = [
    card('Version', s.version),
    card('Newsletters', s.count),
    card('By type', types || '—', true),
    card('List updated', ago(s.updatedAt), true),
    card('Server reloaded', ago(s.loadedAt), true),
    card('Uptime', fmtUptime(s.uptimeSeconds), true),
    card('ETag', s.etag.replace(/"/g, '').slice(0, 12) + '…', true),
  ].join('');
}

function renderRows(list) {
  if (list.length === 0) {
    el.rows.innerHTML = '<tr><td colspan="4" class="muted">No matches.</td></tr>';
    return;
  }
  el.rows.innerHTML = list
    .map((n, i) => {
      const target = n.slug || n.host || n.url || '—';
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(n.name)}</td>
        <td><span class="badge ${n.type}">${n.type}</span></td>
        <td class="target">${escapeHtml(target)}</td>
      </tr>`;
    })
    .join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function applyFilter() {
  const q = el.filter.value.trim().toLowerCase();
  const list = q
    ? allNewsletters.filter((n) => n.name.toLowerCase().includes(q))
    : allNewsletters;
  renderRows(list);
}

async function load() {
  try {
    const [status, list] = await Promise.all([
      fetch('/api/status').then((r) => r.json()),
      fetch('/api/newsletters').then((r) => r.json()),
    ]);
    renderStatus(status);
    allNewsletters = list.newsletters;
    applyFilter();
    el.footer.textContent = `Loaded ${new Date().toLocaleString()}`;
  } catch (err) {
    el.cards.innerHTML = `<div class="error">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

el.refresh.addEventListener('click', load);
el.filter.addEventListener('input', applyFilter);
load();
