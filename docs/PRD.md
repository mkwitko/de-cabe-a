# PRD — De Cabeça MVP

> **Revisão 2026-11-05 (ADR-007):** daily e treino saem; entram trilha de fases por jogo, estrelas 0–3, títulos, ranking (geral, semanal, por fase) e cadastro opcional (convidado continua podendo jogar). Onde este documento conflitar com o ADR-007, vale o ADR-007.

Status: proposto. Decisões aprovadas pelo autor do produto estão marcadas **[APROVADO]**; recomendações desta análise, **[RECOMENDADO]**; pendentes, **[PENDENTE]**.

## 1. Escopo do MVP

| Item | Decisão |
|---|---|
| Jogos | Career Path e Football Grid **[APROVADO]** |
| Modos | Daily Challenge + Practice, nos dois jogos **[APROVADO]** |
| Acesso | Guest-first; cadastro opcional **[APROVADO]**; cadastro implementado no último slice ou após o lançamento piloto **[RECOMENDADO]** |
| Plataforma | Web responsiva, mobile-first **[APROVADO]** |
| Idioma | PT-BR só **[RECOMENDADO]** |
| Geografia | Jogadores com passagem por clubes brasileiros ou seleção brasileira, mais estrangeiros de relevância global **[APROVADO]** |
| Monetização | Nenhuma no MVP; reservar espaço de layout para anúncios **[APROVADO]** |
| Fora | Multiplayer, pagamentos, live data, achievements, ranking global **[APROVADO]** |

## 2. Requisitos funcionais

### RF-01 Catálogo
Home lista os jogos disponíveis com estado do desafio diário (não jogado / em andamento / concluído com resultado).

### RF-02 Sessão guest
Primeiro acesso cria sessão guest no servidor, identificada por cookie assinado. Progresso (tentativas, histórico, streak) fica vinculado a ela. Sem dado pessoal.

### RF-03 Daily Challenge
Um desafio por jogo por dia (fuso `America/Sao_Paulo`, virada 00:00). Mesmo desafio para todos. Só uma tentativa por sessão por desafio. Resultado fica disponível após conclusão.

### RF-04 Practice
Desafio aleatório do pool publicado para prática, ilimitado, não conta para streak. Mesma engine e pontuação do daily.

### RF-05 Career Path
Conforme `GAME_DESIGN/CAREER_PATH.md`.

### RF-06 Football Grid
Conforme `GAME_DESIGN/FOOTBALL_GRID.md`.

### RF-07 Resultado e compartilhamento
Tela de resultado mostra resposta correta (após término), trajetória/células, pontuação e botão de copiar texto compartilhável sem spoiler.

### RF-08 Histórico e estatísticas pessoais
Lista de partidas concluídas por jogo; estatísticas: partidas, vitórias, distribuição de tentativas, streak atual e máximo.

### RF-09 Painel editorial
Rotas administrativas protegidas por token para: listar jogadores e status de verificação, criar/validar/agendar/publicar desafios, ver relatórios de qualidade. Interface mínima (ver `UX_SPEC.md`).

### RF-10 Cadastro opcional **[PENDENTE: método]**
Vincular sessão guest a uma conta para preservar progresso entre dispositivos. Método (e-mail + senha vs. magic link vs. OAuth Google) não decidido. Recomendação: adiar para após o piloto.

## 3. Requisitos não funcionais

- Resposta correta nunca trafega para o cliente antes do fim da partida.
- Toda validação de resposta é server-side.
- Submissões idempotentes (chave por ação).
- Rate limit por sessão e por IP.
- P95 de `submit` < 300 ms em ambiente local com 1 vCPU (meta inicial, sem baseline).
- Acessibilidade: navegação por teclado, contraste AA, labels em todos os controles.
- Sem dados pessoais além do necessário (sem e-mail no MVP guest-only).

## 4. Como os dois jogos se complementam

Career Path é dedução sequencial sobre um jogador (profundidade). Football Grid é recall por cruzamento de critérios (amplitude). Ambos dependem de `CareerSpell` verificado, então o investimento em dados serve aos dois. Um erra para quem conhece poucos jogadores famosos; o outro premia exatamente isso.

## 5. Riscos de qualidade e mitigação

| Risco | Mitigação |
|---|---|
| Resposta válida rejeitada (alias faltando, carreira incompleta) | Input por autocomplete de jogador (não texto livre); pool de grid pré-computado; relatório de "tentativas rejeitadas" para editorial |
| Desafio muda após publicação | Snapshot imutável por desafio (ADR-002) |
| Dados de empréstimo/retorno errados | Status de verificação por spell; só `verified` entra em desafio |
| Desafio trivial ou impossível | Critérios de elegibilidade + dificuldade estimada + revisão manual |
| Licenciamento de dados | Wikidata CC0 como fonte primária; sem scraping de fontes que proíbem (ADR-003) |

## 6. Validação antes de expandir

Piloto fechado com 20–50 pessoas por 2 semanas (link direto, sem divulgação). Medir métricas de `ANALYTICS.md`. Critério de passagem: coletar baseline e revisar relatórios de rejeição; só depois decidir terceiro jogo.

## 7. Questões em aberto

- Q1 Método de cadastro (RF-10).
- Q2 Hospedagem (ver `ARCHITECTURE.md` §Deploy) — nenhuma contratada.
- Q3 Nome: "De Cabeça" (decidido 2026-11-05). Domínio: `decabecafc.com.br` (escolhido 2026-11-06; `decabeca.com.br` é de terceiros). Verificar registro INPI antes do lançamento.
- Q4 Tamanho mínimo do pool de jogadores verificados para lançar o piloto (recomendação: 300 jogadores com carreira completa verificada; 60 desafios de Career Path e 30 grids publicáveis).
