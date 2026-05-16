// Substack publications expose a public free-tier signup endpoint:
//   POST https://{slug}.substack.com/api/v1/free
// Body is form-encoded: { email, first_url, first_referrer, current_url, current_referrer, referral_code }
// Successful response is JSON containing the new free subscription, or an error message.

export async function signupSubstack(email, newsletter) {
  // Many pubs migrated to custom domains (e.g. slowboring.com) and their
  // {slug}.substack.com host returns 404. Accept an optional `host` so the
  // adapter can hit the custom domain directly. The /api/v1/free endpoint
  // is still served by Substack at that origin.
  const host = newsletter.host || (newsletter.slug ? `${newsletter.slug}.substack.com` : null);
  if (!host) throw new Error('Missing Substack host or slug');

  const origin = `https://${host}`;
  const body = new URLSearchParams({
    email,
    first_url: `${origin}/`,
    first_referrer: '',
    current_url: `${origin}/`,
    current_referrer: '',
    referral_code: '',
    source: 'subscribe_page',
  });

  const res = await fetch(`${origin}/api/v1/free`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return {
      status: 'error',
      message: `HTTP ${res.status}${text ? `: ${truncate(text, 120)}` : ''}`,
    };
  }

  const data = await res.json().catch(() => ({}));

  // Substack returns the email_subscription object on success.
  if (data.email_subscription || data.id || data.subscription) {
    return { status: 'success', message: 'Subscribed via Substack API' };
  }

  // Some pubs require email confirmation but still return 200 with a message.
  if (typeof data.message === 'string') {
    return { status: 'success', message: data.message };
  }

  return { status: 'success', message: 'Subscribed (no payload)' };
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
