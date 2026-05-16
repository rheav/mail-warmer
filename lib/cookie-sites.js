// Sites visited during the cookie-profile warm-up.
//
// Why: a freshly installed browser has no cookies. Visiting these sites — and
// accepting their cookie banners — populates a normal mix of first- and
// third-party cookies before newsletter signups run.
//
// This list is luxury real-estate, automotive, and fashion sites: each either
// auto-accepts cookies or shows a clear, dismissible consent popup.

export const COOKIE_SITES = [
  {
    name: 'Plum Guide — Nice Villas',
    url: 'https://www.plumguide.com/d/fr-alpes-maritimes-nice/villas',
    category: 'Real estate',
  },
  {
    name: "Côte d'Azur Sotheby's Realty",
    url: 'https://www.cotedazur-sothebysrealty.com/en/villa-nice/&new_research=1',
    category: 'Real estate',
  },
  {
    name: 'Ibiza in Motion',
    url: 'https://www.ibizainmotion.com/?gad_source=1&gad_campaignid=8889338073&gbraid=0AAAAADC1lGfEOgI-scs8KsONZIi3cJVTH',
    category: 'Real estate',
  },
  {
    name: 'Le Collectionist — Ibiza',
    url: 'https://www.lecollectionist.com/en/luxury-villas-rentals/ibiza?utm_term=ibiza+villas&utm_campaign=1.[S]_-_[MERGED]_-_[Ibiza_-_Espagne_-_Espagne]_-_[EN]_-_Exact&utm_source=adwords&utm_medium=ppc&hsa_acc=4207412224&hsa_cam=22558598369&hsa_grp=178276072303&hsa_ad=752255178863&hsa_src=g&hsa_tgt=kwd-52154543&hsa_kw=ibiza+villas&hsa_mt=e&hsa_net=adwords&hsa_ver=3&gad_source=1&gad_campaignid=22558598369&gbraid=0AAAAADujpwiLGRgERpEYbzbhcifXzndQ5&gclid=CjwKCAjwq6DQBhBVEiwA4ZD5XFrlHThS398ZgfC7XUEcPBdU3muUyChW4s6gIyBAKSUbX0z9Fkjd8BoC_RAQAvD_BwE',
    category: 'Real estate',
  },
  {
    name: 'Mareterra Monaco',
    url: 'https://mareterra.com/en/',
    category: 'Real estate',
  },
  {
    name: 'Greek Exclusive Properties',
    url: 'https://www.greekexclusiveproperties.com/santorini-properties-for-sale-real-estate-in-santorini-greece/',
    category: 'Real estate',
  },
  {
    name: 'Santorini Villas',
    url: 'https://santorini.villas/',
    category: 'Real estate',
  },
  {
    name: 'Ferrari',
    url: 'https://www.ferrari.com/en-BR',
    category: 'Automotive',
  },
  {
    name: 'Mercedes-Benz Brazil',
    url: 'https://www2.mercedes-benz.com.br/',
    category: 'Automotive',
  },
  {
    name: 'BMW Brazil',
    url: 'https://www.bmw.com.br/pt/index.html',
    category: 'Automotive',
  },
  {
    name: 'Porsche Brazil',
    url: 'https://www.porsche.com/brazil/pt/',
    category: 'Automotive',
  },
  {
    name: 'Yves Saint Laurent',
    url: 'https://www.ysl.com/pt-br?utm_source=google&utm_source_platform=SA360&utm_medium=cpc&utm_campaign=BR%7CPT%7CSRC%7CBrand+Pure%7CBrand%7CU%7CPure_Exact_yves+saint+laurent&utm_id=21823897108&gclsrc=aw.ds&gad_source=1&gad_campaignid=21823897108&gbraid=0AAAAADozE2goz2gXvJZdIrC7w7-tq8a3i&gclid=CjwKCAjwq6DQBhBVEiwA4ZD5XFxrWwWcM1cjGU2NABDeV96HUn1HDd6XsBQuzdIvhuirJF5n2H8bDxoColoQAvD_BwE',
    category: 'Fashion',
  },
  {
    name: 'Chanel Brazil',
    url: 'https://www.chanel.com/br/',
    category: 'Fashion',
  },
  {
    name: 'Dior Brazil',
    url: 'https://shop.dior.com.br/?srsltid=AfmBOorfo7gCoYrXAsk3nHmvrePhgK8dWj9paZzMwpM-2l9dov7vODVM',
    category: 'Fashion',
  },
];

// Stable id for a site, derived from its hostname — used as a checkbox key
// and to match a site against a stored warm-up result.
export function siteId(site) {
  try {
    return new URL(site.url).hostname.replace(/^www\d?\./, '');
  } catch {
    return site.url;
  }
}
