# Competitive and Gameplay Analysis

Pesquisa em 2026-11-04 com acesso web limitado (vários sites bloquearam fetch). Legenda: **F** = fato observado com URL; **H** = hipótese; **?** = desconhecido.

## 1. Tabela de concorrentes

| Produto | Modos | Daily | Practice | Progressão | Share | Monetização | Idioma | Fraqueza observada | Oportunidade |
|---|---|---|---|---|---|---|---|---|---|
| Renderfoot (renderfoot.com/pt) **F** | Grid, Who Are Ya ("Adivinhe o Jogador", 8 tent.), Wordle de futebol, Jogo da Velha Brasileirão | Sim (grid vira 00:00 **UTC**) | Sim (grid ilimitado) | ? | "Faça o imaculado e compartilhe" (formato ?) | ? | PT (tradução) | Clones genéricos; sem Career Path; virada em UTC (21:00 no Brasil) | Virada no fuso BR; Career Path; dados BR |
| Immaculate Grid / Immaculate Footy (Sports Reference) **F** (Wikipedia) | Grid 3×3 | Sim | ? | Rarity score | Grid de emojis | ? | EN | Foco EUA/Europa | Base BR |
| Who Are Ya (playfootball.games) **F** (nationalworld) | Mystery player com feedback (nacionalidade, liga, clube, posição, idade) | Sim | ? | ? | ? | ? | EN | Só top-5 ligas europeias | Jogadores BR |
| FootyGuess (iOS) **F** (App Store) | Career path e outros | ? | ? | ? | ? | ? | EN | App nativo, não web | Web sem instalação |
| Daily Football Games, Daily Play, Clubography, Futbol-11, Missing 11, Shotle, Fut Trivia | **?** não verificados nesta sessão | | | | | | | | |
| Football Genius (footballgenius.app) | Multi-modo (fetch bloqueado) | ? | | | | | EN | | |

Concorrente brasileiro nativo com Career Path diário: **não encontrado** (H: nicho pouco servido; precisa de nova busca manual em Shotle e Fut Trivia, citados no briefing mas não localizados pelo agente).

## 2. Avaliação crítica dos aprendizados iniciais

| Aprendizado do briefing | Avaliação |
|---|---|
| Daily, streak, share, tentativas limitadas são padrão | Confirmado (F para Immaculate Grid e Renderfoot). Não é diferencial, é requisito de entrada |
| Variedade aumenta tempo de sessão | H plausível, sem dado. Não confundir com retenção |
| Career Path validado mas insuficiente sozinho | Concordo: Renderfoot e outros já cobrem Grid e Who Are Ya em PT; Career Path em PT com dados BR é lacuna (H) |
| Qualidade/procedência de dados como diferencial | Concordo, mas é diferencial **operacional** (menos reclamações), não de marketing. Usuário percebe quando a resposta válida é rejeitada |
| Dois jogos diferentes > dois parecidos | Concordo |
| Arquitetura extensível sem framework genérico | Concordo; ver ADR-005 |

Ponto cego do briefing: **virada do dia em UTC** nos concorrentes traduzidos é uma fraqueza concreta para o Brasil. Virar à meia-noite de Brasília é barato e perceptível.

## 3. Mecânicas — matriz de priorização (1 = ruim, 5 = ótimo)

| Mecânica | Valor p/ usuário | Retenção (H) | Reuso de dados | Complexidade (5 = simples) | Manutenção (5 = barata) | Diferenciação | Total | Ordem |
|---|---|---|---|---|---|---|---|---|
| Career Path | 5 | 4 | 5 (CareerSpell) | 4 | 4 | 4 (em PT/BR) | 26 | MVP 1 |
| Football Grid | 5 | 4 | 5 | 3 | 3 (curadoria de grids) | 2 | 22 | MVP 2 |
| Mystery Player (Who Are Ya) | 4 | 3 | 4 (precisa idade, liga atual) | 4 | 3 (dados "atuais" envelhecem) | 2 | 20 | 3º |
| Connections (4 grupos de 4) | 4 | 3 | 3 (precisa fatos variados) | 4 | 2 (curadoria pesada) | 3 | 19 | 4º |
| Higher or Lower (ex.: gols, idade) | 3 | 2 | 2 (estatísticas numéricas verificadas) | 5 | 3 | 2 | 17 | 5º |
| Missing XI (escalação histórica) | 4 | 3 | 1 (precisa escalações por partida) | 2 | 2 | 4 | 16 | 6º |
| Draft Challenge | 3 | 2 | 3 | 2 | 3 | 3 | 16 | 6º |
| Football Impostor (quem não jogou no clube) | 3 | 2 | 5 | 5 | 4 | 2 | 21 | **candidato barato** a 3º (mecânica leve, mesmos dados) |

Recomendação de ordem pós-MVP: Football Impostor (quase grátis com dados existentes) → Mystery Player → Connections. Missing XI só com fonte de escalações licenciada.

## 4. Recursos interessantes que não justificam custo agora

- Rarity score: exige volume de jogadas; pós-piloto.
- Ranking global/ligas de amigos: multiplayer-lite, fora.
- Logos de clubes: licenciamento; iniciais bastam.
- Modo "hard" com menos tentativas: trivial de fazer, mas fragmenta o daily; depois.
- Notificação push: exige PWA + consentimento; depois.

## 5. Riscos de licenciamento e aquisição

Ver `DATA_SOURCES.md`. Resumo: Wikidata CC0 é a única fonte estruturada claramente livre; cobertura BR pré-2000 **desconhecida** e deve ser medida antes de prometer "base histórica".

## 6. Monetização (futuro)

- Anúncio único por tela de resultado (momento natural) — H.
- "Sem anúncios" como único item pago futuro — H.
Nada implementado no MVP; layout reserva um slot abaixo do resultado.

## 7. Evidência de retenção

Só comentário jornalístico e um post genérico do Google Play (ver URLs no relatório de pesquisa). **Nenhum postmortem com D1/D7** encontrado. Tratar toda afirmação de retenção como hipótese a medir no piloto.
