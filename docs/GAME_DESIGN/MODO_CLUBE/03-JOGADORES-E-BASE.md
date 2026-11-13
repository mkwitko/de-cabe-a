# Modo Clube — pacote de dados, jogadores, treino, moral e mundo da base

Data: 2026-11-13, revisão 4. Base: ADR-014 e ADR-016. Evidência e números: `docs/pesquisa/modo-clube/02-formacao-e-desenvolvimento.md`. Legenda: FATO, HIPÓTESE, DECISÃO, PARÂMETRO. Vários números da pesquisa 02 vieram de leitura por resumo e estão marcados lá como "a conferir"; aqui entram como PARÂMETRO.

## 1. Pacote de dados

### 1.1 Esquema (zod, `packages/club-domain/src/pack/schema.ts`)
```ts
interface Pack {
  id: string; version: number; kind: 'real' | 'dev'; region: 'BR'; season: number; createdAt: string; checksum: string;
  manifest: Array<{ file: string; sha256: string; rows: number; importedAt: string; note?: string }>;
  competitions: PackCompetition[];   // fases, vagas, desempates, inscrição, TV, premiação, regras financeiras (ADR-016, `05`)
  clubs: PackClub[];                 // identidade, cidade, estádio, estrutura, torcida, perfil, caixa, contratos de patrocínio
  players: PackPlayer[];
  staff: PackStaff[]; assignments: PackStaffAssignment[];   // comissão, vínculos, acúmulo e terceirização (`06`)
  governance: PackGovernance[];      // modelo de propriedade, dono, metas (`06` §5)
  cities: PackCity[];                // população, renda, clima mensal, altitude, coordenadas, perfil de formação
  academies: PackAcademy[];          // escolinhas, núcleos de futsal, clubes formadores
  youthCompetitions: PackYouthCompetition[];
  names: { first: string[]; last: string[]; nicknames: string[] };   // para o gerador
}
interface PackPlayer {
  id: string; name: string; knownAs?: string; birthDate: string; nationality: string; birthCityId?: string;
  heightCm?: number; foot: 'D' | 'E' | 'A';
  positions: Array<{ position: Position; level: 1 | 2 | 3 }>;   // 3 = natural
  attributes: Attributes;            // 1..99
  potential: PotentialProfile;
  personality: Personality; traits: Trait[];
  clubId: string | null; contract?: Contract; loanFromClubId?: string;
  origin?: PlayerOrigin;             // cidade, escolinha, clube formador
  field: Record<string, 'importado' | 'gerado' | 'ajustado'>;   // origem por campo
}
```

### 1.2 Importador (`scripts/club-pack`)
Etapas: ler CSV ou JSON → mapear colunas por arquivo de mapeamento → normalizar (nomes, datas, posições para as 13, escalas para 1..99 por regra declarada no mapeamento) → deduplicar (nome normalizado + nascimento; conflito vai para relatório, nunca é resolvido em silêncio) → ligar a clubes → validar → completar o que falta com o gerador, marcando `gerado` → emitir pacote e relatório.

O importador não tem restrição de formato além de CSV e JSON com mapeamento, e não conhece fornecedor. Campo ausente nunca é inventado como `importado`.

### 1.3 Validação (pacote não publica com erro)
Participantes de cada competição = vagas do regulamento; elenco entre 22 e 35 (limites de inscrição da competição prevalecem); ao menos 2 goleiros; cada uma das 13 posições coberta por alguém de nível ≥ 2; atributos em 1..99; idade entre 15 e 45; contrato dentro do clube; regras financeiras da competição respeitadas no estado inicial ou divergência listada; cidade existente; sem jogador em dois clubes; `checksum` confere.

### 1.4 Relatório de qualidade
Por clube e por divisão: jogadores, origem por campo (% importado, gerado, ajustado), cobertura de posições, atributos ausentes, contratos ausentes, duplicidades, divergências, registros sem identificação confiável. Mais: distribuição de força por divisão e sobreposição entre divisões (alerta se a Série B média supera a A).

### 1.5 Pacote fictício de desenvolvimento

`br-dev-1` (`kind: 'dev'`): clubes, pessoas, cidades e competições inventados, gerados por semente fixa. Mesmo comando, mesmo arquivo, byte a byte. Tem pelo menos uma competição de cada tipo de fase (liga, grupos, mata-mata de jogo único e de ida e volta) e volumes próximos dos reais, para que testes de calendário e de custo valham. Existe uma variante pequena (`br-dev-mini`) para testes rápidos; a suíte roda nas duas para provar que nada depende de tamanho.

### 1.6 Pacote real e critério de publicação

Três pacotes diferentes, que não se confundem (revisão 4):

| Pacote | `kind` | Para que serve | Quem vê |
| --- | --- | --- | --- |
| Desenvolvimento (`br-dev-1`, `br-dev-mini`) | `ficticio` | testes, calibragem, bancada; nomes gerados sem cuidado editorial | só o time |
| Lançamento fictício | `ficticio` | pacote público com clubes, cidades e jogadores inventados e revisados (nomes, escudos, rivalidades, história) | usuários; é o pacote do lançamento (decisão do dono em 2026-11-13, `ROADMAP.md` §4, questão 14) |
| Real | `real` | jogadores reais nas quatro divisões, sob o critério abaixo | usuários |

O jogo inteiro é desenvolvido e aprovado no pacote de desenvolvimento. O pacote de lançamento é uma decisão de produto separada, e nenhuma tarefa de jogo depende dela.

Decisão do dono: jogadores reais nas quatro divisões nacionais.

- `kind: 'real'`. Clubes = participantes das competições da temporada do pacote, conforme regulamento (`05`).
- **Sem preenchimento silencioso.** Em pacote real, jogador gerado não entra em elenco de clube. Campo ausente de um jogador real (um atributo, a altura) pode ser **estimado** por regra declarada e fica marcado `estimado`; identidade nunca é estimada.
- Origem por campo: `importado`, `estimado`, `ajustado`. A soma por clube aparece no relatório.
- **Critério para publicar** (PARÂMETROS): por clube, elenco real de pelo menos 22 jogadores com pelo menos 2 goleiros e todas as 13 posições cobertas; identidade (nome, nascimento, posição, clube) 100% importada; atributos com no máximo 30% `estimado` nas duas primeiras divisões e 60% nas duas últimas; nenhum conflito de duplicidade aberto; treinador identificado. Divisão com mais de 10% dos clubes abaixo do critério não publica.
- Clube abaixo do critério bloqueia a publicação do pacote; não existe "publicar com aviso".
- A carreira guarda `packId` e `packVersion`; pacote novo nunca altera carreira existente (teste de integração).
- A origem dos arquivos de entrada é responsabilidade do dono (ADR-014 item 2).

Risco declarado: elencos das Séries C e D mudam muito e têm pouca fonte pública estruturada. O jogo é desenvolvido e testado no pacote fictício; o pacote real pode sair depois do corte jogável 1.

### 1.7 Procedência por campo

A marca simples (`importado`, `estimado`, `ajustado`, `gerado`) fica no pacote publicado. O **processo de importação** guarda, fora do pacote, um registro completo por valor relevante: arquivo e identificador do registro de origem, data de referência do dado, data de coleta, transformação aplicada (regra e versão do normalizador), confiança (`alta`, `média`, `baixa`) e estado de revisão (`automático`, `revisado`, `contestado`). O pacote publicado leva só a marca e a confiança, para não inchar; o registro completo é o que permite auditar e refazer.

A interface pode mostrar confiança: valor estimado aparece como estimado ("finalização por volta de 76"), sem se apresentar como medida oficial.

### 1.8 O que é dado real, o que é avaliação e o que é simulação

Decisão do dono (2026-11-13): jogadores reais têm **personalidade real**. A versão anterior desta seção sorteava personalidade em faixas neutras; foi revogada.

| Campo | Natureza |
| --- | --- |
| Nome, nascimento, nacionalidade, altura, pé, clube e contrato na data de referência | dado real |
| Jogos, gols, minutos, cartões, capitania de temporadas passadas | observação de desempenho |
| Atributos | avaliação ou estimativa; nunca apresentada como medida oficial |
| Personalidade (profissionalismo, ambição, lealdade, temperamento, resiliência, sociabilidade), ocultos (consistência, jogos grandes, propensão a lesão, adaptabilidade, versatilidade), liderança e traços de campo | **avaliação do jogador real**, campo do pacote como qualquer atributo, com marca de origem (`importado`, `estimado`, `ajustado`) e confiança |
| Potencial | variável do jogo, estimada |
| Moral, relações de vestiário, familiaridade | estado da carreira, simulado a partir do início |
| Origem de garotos gerados | mundo simulado |

Regras:

- **Sem neutralização.** O capitão conhecido entra líder; o jogador de pavio curto entra com temperamento baixo. Vestiário, moral e liderança dos elencos reais usam esses valores desde o primeiro dia.
- **Quando o arquivo de entrada não traz o campo**, ele é estimado por regra declarada a partir de fatos observáveis e fica marcado `estimado` com confiança baixa: liderança por capitania e idade; temperamento por cartões vermelhos e suspensões por minuto; lealdade por tempo de clube; consistência por variação de minutos e de notas; propensão a lesão por histórico de afastamentos; jogos grandes por desempenho em decisões, quando houver dado. Sem fato observável, o campo fica no meio da escala e marcado como tal; não se inventa.
- **Revisão**: personalidade e ocultos passam pela mesma auditoria dos atributos e podem ser ajustados à mão (`ajustado`), com registro de quem e por quê na procedência (§1.7).
- **Como aparece**: como nos jogos do gênero, em rótulos e em relatório de olheiro. O vocabulário descreve comportamento esportivo ("líder de vestiário", "explosivo em campo", "irregular", "cresce em decisão", "pouco aplicado nos treinos"). Não há mensagem sobre vida privada, saúde fora do esporte ou conduta fora do futebol.
- **Risco registrado**: atribuir traço de caráter a pessoa real identificada, num produto com anúncio, é o ponto mais sensível da consulta jurídica pendente (`ROADMAP.md` §4, questão 10). A decisão de seguir é do dono.

## 2. Jogador

### 2.1 Posições (13)
Goleiro; zagueiro; lateral direito e esquerdo; volante; meia central; meia direita e esquerda; meia armador; ponta direita e esquerda; segundo atacante; centroavante. Nível 3 natural, 2 competente, 1 improvisado; fora de posição perde familiaridade e parte de `posicionamento` e `decisões`. Função é do plano tático (`02-MATCH-ENGINE.md` §8.2).

### 2.2 Atributos (1..99): 28 de linha (10 técnicos, 11 mentais, 7 físicos) e 6 de goleiro
- **Técnicos (10)**: primeiro toque, passe, técnica, drible, cruzamento, finalização, cabeceio, desarme, marcação, bola parada.
- **Mentais (11)**: decisões, visão, antecipação, posicionamento, movimentação sem bola, compostura, concentração, trabalho em equipe, intensidade, liderança, agressividade.
- **Físicos (7)**: aceleração, velocidade, agilidade, equilíbrio, força, resistência, impulsão.
- **Goleiro (6)**: reflexos, defesa, um contra um, domínio da área, reposição, posicionamento de goleiro.

DECISÃO: não existe nota geral única no modelo. A tela mostra **nota por função** (quão bem ele faz o que aquela função pede, 0..99, calculada dos atributos com os pesos da função) e seis resumos (técnica, mente, físico, ataque, defesa, goleiro). Comparar dois jogadores é sempre "para qual função".

### 2.3 Ocultos e personalidade
Ocultos (1..20): consistência, jogos grandes, propensão a lesão, adaptabilidade, versatilidade. Personalidade (1..20): profissionalismo, ambição, lealdade, temperamento, resiliência, sociabilidade. Revelados por relatório de olheiro em texto ("some em jogo grande"), não em número (ideia 20).

Traços (comportamento em campo, binários): corta para dentro, arrisca de longe, segura a bola, parte para o drible, entra na área, joga simples, dá carrinho, reclama com árbitro, entre outros. Entram como viés na utilidade.

### 2.4 Potencial
```ts
interface PotentialProfile {
  ceiling: { technical: number; mental: number; physical: number };   // teto por grupo
  learning: number;          // velocidade de ganho, 1..20
  physicalCurve: 'precoce' | 'normal' | 'tardio';
  peakAge: number;           // sorteado por posição
}
```
DECISÃO: potencial não é destino. A evolução real sai de treino, minutos, comissão, saúde e personalidade; o teto só limita. O que a tela mostra é uma **faixa** ("teto provável 72–80, raro 86"), o percentil de trajetórias simuladas a partir do estado atual (FATO: é como o Basketball GM calcula potencial), e a faixa estreita com observação.

## 3. Evolução por idade

FATO (pesquisa 02): pico entre 25 e 27 (atacante perto de 25, zagueiro perto de 27; goleiro e zagueiro sustentam até cerca de 31); físico cai primeiro (sprints −21% em veteranos), passe se mantém ou melhora; jogador técnico envelhece melhor.

Regra anual por atributo (aplicada em passos semanais):
```text
Δ = base(grupo, idade − pico) × learning × treino × minutos × comissão × saúde
    limitado por ceiling do grupo; ruído individual pequeno
```
| Faixa (relativa ao pico) | Técnico | Mental | Físico |
|---|---|---|---|
| até −7 anos | +3 a +6 | +2 a +4 | +3 a +6 (conforme curva física) |
| −6 a −3 | +2 a +4 | +2 a +4 | +1 a +3 |
| −2 a +1 | 0 a +1 | +1 a +2 | 0 |
| +2 a +4 | 0 a −1 | 0 a +1 | −1 a −3 |
| +5 em diante | −1 a −2 | 0 | −3 a −5 |
PARÂMETROS (pontos por ano). Goleiro: pico +3 anos e queda física pela metade. Lesão grave tira pontos físicos e sobe propensão.

**Minutos**: jovem sem jogar evolui menos; jovem jogando acima do nível evolui mais em mental e arrisca moral e lesão. Empréstimo é a ferramenta.

## 4. Lesão e carga

FATO (pesquisa 02): Europa, 8,0 lesões por 1.000 h no total, 27,5 em jogo e 4,1 em treino; posterior da coxa 19%, mediana de 13 dias. Série A 2019: 20,5 por 1.000 h de jogo; afastamento médio de 23 dias. Academia: 2,4 por 1.000 h, subindo no pico de crescimento (24,5 contra 11,5).

DECISÃO: risco por hora de exposição = taxa base (jogo ou treino) × carga aguda sobre crônica × fadiga × idade × propensão × gramado × histórico; departamento médico reduz risco e duração. Tabela de tipos com frequência e dias fora no pacote da engine. Jovem em pico de crescimento tem risco multiplicado: treinar pesado um garoto de 14 anos custa.

Calibragem-alvo: um elenco de 28 tem entre 35 e 50 lesões com afastamento por temporada de 38 jogos (PARÂMETRO derivado das taxas acima; conferir em simulação).

## 5. Treino

### 5.1 Semana
Sete blocos, um por dia, com intensidade (recuperação, leve, média, alta). O jogo propõe uma semana conforme o calendário; o usuário ajusta ou delega. DECISÃO (ideias 15 e 16): além de físico e técnico, o treino tático é organizado por **momento do jogo** (organização ofensiva, transição defensiva, organização defensiva, transição ofensiva, bola parada), coerente com o modelo de jogo do clube.

| Bloco | Sobe | Custa |
|---|---|---|
| Técnico (por fundamento) | atributos técnicos escolhidos | carga leve |
| Tático por momento | familiaridade do plano e sincronização naquele momento | carga média |
| Físico | atributos físicos, tanque de fôlego da temporada | carga alta, risco |
| Mental e vídeo | concentração, decisões; leitura do próximo adversário | nada físico |
| Bola parada | sincronização das rotinas escolhidas | carga leve |
| Preparação do adversário | bônus de leitura contra o plano dele por uma partida | toma o lugar de outro bloco |
| Recuperação | fôlego, reduz risco | nenhum ganho |

### 5.2 Individual
Um foco por jogador: fundamento, nova função, nova posição, pé ruim, traço a ganhar ou perder. Compete com o coletivo: quem faz individual participa menos do bloco tático do dia.

### 5.3 Quatro medidas, nunca uma "química" só
- **Entendimento**: sabe o que a função pede (treino tático, vídeo, `decisões`).
- **Capacidade**: tem atributo para executar (nota por função).
- **Adesão**: aceita o plano (moral, relação com técnico, personalidade, coerência do modelo de jogo).
- **Sincronização**: faz na hora certa com os vizinhos (minutos juntos em pares e trios definidos pela formação).

`familiarity` usada na engine = combinação das quatro. A tela mostra as quatro por jogador, com prazo estimado.

## 6. Moral, vestiário e relações

FATO (pesquisa 02): coesão e desempenho se correlacionam (r = 0,34; coesão de tarefa 0,45, social 0,11); o efeito de técnico novo dura cerca de 5 jogos.

- **Moral individual** (0..100): minutos contra expectativa do contrato, desempenho, salário relativo, promessas, relação com técnico, resultados, lesão. Efeito: `composure`, `focus` e adesão.
- **Vestiário**: hierarquia (líderes, influentes, demais) e até três grupos sociais por afinidade (idade, origem, tempo de clube). Líder insatisfeito contagia o grupo. DECISÃO: coesão de tarefa pesa mais que a social no desempenho, como na evidência.
- **Promessas**: registradas com prazo (minutos, função, venda, aumento). Cumprir ou não é o que mais move moral.
- **Troca de técnico (rivais)**: ganho de adesão por 5 partidas, depois some (PARÂMETRO).
- Cada mudança de moral guarda a causa; a tela mostra as três maiores.

## 7. Mundo da base

**Fronteira com `08` (revisão 4).** Este capítulo é dono de: como o mundo da base é gerado e guardado (camadas, cidades, gerador, identidade determinística), olheiros e informação, vínculo e dinheiro de formação. `08-SAUDE-DESEMPENHO-E-BEM-ESTAR.md` §7 é dono de: raridade e geografia do talento (§7.5 de lá substitui os números de safra do §7.2 daqui), permanência, bem-estar, metodologia e instalações da base. Em conflito sobre quantos talentos existem e onde, vale o `08`.

**Safra anual mínima, desde o corte 1.** O sistema de base (categorias, olheiros, escolinhas) fica fora do corte 1, mas o mundo precisa repor jogadores, senão os elencos envelhecem e somem em poucas temporadas. Por isso existe, desde o corte 1, uma mecânica de mundo sem decisão do usuário: ao fim de cada temporada, cada clube recebe uma safra gerada (quantidade e nível por tamanho do clube e nível fixo da base no pacote), e os jogadores sem clube acima da idade limite se aposentam. Teste: 30 temporadas sem usuário mantêm tamanho de elenco e curva de idade (`TEST_STRATEGY.md` §5).

### 7.1 Camadas
1. **Comunidade (7 a 13)**: escolinhas, projetos, campos e núcleos de futsal por cidade. Aqui não se contrata; observa-se, apoia-se e convida-se para avaliação.
2. **Clubes formadores (13 a 17)**: fora das quatro divisões; têm técnico, estrutura e elenco latente; vendem com percentual futuro.
3. **Base dos clubes (sub-15, sub-17, sub-20)**: FATO: contrato de formação dos 14 aos 20; primeiro contrato profissional a partir dos 16, por até 3 anos.
4. **Competições**: festivais municipais e de futsal, regionais, estaduais sub-15 e sub-17, nacionais sub-17 e sub-20, Copa São Paulo (FATO: 128 equipes em 32 grupos de 4), copas sub-17 e sub-20. Formato por parâmetro do pacote.
5. **Transição**: promover, emprestar, vender, dispensar.

### 7.2 Cidades e população latente
FATO: 5.570 municípios, 44,8% com até 10 mil habitantes; seis estados concentram cerca de 75% dos jogadores da Série A; cerca de 70% nasceram em Rio, São Paulo ou cidades abaixo de 400 mil. Lacuna: jogadores por habitante por município.

DECISÃO: o pacote traz todas as cidades com poucos campos (população jovem, renda, futsal, campo, clubes próximos, histórico). Cada cidade tem, por safra, uma **distribuição** de talento, não uma lista de crianças. Parâmetros: praticantes estimados, média e cauda da qualidade (função de volume, estrutura e continuidade), peso do futsal. A raridade de talento extremo é controlada no total do país por safra, por um parâmetro **calibrado em simulação** (não um número fixo), e a geografia altera acesso e desenvolvimento, não o potencial sorteado: ver `08-SAUDE-DESEMPENHO-E-BEM-ESTAR.md` §7.5.

Materialização: quando um olheiro cobre um torneio, o gerador cria os N destaques daquele torneio com identificador `hash(semente, cidade, safra, índice)`. Sem observação, o garoto segue latente; se for bom, aparece mais tarde num clube formador ou na base de um rival (o mundo o "descobre" por regra).

### 7.3 Gerador
Entrada: cidade, safra, camada, semente. Saída: nome, nascimento, pé, altura projetada, posição, atributos iniciais, potencial, personalidade, traços, origem.
- FATO: efeito da idade relativa (62% da Série A nasceu no primeiro semestre; quem nasce no fim do ano e chega vale mais depois dos 20). → DECISÃO: mês de nascimento afeta maturação aparente, não potencial; a seleção por desempenho atual favorece o nascido cedo; o tardio que sobrevive tende a ter `learning` e resiliência maiores.
- **Maturação**: idade biológica = cronológica ± desvio; atributos físicos atuais seguem a biológica; o teto, não. Um garoto dominante no sub-15 pode ser só precoce.
- **Futsal**: garoto de futsal começa com primeiro toque, técnica, drible e decisões em espaço curto acima da média e com adaptação ao campo a provar. Lacuna: não há evidência quantitativa de transferência; é HIPÓTESE de desenho.
- **Histórias de origem** (ideia 25): filho de ex-jogador do clube, irmão de profissional, vindo de projeto social, descoberto em festival.

Quantos chegam: FATO: cerca de 4 a 5% dos jovens de academia chegam ao topo; no Brasil, 1,5% (origem não verificada). PARÂMETRO de calibragem: de cada safra sub-17 de um clube, 1 a 2 viram profissionais de nível da própria divisão.

### 7.4 Olheiros
Atributos: avaliação técnica, física, mental, projeção, conhecimento por região, conhecimento de futsal, e um **viés nomeado** (superestima físico precoce, subestima baixinho, encanta-se com drible) que o usuário aprende com o tempo (ideia 22).

FATO: concordância entre olheiros é moderada para nível atual (0,6) e fraca para potencial (0,4). → DECISÃO: erro de potencial é maior que erro de nível atual, cai com horas de observação e com contextos diferentes (futsal, campo, jogo grande), e nunca chega a zero antes dos 18.

Tarefa de olheiro: região ou competição, faixa etária, perfil buscado, duração, custo. Entrega: relatório curto com 3 a 5 nomes, faixas, texto sobre ocultos, recomendação. O usuário nunca vê a lista inteira da população.

Agrupar por maturação (bio-banding) é uma ferramenta de observação desbloqueada pelo nível da base: mostra o garoto contra pares biológicos. FATO: evidência de benefício no longo prazo é limitada; no jogo é ajuda de leitura, não garantia.

### 7.5 Vínculo e dinheiro
- Apoiar escolinha (custo anual) dá prioridade de convite e relatórios melhores daquela cidade.
- Convênio com clube formador: preferência de compra, percentual futuro para ele.
- FATO (Lei 14.597/2023, texto oficial; `docs/pesquisa/modo-clube/09-regulamentos-conferidos.md` item 4), regras **nacionais**: primeiro contrato profissional a partir dos 16 anos, com prazo de até 3 anos para o clube formador; bolsa de formação dos 14 aos 20 anos, sem vínculo de emprego; preferência do formador na primeira renovação, por até 3 anos, com proposta 45 dias antes do fim e resposta em 15; indenização de formação de até 200 vezes os gastos comprovados, paga pelo novo clube em 15 dias; **solidariedade nacional de até 6%** do valor da transferência (0,5% por ano dos 12 aos 13, 1% por ano dos 14 aos 17, 0,5% por ano dos 18 aos 19), retida por quem compra e distribuída em 30 dias, em transferência definitiva ou empréstimo; multa para transferência nacional de até 2.000 vezes o salário médio, sem limite para o exterior; multa a favor do atleta de até 400 salários; menor de 14 anos sai a qualquer momento sem multa.
- FATO: solidariedade internacional de 5% da transferência, 0,25% por ano dos 12 aos 15 e 0,5% por ano dos 16 aos 23; indenização de formação de até 200 vezes o custo; direito de preferência de até 3 anos. → PARÂMETROS diretos do pacote. O histórico de onde o garoto esteve em cada idade é gravado e paga quem formou, inclusive o clube do usuário.

### 7.6 Decisões por temporada (o que chega ao Centro de Decisões)
Onde pôr cada olheiro; que escolinhas e convênios manter; quem convidar; quem assinar contrato de formação; quem sobe de categoria; quem treina com o profissional; quem empresta; quem profissionaliza; quem vende e com que percentual; quem dirige a base e com que metodologia. Promessas chegam como carta com duas ou três saídas (ideia 26), não como planilha.

### 7.7 Apego
`PlayerOrigin` e `ClubHistory` guardam cidade, primeira escolinha, primeiro técnico, torneio em que foi visto, categorias, estreia, primeiro gol, venda, volta. A ficha conta a história em texto por modelo de frase.

## 8. Calibragem do mundo de jogadores (testes)

- Gerador reproduzível; identificadores sem colisão em 30 safras.
- Distribuição de força por divisão estável em 30 temporadas (sem inflação nem deflação de atributos: média da Série A no ano 30 dentro de ±2 pontos da inicial).
- Curva de idade dos titulares compatível com o pico de 25 a 27.
- Talento extremo por safra dentro do parâmetro; proporção de nascidos no primeiro semestre entre profissionais gerados perto de 60%.
- Lesões por elenco por temporada na faixa do §4.

## 9. Documento do mundo da carreira (ADR-014)

```ts
interface WorldDelta {
  players: Record<id, Partial<DynamicPlayer>>;      // só quem mudou: atributos, clube, contrato, moral, lesão, familiaridade
  generated: Record<id, GeneratedPlayer>;           // materializados
  clubs: Record<id, DynamicClub>;                   // caixa, estrutura, técnico, plano, torcida, perfil atual
  tables: Record<competitionId, Standing[]>;
  market: MarketState; scouting: ScoutingState; rivalries: Rivalry[];
  calendar: CalendarState; rngStreams: Record<string, RngState>;
}
```
