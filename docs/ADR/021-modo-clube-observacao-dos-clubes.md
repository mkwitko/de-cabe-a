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
- os jogadores de todo clube que ele enfrenta em alguma competição da temporada (liga, copa, estadual), porque um clube estuda os adversários;
- os jogadores que a pessoa coloca à venda, porque anunciar é justamente mostrar para todos.

## Consequências

- O mercado fica regional e desigual. Clubes grandes, com bom scouting, enxergam o país. Clubes pequenos enxergam sobretudo o próprio estado e a elite.
- A filtragem é barata: um hash por candidato, antes da leitura cara. A divisão de cada clube agora fica em cache por temporada (`tierOfClub`), o que também acelera o êxodo para o exterior.
- **Teto:** fora os adversários da temporada, o conhecimento dos clubes da IA não cresce com o tempo. Quem foi adversário numa temporada e não é mais volta para o sorteio.

## Passo 4: o conhecimento do clube da pessoa (2026-11-18)

O clube da pessoa sabe de cada jogador um **percentual de conhecimento**, de 0 a 100 (`market/scouting.ts`). O dono pediu este modelo no lugar de um relatório com prazo de validade.

- **Piso:** 25% para quem qualquer clube conheceria: a maior parte da Série A, o próprio estado e os adversários da temporada. 0% para os demais, que ficam fora da lista do mercado. Os jogadores do próprio clube contam como 100% e seguem a leitura do departamento de futebol.
- **Sobe com relatórios:** o clube manda olheiros a uma divisão ou a um estado. Cada viagem leva 28 dias e ele pode ter de 1 a 3 olheiros fora ao mesmo tempo, conforme o departamento de scouting. O olheiro volta com 6 a 20 jogadores de quem o clube sabe menos de 50%, os melhores segundo o olhar do próprio clube, e cada um ganha de 20 a 40 pontos.
- **Sobe com partidas:** cada jogo contra um clube dá 8 pontos a cada jogador do elenco dele.
- **Desce com o tempo:** perde 1 ponto a cada 10 dias desde a última vez que subiu, até voltar ao piso. Os jogadores mudam, e a informação envelhece.
- **Efeito na leitura:** a nota e o teto que o clube vê chegam mais perto da verdade e a margem de erro diminui na proporção do conhecimento. Com 100% a leitura é exata.
- **Save:** só guarda os jogadores acima do piso (`w.scouting.known`: percentual e dia da última alta). Uma vez por mês o save solta quem voltou ao piso.

Como isso muda os resultados das carreiras, `CAREER_RULES_VERSION` passou para 12.

Teto: ainda não dá para pedir o relatório de um jogador específico (a opção B). Partidas contam o elenco inteiro do adversário, não só quem entrou em campo.
