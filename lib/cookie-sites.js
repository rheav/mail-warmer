// Curated list of high-traffic US websites used to warm up the browser's
// cookie profile before email signups.
//
// Why: a freshly installed browser has no cookies. Visiting mainstream US
// sites — and accepting their cookie banners — populates a normal mix of
// first- and third-party cookies, so the profile looks like an ordinary,
// used browser rather than a brand-new one when newsletters are signed up.
//
// Each site was picked for: a US audience, a stable landing URL, and a
// dismissible cookie-consent dialog (OneTrust / Cookiebot / Quantcast /
// Sourcepoint / Didomi / generic) that the cookie-accept routine can click.

export const COOKIE_SITES = [
  { name: 'CNN',                url: 'https://www.cnn.com/',             category: 'News' },
  { name: 'NBC News',           url: 'https://www.nbcnews.com/',         category: 'News' },
  { name: 'USA Today',          url: 'https://www.usatoday.com/',        category: 'News' },
  { name: 'Reuters',            url: 'https://www.reuters.com/',         category: 'News' },
  { name: 'Forbes',             url: 'https://www.forbes.com/',          category: 'Business' },
  { name: 'Business Insider',   url: 'https://www.businessinsider.com/', category: 'Business' },
  { name: 'The Weather Channel',url: 'https://weather.com/',             category: 'Weather' },
  { name: 'ESPN',               url: 'https://www.espn.com/',            category: 'Sports' },
  { name: 'People',             url: 'https://people.com/',              category: 'Lifestyle' },
  { name: 'IMDb',               url: 'https://www.imdb.com/',            category: 'Entertainment' },
  { name: 'TechCrunch',         url: 'https://techcrunch.com/',          category: 'Tech' },
  { name: 'Healthline',         url: 'https://www.healthline.com/',      category: 'Health' },
];

// Stable id for a site, derived from its hostname — used as a checkbox key
// and to match a site against a stored warm-up result.
export function siteId(site) {
  try {
    return new URL(site.url).hostname.replace(/^www\./, '');
  } catch {
    return site.url;
  }
}
