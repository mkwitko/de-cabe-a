# open-football e fontes abertas de dados (pesquisa de 2026-11-17)

Escopo: ler o código do ZOXEXIVO/open-football (Rust, Apache-2.0) e propor portes para o `club-domain` do Modo Clube; avaliar três fontes de dados abertas (biter777/countries, openfootball/awesome-football, sportdb/sport.db). Somente leitura; nada foi alterado no repositório de código.

Método: clones rasos em 2026-11-17. open-football no commit `b2aa6a2` (último commit 2026-11-10). Não compilei nem rodei o open-football; tudo abaixo é leitura de fonte. Caminhos do open-football são relativos a `src/core/src/club/` salvo indicação. Caminhos nossos são relativos a `de-cabeca-competicoes/packages/club-domain/src/`.

## 0. Resumo executivo

- O que vale portar: a escada de dívida (finance/debt.rs), a classificação de aperto financeiro relativa à folha (finance/balance.rs:627), a paralela de descenso (parachute), o teto de folha por situação da dívida, o piso nunca zero do orçamento de transferências, e a seleção de base em "pool + filtro de elite". Tudo isso é O(1) por clube por mês, em inteiros.
- O que não vale portar: treino semanal por jogador da base, 28 submódulos de conselho (patrocinador, ownership, governança), scouting por mapa de conhecimento. São desenhados para um mundo único simulado dia a dia, o oposto do nosso modelo de milhares de carreiras com crescimento anual.
- Achado importante sobre o "harness": o `.dev/simulate` do open-football NÃO é um harness de muitas carreiras. É um mundo único (todas as ligas) com tick diário, com `match-stub`, impressão digital por subsistema e contador de alocações. `.dev/careers` é um censo de coortes de jogadores nesse mesmo mundo único. O que se aproveita são os padrões (fingerprint, stub, censo), não a arquitetura.
- Já temos o equivalente ou melhor em: valor de mercado e postura do vendedor (market/value.ts, market/deals.ts), crescimento anual do jogador (career/development.ts), ledger idempotente (finance/ledger.ts), erro de leitura do nível pelo clube (market/judgement.ts).
- Dados: `openfootball/clubs` (CC0) preenche cidade e estádio (com capacidade) de clubes brasileiros e sul-americanos, e `openfootball/leagues` (CC0) preenche nomes de competição. Cores de clube não existem em nenhuma das três fontes. Nomes de países em pt-BR: o biter777/countries não tem; `Intl.DisplayNames('pt-BR')` do Node resolve os 249 sem dependência.

## 1. open-football (Apache-2.0)

### 1.1 Licença e atribuição

- `LICENSE` é o texto padrão Apache-2.0 (o apêndice ainda traz `[yyyy] [name of copyright owner]`, sem aviso de copyright preenchido); `Cargo.toml` lista como autor "Artemov Ivan (ZOXEXIVO)". Não há arquivo `NOTICE` na raiz (verificado), então não há texto de NOTICE obrigatório a repassar.
- Obrigações da seção 4 se algum trecho for adaptado: entregar cópia da licença, marcar os arquivos modificados, manter avisos de copyright/atribuição no código-fonte derivado. Se só usarmos ideias e valores de parâmetro reescritos em TypeScript, não há trecho copiado; mesmo assim a prática segura e barata é:
  1. entrada em um arquivo `THIRD_PARTY_NOTICES.md` (nome, URL, licença, commit `b2aa6a2`, o que foi derivado);
  2. comentário `// após open-football (Apache-2.0), finance/debt.rs` junto de cada constante portada;
  3. incluir o texto da licença Apache-2.0 uma vez no repositório.
- Nota de cautela: as constantes são "PARÂMETRO, não calibrado" no nosso próprio estilo (ver cabeçalhos de board.ts, finance.ts). Portar um número do open-football não o torna calibrado; deve passar pelo nosso bench de calibragem (bench/calibrate.ts).

### 1.2 Finanças do clube

#### Como funciona no open-football

Arquivos: `finance/balance.rs` (1312 linhas), `finance/debt.rs` (477), `finance/revenue.rs` (695), `finance/sponsorship.rs`.

Receita mensal (`RevenueModel`, revenue.rs):
- Pool de TV por clube: `TOP_FLIGHT_POOL = 130 M` × fração da divisão (1: 1,00; 2: 0,12; 3: 0,035; 4: 0,012; 5+: 0,005) × `tv_market` do país. Dividido por 12.
- Divisão do pool: 50 % igual, 30 % por mérito, 20 % por exposição (facility fee). Mérito linear na posição: `0,35 + rank_share × 1,55` (campeão 1,9x a média, lanterna 0,35x). Exposição: `clamp(0,35 + rep × 1,30; 0,35; 1,75)`.
- Bilheteria: ocupação base `0,52 + rep × 0,42`, vezes humor da torcida, vezes fator do país (clamp 0,3–1,2), resultado clamp 0,20–1,0; receita por pessoa `(9 + rep × 62) × nível de preço`; vezes jogos em casa do mês (contador incrementado a cada jogo em casa).
- Comercial: `480 M × rep³ × mercado de patrocínio × sqrt(preço)`, por ano. Cúbico em reputação.
- Paraquedas: clube rebaixado recebe fatia da divisão de origem por 3 temporadas: 55 %, 40 %, 25 % (revenue.rs, `ParachuteEntitlement`). O comentário do código diz que é o mecanismo anticlifs mais importante: sem ele o rebaixamento é um corte de 90 % de receita contra folha fixa em contratos.
- Despesa operacional: `12 % da receita + 6 000 + rep² × 900 000` por mês.

Caixa e contabilidade (balance.rs):
- Compra de jogador: o caixa sai inteiro na hora; o resultado (P&L) recebe amortização mensal `fee / (anos de contrato × 12)` (`TransferObligation`, `tick_amortization`).
- Reserva de orçamento de transferências no momento do acordo (`reserve_transfer_budget`), devolvida se o negócio desmorona. Evita dois acordos gastarem o mesmo dinheiro.
- Aperto financeiro relativo à folha (`classify_distress`, balance.rs:627): saldo < -3 meses de folha média = Distress; < -6 = Severe; < -12 = Insolvency. Média da folha dos últimos ~95 dias, lida ANTES de limpar o mês (comentário relata o bug que isso corrigiu).
- Fatores de orçamento por nível (transferência, folha): None (1,00; 1,00), Distress (0,60; 1,00), Severe (0,25; 0,95), Insolvency (0,08; 0,90). O fator de transferência nunca é zero. O código registra o erro histórico: multiplicar o orçamento guardado todo mês (0,70^12 ≈ 0,01) e, no zero, travar para sempre. A solução foi guardar só o nível e recalcular o orçamento a partir da receita a cada ciclo.

Dívida (debt.rs), em ordem de escada:
1. Facilidade de crédito: `max(1,5 × receita anual móvel; 2 M)`.
2. Juros anuais por situação: Solvent/Leveraged 5,5 %; OwnerFunded 7,0 %; Emergency 9,0 %; Administration 0 %. Juros só sobre a dívida DENTRO da facilidade (o comentário explica que cobrar sobre o excedente é o termo composto que levou saldos a -1,5 bi).
3. Situação: Solvent (saldo >= 0 ou dívida <= facilidade/2), Leveraged (<= facilidade), OwnerFunded (<= 2x facilidade), Emergency (acima, ou Insolvency na folha), Administration. Insolvência da folha eleva Solvent/Leveraged para OwnerFunded.
4. Injeção do dono: `choque = (dívida - facilidade) × (0,15 + apetite × 0,55) × apetite` por mês, com `apetite = (riqueza × 0,6 + tolerância a risco × 0,4)/100 + bônus de benfeitor`.
5. Administração: entra se Emergency, dívida > 2x facilidade e folha anual > receita anual. Pena: 12 pontos (1ª divisão) ou 9 pontos, 12 meses, juros congelados, dívida baixada até a facilidade (a baixa é crédito no saldo).
6. Consequências por situação: Emergency e Administration bloqueiam gasto com taxa de transferência (orçamento = 0); teto de folha sobre receita: 0,70 / 0,62 / 0,55 / 0,45 / 0,35 (Solvent..Administration); folha-alvo `clamp(0,30; 0,80)` e a meta da folha só pode cair no máximo 15 % por recálculo (`max(receita × alvo; folha atual × 0,85)`, targets/mod.rs).
7. Orçamento de transferências limitado por `0,25 × receita anual + 0,08 × caixa ocioso`, vezes fator de divisão (1,0 / 0,6 / 0,35 / 0,2).

#### Como o club-domain faz hoje

- Receita: `career/finance.ts:19-24` tabela `BY_TIER` (TV por temporada 120 M / 14,5 M / 1,3 M / 0,5 M; bilhete 60/30/18/12). A razão tier2/tier1 (0,12) coincide com a do open-football; tier3 (0,011) e tier4 (0,004) são cerca de um terço dos 0,035/0,012. Bilheteria por jogo em casa: `finance.ts:34-40,78-91`, 3 a 5 % da torcida limitado à capacidade. Prêmio da tabela: `finance.ts:97-110`, campeão = 1/4 da TV da divisão, linear até 1/n (sem piso).
- Folha, patrocínio e TV lançados no dia 1 de cada mês (`finance.ts:42-68`), com chave de idempotência.
- Dívida inicial: `finance.ts:26,63-65`, 60 parcelas mensais sem juros. Comentário no próprio código: "no interest yet".
- Taxa de transferência: `career/market.ts:149-165`, uma entrada 'transfers' com valor cheio no dia do negócio (sem amortização, sem parcelas).
- Efeito de caixa negativo: só `board.ts:82` (-2 de confiança por jogo) e aviso `cashRed` (`career/advance.ts:193`). Nenhum bloqueio de contratação, nenhum teto de folha, nenhum juro.
- Rivais não têm ledger. `market/books.ts:36-63` dá orçamento por temporada a partir da renda estimada (transferência 6 a 16 %; teto de folha 55 a 75 % por risco do dono), com `spent/earned/bill` por clube (`books.ts:68-112`); reinveste 80 % das vendas (`books.ts:17`).

#### Proposta de porte

1. `debtStanding(cash, receitaAnualMóvel)` puro (inteiros), 5 estados, facilidade = max(1,5 × receita; piso). Lançar a entrada 'interest' mensal no ledger do jogador (juros só dentro da facilidade; 5,5/7/9 %). Para rivais, guardar uma só string/numeral de estado por clube em `w.books` (já existe a estrutura por clube) e recomputar no 1º dia do mês.
   - Efeito esperado: caixa negativo deixa de ser indolor para o jogador (hoje só -2 de confiança por jogo) e deixa de ser invisível nos rivais; surgem vendas forçadas, bloqueio de contratação e, no limite, penalização esportiva.
   - Custo: O(1) por clube por mês, um número por clube a mais no save. Um lançamento de juros a mais por mês por carreira (12 por ano; o ledger já cresce 1+ por jogo em casa e por mês). Para milhares de carreiras, não muda a ordem de grandeza.
2. Limiar de aperto relativo à folha em vez de saldo < 0: `distress(saldo, folhaMensalMédia)` com 3/6/12 meses. Usar nos fatores de orçamento (1; 0,6; 0,25; 0,08), recalculando o orçamento a cada ciclo a partir de `budgetOf` e NUNCA multiplicando um valor guardado. Integrar em `available` e `wageRoom` (`books.ts:85-101`). Evita um pequeno clube ser tratado como um grande no mesmo saldo.
3. Teto de folha por situação (0,70 .. 0,35) como `min` com o teto atual (`wageCap`, `books.ts:61`) e a regra de queda máxima de 15 % por recálculo. Custo: uma comparação.
4. Paraquedas para clubes rebaixados (55/40/25 % da TV da divisão de origem por 3 temporadas). Hoje o rebaixamento no `BY_TIER` corta TV de 120 M para 14,5 M sem aviso (`finance.ts:19-24`), com folha herdada: aritmeticamente insustentável, e o próprio open-football registra isso. Custo: um campo `{fromTier, seasonsElapsed}` por clube rebaixado.
5. Amortização da taxa de transferência para o P&L (caixa sai na hora, resultado reconhece fatia mensal). Só importa se a UI mostrar resultado contábil e se o conselho julgar lucro/prejuízo; senão o caixa já basta. Baixa prioridade.
6. Mérito da TV sem piso zero: trocar o prêmio linear até 1/n (`finance.ts:97-110`) por `0,35 + rank_share × 1,55` do pool de mérito, mantendo base fixa de 50 % + exposição. Efeito: lanternas deixam de ter receita de TV próxima do prêmio mínimo. Custo: zero.

### 1.3 Base, treino e desenvolvimento

#### Como funciona no open-football

`academy/` (≈ 3 400 linhas: academy.rs, intake.rs, training.rs, graduation.rs, tuning.rs).

- Nível da base 1..20 comprimido em tier 1..10 (`AcademyTier::from_level`, tuning.rs). População alvo por tier de 22–34 a 40–62 jovens.
- Entrada anual no mês 7: `intake = clamp(4 + norm × 4 + (recrutamento - 0,35) × 5 + (pathway - 0,5) × 2 + (rep - 0,4) × 1,5; 3; 12)`; `pool = intake × round(2 + recrutamento × 7 + norm × 3)` limitado a 12..96 (intake.rs:208-232).
- Seleção do pool: nota `0,45 × PA + 0,25 × CA + 0,10 × personalidade + 0,10 × necessidade de posição + 0,10 × palpite aleatório` (intake.rs:478).
- Idades de entrada: 13 (20 %), 14 (45 %), 15 (25 %), 16 (10 %).
- Portão de elite (`EliteSelectionGate`): o primeiro mundial passa; o seguinte passa com `0,35^n`; elite com `0,55^n`. Evita uma turma com vários gênios.
- Treino semanal: multiplicador de ambiente `0,70 + 0,55 × clamp(0,30 × qualidade da base + 0,25 × instalações + 0,20 × treinador + 0,15 × tier + 0,10 × reputação do pathway)` (faixa 0,70–1,25), vezes bônus do treinador de jovens, personalidade (0,55–1,45, profissionalismo domina), sessões por fase (2–6 por semana, normalizadas), bem-estar, variação 0,88–1,12; tetos de ganho por fase e por categoria (ex.: profissional 0,034 técnico/0,026 mental/0,018 físico por semana); PA nunca sobe pelo treino (tudo em academy/training.rs:268-363).
- Graduação: nota de prontidão 0..100 com limiar 58/64/70/75 por faixa de tier (tuning.rs).

#### Como o club-domain faz hoje

- Crescimento anual por jogador fechando uma fração da distância até o teto: `career/development.ts:90-137` (`develop`), taxa 11–18 % da distância/ano até 21, 6–11 % depois, multiplicada por `drive` (`:63`), por "o ano que teve" (`:73`, 1/6 ano ruim, 1/6 ano brilhante) e por `growth` de `growthOf` (`:255`, terreno de treino -10..+15 %, minutos -30..+25 %, semana de treino -5..+8 %). O comentário relata medição: bem cuidado chega a 4/5 do teto, negligenciado a menos da metade. Inteiros e gerador com semente.
- Base: `development.ts:167` `CROP = [3,3,4,5,6]` por nível de juventude 1..5; `crop` (`:173-209`) gera 15–17 anos com `quality = max(20, nível - 13 + juventude + sorteio(7))`, 1 em 6 é "gema" com teto +10..21, salário de 40 % do mercado.
- Treino do jogador: `career/training.ts` é só intensidade semanal (frescor + entrosamento), sem desenvolvimento semanal.

#### Proposta de porte

Nosso desenvolvimento anual está no grão certo para milhares de carreiras (open-football treina semanalmente cada jovem em cada clube, inviável aqui). Não portar a mecânica semanal. Portar duas ideias pontuais:

1. Pool e filtro (intake.rs:208-232, 478). Gerar `pool = intake × m` candidatos baratos (apenas escalares: qualidade, alcance, personalidade, posição) e só materializar os atributos completos dos selecionados.
   - Efeito esperado: a qualidade da base passa a depender de "tamanho do pool" (olheiros/nível da base) além de sorteio simples, e o filtro dá variação com sentido para o futuro recurso de recrutamento.
   - Custo: ao gerar só escalares, O(pool) comparações por clube por ano; `generateAttributes` continua apenas para `CROP[...]` jogadores. `crop` hoje roda para todo clube da origem a cada virada (`evolve`, `development.ts:297-303`): o custo dominante é a geração de atributos, que não muda.
2. Portão de elite. Hoje cada garoto tem 1/6 de chance independente de ser gema (`development.ts:~196`): com 6 garotos, P(2 ou mais) = 26 % (cálculo binomial: 1 - 0,335 - 0,402), e com `CROP=6` a base nível 5 produz turmas de 2 gemas em 1 de cada 4 anos. Com o portão (0,55^n) cai a frequência de 2+ gemas. Custo: uma multiplicação por garoto. Só vale se a medição de `bench/calibrate.ts` mostrar excesso de gemas por clube/ano.
3. Teto por categoria de ganho: só se o `develop` anual mostrar ganhos absurdos em 1 ano (a doc diz que foi medido; não encontrei sinal contrário).

### 1.4 Conselho (board)

#### Como funciona no open-football

`board/` tem 28 submódulos (13 353 linhas). O núcleo que importa é `board/scoring/mod.rs` e `board/core/review.rs`:

- Fase da temporada: <5 jogos "cedo demais"; <30 % "cedo"; <75 % "meio"; depois "reta final". O sacar o técnico só é permitido em meio/reta final (`can_sack_manager`).
- Quatro notas em [-40, 40]: esportiva (peso 0,45), financeira (0,22), elenco (0,15), estratégia (0,18). `delta = round(soma ponderada × mult_da_fase / 2,2)` (0,5/0,75/1,0/1,15), menos a pressão (torcida, mídia, finanças, regulação, vestiário).
- Esportiva: `(posição esperada - posição) × 3 + (pontos por jogo - 1,3) × 9 + (V - D recentes) × 2,5 + saldo de gols recente (±8) × 0,6 + saldo total (±25) × 0,2`, penalidade de rebaixamento (-10 se na zona, -4 a 2 pontos), escalada pela fase (0,4/0,7/1,0/1,25); crise de lesões suaviza só as notas negativas.
- Financeira: FFP limpo +4, observação -8, violação -20; `meses de caixa = saldo / folha mensal` limitado a [-12, +6]; uso do orçamento de folha > 1,1: -12; > 1,0: -6; < 0,85: +4; uso do orçamento de transferências > 1,05: -6; < 0,6: +3; lucro 12 m ±4; dívida/receita > 1,0: -8.
- Posição esperada vem da reputação (`1 - rep`), ajustada pela ambição do presidente e pela meta de longo prazo.
- Demissão: só após um ultimato já vivido por um mês; condição terminal = confiança 0 ou crise (humor ruim sustentado por `paciência` meses com baixo rendimento) e sem recuperação visível. O ultimato cai se o time reage. Na demissão a confiança volta a 50.

#### Como o club-domain faz hoje

`career/board.ts` (113 linhas): confiança 0..100 começando em 60; delta por jogo conforme resultado contra o favoritismo (`BY_ODDS`, `board.ts:37-44`); -2 por jogo com caixa < 0 (`:45,82`); ultimato abaixo de 25 (5 jogos, 6 pontos), alívio para 35 (`:29-34`); meta = uma posição abaixo do ranking de força (`goalFor`, `:52-57`); +15 ou -10 no fim da temporada (`:46-47,103-113`). Tudo "PARÂMETRO, não calibrado".

#### Proposta de porte

Nosso conselho já tem a forma certa (confiança, ultimato, demissão). Itens de baixo custo:

1. Nota financeira por meses de caixa em lugar do -2 plano: `clamp(caixa / folhaMensal; -12; 6)` mapeado a um delta pequeno por jogo ou por mês. Combina com o estado da escada de dívida (1.2 item 1): `Emergency/Administration` entram como motivo ('cash' em `BoardReason`). Efeito: dois clubes no vermelho deixam de ser iguais; custo: uma divisão por jogo da carreira (só o clube do jogador tem conselho ativo).
2. Escala por fase (cedo 0,4–0,7x): evita choques de 3 jogos iniciais. Hoje com início em 60 e ultimato em 25 é improvável, então só se a telemetria mostrar demissões precoces. Baixa prioridade.
3. Expectativa de posição por reputação/ambição (não só ranking de força) — só quando existir reputação no pack; hoje `goalFor` usa a força e já cumpre.
4. Não portar: pressão de torcida/mídia, FFP, ownership, takeover, governança, promessas (alto custo de código, dependem de sistemas que o Modo Clube não tem).

### 1.5 IA de transferências

#### Como funciona no open-football

`transfers/` (26 mil linhas só em pipeline, scouting, gate). Pontos relevantes e transferíveis:

- Preço pedido (`squad/ledger.rs`, `AssetLedger::asking_for`): `valor_estimado × prêmio_papel × apetite × prêmio_pathway × curva_de_contrato × trajetória_de_idade`.
  - Prêmio de papel: jogador-chave 1,6–2,4 (cresce até 20 pontos acima da média do elenco); titular útil 1,3; rotação 1,0; excedente 0,8; promessa 2,0–3,0 (cresce com a folga até o teto, saturando em 25).
  - Curva de contrato: 1,0 com >= 36 meses; 0,5 em 6 meses; piso 0,45 abaixo (interpolação linear contínua).
  - Idade: +5 % por ano abaixo de 24 (até +30 %); 1,0 até o pico de venda (28; goleiro 31); depois `1 - 0,13 × anos`, piso 0,25.
  - Pathway: vender no auge 1,15; "acabou" 0,85.
- Estresse do vendedor: `seller_distress_multiplier(saldo) = 0,9 se saldo < 0, senão 1,1` (`transfers/value/mod.rs:43`). O próprio comentário diz que é provisório.
- Lista de venda: no máximo 6 jogadores (`MAX_ENTRIES`); só vende se `prontidão >= 0,35`.
- Estrutura de execução: Fase A por país em paralelo (rayon), Fase C serial; um `MarketWorld` único para os dois escopos; os "bumps" do pool de agentes livres foram agrupados de `O(países × pool)` para uma passada só (`transfers/pool/mod.rs`, comentário). É o mesmo princípio da nossa regra "sem N+1".

#### Como o club-domain faz hoje

- Valor: `market/value.ts` (valor = salário de mercado do nível × meses por idade (22/18/12/6/3) × promessa (até +100 % para jovens com folga) × contrato (100/88/65/35)), em centésimos, inteiro, cacheado por pack/ano.
- Vendedor: `market/deals.ts:39-69` `sellerStance`: piso = valor visto × (100 + plano (+35 titular, +5 cobertura, -20 excedente) + sem cobertura +25 + contrato <= 1 ano -20 + rival +20 + `holds`) %. Valor visto vem de `market/judgement.ts` (erro de leitura do clube, equivalente ao "estimador de potencial" do open-football).
- Rodadas de janela: `market/rounds.ts` com utilidade `U = N + F + D + R - C - W` (necessidade, encaixe, crescimento, revenda, custo contra orçamento, peso na folha). Determinístico a partir da semente.
- Não existe: prêmio de papel proporcional ao quanto o jogador se destaca; trajetória de idade no preço pedido; curva de contrato contínua; efeito do aperto financeiro do vendedor no preço.

#### Proposta de porte

1. Curva de contrato contínua no preço (0,45–1,0, de 36 para 6 meses) no lugar do degrau 100/88/65/35 (`value.ts`, `contract`). Efeito: elimina saltos de valor na virada do ano e deixa o comprador esperar o fim do contrato, comportamento real. Custo: uma interpolação inteira.
2. Estresse do vendedor derivado da escada de dívida (Solvent 1,05–1,10; Leveraged 1,00; OwnerFunded 0,95; Emergency/Administration 0,85, com venda forçada ao ultrapassar o teto de folha) em `sellerStance`. Efeito: vendas forçadas aparecem; depende do item 1.2.1. Custo: leitura de um campo por clube.
3. Prêmio por destaque no elenco (jogador-chave) e trajetória de idade no preço pedido. Nosso `plan` (+35 % titular) cobre metade; só adicionar o escalonamento "mais acima da média, mais caro" se a calibragem mostrar astros sendo vendidos barato demais.
4. Não portar: pipelines de scouting por mapa de conhecimento, janelas de acordo com 14 dias antes/3 dias depois, gate de plausibilidade, pool global de agentes livres (nosso modelo é por carreira).

### 1.6 Harness headless

#### O que existe no open-football

- `.dev/simulate/src/main.rs` (2 368 linhas): chama `FootballSimulator::simulate` (tick diário do mundo todo) sem HTTP. Recurso `match-stub` (default): o resultado do jogo vem do elenco, sem rodar o motor; sem o recurso roda o motor real ("um dia com motor real são minutos, não milissegundos"). Opções `--threads N`, `--seed S`, `--recordings`.
- Modos: `bench [dias]`, `fingerprint`, `fingerprint-check`, `fingerprint-phases`, `fingerprint-matches`, `fingerprint-detail`, `index-oracle`, `copy-check`, `stars`, `injuries`, `clash`, `keeper-breakthrough`, `history-leagues`, `holiday`.
- `fingerprint.rs`: resumo por dia do mundo em 7 sub-hashes (partidas, jogadores, clubes, staff, mercados, agentes livres, loja de partidas). Duas execuções com a mesma semente e 1 thread devem imprimir as mesmas linhas; se uma refatoração muda uma linha, mudou o comportamento. É a ferramenta para distinguir otimização de mudança de comportamento.
- `heap.rs`: alocador contador (só conta com `OF_PERFORMANCE`); `mimalloc` para tirar a contenção do heap em fan-out de 32 threads.
- `.dev/careers`: censo de 12 coortes de 40 jogadores (estrela de elite, promessa de elite, garoto de clube pequeno, ambicioso, titular fixo, banco de grande clube, servo do clube, no exterior sem se adaptar, veterano, profissional de liga baixa, goleiro reserva, agente livre) seguidas por 730 dias; biografias por jogador; contagem de movimentos "questionáveis". Retém resultados de partidas só 40 dias ("três temporadas custam dezenas de GB").
- Conclusão: não é um harness de milhares de carreiras. É um único mundo grande; nenhum conceito de "carreira do usuário" paralela.

#### Como o club-domain faz hoje

- `bench/world.ts` + `season/run.ts`: uma temporada do pack grande dia a dia com resultado nível 3 (somente placar), medindo ms por dia (p50/p95/max) e bytes (`benchSeason`, `bench/world.ts:20-30`); `season/run.ts` roda a temporada com o motor real em `worker_threads`, resultados em ordem de entrada (reprodutível), com checagens de temporada e saída com código 1 em problema.
- Determinismo: ADR-020 (inteiros e gerador com semente); o `Ledger` é reconstruível do mundo.

#### Proposta de porte

Não existe um "harness de muitas carreiras" para copiar; propor construir o nosso com os padrões do open-football:

1. Fingerprint por subsistema após cada temporada simulada: hash de `ledger`, `books`, estado de dívida, conselho, base (ids da `crop`), mercado (lista de negócios). Duas execuções com a mesma semente iguais bit a bit; falha aponta o subsistema. Custo: um hash por subsistema por temporada; só em teste.
2. Censo por carreira: executar N carreiras (sementes distintas, `worker_threads`) com o nível 3, registrando por carreira: demitida?, dias no vermelho, pior estado de dívida, número de rebaixamentos, ms por temporada, bytes do save. Agregar distribuição entre carreiras (percentis), que é o que mostra "milhares de carreiras simultâneas" melhor que um mundo único. Custo: roda offline; usa o que já existe (`benchSeason`, `startSeason`).
3. Cohortes de sanidade para os portes de 1.2 e 1.3 (por exemplo: "clube de baixa divisão rebaixado com folha alta", "base nível 5 por 10 anos"): contar quantas vezes a escada de dívida chega a Administration e quantas gemas/clube/ano saem.
4. Rótulos de fase no tempo do dia (mercado, finanças, desenvolvimento, board), no estilo `PhaseObserver`, para achar a fase que domina o p95.
5. Reter só o necessário: limpar o histórico de partidas das carreiras fora do jogador (a lição dos "dezenas de GB").

## 2. biter777/countries (ISO 3166)

- O que é: biblioteca Go (252 códigos) com ISO 3166-1 alpha-2/alpha-3/numérico, nomes em inglês e russo, FIPS, IOC, FIFA, moeda, capital, DDI, domínio, região, subdivisões. Último commit 2024-05-30 (inativo há mais de 2 anos).
- Licença: BSD-2-Clause (texto em `LICENSE`, copyright 2019 Biter). BSD-2 exige manter o aviso e a lista de condições ao redistribuir código/binário; se só extraímos a tabela por script e distribuímos nossos próprios dados, o risco é baixo, mas vale manter uma linha em `THIRD_PARTY_NOTICES.md`.
- Dados: contém `data/iso-codes/data_iso_3166-1.json` (249 registros: `alpha_2`, `alpha_3`, `name`, `numeric`, às vezes `official_name`), copiado do projeto Debian iso-codes (upstream LGPL-2.1+; confirmar a licença dos dados antes de redistribuir o JSON, pois é uma camada acima do BSD do repositório). Este JSON é a via mais simples de extração: um `JSON.parse` e uma tabela, sem tocar em Go.
- Alternativa em Go: `countriesconst.go` e `countries.go` usam `switch c { case 76: return "Brazil" ... }` para `String()`, `Alpha2()`, `Alpha3()`, `FIFA()`, `IOC()`. Extração por regex possível (`case (\d+):\s*\n\s*return "(.*)"`), mas frágil e desnecessária dado o JSON.
- Nomes em pt-BR: não existem no repositório (apenas inglês e russo). Medi: os 249 países do JSON resolvem com `Intl.DisplayNames(['pt-BR'], { type: 'region' })` do Node 22 (Brasil, Alemanha, Costa do Marfim, Reino Unido, Estados Unidos, Coreia do Sul, Tchéquia, Essuatíni). Origem: Unicode CLDR (licença Unicode, livre). Recomendação: gerar a tabela por script combinando `alpha_2/alpha_3/numeric` do JSON com o nome pt-BR do `Intl.DisplayNames`, sem dependência de runtime. FIFA/IOC: o código FIFA só diferencia casos especiais (ex.: GBR=ENG, DEU=GER); o resto usa alpha-3. Para seleções, usar a lista de membros FIFA do próprio repositório não é recomendado sem checagem manual.
- Lacuna nossa que preenche: nomes de nações e códigos alpha-2/alpha-3 (o pack usa `nationality: string(2)`, `pack/schema.ts:69,240`).

## 3. openfootball/awesome-football e sportdb/sport.db

### 3.1 openfootball/awesome-football

- É uma lista de links ("awesome list"), não um conjunto de dados: 14 KB de README com links para bases de terceiros (Fjelstul World Cup, worldfootballR, transfermarkt-datasets, soccerdata, openfootball/*). Licença: domínio público (declarada no README). Última atividade: 2026-09-30 (commit "Add Football Charts open results dataset").
- Não contém clubes, cores, cidades, estádios ou nomes de competição; só aponta para `openfootball/stadiums` (copas do mundo), outras listas e o dataset "Football Charts" (resultados, CC BY, 93 ligas). Utilidade: índice para descobrir fontes. Não preenche lacuna direta.

### 3.2 sportdb/sport.db

- Contém bibliotecas Ruby (`sportdb-*`) e utilitários; os dados vivem em repositórios irmãos (`openfootball/clubs`, `openfootball/leagues`, `openfootball/stadiums`, `football.json`). Licença: scripts em domínio público (LICENSE.md é CC0 1.0). Última atividade: 2026-05-25 (código); `openfootball/leagues` 2025-12-04; `openfootball/clubs` 2025-01-03 (inativo há quase 2 anos); `openfootball/stadiums` 2026-08-19 (só copas do mundo).
- `openfootball/clubs` (CC0 1.0), texto próprio `.txt`:
  - `south-america/brazil/br.clubs.txt` (330 linhas; 143 clubes): "Clube, Cidade" e variantes de nome após `|`. Exemplo: `Corinthians SP, São Paulo | SC Corinthians Paulista ...`. Agrupado por estado.
  - `south-america/brazil/br.stadiums.txt` (149 linhas): "Estádio, capacidade, Cidade" com apelidos e comentário `# club: Flamengo`. Exemplo: `Estádio Jornalista Mário Filho, 76_935, Rio de Janeiro | Maracanã`.
  - Demais países da América do Sul (Argentina 288 linhas, Colômbia 166, Chile 69 etc.) e Europa em `europe/<país>/xx.clubs.txt` e `xx.stadiums.txt`.
  - Não há campo de cores de camisa nem de fundação em todos os registros (fundação aparece em alguns países, como a Inglaterra, no formato `Arsenal FC, 1886, @ Emirates Stadium, London`). Um `grep` por "colour" encontra apenas comentários textuais, não dados.
- `openfootball/leagues` (CC0 1.0): `south-america/brazil/br.leagues.txt` lista níveis (1 Série A, 2 Série B, 3 Série C, 4 Série D), a Copa do Brasil e estaduais (Gaúcho, etc.), cada um com apelidos e a chave curta (`br.a`, `br.copa`), e `br.seasons.txt` com temporadas. Localização em alemão como `[de]`; nomes em português são o nome principal.
- Formato: texto próprio (sportdb), não JSON. Parser Ruby oficial; nós já temos `parseFootballTxt` em `scripts/research/lib/football-txt` (usado por `scripts/club-pack/build-world.ts:11`), que cobre jogos (`football.json`) e pode ser estendido para `clubs.txt` e `stadiums.txt` por serem linhas simples.

### 3.3 Qual lacuna cada um preenche

| Lacuna | Fonte | Veredito |
|---|---|---|
| Nomes de competição (e apelidos) | `openfootball/leagues` (`br.leagues.txt`) | Preenche bem para BR e a maioria; checar países menores |
| Nomes de cidades | `openfootball/clubs` (`*.clubs.txt`, campo cidade) | Preenche para clube com ligação por nome |
| Estádios (nome, capacidade, cidade, apelidos) | `openfootball/clubs` (`*.stadiums.txt`) | Preenche; capacidade é "meio" confiável (conferir contra Wikidata) |
| Cores de clube | nenhuma das três | Não preenche. Opções: Wikidata (propriedade P6364 "official color(s)") ou curadoria própria |
| Nomes de nações (ISO) | biter777/countries (JSON do iso-codes) + `Intl.DisplayNames` | Preenche, incluindo pt-BR |

Cautela de qualidade: já temos o `build-world.ts` ligando times a clubes só por evidência (nome exato ou nome normalizado único no país), nunca por texto aproximado. A mesma regra deve valer para cidade/estádio.

## 4. Lista de ações em ordem de prioridade

1. Escada de dívida + piso nunca zero do orçamento (1.2 itens 1 a 3): maior efeito de jogabilidade (caixa negativo hoje é indolor) e custo O(1). Antes, rodar um censo de N carreiras (1.6 item 2) para medir o estado atual (quantas carreiras ficam no vermelho hoje).
2. Paraquedas de rebaixamento (1.2 item 4): corrige um rebaixamento aritmeticamente insustentável hoje; mudança mínima.
3. Extrair cidade, estádio (com capacidade) e nomes de competição de `openfootball/clubs` e `openfootball/leagues` (CC0) com a mesma regra de ligação por evidência do `build-world.ts` (3.2); preenche três lacunas de uma vez.
4. Gerar tabela ISO (alpha-2/alpha-3/numérico) do JSON do iso-codes + nome pt-BR do `Intl.DisplayNames`; confirmar a licença dos dados do iso-codes e registrar atribuição (biter777: BSD-2) (seção 2).
5. Harness: fingerprint por subsistema e censo multi-carreira (1.6 itens 1 e 2); precondição para calibrar os itens 1 e 2 acima.
6. Estresse do vendedor derivado da dívida e curva de contrato contínua no preço (1.5 itens 1 e 2).
7. Nota financeira do conselho por meses de caixa (1.4 item 1).
8. Pool e filtro + portão de elite na base (1.3 itens 1 e 2), somente se a calibragem mostrar excesso de gemas ou pouca variação.
9. Amortização da taxa de transferência no P&L (1.2 item 5) e escala do conselho por fase (1.4 item 2): baixo valor até a UI mostrar resultado contábil.
10. Antes de qualquer porte: criar `THIRD_PARTY_NOTICES.md` com open-football (Apache-2.0, commit `b2aa6a2`) e biter777/countries (BSD-2), e incluir o texto da licença Apache-2.0; marcar cada constante portada com comentário de origem.
11. Cores de clube: nenhuma fonte aberta analisada serve; tratar à parte (Wikidata P6364 ou curadoria própria) e só publicar com a regra de qualidade de dados do dono.
