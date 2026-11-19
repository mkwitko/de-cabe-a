# ADR-022 — Modo Clube: empresários, comissões e redes de clubes

Status: aceito pelo dono em 2026-11-18. O dono pediu que a oferta de um jogador a um clube passe pelo empresário, e que cada empresário tenha a própria rede de clubes e influência. Pesquisa de base: `docs/pesquisa/modo-clube/2026-11-18-mercado-realismo-e-diversao.md`. Mapa: `23-MAPA-DE-CONHECIMENTO-DO-FUTEBOL.md`, entrega 1.

## Contexto

No futebol brasileiro, o empresário intermedeia quase toda negociação. Poucas agências grandes concentram os melhores jogadores. Os tetos de comissão da FIFA estão suspensos desde dezembro de 2023 (Circular 1873).

Nos jogos de gestão, os empresários dão profundidade, mas irritam em três situações:

- quando a exigência sobe sem explicação (bug do FM24, cerca de 40% por contraproposta);
- quando a comissão é absurda;
- quando as ofertas lotam a caixa de entrada.

## Decisão

### Quem são

Os empresários são **fictícios**: nome gerado e marcado com origem `generated`. O jogo não afirma que uma pessoa real representa um jogador real. Se um dia houver fonte para um vínculo real, ele entra com fonte e confiança, como pede o mapa de conhecimento.

Agências e carteiras de jogadores:

- 6 agências grandes ficam com os melhores jogadores (nível 66 ou mais), 30 agentes médios com o nível médio e cerca de 120 agentes pequenos com o resto.
- Cada jogador recebe seu empresário por um sorteio fixo por pack, ponderado pelo nível dele.
- Nada disso é guardado no save: tudo é derivado do pack.

### Traços

Cada empresário tem três traços, sorteados de forma fixa por pack (PARÂMETROS):

- **Ganância:** comissão de 5% a 15% da taxa da transferência, ou de 2 a 6 meses de salário quando o jogador vem sem clube. Agências grandes ficam na faixa alta.
- **Paciência:** de 1 a 4 rodadas de negociação antes de endurecer.
- **Influência:** de 1 a 5. Define o tamanho da rede: 3 clubes por ponto, mais destinos no exterior a partir de 4.

A pessoa vê os traços aos poucos. Cada negociação fechada ou rompida com o empresário revela um traço, na ordem ganância, paciência e influência.

### Rede de clubes

- **Afinidade de base:** derivada por sorteio fixo, com peso para clubes de maior reputação e para o estado de origem da agência.
- **Mudanças na afinidade:** são guardadas no save em `w.agents.affinity`, só para o clube da pessoa. Negócio fechado: +10. Negociação rompida por insulto ou desistência: −5. Afinidade entre −30 e +30, somada à base.

### Efeitos no jogo

1. **Comissão:** paga pelo clube comprador, à parte da taxa.
   - Para a pessoa, sai do caixa como lançamento do tipo `agent`.
   - Para um clube da IA, entra no gasto da temporada (`books.spent`).
   - A IA considera a comissão no custo de um alvo.
2. **Negociação de contrato:**
   - Até esgotar a paciência, a exigência não sobe.
   - Depois, cada contraproposta abaixo do pedido sobe a exigência de 3% a 5%, conforme a ganância.
   - A resposta diz o motivo ("O empresário perdeu a paciência").
   - O empresário encerra a conversa só quando as rodadas acabam (`MAX_ROUNDS`).
3. **Ofertas pela rede:**
   - A cada rodada de mercado, empresários com afinidade positiva com o seu clube podem oferecer jogadores da carteira que encaixam no que o elenco precisa: vagas no time titular ou reforço.
   - Os oferecidos incluem quem está sobrando no clube atual, jogadores sem clube e quem quer voltar do exterior.
   - No máximo 2 ofertas por rodada, reunidas numa única mensagem.
   - Cada jogador oferecido ganha conhecimento até 40%. É a versão do empresário: a nota que ele "vende" puxa para cima.
4. **Volta do exterior:**
   - O jogador volta pelo empresário, que oferece o jogador aos clubes da rede dele.
   - Se o seu clube está na rede e precisa dele, a oferta chega como proposta do empresário e a conversa fica aberta. Isso substitui o PR #123.
   - Fora da rede, ele vai para o clube da rede com maior reputação que precisa dele.

## Consequências

- O mercado ganha um canal real de chegada de nomes, e a pessoa ganha motivo para cuidar das relações.
- O custo de cada negócio fica maior e mais realista.
- O volume da caixa de entrada fica sob controle: no máximo uma mensagem de ofertas por rodada.
- **Teto:** os empresários não negociam entre si, não financiam clubes e não empurram saídas para o exterior. O êxodo continua pelas faixas de destino. Cada um desses é um passo seguinte.
- **Teto:** a carteira é fixa por pack. O empresário não ganha nem perde clientes durante a carreira.
