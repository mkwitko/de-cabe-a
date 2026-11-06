# Modo Carreira — plano (2026-11-06)

Status: proposta para aprovação. Base: pesquisa de mecânicas (EA FC Player Career, New Star Soccer, Retro Bowl, Duolingo, Wordle; fontes no fim) e o que o De Cabeça já tem (5 jogos em trilha, estrelas, títulos, ranking, 95 mil jogadores, ~44 mil partidas reais).

## A ideia em uma frase

Você cria **o seu craque** e ele evolui com o que você sabe de futebol: as estrelas dos minijogos viram treino, o treino vira atributos, e os atributos levam o craque da base até a Europa, numa carreira que dá para mostrar no grupo do WhatsApp.

## O laço (o que a pessoa faz a cada sessão)

1. Abre o Modo Carreira e vê o **próximo jogo** do seu clube: adversário real, data, campeonato ("Rodada 7 · Seu clube × Coritiba · Série B").
2. **Treina** jogando fases normais de qualquer minijogo. Cada estrela vira treino no atributo daquele jogo.
3. Toca **"Jogar a partida"**: o resultado sai de uma simulação simples (atributos do craque + força dos times + sorte com semente). Aparecem gols, assistências, nota de 0 a 10 e uma **manchete**.
4. A cada **10 partidas fecha uma temporada**: resumo, prêmios e **propostas de clubes maiores**. A pessoa escolhe para onde ir.

Uma sessão curta (2–3 fases + 1 partida) já avança a carreira; não há obrigação diária.

## Seu craque

- **Criação:** nome (filtro de palavrões, como o apelido), posição (goleiro, defensor, meia, atacante), pé (só sabor), **clube de base**: um clube brasileiro real de Série B ou C da nossa base (nome e cores, nunca escudo).
- **Atributos (0–99):** Finalização, Passe, Visão, Defesa, Físico. Começam baixos (40–50) e a posição define pesos: o atacante depende de Finalização, o defensor de Defesa, etc.
- **Overall:** média ponderada pela posição. É o número que clubes "olham".
- **Treino vindo dos jogos** (uma estrela = 1 ponto de treino; a cada 3 pontos, +1 no atributo):

| Minijogo | Atributo treinado |
|---|---|
| Career Path | Visão |
| Football Grid | Passe |
| Impostor | Defesa |
| Linha do tempo | Físico |
| Mais ou Menos | Finalização |

- **Teto de treino por dia** (ex.: 15 estrelas/dia contam para a carreira) para não virar maratona; o resto continua valendo para ranking e títulos. Fases já jogadas não se repetem (regra atual), então não há atalho.
- **Variedade é recompensada:** jogar 3 jogos diferentes no dia dá +1 treino extra ("treino completo"), contra a monotonia que a pesquisa aponta como queixa nº 1 nos modos carreira.

## Temporada, partidas e clubes (dados reais)

- **Calendário real:** os adversários e a ordem das rodadas vêm dos jogos reais do campeonato do clube (`Match`: Brasileirão A/B, Libertadores, ligas europeias, Champions). Se o clube do craque está na Série B de 2024, ele joga contra os adversários reais daquela Série B.
- **Força dos times:** sai dos resultados reais daquela temporada (pontos por jogo). Simples e defensável.
- **Simulação (pura, testável, como as engines):** `chance de gol do craque = f(overall, força do time, força do adversário)` + sorte com semente gravada (o resultado é sempre o mesmo para aquela partida). Saída: placar do time, gols e assistências do craque, nota.
- **Contexto real de graça:** "No mundo real, nesta rodada, Coritiba 2 × 1 Avaí". Só fatos de placar, sem imitar pessoas.
- **Fim de temporada (10 partidas):** tabela simplificada, artilharia do craque, prêmio (melhor jogador do time, revelação), e **1 a 3 propostas** de clubes de nível acima, conforme overall e notas. Níveis: Série C → B → A → Libertadores → Europa (liga e depois Champions). Recusar é permitido: "ficar e ser capitão" dá bônus de nota.
- **Manchetes:** texto nosso, no tom de resenha, gerado por modelos ("Seu Nome decide e o Avaí respira na Série B"). Sem imitar veículo, narrador ou pessoa real.

## Compartilhar

- **Card da carreira** (imagem gerada no navegador, sem escudos): nome, trajetória de clubes no formato do Career Path (Avaí → Grêmio → Porto), temporadas, gols, títulos. Texto pronto para o WhatsApp no estilo do resultado das fases. Não revela nada de fases.
- **Desafio:** "Meu craque chegou à Champions em 6 temporadas. E o seu?" com link.

## O que evitar (pesquisa)

- Streak punitivo: nada de "perdeu tudo". Se um dia faltar, a carreira só para; não regride.
- Grind e tarefas repetitivas: teto diário + bônus de variedade.
- Anúncio no meio da partida ou do resultado: anúncios só nas pausas (ADR-012). Nunca vender atributo, moeda ou atalho.
- Lesões que tiram a pessoa do jogo no MVP.

## Escopo

**MVP (2–3 semanas):** criar o craque; treino a partir das estrelas (teto diário, bônus de variedade); calendário real de 1 campeonato por temporada; simulação + manchete; fim de temporada com propostas; card de compartilhamento; tela "Minha carreira" com a trajetória. Modelo de dados: `CareerPlayer` (por conta ou sessão de convidado, como o progresso), `CareerSeason`, `CareerMatch` (resultado gravado, imutável).

**Depois, em ordem:**
1. Desafio diário único com card (o "Wordle" do De Cabeça) — alimenta a carreira e o grupo.
2. **Álbum de figurinhas**: figurinhas dos 95 mil jogadores ganhas jogando (sem compra), páginas por clube e por Copa; trocas entre amigos por link.
3. Liga semanal de amigos por link do WhatsApp (grupos pequenos, sobe e desce).
4. Rival fixo e eventos (convocação para a Seleção, clássico).
5. Seleção e "Rumo à Copa" usando as Copas reais até 2026.
6. Aposentadoria e legado: a carreira entra no "Hall da Fama" do jogador.

## Perguntas em aberto

- Clube de base: sortear entre Séries B/C ou deixar escolher qualquer clube? (Proposta: escolher entre clubes de Série B/C, para ter onde subir.)
- Um craque por conta ou vários (novo jogo)? (Proposta: um ativo; "aposentar e começar outro" depois.)
- Nome do modo: "Modo Carreira", "Meu Craque" ou "Da Base à Europa"?

## Fontes da pesquisa

EA FC career mode ([EA Help](https://help.ea.com/en/articles/ea-sports-fc/career-mode/), [feedback dos jogadores](https://forums.ea.com/discussions/fc-26-feedback-en/player-career-mode-feedback-tasks--personality-system/12624060)); New Star Soccer ([Wikipedia](https://wikipedia.com/wiki/New_Star_Soccer)); Duolingo streaks ([Lenny's Newsletter](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)); Wordle ([Smithsonian](https://www.smithsonianmag.com/smart-news/heres-why-the-word-game-wordle-went-viral-180979439/)); streak burnout ([The Decision Lab](https://thedecisionlab.com/fr-CA/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)); álbum da Copa 2026 no Brasil ([O Povo](https://mais.opovo.com.br/jornal/vidaearte/2026/05/30/copa-do-mundo-albuns-de-figurinhas-unem-familias-e-viram-febre.html)). Várias fontes de retenção são secundárias; os números de impacto não foram usados.
