---
title: "Listas"
description: "Opcional. A lista selecionada de newsletters, como adicionar as suas e como consertar um formulário que o mailWarmer não consegue preencher."
nav: "Listas"
order: 5
---

<figure class="shot"><img src="/images/docs/pt-br/lists.webp" alt="A aba Listas: newsletters do Substack e de formulário, com os botões de adicionar e restaurar" width="400" height="760" loading="lazy" /><figcaption>A aba Listas</figcaption></figure>

A aba **Listas** mostra todas as newsletters em que o mailWarmer pode inscrever você. Não é preciso mudar nada aqui para usar.

## A lista selecionada

O mailWarmer vem com uma lista de newsletters de qualidade, escolhidas a dedo. A lista vem dentro da extensão: ela é atualizada quando a extensão é atualizada, e nada é baixado de servidor. As atualizações mantêm as newsletters que você adicionou e o seu histórico.

Cada linha tem uma etiqueta que diz como a inscrição é feita:

- <span class="pill">substack</span> — uma publicação do Substack, inscrita pelo próprio cadastro do Substack. A segunda linha é o nome no Substack ou o endereço do site.
- <span class="pill blue">formulário</span> — uma página de inscrição comum, que o mailWarmer preenche. A segunda linha é o endereço da página.

## Adicione sua própria newsletter

1. Clique em **+ Newsletter**.
2. Dê um **Nome**.
3. Escolha o **Tipo**:
   - **Substack (API)** — depois digite o **Slug do Substack ou domínio próprio**, por exemplo `lennysnewsletter` ou `www.slowboring.com`.
   - **Formulário genérico (DOM)** — depois cole a **URL de inscrição**, a página com o formulário.
4. Clique em **Salvar**. Ela aparece na lista e na aba Rodar.

Para remover qualquer newsletter, clique na lixeira da linha.

## Seletores próprios para um formulário teimoso

O mailWarmer encontra o campo de e-mail sozinho na maioria das páginas. Quando uma newsletter de formulário continua falhando, você pode apontar os elementos certos. Clique no ícone de ajustes da linha para abrir **Seletores próprios**:

- **Seletor do campo de e-mail** (obrigatório) — um seletor CSS para o campo de e-mail, como `input[name=email]`.
- **Seletor do botão de envio (opcional)** — o botão de inscrever, como `button.subscribe`.
- **Seletores de outros campos (avançado)** — seletores para os outros campos que o formulário pede.

Uma ★ ao lado do nome indica que ela usa seletores próprios. **Remover seletores** volta para a detecção automática.

> **Dica:** para achar um seletor, abra a página de inscrição, clique com o botão direito no campo de e-mail, escolha **Inspecionar** e veja o `name`, o `id` ou o `type` dele.

## Restaurar padrão

**Restaurar padrão** devolve a lista selecionada exatamente como ela vem na extensão. Ele pergunta antes, porque **as newsletters que você adicionou são removidas**.
