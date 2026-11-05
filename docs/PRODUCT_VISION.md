# Product Vision — De Cabeça

## Visão

Plataforma web de minijogos de conhecimento sobre futebol, com foco inicial no futebol brasileiro e nos jogadores internacionais que passaram por ele ou marcaram época. Cada jogo tem mecânica própria; todos consomem a mesma base histórica verificada.

Frase guia: **"Prove que você sabe de futebol, todo dia, em dois minutos."**

## Problema

Fãs de futebol gostam de testar memória e conhecimento, mas as opções existentes são:

- Em inglês, com base de dados centrada em ligas europeias (fato observado nos concorrentes, ver `COMPETITIVE_ANALYSIS.md`).
- Quizzes genéricos sem mecânica, sem desafio diário, sem progressão.
- Com dados históricos frágeis (carreiras incompletas, empréstimos errados, apelidos não aceitos) — hipótese a validar com usuários, baseada em observação informal dos concorrentes.

## Princípios de produto

1. **Jogar em 10 segundos.** Sem cadastro, sem tutorial obrigatório, sem splash.
2. **Qualidade antes de quantidade.** Um desafio errado (resposta válida rejeitada) custa mais que dez desafios a menos. Nenhum desafio vai ao ar sem verificação editorial.
3. **Mecânicas distintas, base única.** Cada jogo precisa de uma razão de existir diferente da dos outros. Todos leem o mesmo modelo de dados.
4. **Determinismo.** Mesmo desafio, mesma resposta, mesma pontuação para todo mundo, para sempre.
5. **Brasil primeiro, sem ser só Brasil.** Jogadores brasileiros, clubes brasileiros e estrangeiros relevantes para o público brasileiro.
6. **Compartilhável sem spoiler.** O resultado conta a história da partida sem revelar a resposta.

## Público-alvo

Fãs de futebol brasileiros, 18–55 anos, de diferentes gerações (quem viu Zico e quem viu Neymar). Jogam no celular, em momentos curtos (transporte, intervalo). Já conhecem o padrão Wordle/"desafio do dia".

## Jobs to be done

- "Quando tenho dois minutos livres, quero um desafio rápido de futebol para me sentir esperto e lembrar de histórias."
- "Quando acerto algo difícil, quero mostrar para os amigos sem entregar a resposta."
- "Quando erro, quero saber a resposta certa e aprender a trajetória."
- "Quando acabo o desafio do dia, quero continuar jogando sem esperar o amanhã."

## Proposta de valor

- Dois jogos com mecânicas diferentes no lançamento: dedução (Career Path) e cruzamento (Football Grid).
- Base histórica com procedência e verificação, cobrindo futebol brasileiro desde os anos 1970 (meta de cobertura; ver `DATA_SOURCES.md`).
- Desafio diário + prática ilimitada.
- Português do Brasil, apelidos brasileiros aceitos ("Fenômeno" não, mas "Ronaldo Fenômeno" sim; regras em `GAME_DESIGN/CAREER_PATH.md`).

## Diferenciação

| Eixo | Concorrentes (observado) | De Cabeça |
|---|---|---|
| Idioma e base | Inglês, Europa | PT-BR, Brasil + mundo |
| Dados | Origem opaca | Procedência e status de verificação por fato |
| Mecânicas | Muitas, qualidade variável | Duas no MVP, curadas |
| Prática | Nem sempre | Sempre, nos dois jogos |

## Hipóteses (não comprovadas)

- H1: Público brasileiro prefere um jogo em PT-BR mesmo com menos modos.
- H2: Verificação editorial reduz taxa de respostas válidas rejeitadas a ponto de o usuário perceber.
- H3: Dois jogos distintos elevam partidas por sessão em relação a um jogo só.
- H4: Compartilhamento sem spoiler é canal de aquisição relevante.

## Não objetivos (MVP)

Multiplayer, pagamentos, dados ao vivo, apps nativos, ranking global público, conteúdo gerado por usuário, mais de dois jogos.

## Métricas e critérios de sucesso

Definidos em `ANALYTICS.md`. Sem metas numéricas até existir baseline de 2 semanas com grupo piloto.
