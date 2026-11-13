# ADR-016 — Modo Clube: competições configuráveis, calendário global e universo de tamanho variável

Status: aceito pelo dono em 2026-11-13 (specs aprovadas, MC-010). Decisão do dono na revisão do mesmo dia: dois modos de início, jogadores reais nas quatro divisões, estaduais, copas e continentais no horizonte.

## Contexto

A primeira versão dos documentos fixava quatro divisões de 20 clubes, 38 rodadas e uma operação `round/close`. O futebol brasileiro real não cabe nisso: a Série D tem dezenas de clubes em grupos e mata-mata, a Série C muda de tamanho em 2027, e um clube disputa estadual, copa e liga na mesma semana. O formato de 2027 de parte das competições ainda não foi publicado.

## Decisão

1. **Competição é dado, não código.** O pacote descreve cada competição da temporada como uma sequência de fases, e um interpretador único (`competition`, dentro de `packages/club-domain`) gera tabelas, chaves e jogos. Tipos de fase: `liga` (turno único ou turno e returno), `grupos`, `mata-mata` (jogo único ou ida e volta, com regra de desempate: prorrogação, pênaltis, gol fora, vantagem do melhor), `final` (única ou dupla). Cada fase declara de onde vêm os participantes (lista fixa, posição em outra fase, posição em outra competição, ranking) e para onde vão (próxima fase, acesso, descenso, vaga em outra competição na temporada seguinte).
2. **Critérios de desempate, limites de inscrição, janelas e premiação** são listas ordenadas no dado da competição.
3. **Pacote de competições versionado por temporada.** A carreira avança de temporada lendo o regulamento daquela temporada; se o pacote não traz a temporada seguinte, repete o último regulamento conhecido. Mudança de tamanho de divisão entre temporadas é resolvida por regra de transição declarada no pacote.
4. **Universo de tamanho variável.** Clubes do mundo = união dos participantes das competições ativas. Nenhum código assume 80 clubes, 20 por divisão ou 38 rodadas. Clubes fora das competições ativas existem como registros leves (nome, cidade, força agregada) para serem promovidos ao mundo quando sobem.
5. **Calendário global da carreira.** Uma lista de dias com eventos: partida de qualquer competição, treino, janela que abre ou fecha, vencimento financeiro, sorteio, data FIFA, obra que termina. O calendário é montado no início da temporada a partir das janelas de datas de cada competição; conflito de data é resolvido por prioridade declarada e gera adiamento.
6. **A operação de avanço é por dia**, não por rodada: `POST /v1/manager/calendar/advance { até: 'próxima decisão' | data }`. Ela resolve, numa transação idempotente, todos os eventos esportivos e financeiros do intervalo: partidas dos rivais na engine por posses, a do usuário se ele pediu partida rápida, treino, lesões, mercado, lançamentos, cartas. Para na primeira decisão obrigatória do usuário.
7. **Dois modos de início** (`CareerStartMode`: `free_choice`, `job_offers`), gravados na carreira. As propostas saem de um gerador que recebe reputação e experiência do treinador.
8. **O que entra em cada etapa** está em `docs/GAME_DESIGN/MODO_CLUBE/00-VISAO-E-PRODUTO.md` §5. O interpretador nasce com liga, grupos e mata-mata porque a Série D já exige os três.

## Consequências

- `round/prepare` e `round/close` deixam de existir nos documentos; `01-ARQUITETURA.md` §4 descreve o avanço por dia.
- O custo de servidor passa a ser medido por dia de calendário e por temporada inteira, com o número real de partidas do pacote.
- O pacote fictício de desenvolvimento precisa ter pelo menos uma competição de cada tipo de fase, com volumes parecidos com os reais.
- Rivais em dois torneios precisam de rodízio de elenco; isso entra na IA de clube (`04-CLUBE-E-MUNDO.md` §8).

## Alternativas

- Manter o formato simplificado na primeira versão: menos trabalho agora, mas reescrita certa quando entrarem copas, e incompatível com jogadores reais numa Série D que não tem 20 clubes.
- Um módulo de código por competição: rápido para a primeira, inviável para estaduais.
