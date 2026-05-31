import { MSG, RUN_STATUS } from '../lib/messages.js';
import * as store from '../lib/storage.js';
import { sendPulse } from '../lib/analytics.js';
import { signupSubstack } from './adapters/substack.js';
import { signupViaForm } from './adapters/form.js';
import { setRunningBadge, setResultBadge, clearBadge } from '../lib/badge.js';

let state = {
  status: RUN_STATUS.IDLE,
  progress: { done: 0, total: 0, current: null },
  abort: false,
};

export function getRunState() {
  return { status: state.status, progress: state.progress };
}

export function stopRun() {
  state.abort = true;
}

export async function runSignups({ emailId, newsletterIds }) {
  if (state.status === RUN_STATUS.RUNNING) {
    throw new Error('Already running');
  }

  const { emails, newsletters, profile } = await store.getAll();
  const email = emails.find((e) => e.id === emailId);
  if (!email) throw new Error('Active email not found');

  const items = newsletterIds
    .map((id) => newsletters.find((n) => n.id === id))
    .filter(Boolean);

  state = {
    status: RUN_STATUS.RUNNING,
    progress: { done: 0, total: items.length, current: null },
    abort: false,
  };
  broadcastProgress();
  clearBadge();
  await store.appendLog('info', `Run start: ${items.length} newsletters for ${email.address}`);

  // Per-newsletter outcomes, collected for the anonymous analytics pulse.
  const pulseResults = [];
  let successCount = 0;
  let errorCount = 0;

  for (const n of items) {
    if (state.abort) {
      await store.appendLog('warn', 'Run aborted by user');
      break;
    }
    state.progress.current = n.name;
    broadcastProgress();

    let status;
    try {
      const result = await signupOne(email.address, n, { profile });
      status = result.status;
      await store.recordResult(emailId, n.id, result.status, result.message);
      await store.appendLog(
        result.status === 'success' ? 'success' : 'warn',
        `[${n.name}] ${result.status}${result.message ? ` — ${result.message}` : ''}`
      );
    } catch (err) {
      status = 'error';
      await store.recordResult(emailId, n.id, 'error', err.message);
      await store.appendLog('error', `[${n.name}] error — ${err.message}`);
    }
    pulseResults.push({ newsletter: n.name, type: n.type, status });
    if (status === 'success') successCount += 1;
    else if (status === 'error') errorCount += 1;

    state.progress.done += 1;
    broadcastProgress();
    setRunningBadge(successCount);

    // Pace requests so we don't look like a bot or trip rate limits.
    await delay(jitter(2500, 5500));
  }

  state.status = RUN_STATUS.DONE;
  state.progress.current = null;
  broadcastProgress();
  setResultBadge({ success: successCount, error: errorCount });
  chrome.runtime.sendMessage({ type: MSG.RUN_COMPLETE }).catch(() => {});
  await store.appendLog('info', 'Run complete');

  // Fire-and-forget anonymous analytics pulse (never blocks the run).
  sendPulse(pulseResults);

  state.status = RUN_STATUS.IDLE;
}

async function signupOne(email, newsletter, ctx) {
  if (newsletter.type === 'substack') {
    return signupSubstack(email, newsletter);
  }
  if (newsletter.type === 'form') {
    return signupViaForm(email, newsletter, ctx);
  }
  throw new Error(`Unknown newsletter type: ${newsletter.type}`);
}

function broadcastProgress() {
  chrome.runtime.sendMessage({
    type: MSG.RUN_PROGRESS,
    data: state.progress,
  }).catch(() => {});
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}
