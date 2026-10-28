---
title: "Troubleshooting"
description: "What each error means, why a newsletter might fail, and how to fix it — usually in a click."
nav: "Troubleshooting"
order: 7
---

Newsletter signup pages change all the time, so an occasional failure is normal. Most fixes take a click.

## Nothing happens when I click Run signups

The panel tells you what is missing:

- *Add and select an email first.* — add an address on the [Emails](/docs/emails) tab and choose it in **From**.
- *Pick at least one newsletter.* — tick at least one newsletter on the Run tab.

On the Cookies tab, *Pick at least one website.* means the same for sites.

## A newsletter shows error

Open the [Log](/docs/log) to see the reason, then find it below.

| Message in the log | What it means | What to do |
| --- | --- | --- |
| No frame found a fillable email field | The page loaded, but no email field was found anywhere on it. | The page may have changed, need a login, or show a captcha. Open it yourself; if the form is there, add [custom selectors](/docs/lists#custom-selectors-for-a-stubborn-form). Otherwise remove it. |
| All email inputs were honeypots or hidden | The only email fields on the page are traps for bots or invisible. | Add custom selectors that point at the real field. |
| Best candidate score too low | A field was found, but it doesn't look enough like a signup email field to fill safely. | Add custom selectors. |
| Filled field but found no submit control | The email went in, but no subscribe button was found. | Add a **Submit selector** in custom selectors. |
| Override email selector matched nothing | Your custom email selector doesn't match anything on the page. | Fix the selector, or click **Clear overrides**. |
| Override matched email but no submit control | Your selector found the field, but no button to send it. | Add a **Submit selector**. |
| Missing signup URL / Missing Substack host or slug | The newsletter entry is incomplete. | Delete it and add it again on the Lists tab. |

## Retry only what failed

On the Run tab, click **Un-subscribed only**, then **Run signups**. It ticks just the newsletters the selected address isn't subscribed to yet.

## The signup succeeded, but no email arrives

- Look for a "Confirm your subscription" email, including in Promotions and Spam, and click it. Unconfirmed subscriptions never start sending.
- Some newsletters only send weekly. Give it a few days.
- If the address was already subscribed, the newsletter may not send a new welcome email.

## Still stuck?

[Open an issue on GitHub](https://github.com/rheav/mail-warmer/issues/new) with the newsletter's name and the line from the Log. Never paste your real email address.
