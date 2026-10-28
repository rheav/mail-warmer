/**
 * Two languages. English lives at the root (/, /docs, /privacy…) so the URLs
 * the Chrome Web Store listing links to never move; Brazilian Portuguese lives
 * under /pt-br. URLs never end with a slash (root excepted).
 *
 *   const lang = getLang(Astro.url);
 *   const copy = { en: {...}, "pt-br": {...} }[lang];
 */
import { siteUrl } from "./data/site";

export const langs = ["en", "pt-br"] as const;
export type Lang = (typeof langs)[number];
export const defaultLang: Lang = "en";

/** BCP 47 codes for <html lang>, hreflang and og:locale. */
export const langTag: Record<Lang, string> = { en: "en", "pt-br": "pt-BR" };
export const langName: Record<Lang, string> = { en: "English", "pt-br": "Português" };

const prefix = /^\/pt-br(?=\/|$)/;

/** getStaticPaths entries for a page that exists in every language (`[...lang]` routes). */
export function localeStaticPaths() {
  return [{ params: { lang: undefined } }, { params: { lang: "pt-br" } }];
}

export function getLang(url: URL): Lang {
  return prefix.test(url.pathname) ? "pt-br" : "en";
}

/** Path without the language prefix and trailing slash ("/" for the home). */
export function cleanPath(pathname: string): string {
  return pathname.replace(prefix, "").replace(/\/+$/, "") || "/";
}

/** localize("pt-br", "/docs#x") -> "/pt-br/docs#x"; localize("en", "/") -> "/". */
export function localize(lang: Lang, path: string): string {
  const [p, hash] = path.split("#");
  const clean = cleanPath(p || "/");
  const base = lang === defaultLang ? clean : clean === "/" ? "/pt-br" : `/pt-br${clean}`;
  return hash ? `${base}#${hash}` : base;
}

export function absoluteUrl(lang: Lang, pathname: string): string {
  const p = localize(lang, cleanPath(pathname));
  return p === "/" ? `${siteUrl}/` : `${siteUrl}${p}`;
}
