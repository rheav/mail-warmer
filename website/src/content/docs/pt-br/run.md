---
title: "Rodar"
description: "Passo 2. Escolha um endereço e as newsletters, faça as inscrições e acompanhe cada status mudando."
nav: "Rodar"
order: 2
---

<figure class="shot"><img src="/images/docs/pt-br/run.webp" alt="A aba Rodar: seletor De, botões de seleção rápida e a lista de newsletters com status" width="400" height="760" loading="lazy" /><figcaption>A aba Rodar depois de uma execução</figcaption></figure>

A aba **Rodar** é onde as inscrições acontecem. É o passo 2, logo depois de cadastrar um endereço na aba [E-mails](/pt-br/docs/emails).

## Escolha o endereço

**De** lista os endereços da aba E-mails. O escolhido aqui é o que esta execução inscreve. Se a lista estiver vazia, o painel pede *Adicione e escolha um e-mail primeiro*.

## Escolha as newsletters

Marque as newsletters em que quer se inscrever. O contador acima da lista mostra quantas estão marcadas. Há três atalhos logo acima:

- **Marcar todos** — marca todas as newsletters.
- **Limpar** — desmarca tudo.
- **Só os não inscritos** — marca só as newsletters que o endereço escolhido ainda não assina: tudo o que é novo ou falhou da última vez. É o jeito mais rápido de tentar de novo.

## Rodar e parar

Clique em **Fazer inscrições** — o botão grande no topo do painel. Ele aparece em todas as abas, então dá para começar de qualquer lugar depois de montar a seleção.

O botão quadradinho ao lado é o **Parar**. Ele encerra a execução depois da inscrição em andamento. O que já terminou mantém o status.

## O que acontece durante a execução

O mailWarmer passa pela seleção **uma newsletter por vez**, esperando de 2,5 a 5,5 segundos (aleatório) entre as inscrições, para a atividade parecer humana.

- **Newsletters do Substack** (etiqueta <span class="pill">substack</span>) são inscritas pelo próprio cadastro do Substack daquela newsletter — nenhuma aba abre.
- **Newsletters de formulário** (etiqueta <span class="pill blue">formulário</span>) abrem a página de inscrição numa aba em segundo plano. O mailWarmer encontra o campo de e-mail (na página ou dentro de um quadro incorporado), preenche — junto com os campos extras do seu [Perfil](/pt-br/docs/profile) —, envia e fecha a aba.

Você pode continuar navegando enquanto ele trabalha. Deixe o Chrome aberto até a execução terminar.

## Status

| Status | O que significa |
| --- | --- |
| <span class="pill">novo</span> | Nunca rodou para este endereço. |
| <span class="pill">pendente</span> | Marcada e esperando a vez nesta execução. |
| <span class="pill run">rodando</span> | Sendo inscrita agora. |
| <span class="pill ok">sucesso</span> | A inscrição foi feita. |
| <span class="pill err">erro</span> | Falhou. O [Log](/pt-br/docs/log) mostra o motivo; veja também [Problemas comuns](/pt-br/docs/troubleshooting). |

## O selo na barra de ferramentas

O ícone do mailWarmer mostra o progresso num relance, mesmo com o painel fechado:

- **Laranja** durante a execução — o número de sucessos até agora.
- **Verde** no fim — o número de inscrições bem-sucedidas.
- **Vermelho** quando termina sem nenhum sucesso — o número de erros.

## Depois da execução

Abra a caixa de entrada e confirme os e-mails de "Confirme sua inscrição". O mailWarmer não lê sua caixa, então esse clique é seu — inscrições não confirmadas nunca começam a enviar.
