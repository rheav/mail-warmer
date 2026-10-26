// Public release notes, newest first: short and in plain language. The
// developer changelog is CHANGELOG.md at the repo root.
export const changelog: { version: string; title: string; body: string }[] = [
  {
    version: "0.7.0",
    title: "Português and zero server",
    body: "mailWarmer now speaks Brazilian Portuguese as well as English, following your browser's language. It no longer has any server code at all: the newsletter list ships with the extension and nothing is ever sent anywhere. The tabs now follow the flow — Emails is step 1, Run step 2 — and every tab shows a one-line hint on hover. It also asks for fewer permissions.",
  },
  {
    version: "0.6.0",
    title: "Toolbar badges",
    body: "The toolbar icon now shows live progress: an orange running count during a run, then a green success count (or red on error). Cookie warm-up ends with a green badge of sites accepted. Full names show on hover, and status labels no longer get cut off in a narrow side panel.",
  },
  {
    version: "0.5.0",
    title: "Cookie capture",
    body: "Cookie warm-up now shows the cookies each visit leaves behind, with a per-site count you can expand and a total summary at the end. Recognizes more cookie banners and waits longer on slow sites.",
  },
  {
    version: "0.4.0",
    title: "Cookies tab",
    body: "Added the optional Cookies tab — a one-click warm-up that builds a natural-looking browser profile before signups run, with live progress and a summary.",
  },
  {
    version: "0.3.0",
    title: "New side panel",
    body: "A clean Gmail-style side panel with Run, Emails, Profile, Lists, and Log tabs. Optional profile to fill the extra fields some newsletters ask for, smarter form detection, and support for newsletters on custom web addresses.",
  },
];
