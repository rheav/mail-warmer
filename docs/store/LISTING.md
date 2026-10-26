# Chrome Web Store listing (v0.7.0)

Paste into the developer dashboard. Images are in `screenshots/<lang>/`: `1–6.png` (1280×800), `promo-tile-440x280.png`, `marquee-1400x560.png`, for `en` and `pt-BR`. The store shows at most 5 screenshots: suggested set **1, 2, 4, 5, 6**. To refresh them, see "Images" at the end.

| # | Caption (en) | Caption (pt-BR) | Shows |
| --- | --- | --- | --- |
| 1 | Keep every inbox warm | Mantenha cada caixa aquecida | Run tab after a run: per-newsletter results |
| 2 | Warm up the browser first | Aqueça o navegador antes | Cookies tab with a finished warm-up, one row expanded |
| 3 | As many inboxes as you need | Quantas caixas você precisar | Emails tab with three addresses |
| 4 | Fills the extra fields for you | Preenche os campos extras | Profile tab |
| 5 | See exactly what happened | Veja exatamente o que aconteceu | Log tab |
| 6 | No server. No account. | Sem servidor. Sem conta. | Lists tab with a custom newsletter |

## Store settings

- **Category:** Tools
- **Languages:** English (default) and Português (Brasil). The short description comes from `extension/_locales/<lang>/messages.json` (`extDescription`).
- **Website:** https://mail-warmer.rheav.dev
- **Support URL:** https://mail-warmer.rheav.dev/docs
- **Privacy policy URL:** https://mail-warmer.rheav.dev/privacy

## Description

### en

mailWarmer is a free Chrome extension that keeps your email accounts alive and valid. It signs your addresses up to a curated list of real newsletters, so fresh or quiet inboxes keep receiving real mail and read as active, trusted accounts.

Why it matters: a brand-new inbox that never gets any mail looks dormant. Providers flag, limit, or even suspend dormant accounts — and they're far more likely to block them when you sign up for social media, affiliate networks, or new services. Steady incoming mail keeps the account looking real and used.

WHAT IT DOES
• Keeps accounts alive — subscribes your addresses to popular newsletters so they keep getting real messages.
• Curated newsletter list — a hand-picked list ships inside the extension. Add your own newsletters too.
• Fills forms for you — opens each signup page and fills it in with the email and optional profile details you choose.
• Cookie warm-up (optional) — visits a few well-known websites and accepts their cookie banners first, so the browser profile looks natural.
• See exactly what happened — every signup is tracked per email, with a time-stamped log.

PRIVATE BY DESIGN
mailWarmer has no server. It never reads or sends from your inbox, and your emails and profile never leave your browser. No account, no usage statistics, no tracking. Free and open source.

SIMPLE TO USE
1. Add your email addresses.
2. Pick the newsletters you want (or the whole list).
3. Hit Run — mailWarmer does the rest.

In English and Brazilian Portuguese.

### pt-BR

O mailWarmer é uma extensão gratuita para Chrome que mantém suas contas de e-mail vivas e válidas. Ele inscreve seus endereços em uma lista selecionada de newsletters reais, para que caixas novas ou paradas continuem recebendo e-mails de verdade e pareçam contas ativas e confiáveis.

Por que importa: uma caixa nova que nunca recebe nada parece abandonada. Os provedores marcam, limitam ou até suspendem contas paradas — e elas são bloqueadas com muito mais facilidade quando você se cadastra em redes sociais, programas de afiliados ou serviços novos. Receber e-mails com frequência mantém a conta com cara de uso real.

O QUE ELE FAZ
• Mantém as contas vivas — inscreve seus endereços em newsletters populares para que continuem recebendo mensagens reais.
• Lista selecionada — uma lista escolhida a dedo vem dentro da extensão. Você também pode adicionar as suas.
• Preenche os formulários — abre cada página de inscrição e preenche com o e-mail e os dados de perfil opcionais que você escolher.
• Aquecimento de cookies (opcional) — visita alguns sites conhecidos e aceita os avisos de cookies antes, para o perfil do navegador parecer natural.
• Mostra o que aconteceu — cada inscrição fica registrada por e-mail, com um log com horário.

PRIVADO DE VERDADE
O mailWarmer não tem servidor. Ele nunca lê nem envia nada da sua caixa de entrada, e seus e-mails e perfil não saem do navegador. Sem conta, sem estatísticas de uso, sem rastreamento. Gratuito e de código aberto.

SIMPLES DE USAR
1. Adicione seus endereços de e-mail.
2. Escolha as newsletters (ou a lista inteira).
3. Clique em Fazer inscrições — o mailWarmer cuida do resto.

Em português e inglês.

## Single purpose

O mailWarmer tem um único propósito: manter contas de e-mail ativas e válidas inscrevendo os endereços do próprio usuário em uma lista selecionada de newsletters reais. A extensão abre a página de inscrição de cada newsletter escolhida e preenche o formulário com o e-mail e os dados de perfil opcionais definidos pelo usuário. Um aquecimento de cookies opcional visita alguns sites conhecidos e aceita seus avisos de cookies antes das inscrições, para que o perfil do navegador pareça natural. A extensão nunca lê, abre nem envia nada da caixa de entrada do usuário.

## Permission justifications

| Permissão | Justificativa |
| --- | --- |
| `storage` | Guarda no dispositivo, com chrome.storage.local, o que o usuário configura: e-mails e apelidos, perfil opcional, lista de newsletters, histórico de inscrições, registro de atividade e o resultado do aquecimento de cookies. Nada disso é enviado a lugar nenhum. |
| `scripting` | Injeta, só nas abas que a própria extensão abre, scripts que vêm no pacote: o preenchedor do formulário de inscrição e, no aquecimento de cookies, o script que aceita o aviso de cookies. Nenhum código remoto. |
| `sidePanel` | Toda a interface da extensão é um painel lateral. |
| `webNavigation` | chrome.webNavigation.getAllFrames lista os frames da aba de inscrição aberta pela extensão, para achar o formulário mesmo dentro de um iframe incorporado. Não é usada para acompanhar a navegação do usuário. |
| `cookies` | Só chrome.cookies.getAll, depois do aquecimento opcional, para mostrar ao usuário quantos cookies cada site visitado deixou. Leitura local: os cookies não são alterados, exportados nem enviados. |
| Host `https://*/*`, `http://*/*` | As newsletters (e as que o usuário adiciona) e os sites do aquecimento ficam em domínios variados. A extensão precisa abrir essas páginas e injetar o preenchedor em qualquer domínio. O acesso só é usado nas abas que a extensão cria. |
| (removidas na 0.7.0) `tabs`, `alarms` | `tabs` não é necessária para criar, acompanhar e fechar abas; `alarms` servia a uma atualização remota que não existe mais. |

**Remote code:** não. Todo o JavaScript e as fontes vêm no pacote; não há `<script>` externo, módulo remoto nem `eval()`.

## Privacy practices form

- **Dados coletados:** nenhuma categoria. A extensão não tem servidor e não envia nada: e-mails, perfil, listas, histórico e resultados do aquecimento ficam só no dispositivo. As únicas requisições são as inscrições que o usuário roda (para o site de cada newsletter) e as visitas do aquecimento de cookies.
- **Certificações (marcar as três):** não vendo nem transfiro dados a terceiros; não uso para fins fora do propósito único; não uso para crédito ou empréstimo.
- **Privacy policy URL:** https://mail-warmer.rheav.dev/privacy

## Images

1. Load `extension/` unpacked, open `chrome-extension://<id>/sidepanel/sidepanel.html` in a tab at 400×760, device scale 2.
2. For each language, seed `chrome.storage.local` with the output of `node docs/store/seed.mjs <en|pt_BR>` (it sets `lang`), reload, open each tab and save the capture as `docs/store/raw/<lang>/<id>.png` (`run`, `cookies`, `emails`, `profile`, `log`, `lists`). The Cookies capture has the Ferrari row expanded.
3. `npm run store-images` frames them into `screenshots/`. Captions live in `docs/store/tools/render-images.mjs`.
4. Restore the storage you replaced.
