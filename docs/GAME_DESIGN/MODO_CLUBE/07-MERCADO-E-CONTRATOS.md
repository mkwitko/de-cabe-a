# Modo Clube — mercado de jogadores, contratos, agentes, empréstimos e clubes parceiros

Data: 2026-11-13, revisão 4. Substitui e amplia `04-CLUBE-E-MUNDO.md` §3. Legenda: FATO, HIPÓTESE, DECISÃO, PARÂMETRO, NÃO PESQUISADO. **FATO PARCIAL** marca fonte que existe mas foi lida só em parte; detalhes em `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md`.

## 1. Três valores de um jogador

DECISÃO: não existe "preço" único derivado de atributo.

| Valor | Pergunta que responde | Como é calculado |
| --- | --- | --- |
| **Esportivo**, por clube | quanto ele ajuda este clube agora e nos próximos anos | utilidade do `04` §8.2: necessidade da posição, nota na função que o plano do clube pede, aderência ao modelo de jogo, idade e curva, disponibilidade (lesão) |
| **De mercado** | quanto o mercado pagaria hoje | função de idade, posição, nível e potencial estimados, desempenho recente e minutos, tempo de contrato, salário, reputação, seleção, divisão em que joga, número de interessados e a situação financeira do vendedor |
| **Patrimonial** | quanto vale no balanço | custo de aquisição menos amortização (`04` §4.1); formado em casa vale zero no balanço |

FATO (Franceschi e outros, 2024, Journal of Economic Surveys; `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md` item 5): revisão de 29 estudos sobre valor de jogadores, com variáveis em seis categorias (clube, tempo, relação de trabalho, desempenho, características do atleta, popularidade). O número de variáveis citado na revisão do dono (93) não foi confirmado; o conjunto de dados dos autores lista 471. Uso no jogo: a função de valor de mercado tem um termo por categoria; os pesos são PARÂMETROS calibrados contra a concentração real de vendas (`04` §1), não copiados de nenhum estudo.

Consequências de desenho: um volante de 30 anos pode ter valor esportivo alto e de mercado baixo; um atacante de 19 anos, o inverso. O que a tela mostra é sempre uma **faixa** de valor de mercado, tão larga quanto a informação do clube sobre o jogador (`03` §7.4).

## 2. Contrato do jogador

```ts
interface PlayerContract {
  clubId: string; from: Day; until: Day;                     // FATO: de 3 meses a 5 anos (Lei 14.597, art. 86); primeiro contrato do formador: até 3 anos
  wage: number; imageRightsShare: number;                    // até 50% da remuneração (FATO)
  signingFee: number;                                        // luvas
  bonuses: Array<{ trigger: 'jogo' | 'gol' | 'título' | 'acesso' | 'permanência' | 'convocação'; amount: number }>;
  releaseClauseDomestic?: number; releaseClauseForeign?: number;   // FATO: nacional até 2.000 salários
  role: 'titular' | 'rodízio' | 'reserva' | 'promessa';      // expectativa de minutos; base das promessas (`03` §6)
  sellOnOwedTo: Array<{ clubId: string; share: number }>;    // percentual de revenda devido
  trainingRewards: FormationHistory;                         // `03` §7.5
  agentId?: string; agentFee: number;
  extensionOption?: { seasons: number; trigger: 'clube' | 'jogos' };
  wageRiseOnPromotion?: number; wageCutOnRelegation?: number;
}
```

Negociação em dois lados: com o clube (taxa, parcelas, percentual futuro, jogador em troca) e com o jogador e seu agente (salário, duração, papel, luvas, cláusulas). O jogador decide por utilidade própria: salário, divisão e ambição, papel prometido, cidade e distância de casa, treinador, estilo de jogo, quem já está no elenco, e personalidade (lealdade, ambição).

## 3. Agentes

Entidade própria no pacote e no mundo (`PackAgent`).

- Atributos: carteira de jogadores, reputação, região de atuação, dureza na negociação, relação com cada clube e com dirigentes (histórico de negócios), comissão esperada, tolerância a propostas baixas.
- Comportamento: oferece jogadores da carteira a clubes com necessidade; busca concorrência quando há proposta; pressiona por renovação ou saída quando o jogador está insatisfeito ou valorizado; pode orientar o jogador a recusar.
- A direção de futebol do clube negocia com o agente: o nível do departamento desloca o resultado (`06` §4).
- Relação com agente é estado persistente: descumprir acordo fecha portas na carteira inteira; bons negócios trazem ofertas antes do mercado.
- FATO (fonte primária, regulamento de intermediários da CBF de 2022, que o site oficial indica como vigente; `docs/pesquisa/modo-clube/09-regulamentos-conferidos.md` item 5): **não há teto de comissão**. Agente contratado pelo atleta recebe sobre a remuneração bruta; contratado pelo clube, valor fixo combinado; sem acordo, vale 3% da remuneração bruta até o fim do contrato. O agente não pode receber parte de transferência, de formação ou de solidariedade. A Lei Geral do Esporte também não fixa teto. O regulamento de 2023, que espelhava os tetos da FIFA, é dado por fontes secundárias como suspenso por decisão judicial. No jogo: comissão é PARÂMETRO do pacote por temporada, valor inicial de 3% a 10% da remuneração conforme a `dureza` do agente, sem teto de regra.

Limite de escopo: agente não é personagem de diálogo. Aparece em três lugares: na mesa de negociação, em propostas espontâneas e em cartas de pressão.

## 4. Empréstimos

| Tipo | Regra |
| --- | --- |
| Simples | volta ao fim; taxa opcional |
| Com opção de compra | preço fixado; o clube que recebe decide |
| Com obrigação de compra | compra automática, ou condicionada a meta (jogos, acesso) |

Cláusulas possíveis: divisão do salário entre os clubes; **minutos mínimos** (percentual dos minutos disponíveis); posição ou função pretendida; proibição de enfrentar o clube de origem; retorno antecipado em janela; multa por descumprimento.

O clube de origem acompanha: relatório mensal (minutos, nota, evolução, função usada). Cláusula descumprida gera multa, direito de retorno e piora da relação entre os clubes. Vale nos dois sentidos: o usuário também é cobrado pelos emprestados que recebe.

Regras de competição que limitam empréstimo e transferência (inscrição, limite de jogos por outro clube na mesma competição) vêm do dado da competição (`05` §2 e §8).

## 5. Clubes parceiros

DECISÃO: acordo de parceria é um contrato entre dois clubes, de qualquer divisão, com prazo e termos:

- **Desenvolvimento**: o maior empresta jovens com minutos garantidos; o menor recebe jogadores e ajuda de custo.
- **Preferência**: o maior tem primeira opção sobre revelações do menor, com preço ou percentual combinado.
- **Conhecimento**: compartilhamento de relatórios de observação da região do parceiro; estágio de profissionais da comissão.
- **Formação**: clube formador ou escolinha parceira (`03` §7.5).

Limites: número de parcerias por clube é PARÂMETRO; parceiros na mesma competição têm restrições. Um clube pequeno conduzido pelo usuário pode ser o lado menor do acordo, o que muda o começo da carreira: menos dinheiro, mais jogadores emprestados, menos autonomia sobre eles.

Rede de clubes do mesmo dono (SAF de grupo, `06` §5.1) é um caso especial de parceria imposta pela governança.

## 6. Funcionamento do mercado

- **Janelas** como eventos do calendário (`05`). Jogador sem contrato assina fora de janela se o regulamento permitir.
- **Rodadas de oferta** dentro da janela: todos os clubes propõem na mesma rodada e as respostas saem juntas. O número de rodadas por janela é PARÂMETRO (uma no corte 1).
- **Lista de interesse** e **lista de dispensa**: declarar que um jogador está à venda ou que se procura uma posição atrai propostas e enfraquece a posição de negociação.
- **Pré-contrato**: jogador nos últimos seis meses de contrato pode assinar com outro clube para o fim do vínculo (PARÂMETRO de regulamento).
- **Travas contra exploração**: carência de revenda de recém-comprado; a IA não aceita troca que piora necessidade de setor; relutância com contrato longo e caro para veterano; propostas repetidas e recusadas pioram a relação.

### Mercado que aprende (P2)

HIPÓTESE de desenho, a validar em simulação longa: a demanda por perfil reage a resultado observado. Cada clube tem pesos de utilidade por perfil (idade, origem, tipo físico ou técnico); ao fim de cada temporada, perfis que renderam acima do custo nos clubes de filosofia parecida ganham peso, e os que renderam abaixo perdem. Efeito esperado: se muitos clubes passam a buscar o mesmo perfil, o preço dele sobe e a vantagem some. Sem isso, uma estratégia de mercado descoberta pelo usuário valeria para sempre. Teste: `TEST_STRATEGY.md` §5 (o "usuário ótimo" não mantém a mesma vantagem de mercado por 15 temporadas).

## 7. Inscrição e elegibilidade

Sistema próprio, alimentado pelo dado da competição. FATOS de 2026, fonte primária (`docs/pesquisa/modo-clube/09-regulamentos-conferidos.md` item 6):

| Regra | Valor em 2026 |
| --- | --- |
| Inscritos | 50 por clube; mínimo de 25 antes da primeira partida (Série A) |
| Trocas depois do prazo | 8 nas Séries A, B e C; nenhuma na Série D |
| Jogador vindo de outro clube da mesma competição | só se fez até 12 partidas pelo anterior; joga por no máximo mais um clube; cada clube recebe até 5, e até 3 do mesmo clube (Séries A, B e C). Série D: só a partir da segunda fase e vindo de clube eliminado na primeira |
| Estrangeiros | até 9 relacionados por partida; refugiado conta como nacional (redução aprovada para 2027, número não lido) |
| Súmula | 11 titulares, 12 suplentes, 6 da comissão |
| Cartão amarelo | suspensão a cada série de 3 na mesma competição |
| Substituições | até 5 em no máximo 3 paradas (intervalo não conta), mais uma extra por concussão |
| Descanso | 66 horas entre o fim de uma partida e o começo da seguinte |
| Não profissional | pode ser relacionado de 16 a 20 anos |

Jogador não inscrito não joga; a tela avisa antes do prazo. Todos os valores são dado da competição no pacote (`05` §2), nunca constante no código.

## 8. Rivais

Usam as mesmas regras, com a utilidade do `04` §8.2. Cada decisão de compra e venda guarda os termos, para o jogo poder responder "por que eles compraram?". Testes de sanidade em `04` §8.3.

## 9. Em cada corte

| Corte | O que existe |
| --- | --- |
| 1 | três valores; contrato com salário, duração, papel e multa; compra, venda e renovação em uma rodada de oferta por janela; inscrição com limite; sem agentes, sem empréstimo |
| 2 | negociação em dois lados, bônus e cláusulas, empréstimos com cláusulas e relatório, agentes na mesa, pré-contrato, várias rodadas de oferta |
| 3 | clubes parceiros, mercado que aprende, agentes com carteira ativa e relação persistente |
| Depois | observação e mercado internacionais |

## 10. Testes

- Valor de mercado de um jogador cai ao se aproximar o fim do contrato e sobe com minutos e desempenho.
- Mesmo jogador tem valor esportivo diferente para dois clubes de modelos de jogo diferentes.
- Amortização: soma amortizada = custo de aquisição ao fim do contrato; venda antecipada gera o resultado correto.
- Cláusula de minutos descumprida dispara multa e direito de retorno.
- Operação fora de janela ou acima do limite de inscritos devolve 409.
- Nenhum rival termina janela sem goleiro, com posição zerada ou acima da regra financeira.
- Duas requisições simultâneas de compra do mesmo jogador: um efeito.
