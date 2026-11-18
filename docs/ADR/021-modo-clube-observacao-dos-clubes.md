# ADR-021 — Modo Clube: o que cada clube conhece dos jogadores, derivado e sem armazenamento

Status: aceito pelo dono em 2026-11-18 (passo 3 do plano de mercado: "conhecimento das IAs por clube, derivado"). O passo 4, a observação do clube da pessoa com memória e tela, terá ADR própria.

## Contexto

O dono quer que nem os clubes nem a pessoa saibam tudo de todos os jogadores. Cada um deve depender da própria observação.

O jogo já tinha parte disso em `market/judgement.ts`. Cada clube erra o nível e o teto de cada jogador. O erro é fixo por clube e jogador e diminui com a qualidade do departamento de scouting. Para os próprios jogadores, o erro diminui com o tempo de casa.

Faltava o principal: todo clube via todos os 15,7 mil jogadores do pack FM. Um clube da Série D de Roraima podia achar um reserva de Série B do Rio Grande do Sul. Na vida real, ele nunca ouviu falar desse jogador.

## Decisão

Um clube só considera no mercado os jogadores que conhece. Conhecer é um sorteio fixo por carreira, clube e jogador, feito com o mesmo hash de `judgement.ts`. Nada é guardado no save. Duas carreiras com a mesma seed veem o mesmo mercado.

A chance de conhecer um jogador (`reach`, PARÂMETROS) é:

- **Alcance do scouting do clube:** de 35% (departamento nível 1) a 95% (nível 5).
- **Visibilidade da divisão do jogador:** fator de 100% na Série A, 70% na B, 45% na C e 25% na D e abaixo. Para jogador sem clube, o fator é 60%.
- **Mesmo estado:** mais 30 pontos se o jogador joga no estado do clube.
- **Limite:** 100%.

Sempre conhecidos:

- os jogadores do próprio clube;
- os jogadores que a pessoa coloca à venda, porque anunciar é justamente mostrar para todos.

## Consequências

- O mercado fica regional e desigual. Clubes grandes, com bom scouting, enxergam o país. Clubes pequenos enxergam sobretudo o próprio estado e a elite.
- A filtragem é barata: um hash por candidato, antes da leitura cara. A divisão de cada clube agora fica em cache por temporada (`tierOfClub`), o que também acelera o êxodo para o exterior.
- **Teto:** o conhecimento não cresce com o tempo. Jogar contra um jogador ou observá-lo por uma temporada ainda não faz o clube conhecê-lo. Para corrigir, basta trocar o sorteio fixo por um limiar que sobe com as temporadas e com os jogos entre os clubes, ainda sem armazenamento.
- O clube da pessoa continua vendo todos os jogadores, como hoje. O passo 4 muda isso, com observadores, relatórios e uma base de dados própria guardada no save.
