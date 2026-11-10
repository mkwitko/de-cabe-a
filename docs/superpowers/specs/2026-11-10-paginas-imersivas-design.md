# Outras páginas: imersivas

Data: 2026-11-10. Pedido do dono: "melhorar os outros modos de jogos também e as outras páginas como um todo". Continua `2026-11-09-jogos-imersivos-design.md` (objeto por tela, sem colunas laterais, tela cheia, materiais reais, sem dependência nova) e `2026-11-10-home-carrossel-design.md`.

## Regra

Cada página vira um objeto ou lugar do futebol, como os modos. A informação e as rotas não mudam; só a apresentação. Celular primeiro (360px), só `transform`/`opacity` em animação, `prefers-reduced-motion` respeitado, alvos ≥ 44px, texto ≥ 12px, contraste AA. Paleta e tipografia de `apps/web/DESIGN.md`. Sem gradiente roxo-azul, sem brilho difuso, sem emoji como ícone.

## Objeto de cada página

| Página | Rota | Objeto | Destaque |
|---|---|---|---|
| Trilha do modo | `/<modo>` | Usa a capa do modo (`ModeCover`) como cabeçalho; fases como um caminho de casas no material do modo | Fase atual pulsa; concluídas mostram estrelas como selos |
| Estatísticas | `/stats` | Ficha técnica / súmula do jogo impressa | Números grandes em fonte condensada, contagem ao entrar |
| Perfil público | `/perfil/:apelido` | Cartão de jogador (carteirinha de sócio) + vitrine de figurinhas | Cartão com leve inclinação ao tocar |
| Histórico | `/history` | Caderno de resultados / súmulas empilhadas | Cada linha como recorte com data carimbada |
| Ranking | `/ranking` | Tabela de classificação no telão do estádio | Top 3 em pódio; a linha do jogador destacada e fixa |
| Ligas | `/ligas`, `/liga/:code` | Tabela de campeonato impressa / mural do clube | Código da liga como ingresso destacável |
| Desafio do Dia | `/d/:date` | Capa de jornal esportivo do dia | Manchete com o modo do dia |
| Carreira | `/carreira` | Contrato / carteira de trabalho do jogador | Marcos como carimbos |
| Copa, Fantasy | `/copa`, `/fantasy` | Transmissão (`Broadcast`) como palco: placar de TV, faixas de tela | Chaveamento/escalação em perspectiva |
| Oficina | `/oficina*` | Prancheta de rascunho / bancada | Fases da comunidade como cartões presos |
| Conta, Privacidade, Como jogar, Nova senha | | Utilitário polido (sem objeto pesado) | Tipografia e espaçamento consistentes |

## Restrições

- E2E existentes passam (ajustar seletores só se o nome acessível não mudar de sentido).
- Componentes compartilhados reaproveitados: `ModeCover`, `Broadcast`, `StickerCard`, `sound.ts`, `haptics.ts`. Classes novas em `index.css` junto das dos modos.
- Sem mudança de API ou contratos.

## Decisões do Claude (revisáveis)

- Objetos da tabela acima.
- Ordem: trilha, estatísticas, perfil, histórico, ranking, ligas, desafio do dia; depois carreira, Copa, Fantasy, Oficina, utilitárias.
