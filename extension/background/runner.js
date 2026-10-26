import { MSG, RUN_STATUS } from '../lib/messages.js';
import * as store from '../lib/storage.js';
import { loadLocale, t } from '../lib/i18n.js';
import { delay, jitter } from '../lib/wait.js';
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
  await loadLocale();
  if (state.status === RUN_STATUS.RUNNING) {
    throw new Error(t('errAlreadyRunning'));
  }

  const { emails, newsletters, profile } = await store.getAll();
  const email = emails.find((e) => e.id === emailId);
  if (!email) throw new Error(t('errActiveEmailMissing'));

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
  await store.appendLog('info', t('logRunStart', items.length, email.address));

  let successCount = 0;
  let errorCount = 0;

  for (const n of items) {
    if (state.abort) {
      await store.appendLog('warn', t('logRunAborted'));
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
        `[${n.name}] ${t(`status_${result.status}`)}${result.message ? ` — ${result.message}` : ''}`
      );
    } catch (err) {
      status = 'error';
      await store.recordResult(emailId, n.id, 'error', err.message);
      await store.appendLog('error', `[${n.name}] ${t('status_error')} — ${err.message}`);
    }
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
  await store.appendLog('info', t('logRunComplete', successCount, items.length));

  state.status = RUN_STATUS.IDLE;
}

async function signupOne(email, newsletter, ctx) {
  if (newsletter.type === 'substack') {
    return signupSubstack(email, newsletter);
  }
  if (newsletter.type === 'form') {
    return signupViaForm(email, newsletter, ctx);
  }
  throw new Error(t('errUnknownType', newsletter.type));
}

function broadcastProgress() {
  chrome.runtime.sendMessage({
    type: MSG.RUN_PROGRESS,
    data: state.progress,
  }).catch(() => {});
}
