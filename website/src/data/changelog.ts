// Public release notes, newest first: short and in plain language, in both
// site languages. The developer changelog is CHANGELOG.md at the repo root.
type Note = { title: string; body: string };

export const changelog: { version: string; en: Note; "pt-br": Note }[] = [
  {
    version: "0.7.0",
    en: {
      title: "Português and zero server",
      body: "mailWarmer now speaks Brazilian Portuguese as well as English, following your browser's language. It no longer has any server code at all: the newsletter list ships with the extension and nothing is ever sent anywhere. The tabs now follow the flow — Emails is step 1, Run step 2 — and every tab shows a one-line hint on hover. It also asks for fewer permissions.",
    },
    "pt-br": {
      title: "Português e zero servidor",
      body: "O mailWarmer agora fala português do Brasil além de inglês, seguindo o idioma do seu navegador. Ele não tem mais nenhum código de servidor: a lista de newsletters vem com a extensão e nada é enviado para lugar nenhum. As abas seguem o fluxo — E-mails é o passo 1, Rodar o passo 2 — e cada aba mostra uma dica de uma linha ao passar o mouse. Também pede menos permissões.",
    },
  },
  {
    version: "0.6.0",
    en: {
      title: "Toolbar badges",
      body: "The toolbar icon now shows live progress: an orange running count during a run, then a green success count (or red on error). Cookie warm-up ends with a green badge of sites accepted. Full names show on hover, and status labels no longer get cut off in a narrow side panel.",
    },
    "pt-br": {
      title: "Selos na barra de ferramentas",
      body: "O ícone na barra de ferramentas agora mostra o progresso ao vivo: um contador laranja durante a execução e, no fim, um contador verde de sucessos (ou vermelho em caso de erro). O aquecimento de cookies termina com um selo verde de sites aceitos. Os nomes completos aparecem ao passar o mouse, e os status não são mais cortados num painel lateral estreito.",
    },
  },
  {
    version: "0.5.0",
    en: {
      title: "Cookie capture",
      body: "Cookie warm-up now shows the cookies each visit leaves behind, with a per-site count you can expand and a total summary at the end. Recognizes more cookie banners and waits longer on slow sites.",
    },
    "pt-br": {
      title: "Captura de cookies",
      body: "O aquecimento de cookies agora mostra os cookies que cada visita deixa, com uma contagem por site que você pode expandir e um resumo total no fim. Reconhece mais avisos de cookies e espera mais em sites lentos.",
    },
  },
  {
    version: "0.4.0",
    en: {
      title: "Cookies tab",
      body: "Added the optional Cookies tab — a one-click warm-up that builds a natural-looking browser profile before signups run, with live progress and a summary.",
    },
    "pt-br": {
      title: "Aba Cookies",
      body: "Nova aba opcional Cookies — um aquecimento com um clique que monta um perfil de navegador com cara de uso real antes das inscrições, com progresso ao vivo e um resumo.",
    },
  },
  {
    version: "0.3.0",
    en: {
      title: "New side panel",
      body: "A clean Gmail-style side panel with Run, Emails, Profile, Lists, and Log tabs. Optional profile to fill the extra fields some newsletters ask for, smarter form detection, and support for newsletters on custom web addresses.",
    },
    "pt-br": {
      title: "Novo painel lateral",
      body: "Um painel lateral limpo no estilo do Gmail, com as abas Rodar, E-mails, Perfil, Listas e Log. Perfil opcional para preencher os campos extras que algumas newsletters pedem, detecção de formulários mais esperta e suporte a newsletters em endereços próprios.",
    },
  },
];
