# ADR-017 — Modo Clube: idiomas, celular e desktop, e o que pode ser vendido

Status: aceito pelo dono em 2026-11-13 (specs aprovadas, MC-010).

## Contexto

O site é só em português, não tem biblioteca de tradução e usa `Intl` em poucas telas. Tem assinatura, loja de cosméticos e presente (`Purchase`, `GiftCode`, `CosmeticChoice`) e anúncio discreto (ADR-012). O dono quer o Modo Clube pronto para outros idiomas, jogável no desktop e com algo para vender.

## Decisão

### Idiomas

1. Todo texto do Modo Clube que a pessoa lê sai de uma chave. Isso vale para interface, narração, relatório de jogo, cartas de evento e crônica.
2. **As engines não produzem texto.** Devolvem identificador de mensagem e parâmetros (`{ key: 'match.cause.keeper', params: { saves: 7 } }`). A tradução acontece na web. Isso mantém `match-engine` e `club-domain` sem dependência de idioma e permite trocar de língua numa carreira em andamento.
3. Mensagens em arquivos por idioma dentro de `apps/web/src/games/manager/i18n/` (`pt-BR.ts` agora; `en.ts` e `es.ts` depois), com sintaxe ICU para plural e gênero. Uma função `t(key, params)` pequena sobre `Intl.PluralRules`, `Intl.NumberFormat` e `Intl.DateTimeFormat`. Só adotar biblioteca se essa função deixar de bastar.
4. Teste de build: chave usada e ausente em `pt-BR` falha; texto literal em componente do modo falha no lint (regra por pasta).
5. Moeda do jogo é o real, formatado no idioma da pessoa. Nomes de clubes, pessoas, cidades e competições são dado do pacote e não são traduzidos; nomes de posições, funções, atributos e instruções são chaves.
6. O resto do site continua como está. Esta decisão cobre só o Modo Clube.

### Celular e desktop

7. Uma aplicação. Layout em três faixas de largura: até 640 px (uma coluna, abas embaixo), até 1.024 px (duas colunas), acima (três colunas: lista, detalhe, contexto). O conteúdo é o mesmo; o desktop mostra mais ao mesmo tempo.
8. Tudo o que se faz por arrasto tem equivalente por toque simples e por teclado. Atalhos de teclado no desktop para pausar, velocidade e avançar.
9. O campo 2D se ajusta à orientação: deitado quando há largura, em pé no celular em retrato.

### Venda

10. Só aparência, vagas de carreira, cenários e editor (lista em `00-VISAO-E-PRODUTO.md` §4). Nunca atributo, moeda do jogo, jogador, observação privilegiada, tempo ou resultado. Complementa o ADR-012 e não o altera.
11. Usa o caixa e as tabelas que já existem. O Modo Clube só define: itens de aparência como dado com identificador, limite de carreiras simultâneas por conta, cenário como arquivo de início de carreira.
12. Nada é construído agora além desses três pontos de extensão.

## Consequências

- A explicação de partida e as cartas precisam ser desenhadas como mensagens parametrizadas desde a primeira linha.
- Um idioma novo é um arquivo e uma revisão, sem tocar em engine.
- Rankings entre carreiras ignoram carreiras iniciadas por cenário ou editor.

## Alternativas

- Traduzir depois: barato agora, caro e incompleto mais tarde, porque texto montado dentro de engine não se traduz.
- Biblioteca de tradução completa já: resolve mais do que o modo precisa hoje e adiciona dependência.
