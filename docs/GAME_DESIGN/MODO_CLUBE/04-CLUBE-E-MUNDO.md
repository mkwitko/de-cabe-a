# Modo Clube — clube, economia, torcida, rivais, temporada e eventos

Data: 2026-11-13, revisão 4. Evidência e números reais: `docs/pesquisa/modo-clube/03-economia-e-torcida.md`, `04-design-de-jogos-e-tatica.md` e `07-regras-financeiras-e-receitas.md`. Legenda: FATO, HIPÓTESE, DECISÃO, PARÂMETRO.

## 1. O que a pesquisa muda no desenho

- FATO: a Série A somou R$ 14,9 bilhões em 2025; cinco clubes ficam com 49%; custos são 108% da receita recorrente e a venda de atletas (26% da receita) fecha a conta. → DECISÃO: no jogo, o clube médio opera no vermelho sem venda de jogador. Formar e vender é o motor econômico, não um extra.
- FATO: a distância entre divisões é de centenas de vezes (Série D: R$ 0,7 a 4 milhões; Série A média: R$ 745 milhões; TV da B: R$ 8 a 15 milhões; C sem cota de TV; D com R$ 458 mil de cota). → DECISÃO: receita por degraus reais, sem multiplicador suave. Cada acesso muda o tipo de problema (D: sobreviver; C: sem TV, viajar custa; B: primeira TV; A: concentração e folha).
- FATO: a folha explica cerca de 90% da posição na tabela no longo prazo (Szymanski). → DECISÃO: a folha relativa é a principal alavanca de força dos rivais; o jogador vence gastando melhor (base, tática, olheiro), não gastando mais.
- FATO: 21 trocas de técnico por temporada na Série A; permanência média de 275 dias em 2025. → DECISÃO: demissão é evento comum no mundo; rivais trocam de técnico e de filosofia; a confiança da diretoria do usuário é curta e visível.
- FATO: rebaixamento custa cerca de 20% de sócios e bilheteria e a receita de TV da divisão. → PARÂMETRO direto.
- FATO: divisão de TV: 40/30/30 (Libra) e 45/30/25 (LFU) entre parcela igual, posição e audiência; premiação do campeonato com 10% para o campeão e zero para rebaixados. → PARÂMETRO do pacote por competição.
- FATO (`docs/pesquisa/modo-clube/07-regras-financeiras-e-receitas.md` §1): o Sistema de Sustentabilidade Financeira da CBF vale desde 1º de janeiro de 2026 e trata as divisões de forma diferente. → DECISÃO: regra financeira é parâmetro por competição e por temporada (§4.5). Não existe um limite único de 70% para todos.
- Lacuna declarada: folha e orçamento das Séries B, C e D não têm fonte sólida. Os números dessas divisões abaixo são propostas de jogo.

## 2. Identidade do clube

Cada clube tem, no pacote: cidade, estádio (capacidade, gramado, drenagem), torcida (§7), reputação, caixa e dívida iniciais, níveis de estrutura e um **perfil** de cinco eixos (0..100): filosofia de jogo (vetor: posse, verticalidade, pressão, bloco, largura, ritmo, risco), política de mercado (pronto × jovem, regional × nacional), política de base, apetite a risco financeiro, paciência institucional.

Arquétipos de partida (combináveis): formador, comprador, equilibrado, recuperador, regional, ambicioso, conservador, tradicional.

DECISÃO sobre origem do perfil: campo com **confiança** (`alta | média | baixa`) e origem (`importado | inferido | gerado`). Perfil inferido sem evidência entra como `baixa` e a tela nunca o apresenta como fato sobre um clube real.

A identidade muda: técnico novo desloca a filosofia em direção à dele em ritmo limitado; acesso, rebaixamento e crise deslocam risco e paciência. Mudança registrada na crônica.

**Modelo de jogo do clube** (ideia 17 da pesquisa 04): o usuário declara uma vez por temporada os quatro momentos (organização ofensiva, transição defensiva, organização defensiva, transição ofensiva). Contratar e treinar a favor do modelo acelera familiaridade; trocar no meio do ano custa. É a ponte entre tática, treino e mercado.

### 2.1 Identidade esportiva duradoura ("escola" do clube)

Camada acima do modelo de jogo da temporada. O clube acumula, ao longo dos anos, um **perfil reconhecido**: formador de laterais, meio-campo técnico, pressão agressiva, jogo vertical, defesa compacta, jogadores de futsal, bola parada, formação de goleiros. O perfil não é escolhido num menu: é **medido** do que o clube fez (estilo jogado em campo, posições e tipos de jogador revelados, metodologia da base, treinadores contratados), com memória longa (média móvel de várias temporadas).

Efeitos: atrai jogadores, jovens e profissionais do mesmo perfil (aceitam mais, custam menos); a torcida tem expectativa de estilo (§7); a base produz mais do tipo de jogador que a metodologia privilegia (`08` §7.4). Custo: mudar de rumo é lento. Treinador novo com ideias opostas enfrenta base que forma outro tipo de jogador e elenco montado para outro futebol; alinhar leva temporadas e é uma decisão de projeto (adaptar o treinador, mudar a metodologia, contratar para a transição, ou assumir uma identidade híbrida). A identidade sobrevive à demissão do treinador.

### 2.2 Reputação regional

Separada da reputação esportiva nacional. Cresce com jogadores da região revelados, escolinhas apoiadas, projetos na cidade, presença em competições locais e relação com a torcida. Efeitos: prioridade na captação de garotos da região, patrocinadores locais, público, apoio institucional (cessão de estádio municipal). Um clube pode ser referência regional sem ganhar título.

## 3. Elenco, contratos e mercado

Documento próprio: `07-MERCADO-E-CONTRATOS.md` (três valores do jogador, contrato, agentes, empréstimos, clubes parceiros, inscrição, mercado que aprende).

## 4. Finanças

### 4.1 Livro-caixa: a única origem do dinheiro

Todo real do clube do usuário é um lançamento em `ClubLedgerEntry` (`01-ARQUITETURA.md` §5). Não existe saldo guardado em outro lugar.

- **Caixa** = soma dos lançamentos liquidados. **A receber e a pagar** = lançamentos com vencimento em aberto. **Resultado da temporada** = lançamentos por competência.
- Competência separada de caixa: venda parcelada é receita na data do negócio e entra no caixa parcela a parcela. Compra de jogador é paga conforme o contrato e **amortizada** no resultado pelo prazo do contrato do atleta; vender antes do fim gera ganho ou perda sobre o valor ainda não amortizado.
- Invariantes testados: caixa = soma; nenhum lançamento sem origem (`ref`); nenhuma chave de idempotência repetida; estorno é lançamento novo, nunca edição.
- Rivais: resumo financeiro por temporada no documento do mundo, produzido pela mesma função pura.

### 4.2 Receitas

| Linha | Como é calculada | Estado da evidência |
| --- | --- | --- |
| Direitos de TV e cota | por competição: parcela igual + posição + audiência (pesos do pacote) | FATO para A e B |
| Premiação | por posição ou por fase alcançada; zero para rebaixado | FATO para A e Copa do Brasil |
| Bilheteria | por jogo: demanda (§7.2) × preço, por setor, limitada à capacidade | FATO para A; C parcial |
| Camarotes e hospitalidade | contratos por temporada, função de estádio e mercado da cidade | NÃO PESQUISADO (valores) |
| Alimentação e bebida | gasto por pessoa × público × nível de operação | NÃO PESQUISADO |
| Sócio-torcedor | base × mensalidade por faixa; base reage a resultado, preço, campanha, divisão | FATO para A |
| Patrocínio | contratos por propriedade (§5) | FATO para máster; resto NÃO PESQUISADO |
| Fornecedor de material | fixo, royalties ou misto (§5) | FATO (um contrato real como modelo) |
| Produtos e licenciamento | camisas e produtos ∝ torcida ativa × momento × ídolos; lojas e licenças como contrato | NÃO PESQUISADO |
| Escolinhas licenciadas | taxa por unidade; também alimenta a base (`03` §7) | NÃO PESQUISADO |
| Venda de atletas | à vista ou parcelada; menos percentuais de terceiros e de formação | FATO agregado |
| Empréstimo de atletas | taxa e divisão de salário | NÃO PESQUISADO |
| Percentual de revenda | sobre venda futura de quem já foi vendido | prática; valores NÃO PESQUISADOS |
| Formação e solidariedade | `03` §7.5 | FATO |
| Estádio | aluguel para eventos, naming rights, visita e museu | parcial |
| Aporte | de dono ou investidor, conforme governança (`06` §5) | FATO de regra |
| Incentivos e loterias | linha fixa pequena por clube, parâmetro do pacote | NÃO PESQUISADO (valores) |

### 4.3 Despesas

| Linha | Regra |
| --- | --- |
| Salários de atletas | contrato; parte como direito de imagem, até 50% da remuneração (FATO: Lei Geral do Esporte) |
| Encargos | percentual sobre a parte salarial (PARÂMETRO; alíquotas NÃO PESQUISADAS) |
| Comissão e funcionários | contratos (`06`) |
| Luvas e bônus | no contrato; bônus por meta lançados quando a meta é atingida |
| Agentes | percentual por operação (PARÂMETRO; FATO: não há teto de regra no Brasil, `07` §3) |
| Compra de atletas | parcelas; amortização no resultado |
| Percentuais devidos | revenda, formação e solidariedade a terceiros |
| Viagem e hospedagem | distância entre cidades do pacote × jogos fora; ajuda de custo da competição quando o regulamento prevê |
| Operação de jogo | por partida em casa, função de público e estádio |
| Manutenção | por nível de estrutura |
| Base, escolinhas, observação | orçamentos |
| Obras | parcelas |
| Dívida | juros e principal de empréstimos; dívida antiga de clube que virou SAF consome 20% da receita mensal (FATO) |
| Impostos | linha percentual sobre receita, parâmetro do pacote; SAF paga 5% da receita mensal nos cinco primeiros anos (FATO) |
| Multas | rescisões de jogador e de comissão; sanções |

### 4.4 Tabela inicial por divisão (PARÂMETROS de jogo, revisão 4)

Milhões de reais por temporada, clube médio. Revista com `docs/pesquisa/modo-clube/10-economia-divisoes-inferiores.md`. Marca: **F** = há número lido em fonte (quase sempre secundária); **E** = estimativa de jogo, sem fonte.

| | D | C | B | A |
| --- | --- | --- | --- | --- |
| TV e cotas | 0,5 (F: R$ 458 mil na primeira fase em 2025, R$ 500 mil em 2026) | 1,2–1,4 (F: R$ 1,2 mi em 2024, mais R$ 150 mil extras em 2025) | 14–15 (F: R$ 14 mi líquidos em 2025, R$ 14,9 mi em 2026) | 93–175 (F) |
| Apoio de logística da CBF | viagem e hospedagem pagas pela organização (E) | pagas pela organização (F: orçamento de organização de R$ 68 mi em 2025) | 2–2,5 (F; condicionado à regra financeira em 2026) | 0 |
| Premiação | 0–1,3 (F: R$ 100 a 300 mil por fase em 2026) | 0–0,3 (F: R$ 312,5 mil aos oito classificados em 2024) | 0–2 (E; nenhum prêmio de acesso ou título encontrado) | 0–47,5 (F) |
| Bilheteria + sócios | 0,1–1 (E) | 0,3–4 (E; F de apoio: público médio de 3.466 e cerca de R$ 18 por presente em 2025) | 0,5–15 (F: renda média de R$ 3,35 mi por clube em 2025, cálculo sobre borderôs) | 15–320 (F) |
| Patrocínio + comercial | 0,1–1 (E) | 0,5–3 (E) | 2–15 (E) | 40–270 (F) |
| Venda de atletas | 0–1 (E) | 0–5 (E) | 1–20 (E) | 0–280 (F) |
| **Receita total** | 0,7–4 (E) | 3–15 (E; clube de torcida grande chega a 38, F: Remo 2024) | 20–80 (F parcial: R$ 25,9 a 38,9 mi em dois balanços de 2024) | 150–1.200 (F) |
| Folha mensal | 0,03–0,15 (E; clube de torcida grande chega a 0,8–1,0, F: um clube em 2025) | 0,2–0,8 (E; clubes grandes 0,7–1,5, F) | 1–5,5 (F: R$ 2,5 a 5,5 mi em três clubes) | 5–37 (F) |
| Custo ÷ receita recorrente | 90–120% (E) | 100–130% (E) | 100–130% (E) | 90–110% (F) |

Leituras da pesquisa 10 que mudam o desenho:

- **A dispersão dentro da divisão é maior que a diferença entre divisões vizinhas.** Na Série B de 2025 o público médio por clube foi de 928 a 22.048; na Série C, de 92 a 9.040. Um clube de torcida grande rebaixado para a Série D tem folha de clube de Série B pequena. Por isso receita de jogo, patrocínio e folha são função do **clube** (torcida, cidade, reputação) e a divisão só define cotas, premiação e exposição. Nenhuma receita é "da divisão" além das cotas.
- **Direito de imagem pesa quase tanto quanto salário** nos dois balanços da Série B lidos (R$ 13,6 a 14,6 mi contra R$ 12 a 16 mi de pessoal). O limite de 50% do contrato (`07` §2) é usado no teto pelos clubes; a IA dos rivais faz o mesmo.
- **Encargos sobre salário**: cerca de 12,6% (previdência, fundo de garantia e contribuição social), ou 29% com décimo terceiro e férias. Número calculado pelo pesquisador sobre a tabela de um único clube: entra no manifesto como estimativa de confiança baixa.
- **Sem fonte, e continuam estimativa**: público e ingresso da Série D como divisão; capacidade típica por divisão; patrocínio máster nas Séries B e C; salário de treinador e de jogador por divisão; juros da dívida; taxas de transferência abaixo do topo; custo por assento de obra. Todos entram no manifesto (`TEST_STRATEGY.md` §5.2) com confiança baixa e passam pela análise de sensibilidade antes de qualquer ajuste fino.

### 4.5 Regras financeiras, dívida e crise

**Regra da CBF como dado da competição** (FATO, fonte primária: regulamento do Sistema de Sustentabilidade Financeira da CBF, versão 2 de 2025, lido na íntegra; `docs/pesquisa/modo-clube/09-regulamentos-conferidos.md` item 1. A divergência registrada antes está resolvida, MC-143):

| Regra | Série A | Série B | Série C | Série D |
| --- | --- | --- | --- | --- |
| Custo do elenco sobre receita (art. 60 e art. 93) | 90% no exercício de 2026, 80% no de 2027, 70% depois | 90% no exercício de 2026, 80% depois | sem limite | fora do regulamento |
| Déficit tolerado, soma de 3 exercícios (art. 53) | o maior entre R$ 30 milhões e 2,5% das receitas | o maior entre R$ 10 milhões e 2,5% | não se aplica | |
| Dívida líquida de curto prazo sobre receita (art. 63 e art. 94) | 70% em 2026, 60% em 2027, 50% em 2028, 45% de 2029 em diante | igual | não se aplica | |
| Pagamentos em atraso (arts. 42 a 48) | verificação em 31 de março, 31 de julho e 30 de novembro | igual | igual (monitoramento simplificado, a partir de 2027) | |
| Demonstrações financeiras | auditadas e publicadas | igual | enviadas e publicadas | |
| Sanção por custo, déficit e dívida | só advertência nos exercícios de 2025 e 2026 (transição) | igual | | |

Correções em relação a resumos que circulam: a sequência 70, 60, 50 e 45% é o cronograma da **dívida de curto prazo**, não do custo do elenco; não existe degrau de custo do elenco depois de 2027.

Definições que o jogo copia: **receita** = operacional (bilheteria, sócios, transmissão, patrocínio, produtos, premiação) mais financeira mais transferências líquidas, menos tributos e repasses; o indicador de custo usa a **média de três exercícios** do resultado de transferências, então uma venda grande não libera folha de uma vez. **Custo do elenco** = salários, encargos, luvas, direito de imagem e rescisões de atletas e da comissão principal, mais amortização de contratações e comissão de agentes.

Sanções em escada (art. 106), cumulativas: advertência pública; multa (por excesso de custo, de 10% a 100% do excesso); retenção de receita; restrição de registro de atletas; dedução de pontos na temporada seguinte; exclusão de competição; perda da licença. Credor que denuncia dívida: o devedor tem 10 dias; sem prova de pagamento, o registro de atletas é bloqueado. **Evento de insolvência** (pedido de plano coletivo de pagamento): bloqueio preventivo de registro, gasto líquido de transferências limitado ao arrecadado na janela e folha limitada à média dos seis meses anteriores.

FATO (comunicados do órgão regulador, 2026): até novembro de 2026 as sanções aplicadas foram exclusão de um clube da Série B do programa de apoio de logística por salário atrasado há mais de 60 dias, bloqueio de registro condicionado a pagamento em 45 dias por dívida de transferência, e bloqueio preventivo por insolvência. Nenhuma multa, perda de pontos ou rebaixamento. No jogo: o painel financeiro mostra cada indicador contra o limite do exercício, com projeção; bloqueio de registro e perda do apoio de logística são as sanções frequentes; perda de pontos é rara e avisada com antecedência.

**Dívida**: empréstimo bancário com juros por reputação financeira (PARÂMETRO; juros reais NÃO ENCONTRADOS na pesquisa 10; confiança baixa no manifesto); antecipação de receita de TV e de patrocínio com deságio; parcelamento de dívida antiga.

**Crise**: salário atrasado derruba moral, permite rescisão pelo atleta depois de N meses e gera carta; fornecedor não pago reduz operação. Insolvência não encerra a carreira: a direção vende ativos, pode mudar o modelo de propriedade e demite o usuário.

### 4.6 Por que o clube não fica rico e imbatível (sem trava artificial)
Folha sobe com a divisão e com renovação de quem valorizou; manutenção cresce mais devagar que o custo de obra mas nunca para; grandes assediam seus melhores jogadores (multa paga encerra a conversa); meta da diretoria e exigência da torcida sobem com o sucesso; rivais ricos existem desde o início (concentração real da Série A). HIPÓTESE verificada por simulação de 30 temporadas com um "usuário ótimo" automático: se ele vence a Série A mais de 40% das vezes depois do ano 15, a economia está frouxa (PARÂMETRO).

## 5. Patrocínio, TV e comercial

### 5.1 Propriedades vendáveis

Máster (peito), costas, manga, calção, número, uniforme de treino, centro de treinamento, base, placas de campo, naming rights de estádio e de setor, parceiro digital, parceiro de apostas, banco ou cartão, fornecedor de material. Cada clube tem um inventário; o que não está vendido aparece como oportunidade.

FATO: em 2026 um clube recebe R$ 268 milhões por ano de máster e outros grandes ficam entre R$ 100 e 115 milhões (estimativas); apostas caíram de 18 para 12 clubes da Série A; na Série B, 7 de 20 clubes não têm máster. NÃO PESQUISADO: valores das demais propriedades. PARÂMETRO: cada propriedade vale uma fração do máster do mesmo clube (tabela do pacote).

### 5.2 Contrato

```ts
interface SponsorDeal {
  property: SponsorProperty; sponsorId: string; category: string;   // setor, para exclusividade
  fixedPerSeason: number;
  bonuses: Array<{ trigger: 'acesso' | 'permanência' | 'título' | 'fase' | 'jogos na TV' | 'público'; amount: number }>;
  royalties?: Array<{ upTo: number; rate: number }>;                 // fornecedor: faixas progressivas
  minimumMarketingSpend?: number;                                    // obrigação do patrocinador ou do clube
  relegationCut?: number;                                            // ex.: corta 30% fora da primeira divisão
  from: number; until: number; exitClauses: ExitClause[];
  sponsorRisk: number;                                               // chance de quebrar ou reduzir
}
```
FATO de modelo: um contrato real de fornecedor de 2026 a 2032 não tem valor fixo, paga royalties progressivos de 12%, 15% e 18%, bônus por título, mínimo de marketing e corta 30% se o clube sair da Série A. O jogo oferece os dois desenhos (fixo alto e seguro, ou variável que rende mais se o clube vende camisa).

O patrocinador avalia divisão, exposição em TV, torcida, reputação, mercado da cidade e conflito de categoria com contratos vigentes. A proposta é preparada pelo departamento comercial; o nível dele define quantas chegam e quão boas (`06` §4).

### 5.2.1 Patrocinador como empresa, com entregas

Cada patrocinador do pacote é uma entidade: setor, porte, mercado (cidade, estado, nacional), público que quer atingir, reputação, orçamento de patrocínio, objetivos, histórico com o clube. A aderência entre empresa e clube pesa tanto quanto a divisão: uma rede regional de material de construção pode preferir o clube da cidade a um clube maior de outro estado.

Contrato tem **entregas** medidas: exposição em jogos transmitidos, público no estádio, conteúdo digital produzido, eventos, metas esportivas. O departamento comercial presta contas no fim de cada período; entrega abaixo do combinado reduz o valor da renovação ou aciona cláusula de saída; entrega acima melhora a relação e a próxima proposta. O relacionamento é estado persistente.

### 5.3 TV e exposição

Cada jogo transmitido soma exposição, que alimenta valor de patrocínio, crescimento de torcida e visibilidade de jovens (preço e assédio sobem).

### 5.4 Marketing e comunidade

Orçamento por temporada dividido em campanhas (sócios, cidade, base, camisa histórica, família no estádio, retorno de ídolo, campanha do acesso, clássico, ação social). Cada campanha tem alvo mensurável e retorno incerto, função de torcida, momento e nível do departamento comercial. FATO (pesquisa 03 §10): conteúdo só comercial engaja menos que comunidade e jogo. → DECISÃO: campanha de identidade rende mais em lealdade; campanha de venda rende mais em caixa imediato e gasta paciência se repetida.

## 6. Estrutura e estádio

Oito frentes, cada uma com níveis, custo, prazo em dias de calendário e manutenção: estádio (capacidade por setor), gramado, drenagem, iluminação (habilita jogo noturno e TV), centro de treinamento, base, departamento médico, rede de olheiros, comercial.

```text
custo(n)      = base × 1,65^(n−1)     PARÂMETRO
manutenção(n) = base × 1,35^(n−1)     PARÂMETRO
```
Cada frente declara o que altera: centro de treinamento → ganho de treino e teto de complexidade tática; médico → risco e duração de lesão; base → qualidade e quantidade da safra; drenagem e gramado → efeito de chuva e estilo de passe; comercial → conversão de campanha e valor de patrocínio. Lacuna: custo real por assento e por centro de treinamento não foi encontrado; a base de custo sai da tabela 4.4 (obra de nível seguinte ≈ 20 a 40% da receita anual da divisão em que ela faz sentido).

### 6.1 Onde o clube joga

O estádio não precisa ser do clube. Arranjos possíveis (dado do pacote, mutável na carreira): **próprio**, **municipal cedido**, **alugado**, **compartilhado** com outro clube, **mando em outra cidade** por jogo. Cada arranjo tem custo por partida, parcela da bilheteria e das receitas de consumo que fica com o clube, controle sobre obras, e disponibilidade de datas. Estádio próprio dá toda a receita e toda a conta: operação, segurança, manutenção, gramado, iluminação. Ampliar a capacidade deixa de ser sempre bom: arquibancada vazia custa manutenção e esvazia o efeito da torcida.

### 6.2 Operação do dia de jogo

Modelada como custo e resultado, com poucas decisões, e não como minijogo.
- **Antes**: nível de operação contratado (segurança, atendimento, limpeza, equipe médica do estádio), abertura de setores, preço (§7.3).
- **Durante**: público por setor, ocupação, consumo por pessoa, camarotes, incidentes (probabilidade função de operação, lotação e rivalidade).
- **Depois**: borderô (receita por linha, custo por linha, resultado do jogo), desgaste do gramado, relatório de entrega aos patrocinadores.
Incidente grave gera punição da competição (multa, perda de mando, portões fechados), que é uma das ligações entre operações, torcida e finanças. Requisitos de segurança e de capacidade vêm do licenciamento (`06` §2.7).

## 7. Torcida

### 7.1 Perfil (pacote) e estado (carreira)
Perfil: tamanho, lealdade, exigência, paciência, sensibilidade a preço, identidade local, orgulho da base, ambição, estilo preferido. Estado: humor (0..100), torcida ativa, sócios, pressão sobre diretoria.

### 7.2 Demanda por jogo
```text
público = capacidade ⊓ ( torcida ativa × f(humor, fase da tabela) × clássico × importância
                         × g(preço ÷ renda da cidade) × clima × horário × transmissão )
```
Elasticidade e pesos (FATOS de `docs/pesquisa/modo-clube/10-economia-divisoes-inferiores.md` §5, todos da Série A; valores iniciais dos PARÂMETROS):

| Fator | Evidência | Valor inicial no jogo |
| --- | --- | --- |
| Preço | elasticidade entre −0,16 e −0,29 em quatro estudos (demanda inelástica); −1,28 em um estudo de uma só temporada (2013) | −0,25; faixa do manifesto de −0,15 a −1,3 |
| Clássico | +30% a +32% (2017 a 2019); coeficiente de +0,44 em 2013 | +30% |
| Mandante recém-promovido | coeficiente de +0,42 (2013) | +30% na primeira temporada depois do acesso, decaindo |
| Visitante de grande torcida | +0,18 | +15% |
| Estádio novo | +42,7% (2017 a 2019); +0,56 (2013) | +40% no primeiro ano, decaindo em três temporadas |
| Fim de semana à tarde | +0,18 em um estudo; não significativo em outro | +10%, confiança baixa |
| Horário tardio | efeito negativo, sem coeficiente lido | −10%, confiança baixa |
| Posição do mandante | pior posição, menos público (2017 a 2019); não significativo em 2013 | via `humor` e fase da tabela |
| Chuva e transmissão | sem coeficiente lido; transmissão não significativa num estudo de 2002 | efeito pequeno, confiança baixa |

Limite declarado: não há estudo lido com coeficientes para as Séries B, C e D; o único que cobre as quatro divisões não foi aberto e, segundo citação, não achou efeito do preço e achou efeito de história do clube e de renda local. Referências de nível: 26.551 pagantes e ingresso médio de R$ 51,35 na Série A de 2025, com ocupação média de 42,4% entre 2017 e 2019; Série B com média simples de 6.672 por clube e ingresso perto de R$ 26; Série C com 3.466 e cerca de R$ 18.

### 7.3 Efeitos
- Dinheiro: bilheteria, sócios, produtos.
- Campo: mando. FATO: jogos sem público reduziram a vantagem do mandante (pesquisa 01). → DECISÃO: parte do mando na engine escala com lotação e humor; efeito moderado, em estado mental e arbitragem, nunca em atributo.
- Diretoria: exigência alta encurta paciência.
- Identidade: torcida com orgulho da base tolera resultado pior com garotos em campo e reage mal a venda de ídolo; torcida com estilo preferido reage ao modelo de jogo.

### 7.3.1 Política de ingresso e programa de sócios

FATO PARCIAL (Arboretti e outros, 2026, Journal of Big Data; `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md` item 9): o estudo existe e trata de um clube italiano não identificado na temporada 2023-24; o aumento de 14% nas vendas só foi visto em resumo, e o de 39% na receita não foi confirmado. Não usar esses números como referência. NÃO PESQUISADO: elasticidade de preço no Brasil.

DECISÃO: a pessoa não fixa preço por assento. Escolhe uma **política** por temporada, ajustável por jogo: maximizar receita, priorizar lotação, premiar sócios, atrair famílias, ingresso popular. A política vira tabela de preço por setor e por categoria de jogo (clássico, decisão, jogo comum), calculada pelo departamento comercial com a demanda prevista (§7.2). Preço agressivo repetido gasta paciência da torcida e reduz lealdade; ingresso popular enche o estádio, fortalece o mando e rende menos.

**Sócios** em categorias (básico, família, cadeira, corporativo, fundador), cada uma com mensalidade, benefício (desconto, prioridade, lugar marcado), limite de vagas e custo de atendimento. Decisões: preço, benefícios, campanha de adesão e de renovação. A base de sócios responde a resultado, divisão, preço e tratamento; sócio ocupa lugar que não é vendido na bilheteria.

### 7.4 Rivalidade
Registro por par de clubes com intensidade e causa (geográfica, histórica, decisões recentes, disputa de acesso, jogador "roubado"). Nasce e esfria por eventos da simulação (ideia 33). Afeta público, moral, cartões e cartas.

## 8. Rivais conduzidos por regra

### 8.1 Ciclo
- **Por temporada**: meta, orçamento, plano de elenco (necessidade por posição e idade), decisão sobre técnico.
- **Por rodada de oferta do mercado**: propostas e respostas.
- **Por dia de jogo**: escalação, rodízio por fadiga e por prioridade entre competições (liga, copa, estadual), plano tático para o adversário.
- **Na partida do usuário**: `02-MATCH-ENGINE.md` §10.

### 8.2 Utilidade de contratação
```text
U = N + F + D + R − C − W
```
`N` necessidade da posição no plano; `F` aderência ao modelo de jogo; `D` potencial estimado (com erro do olheiro do clube); `R` revenda esperada; `C` custo; `W` impacto na folha. Pesos vêm do perfil (§2) e da situação (brigando por acesso pesa `N`; em crise pesa `C` e `W`). Toda decisão guarda os termos: o usuário pode perguntar "por que o rival comprou?" e o jogo responde com números.

### 8.3 Sanidade (testes obrigatórios)
Nenhum rival termina janela sem goleiro, com posição zerada ou com folha acima do limite; jovens com potencial alto recebem minutos ou são emprestados (crítica registrada à IA do Football Manager); jogador comprado joga. Em 30 temporadas sem usuário: nenhum clube com caixa negativo sem bloqueio, títulos distribuídos de forma compatível com a concentração de receita.

### 8.4 Treinadores e comissão

Domínio próprio: `06-COMISSAO-E-GOVERNANCA.md`. Os rivais contratam e demitem treinador e comissão pelas mesmas regras.

### 8.5 Tamanho do mundo

O número de rivais é o do pacote (ADR-016). Clubes fora das competições ativas são registros leves e ganham elenco e comissão completos quando entram.

## 9. Temporada, diretoria, eventos

### 9.1 Fases
Pré-temporada (meta, orçamento, modelo de jogo, janela) → primeiro turno → janela do meio → segundo turno → reta final → balanço (premiação, safra da base, renovações, propostas de emprego).

### 9.2 Diretoria
Modelos de propriedade, alçada do usuário e três confianças (direção, torcida, elenco): `06` §5. Resumo: metas negociadas no início (posição, finanças, base, estilo de jogo). Confiança 0..100 visível, com os fatores do último mês. Abaixo do limiar: ultimato com prazo; depois, demissão. Reputação do treinador segue com ele; desempregado recebe propostas compatíveis.

### 9.3 Cartas de evento
Modelo de qualidades (FATO: Reigns e Crusader Kings montam o baralho a partir do estado do jogo): cada carta declara **gatilho** (condição sobre estado), **peso**, **texto** (até 3 frases), **2 ou 3 opções**, **efeitos imediatos**, **efeitos agendados** e **marcas** que ficam no estado e habilitam cartas futuras. No máximo uma carta por dia de jogo, três por mês (PARÂMETRO). Nenhuma carta sem gatilho ligado ao estado do clube.

Baralho inicial (20): patrocinador local de três anos; naming rights; clássico na TV aberta; protesto por preço de ingresso; promessa numa escolinha apoiada; gigante quer seu garoto; ídolo quer voltar; técnico rival sondado para o seu cargo; chuva destrói o gramado; patrocinador em crise; rival quebrado liquida elenco; empresário oferece veterano caro; evento pede o estádio; garoto pede chance; comissão pede especialista; torcida propõe campanha de sócios; clube formador renegocia percentual; surto de lesões numa posição; diretoria exige corte; empresa regional quer associar a marca.

### 9.4 Crônica e fim de jogo
`ClubHistory` grava fatos (estreia, primeiro gol, recorde, título, venda recorde, troca de técnico, nascimento de rivalidade). Deles saem: linha do tempo do clube, ficha de origem de cada jogador, sala de troféus, livro de recordes, camisa aposentada, Hall da Fama. Texto por modelos de frase. Desafios opcionais com conquista: só prata da casa, sem contratações, só jogadores do estado, orçamento travado, sem ver notas de atributo.

### 9.5 Imprensa e comunicação (cortado na revisão 4)

> **Cortado como sistema.** Não há tarefa nos cortes 1 a 5 (a MC-242 foi retirada). O que sobra de imprensa é texto de carta de evento (§9.3) e de crônica (§9.4), sem estado próprio, sem profissional de comunicação e sem medidor de "clima". O parágrafo abaixo fica só como registro, porque o dono aprovou o corte "num primeiro momento" e o sistema pode voltar (`ROADMAP.md` §4, questão 18).

Sem coletiva interativa. A imprensa existe como **clima**: pressão sobre o treinador, especulação de mercado que mexe com jogador e agente, repercussão de derrota em clássico. Chega em cartas (§9.3) com resposta em três tons (proteger o elenco, cobrar em público, não comentar), com efeito em moral, torcida e direção conforme a personalidade de quem é citado. Um profissional de comunicação na comissão reduz o dano de crises.

## 10. Clima e condições

Perfil climático mensal por cidade no pacote (chuva, temperatura, umidade, vento) e altitude. Clima da partida sorteado do perfil pela semente. Efeitos pequenos e específicos (PARÂMETROS a fechar com a pesquisa 01 §8): chuva e gramado ruim aumentam erro de passe rasteiro e de domínio; campo pesado aumenta custo de fôlego; vento aumenta erro de bola longa e cruzamento; calor reduz recuperação de fôlego; altitude penaliza fôlego de visitante não adaptado. Drenagem e gramado do estádio reduzem os dois primeiros. Sem consulta externa em tempo de execução.

## 11. Conhecimento de futebol (ligação com o resto do site)

- Olheiro mostra pista de trajetória de um jogador do pacote; reconhecer estreita a faixa de potencial e dá desconto na negociação.
- Um lance por partida importante pode ser resolvido por pergunta, com bônus pequeno de estado mental.
- Estrelas dos minijogos viram pontos de observação extra ou sessão extra de treino, com teto diário.
- Nada disso é necessário para jogar.
