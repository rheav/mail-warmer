---
title: "Log"
description: "Um registro com horário de cada inscrição e de cada aquecimento de cookies, com o motivo sempre que algo falha."
nav: "Log"
order: 6
---

<figure class="shot"><img src="/images/docs/pt-br/log.webp" alt="A aba Log: início de execução, inscrições com sucesso, um erro e o resumo" width="400" height="760" loading="lazy" /><figcaption>A aba Log</figcaption></figure>

A aba **Log** conta tudo o que o mailWarmer fez, do mais recente para o mais antigo, cada linha com seu horário.

## O que é registrado

- **Execuções** — *Início: 6 newsletters para voce@exemplo.com*, uma linha por newsletter com o resultado e *Concluído — 5 de 6 inscritos* no fim.
- **Aquecimentos de cookies** — o início, cada site que aceitou cookies (e como), os cookies que cada um gravou e o total.
- **Paradas** — quando você clica em Parar, a execução ou o aquecimento registra que foi parado por você.

## Como ler

Linhas verdes são sucessos. Linhas laranja são falhas, com o motivo depois do travessão — por exemplo *[TLDR Newsletter] erro — Nenhum frame tinha um campo de e-mail preenchível*. A página [Problemas comuns](/pt-br/docs/troubleshooting) explica cada motivo e o que fazer.

O contador no topo mostra quantos registros existem. **Limpar** esvazia o log. Isso não mexe nos status da aba Rodar, que são guardados à parte, por endereço e newsletter.

O log fica no seu navegador e nunca é enviado para lugar nenhum.
