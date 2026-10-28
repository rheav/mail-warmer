---
title: "Cookies"
description: "Opcional. Aqueça o navegador antes das inscrições: o mailWarmer visita sites conhecidos e aceita os avisos de cookies por você."
nav: "Cookies"
order: 3
---

<figure class="shot"><img src="/images/docs/pt-br/cookies.webp" alt="A aba Cookies com a lista de sites, os status e os cookies de um site abertos" width="400" height="760" loading="lazy" /><figcaption>A aba Cookies depois de um aquecimento</figcaption></figure>

Um perfil de navegador novinho, sem nenhum cookie, chama atenção. A aba **Cookies** resolve isso antes das inscrições, criando neste navegador um perfil de cookies com cara de uso normal. É opcional — as inscrições funcionam sem ela.

## O que ela faz

Em cada site marcado, o mailWarmer:

1. abre o site numa aba em segundo plano,
2. aceita o aviso de cookies sozinho (ele reconhece os pop-ups de consentimento mais comuns),
3. fecha a aba.

Depois ele lê os cookies que a visita deixou no navegador e mostra quantos são.

## Faça um aquecimento

1. Marque os sites em **Sites**. Todos já vêm marcados; use **Marcar todos** e **Limpar** para mudar isso rápido. Os sites são agrupados em Imóveis, Automóveis e Moda — sites de marcas conhecidas.
2. Clique em **Criar perfil de cookies**.
3. Acompanhe cada linha atualizando. **Parar** encerra o aquecimento depois do site atual.

Cada site precisa carregar por completo, então a lista inteira leva um tempinho. Você pode continuar navegando enquanto isso.

## Entenda os resultados

Cada site termina com um status:

| Status | O que significa |
| --- | --- |
| <span class="pill ok">sucesso</span> | O aviso de cookies foi encontrado e aceito. |
| <span class="pill">pulado</span> | O site carregou, mas nenhum aviso de cookies foi encontrado. Os cookies dele ficaram mesmo assim. |
| <span class="pill err">erro</span> | Não deu para visitar o site. O [Log](/pt-br/docs/log) mostra o motivo. |

Abaixo de cada nome aparecem a categoria do site e quantos cookies ele deixou. Clique em **▸ ver** para listar os cookies; **▾ ocultar** recolhe de novo. No fim, uma linha de resumo mostra *Último aquecimento … — X/Y sites aceitaram cookies*, e o selo do ícone mostra em verde quantos sites aceitaram.

## Privacidade

Tudo acontece no seu navegador. Os cookies capturados só aparecem para você e nunca são enviados para lugar nenhum. Eles se comportam como os cookies de qualquer visita sua, e você pode apagá-los nas configurações do Chrome como quaisquer outros.
