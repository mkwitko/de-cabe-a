# ADR-007 — Trilha de fases, estrelas, ranking e cadastro opcional

Status: aceito (2026-11-05). Substitui, no PRD §1, "Daily Challenge + Practice" e retira "ranking" e "achievements" da lista de fora do MVP. Substitui ADR-004 só no ponto "sem autenticação".

## Contexto
O autor do produto decidiu trocar o desafio do dia e o treino por vários desafios pré-criados, com ranking da comunidade e progressão gamificada (estrelas, stats, títulos) que mostre quem é bom jogador.

## Decisão
- **Trilha por jogo.** Cada jogo tem fases numeradas (`Challenge.publicNumber` = número da fase, atribuído na publicação, em ordem de dificuldade). Fase 1 aberta; concluir a fase N (qualquer resultado) libera a N+1.
- **Uma tentativa por fase por jogador.** Sem replay: quem já viu a resposta tiraria 3 estrelas.
- **Estrelas (0–3) por desempenho**, função pura na engine: Career Path acerto em 1–2 = 3, 3–4 = 2, 5–6 = 1, erro = 0; Grid 9 células = 3, 6–8 = 2, 3–5 = 1, menos = 0.
- **Títulos** pelo total de estrelas: Reserva (0), Titular (15), Craque (60), Lenda (150).
- **Ranking:** geral (soma das estrelas, desempate por pontos), semanal (estrelas de fases concluídas na semana, segunda 00:00 em São Paulo) e por fase (top 10 por pontos, desempate por tempo).
- **Identidade.** Joga-se como convidado (cookie, ADR-004). Para aparecer no ranking basta um apelido público, único e filtrado. Cadastro opcional por e-mail + senha (scrypt nativo do Node) guarda o progresso e permite entrar em outro aparelho; login vincula a sessão atual à conta. Sem e-mail de confirmação nem recuperação de senha no MVP (exigiriam serviço de e-mail).
- Removidos: daily, practice, `scheduledFor`, regra dos 180 dias (agora: um jogador é resposta de no máximo uma fase do Career Path), streak.

## Consequências
Ranking por convidado pode ser inflado criando sessões; mitigação: rate limit de criação de sessão e de cadastro. Conteúdo passa a ser estoque de fases (não calendário): a curadoria publica trilhas ordenadas por dificuldade.
