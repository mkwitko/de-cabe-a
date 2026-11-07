# Roadmap por vertical slices

Ordem por dependência real. Cada slice termina com testes passando e algo demonstrável. Detalhes em `IMPLEMENTATION_PLAN.md`.

| # | Slice | Depende de | Demonstrável |
|---|---|---|---|
| 1 | Fundação do repositório | — | `pnpm dev` sobe API vazia + web "Olá"; CI verde |
| 2 | Modelo de dados histórico | 1 | Migrations aplicadas; seed de países/clubes; DQ checks como funções |
| 3 | Engine Career Path | 1 | Testes unitários da engine |
| 4 | Import Wikidata + spot-check | 2 | Script importa 20 jogadores com status `imported`; relatório de cobertura |
| 5 | Admin mínimo: verificação de jogadores | 2, 4 | Editor marca jogador/spells `verified` via API + página simples |
| 6 | Sessão guest + desafio + partida Career Path (API) | 2, 3, 5 | Curl completa uma partida |
| 7 | Frontend Career Path (daily + practice + resultado + share) | 6 | Jogável no browser |
| 8 | Engine Football Grid | 1 | Testes unitários |
| 9 | Grid: snapshot, elegibilidade, API, admin de criação | 5, 8, 6 | Curl completa um grid |
| 10 | Frontend Football Grid | 9 | Jogável |
| 11 | Progressão: histórico, stats, streak | 6, 9 | Telas de histórico e stats |
| 12 | Publicação editorial: calendário, publish/retire, trigger de imutabilidade, relatórios | 5, 6, 9 | Semana de desafios publicada pelo painel |
| 13 | Analytics (eventos + consultas SQL) | 7, 10 | Tabela de eventos populada; 5 consultas prontas |
| 14 | Hardening: rate limit, e2e completo, acessibilidade, seed de piloto (300 jogadores) | todos | Piloto pode começar |
| 15 | (Pós-piloto) Cadastro opcional | 14 + decisão RF-10 | — |

Slices 3 e 8 podem andar em paralelo com 2/4 (não dependem de banco).

## Depois do piloto (2026-11-07)

Slices 1–15 concluídas. O plano seguinte (acabamento premium, Desafio do Dia, ligas de amigos, Draft de conhecimento, Creator Mode, Oficina de desafios) está em `GROWTH_PLAN.md`, em três ondas com critério de "pronto" por item.
