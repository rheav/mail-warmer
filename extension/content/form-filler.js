// Smart newsletter signup form filler.
//
// Detects the real email input on the page while skipping honeypots,
// fills it (and any related profile fields the form asks for), then submits.
//
// Injected into top frame + all sub-frames. Each frame independently responds.
// The background side keeps the first useful answer.
//
// Returns one of:
//   { submitted: true,  fieldHint, frame }    — Filled + submitted
//   { skipped: true,    reason }              — Intentionally not run
//   { submitted: false, reason }              — Failed to find a safe field
//   { error: string }                         — Unexpected error

(() => {
  if (window.__mailWarmerInjected) return;
  window.__mailWarmerInjected = true;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type !== 'DETECT_AND_SUBMIT') return false;
    runDetectAndSubmit(msg.data || {})
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message || String(err) }));
    return true; // async response
  });

  async function runDetectAndSubmit({ email, profile = {}, selectors = null }) {
    if (!email) return { error: 'No email provided' };

    await waitForReady(4500, selectors);

    // --- Override path: explicit selectors win ---
    if (selectors?.email) {
      return runOverride({ email, profile, selectors });
    }

    // --- Heuristic path ---
    const candidates = collectEmailCandidates();
    if (candidates.length === 0) {
      // Iframes often contain the real form on lazy pages; this frame may
      // have none. Surface a soft failure so other frames still answer.
      return { submitted: false, reason: 'No email-like inputs found in this frame' };
    }

    const scored = candidates
      .map((input) => ({ input, ...scoreInput(input) }))
      .filter((c) => !c.disqualified)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return {
        submitted: false,
        reason: 'All email inputs were honeypots or hidden',
      };
    }

    const target = scored[0];
    if (target.score < 4) {
      return {
        submitted: false,
        reason: `Best candidate score too low (${target.score})`,
      };
    }

    setReactCompatibleValue(target.input, email);

    // Fill any visible profile-related fields in the same form / region.
    const region = target.input.form || nearestRegion(target.input);
    fillProfileFields(region, profile);

    const submit = findSubmit(target.input);
    if (!submit) {
      return { submitted: false, reason: 'Filled field but found no submit control' };
    }

    await sleep(400);
    submit.click();

    const outcome = await observePostSubmit(2500);

    return {
      submitted: true,
      fieldHint: describeInput(target.input),
      frame: location.href,
      outcome,
    };
  }

  // ---------- Override path ----------

  async function runOverride({ email, profile, selectors }) {
    const emailEl = document.querySelector(selectors.email);
    if (!emailEl) {
      return { submitted: false, reason: `Override email selector matched nothing: ${selectors.email}` };
    }
    setReactCompatibleValue(emailEl, email);

    if (selectors.fields && typeof selectors.fields === 'object') {
      for (const [profileKey, sel] of Object.entries(selectors.fields)) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const val = resolveProfileValue(profileKey, profile);
        if (val == null || val === '') continue;
        fillElement(el, val);
      }
    } else {
      // Even with override, opportunistically fill obvious extra fields.
      fillProfileFields(emailEl.form || nearestRegion(emailEl), profile);
    }

    const submit = selectors.submit
      ? document.querySelector(selectors.submit)
      : findSubmit(emailEl);

    if (!submit) {
      return { submitted: false, reason: 'Override matched email but no submit control' };
    }

    await sleep(400);
    submit.click();
    const outcome = await observePostSubmit(2500);

    return {
      submitted: true,
      fieldHint: `override:${selectors.email}`,
      frame: location.href,
      outcome,
    };
  }

  // ---------- Email candidate collection ----------

  function collectEmailCandidates() {
    return Array.from(document.querySelectorAll('input:not([type=hidden])'))
      .filter((input) => looksEmailish(input));
  }

  function looksEmailish(input) {
    const t = (input.type || '').toLowerCase();
    if (t === 'email') return true;
    if (t !== 'text' && t !== '') return false;

    const hay = [
      input.name,
      input.id,
      input.getAttribute('autocomplete'),
      input.placeholder,
      input.getAttribute('aria-label'),
      labelTextFor(input),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return /e[\s-]?mail/.test(hay);
  }

  // ---------- Scoring + honeypot detection ----------

  function scoreInput(input) {
    let score = 0;
    const reasons = [];

    if (!isVisible(input)) return dq('hidden');
    if (isOffScreen(input)) return dq('off-screen');
    if (input.tabIndex < 0) return dq('tabindex=-1');
    if (input.getAttribute('aria-hidden') === 'true') return dq('aria-hidden');
    if (input.hasAttribute('readonly') || input.hasAttribute('disabled')) return dq('readonly/disabled');
    if (hasHoneypotName(input)) return dq('honeypot name');
    if (hasHiddenAncestor(input)) return dq('hidden ancestor');

    if ((input.type || '').toLowerCase() === 'email') {
      score += 5;
      reasons.push('type=email');
    }

    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const ac = (input.getAttribute('autocomplete') || '').toLowerCase();

    if (/^email$|email_address|emailaddress|user_email/.test(name)) {
      score += 3;
      reasons.push('name~email');
    } else if (name.includes('email')) {
      score += 2;
    }

    if (id.includes('email')) {
      score += 1;
      reasons.push('id~email');
    }

    if (ac === 'email' || ac === 'username') {
      score += 2;
      reasons.push(`autocomplete=${ac}`);
    }

    const placeholder = (input.placeholder || '').toLowerCase();
    if (/e[\s-]?mail/.test(placeholder)) {
      score += 1;
      reasons.push('placeholder~email');
    }

    const label = labelTextFor(input).toLowerCase();
    if (/e[\s-]?mail/.test(label)) {
      score += 1;
      reasons.push('label~email');
    }
    if (/subscribe|newsletter|sign\s*up|join|updates/.test(label)) {
      score += 1;
      reasons.push('label~newsletter');
    }

    if (input.required) {
      score += 1;
      reasons.push('required');
    }

    if (isInViewport(input)) {
      score += 1;
      reasons.push('in-viewport');
    }

    return { score, reasons, disqualified: false };

    function dq(reason) {
      return { disqualified: true, score: -999, reasons: [reason] };
    }
  }

  const HONEYPOT_NAMES = [
    'honeypot', 'honey_pot', 'hp_', 'hp-', 'trap',
    '_bot', 'bot_', 'iambot', 'isbot',
    'website', 'url', 'homepage', 'nickname',
    'company_url', 'webpage',
    'b_email', // Mailchimp honeypot prefix used as `b_<list-id>`
    'fax',
  ];

  function hasHoneypotName(input) {
    const all = [input.name, input.id, input.className]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return HONEYPOT_NAMES.some((p) => all.includes(p));
  }

  // ---------- Visibility helpers ----------

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (parseFloat(style.opacity || '1') === 0) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    if (style.clipPath && /inset\(100%\)/.test(style.clipPath)) return false;
    if (style.clip && /rect\(\s*0(px)?[\s,]+0(px)?[\s,]+0(px)?[\s,]+0(px)?\s*\)/.test(style.clip)) return false;
    return true;
  }

  function hasHiddenAncestor(el) {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const s = getComputedStyle(node);
      if (s.display === 'none') return true;
      if (s.visibility === 'hidden') return true;
      if (parseFloat(s.opacity || '1') === 0) return true;
      if (node.hasAttribute('hidden')) return true;
      if (node.getAttribute('aria-hidden') === 'true') return true;
      node = node.parentElement;
    }
    return false;
  }

  function isOffScreen(el) {
    const rect = el.getBoundingClientRect();
    if (rect.right < -500) return true;
    if (rect.bottom < -500) return true;
    if (rect.left > window.innerWidth + 5000) return true;
    if (rect.top > window.innerHeight + 5000) return true;
    return false;
  }

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
  }

  function labelTextFor(input) {
    if (input.id) {
      const lbl = document.querySelector(`label[for="${cssEscape(input.id)}"]`);
      if (lbl) return lbl.textContent || '';
    }
    let p = input.parentElement;
    while (p && p !== document.body) {
      if (p.tagName === 'LABEL') return p.textContent || '';
      p = p.parentElement;
    }
    const lblId = input.getAttribute('aria-labelledby');
    if (lblId) {
      const lbl = document.getElementById(lblId);
      if (lbl) return lbl.textContent || '';
    }
    return '';
  }

  function cssEscape(s) {
    return CSS && CSS.escape ? CSS.escape(s) : s.replace(/"/g, '\\"');
  }

  function nearestRegion(input) {
    return input.closest('form, section, div, aside') || document.body;
  }

  // ---------- Profile field filling ----------

  // Maps profile keys to (regex tested against name/id/autocomplete/label) +
  // generators that produce a value for that field type.
  const PROFILE_RULES = [
    {
      key: 'firstName',
      match: /(^|[\W_])(first[\W_]?name|fname|given[\W_]?name|firstname)([\W_]|$)/i,
      ac: ['given-name'],
    },
    {
      key: 'lastName',
      match: /(^|[\W_])(last[\W_]?name|lname|surname|family[\W_]?name|lastname)([\W_]|$)/i,
      ac: ['family-name'],
    },
    {
      key: 'fullName',
      match: /(^|[\W_])(full[\W_]?name|your[\W_]?name|^name$|customer[\W_]?name)([\W_]|$)/i,
      ac: ['name'],
    },
    {
      key: 'age',
      match: /(^|[\W_])(age)([\W_]|$)/i,
    },
    {
      key: 'dob',
      match: /(^|[\W_])(dob|birth(day|date)?|date[\W_]?of[\W_]?birth)([\W_]|$)/i,
      ac: ['bday'],
    },
    {
      key: 'gender',
      match: /(^|[\W_])(gender|sex|pronoun)([\W_]|$)/i,
    },
    {
      key: 'country',
      match: /(^|[\W_])(country)([\W_]|$)/i,
      ac: ['country', 'country-name'],
    },
    {
      key: 'city',
      match: /(^|[\W_])(city|town|locality)([\W_]|$)/i,
      ac: ['address-level2'],
    },
    {
      key: 'state',
      match: /(^|[\W_])(state|region|province)([\W_]|$)/i,
      ac: ['address-level1'],
    },
    {
      key: 'postalCode',
      match: /(^|[\W_])(zip|postal|postcode)([\W_]|$)/i,
      ac: ['postal-code'],
    },
    {
      key: 'phone',
      match: /(^|[\W_])(phone|mobile|tel)([\W_]|$)/i,
      ac: ['tel', 'tel-national'],
    },
    {
      key: 'company',
      match: /(^|[\W_])(company|organi[sz]ation|employer|business)([\W_]|$)/i,
      ac: ['organization'],
    },
    {
      key: 'jobTitle',
      match: /(^|[\W_])(job[\W_]?title|title|role|position|occupation)([\W_]|$)/i,
      ac: ['organization-title'],
    },
  ];

  function fillProfileFields(region, profile) {
    if (!region) return;
    const fields = Array.from(
      region.querySelectorAll('input, select, textarea')
    ).filter((el) => {
      const t = (el.type || '').toLowerCase();
      if (t === 'hidden' || t === 'submit' || t === 'button' || t === 'email') return false;
      if (!isVisible(el)) return false;
      if (hasHiddenAncestor(el)) return false;
      if (hasHoneypotName(el)) return false;
      if (el.value && el.tagName !== 'SELECT') return false; // already filled
      return true;
    });

    for (const el of fields) {
      const rule = matchRule(el);
      if (rule) {
        const val = resolveProfileValue(rule.key, profile);
        if (val == null || val === '') continue;
        fillElement(el, val);
        continue;
      }
      // For <select> with no matching rule: pick a benign non-empty option
      // so multi-step forms don't block on "How did you hear about us?".
      if (el.tagName === 'SELECT' && el.required && !el.value) {
        pickSafeSelectOption(el);
      }
    }
  }

  function matchRule(el) {
    const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
    const haystack = [
      el.name,
      el.id,
      el.getAttribute('aria-label'),
      el.placeholder,
      labelTextFor(el),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return PROFILE_RULES.find((r) => {
      if (r.ac && r.ac.some((token) => ac.includes(token))) return true;
      return r.match.test(haystack);
    });
  }

  function resolveProfileValue(key, profile) {
    if (profile[key]) return profile[key];

    // Derived fallbacks.
    if (key === 'fullName' && (profile.firstName || profile.lastName)) {
      return [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    }
    if (key === 'firstName' && profile.fullName) {
      return profile.fullName.split(/\s+/)[0];
    }
    if (key === 'lastName' && profile.fullName) {
      const parts = profile.fullName.split(/\s+/);
      return parts.length > 1 ? parts.slice(1).join(' ') : '';
    }
    return '';
  }

  function fillElement(el, value) {
    if (el.tagName === 'SELECT') {
      setSelectValue(el, value);
      return;
    }
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (!el.checked && shouldCheck(el, value)) {
        el.click();
      }
      return;
    }
    setReactCompatibleValue(el, value);
  }

  function shouldCheck(el, value) {
    const v = String(value).toLowerCase();
    if (v === 'true' || v === 'yes' || v === '1') return true;
    if (v === 'false' || v === 'no' || v === '0') return false;
    // For radios: match label/value against profile value.
    const lbl = labelTextFor(el).toLowerCase();
    return lbl.includes(v) || String(el.value).toLowerCase().includes(v);
  }

  function setSelectValue(sel, value) {
    const v = String(value).toLowerCase().trim();
    const options = Array.from(sel.options);

    const match =
      options.find((o) => o.value.toLowerCase() === v) ||
      options.find((o) => o.text.toLowerCase() === v) ||
      options.find((o) => o.value.toLowerCase().includes(v)) ||
      options.find((o) => o.text.toLowerCase().includes(v));

    if (match) {
      sel.value = match.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      pickSafeSelectOption(sel);
    }
  }

  function pickSafeSelectOption(sel) {
    const opt = Array.from(sel.options).find(
      (o) => o.value && !/^(--|select|choose|please|n\/a)/i.test(o.text.trim())
    );
    if (opt) {
      sel.value = opt.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // ---------- Value injection (framework-safe) ----------

  function setReactCompatibleValue(input, value) {
    const proto = input.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) {
      desc.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // ---------- Submit detection ----------

  function findSubmit(input) {
    const form = input.form;

    if (form) {
      const explicit = form.querySelector('button[type="submit"], input[type="submit"]');
      if (explicit && !isHiddenForUser(explicit)) return explicit;

      const buttons = Array.from(
        form.querySelectorAll('button, input[type="button"], a[role="button"]')
      ).filter((b) => !isHiddenForUser(b));
      const textMatch = buttons.find((b) => looksSubmitText(buttonText(b)));
      if (textMatch) return textMatch;

      const visible = buttons.filter((b) => !b.disabled);
      if (visible.length > 0) return visible[visible.length - 1];

      return null;
    }

    const region = input.closest('section, div, aside, header, footer') || document.body;
    const buttons = Array.from(
      region.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]')
    ).filter((b) => !isHiddenForUser(b));

    const textMatch = buttons.find((b) => looksSubmitText(buttonText(b)));
    if (textMatch) return textMatch;

    return buttons[0] || null;
  }

  function buttonText(el) {
    return (el.innerText || el.value || el.getAttribute('aria-label') || '').trim();
  }

  function looksSubmitText(text) {
    return /subscribe|sign\s*up|join|notify|get\s+(updates|started)|submit|continue/i.test(text);
  }

  function isHiddenForUser(el) {
    if (!el) return true;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return true;
    if (parseFloat(s.opacity || '1') === 0) return true;
    const r = el.getBoundingClientRect();
    return r.width < 2 || r.height < 2;
  }

  // ---------- Post-submit observation ----------

  async function observePostSubmit(ms) {
    const start = Date.now();
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        const body = document.body?.innerText || '';
        if (/thank|success|check your (in\s*)?box|confirm|subscribed|sent you/i.test(body)) {
          clearInterval(timer);
          resolve({ confirmedText: true });
          return;
        }
        if (Date.now() - start > ms) {
          clearInterval(timer);
          resolve({ confirmedText: false });
        }
      }, 250);
    });
  }

  // ---------- Misc helpers ----------

  function waitForReady(maxMs, selectors) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (selectors?.email && document.querySelector(selectors.email)) return resolve();
        if (collectEmailCandidates().length > 0) return resolve();
        if (Date.now() - start > maxMs) return resolve();
        setTimeout(check, 250);
      };
      check();
    });
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function describeInput(input) {
    return (
      input.getAttribute('name') ||
      input.id ||
      input.getAttribute('autocomplete') ||
      input.getAttribute('placeholder') ||
      'email'
    );
  }
})();
