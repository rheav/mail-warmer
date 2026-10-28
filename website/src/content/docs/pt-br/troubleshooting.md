---
title: "Problemas comuns"
description: "O que cada erro significa, por que uma newsletter pode falhar e como resolver — quase sempre com um clique."
nav: "Problemas comuns"
order: 7
---

Páginas de inscrição de newsletters mudam o tempo todo, então uma falha de vez em quando é normal. A maioria se resolve com um clique.

## Nada acontece quando clico em Fazer inscrições

O painel avisa o que falta:

- *Adicione e escolha um e-mail primeiro.* — cadastre um endereço na aba [E-mails](/pt-br/docs/emails) e escolha-o em **De**.
- *Marque pelo menos uma newsletter.* — marque pelo menos uma newsletter na aba Rodar.

Na aba Cookies, *Marque pelo menos um site.* quer dizer o mesmo para os sites.

## Uma newsletter ficou com erro

Abra o [Log](/pt-br/docs/log) para ver o motivo e procure-o abaixo.

| Mensagem no log | O que significa | O que fazer |
| --- | --- | --- |
| Nenhum frame tinha um campo de e-mail preenchível | A página carregou, mas não havia campo de e-mail em lugar nenhum. | A página pode ter mudado, exigir login ou mostrar um captcha. Abra-a você mesmo; se o formulário estiver lá, adicione [seletores próprios](/pt-br/docs/lists#seletores-próprios-para-um-formulário-teimoso). Se não, remova a newsletter. |
| Todos os campos de e-mail eram armadilhas ou ocultos | Os únicos campos de e-mail da página são armadilhas para robôs ou estão invisíveis. | Adicione seletores próprios apontando para o campo certo. |
| Melhor campo com pontuação baixa demais | Um campo foi encontrado, mas não parece o bastante com um campo de inscrição para preencher com segurança. | Adicione seletores próprios. |
| Preencheu o campo mas não achou o botão de envio | O e-mail foi digitado, mas nenhum botão de inscrever foi encontrado. | Adicione um **Seletor do botão de envio** nos seletores próprios. |
| O seletor de e-mail não encontrou nada | Seu seletor de e-mail não corresponde a nada na página. | Corrija o seletor ou clique em **Remover seletores**. |
| O seletor achou o e-mail, mas não o botão de envio | Seu seletor achou o campo, mas não o botão para enviar. | Adicione um **Seletor do botão de envio**. |
| Falta a URL de inscrição / Falta o domínio ou slug do Substack | O cadastro da newsletter está incompleto. | Apague e adicione de novo na aba Listas. |

## Tentar de novo só o que falhou

Na aba Rodar, clique em **Só os não inscritos** e depois em **Fazer inscrições**. Ele marca só as newsletters que o endereço escolhido ainda não assina.

## A inscrição deu certo, mas nenhum e-mail chega

- Procure um e-mail de "Confirme sua inscrição", inclusive em Promoções e Spam, e clique nele. Inscrições não confirmadas nunca começam a enviar.
- Algumas newsletters só enviam uma vez por semana. Espere alguns dias.
- Se o endereço já estava inscrito, a newsletter pode não mandar um novo e-mail de boas-vindas.

## Ainda com problema?

[Abra uma issue no GitHub](https://github.com/rheav/mail-warmer/issues/new) com o nome da newsletter e a linha do Log. Nunca cole seu e-mail real.
