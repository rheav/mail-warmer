---
title: "Cookies"
description: "Optional. Warm up the browser before signups: mailWarmer visits well-known sites and accepts their cookie banners for you."
nav: "Cookies"
order: 3
---

<figure class="shot"><img src="/images/docs/en/cookies.webp" alt="The Cookies tab with the site list, statuses and one site's cookies expanded" width="400" height="760" loading="lazy" /><figcaption>The Cookies tab after a warm-up</figcaption></figure>

A brand-new browser profile with no cookies at all stands out. The **Cookies** tab fixes that before you run signups, by building a normal-looking cookie profile in this browser. It is optional — runs work without it.

## What it does

For each site you tick, mailWarmer:

1. opens it in a background tab,
2. accepts the cookie banner by itself (it recognizes the common consent pop-ups),
3. closes the tab.

Then it reads back the cookies that visit left in your browser and shows how many there are.

## Run a warm-up

1. Tick the sites under **Websites**. Every site is ticked by default; use **Select all** and **Clear** to change that quickly. Sites are grouped as Real estate, Automotive and Fashion — well-known brand websites.
2. Click **Build cookie profile**.
3. Watch each row update. **Stop** ends the warm-up after the current site.

Each site has to load fully, so the whole list takes a little while. You can keep browsing in the meantime.

## Read the results

Each site ends with a status:

| Status | What it means |
| --- | --- |
| <span class="pill ok">success</span> | The cookie banner was found and accepted. |
| <span class="pill">skipped</span> | The site loaded, but no cookie banner was found. It still left its cookies. |
| <span class="pill err">error</span> | The site couldn't be visited. The [Log](/docs/log) has the reason. |

Under each name you see the site's category and how many cookies it left. Click **▸ view** to list them; **▾ hide** folds them away again. When the warm-up ends, a summary line reads *Last warm-up … — X/Y sites accepted cookies*, and the toolbar badge shows the number of sites that accepted, in green.

## Privacy

Everything happens in your browser. The captured cookies are shown only to you and are never sent anywhere. They behave like the cookies from any visit you make yourself, and you can remove them in Chrome's settings like any others.
