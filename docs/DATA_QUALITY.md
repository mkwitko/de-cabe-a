# Data Quality

## 1. Ciclo de vida de um fato

```text
imported ──(editor revisa)──▶ verified
    │                            │
    └──(editor rejeita)──▶ rejected   (não aparece em busca nem em desafio)
draft (criado manualmente) ──▶ verified | rejected
```

Transições só via API admin (ou pelo agente de curadoria, ADR-006, com `verifiedBy = "ai-curator"`), com `verifiedBy` e `verifiedAt`. `verified → imported` reabre um registro para edição. Reimport nunca rebaixa `verified`; cria registro de divergência (`ImportDiff`, tabela simples: entidade, campo, valor atual, valor importado, status) para o editor decidir.

## 2. Regras de qualidade (checagens automáticas)

| ID | Regra | Severidade |
|---|---|---|
| DQ-01 | Spell `verified` exige `startDate` com precisão ≥ year | bloqueia |
| DQ-02 | Spell com `endDate < startDate` | bloqueia |
| DQ-03 | Spell `loan` exige `loanFromClubId` | bloqueia |
| DQ-04 | Player `verified` exige ≥ 1 alias `canonical` e `primaryPositionGroup` | bloqueia |
| DQ-05 | Dois players `verified` com mesmo `normalized` alias e mesmo ano de nascimento | aviso (possível duplicata) |
| DQ-06 | Spells sobrepostos do mesmo player em clubes diferentes sem um ser `loan` | aviso |
| DQ-07 | Player sem `wikidataId` e sem `sourceRef` | bloqueia |
| DQ-08 | Club `verified` exige `countryId` | bloqueia |
| DQ-09 | Trajetória elegível (CAREER_PATH §5) com clube `verificationStatus != verified` | bloqueia desafio |

## 3. Normalização de nomes

Função única em `packages/engine/src/text/normalize.ts` (reutilizada por import, busca e testes):

```ts
export function normalizeName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // remove diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')      // pontuação → espaço
    .replace(/\s+/g, ' ')
    .trim();
}
```

Casos de teste obrigatórios: "Zé Roberto" → "ze roberto"; "Müller" → "muller"; "O'Neil" → "o neil"; "Ronaldinho Gaúcho" → "ronaldinho gaucho"; "  Kaká  " → "kaka"; "R9" → "r9".

Busca: `PlayerAlias.normalized` com prefixo por token (`normalized LIKE 'q%' OR normalized LIKE '% q%'`), limite 10, ordena por `notabilityTier` e depois `isPrimary`. Índice trigram (`pg_trgm`) só se a busca por prefixo ficar lenta (>50 ms com 10k aliases).

## 4. Notability tier

| Tier | Critério editorial | Uso |
|---|---|---|
| T1 | Ídolo nacional/global, reconhecido por qualquer fã | Daily (dificuldade 1) |
| T2 | Conhecido por fãs regulares de Brasileirão/seleção | Daily |
| T3 | Conhecido por fãs atentos | Daily (dificuldade 3) |
| T4 | Nicho | Practice só |

Atribuído manualmente. Sem fórmula automática no MVP.

## 5. Relatórios editoriais

- Tentativas rejeitadas por busca sem resultado (`search_no_result` em analytics): candidatos a alias faltante.
- Palpites errados mais frequentes por desafio de Grid: candidatos a jogador faltante no pool (erro de dado) ou a confusão legítima.
- Spells `imported` por player `verified` (inconsistência).

## 6. Baseline

Spot-check de 2026-11-05 (`scripts/research/wikidata-spotcheck.ts`, resultado em `scripts/research/spotcheck-result.json`):

- Jogadores com cidadania brasileira (P27=Q155), ocupação futebolista e ao menos um P54: **10.258**.
- Desses, com data de início (P580) em **todas** as passagens: **4.885 (47,6%)**.
- Amostra fixa de 20 nomes: **20/20** encontrados; passagens em clubes (sem seleções): 227, com data de início: **222 (97,8%)**.
- Wikidata × infobox da Wikipédia PT (número de passagens): **9 de 17** comparáveis batem exatamente; diferenças típicas de 1–2 passagens (empréstimos curtos, clubes amadores, retorno contado como passagem separada). Marcelinho Carioca (21 × 12) e Sócrates (8 × 6) são os maiores desvios. 3 páginas sem infobox legível (Falcão, Bebeto, Dida).

Conclusão: a cobertura dos jogadores conhecidos é boa e datada; a granularidade das passagens difere entre fontes, o que justifica a regra da curadoria (ADR-006): só vira `verified` a carreira cuja sequência de clubes concorda entre as duas fontes.

## Relatos de erro dos jogadores (2026-11-06)

Ao terminar uma fase, o jogador pode marcar "Essa fase tem um erro?" (posição, clubes, jogos/gols/anos, resposta certa recusada, outro, com detalhe opcional). Só depois de terminar, para não dar pista. Um relato por jogador por fase (o novo substitui o anterior).

Fila em dois lugares, mesma fonte (`LevelReport`):
- **Painel** `/admin/level-reports`: relatos agrupados por fase, com o jogador da resposta, posições na base e na fase, passagens por clube e a fonte (Wikipedia/Wikidata). Botões "Corrigido" e "Descartar" com o que foi feito.
- **IA curadora** (terminal): `scripts/research/reports.ts list` dá o mesmo conteúdo em JSON. Fluxo: conferir nas fontes (`Player.notes` tem a página da Wikipedia), corrigir `Player`/`CareerSpell`, substituir a fase no lugar com `scripts/research/replace-level.ts <modo> <fase> "<motivo>"` e fechar com `reports.ts resolve <id> fixed "<o que foi feito>"`.

## Auditoria de Carreira e Mais ou Menos (2026-11-11)

O que o jogador vê nas duas trilhas foi auditado contra as fichas da Wikipédia (ligações de cada célula de clube para o Wikidata) e corrigido na base, de forma reproduzível:

- **Nomes de clube**: nomes jurídicos ("Futbolniy Klub Shakhtar" → "Shakhtar Donetsk"), lixo de wiki ("Pachuca| caps2 =", "AP Leamington cite news"), nome de outro clube (Celta aparecia como "Real Valladolid", Levante como "Desportiva Ferroviária", Marília como "Atlético Paranaense") e times B/sub/feminino sem o sufixo ("Tottenham B" era a base do Tottenham, agora "Tottenham Sub-23").
- **Passagem no clube errado**: o curador antigo casava nomes por palavra solta, então "Barcelona" caía no Barcelona B, "Atlético de Madrid" no Real Madrid Castilla, "Manchester City" no Manchester United, "São Caetano" no São Paulo. A passagem volta ao clube para o qual a célula da ficha aponta (`curate.ts` agora usa a ligação da célula e nunca casa um time principal com um time reserva). Carreiras com clube fundido ou faltando (Tevez sem o City, Valverde sem o Real Madrid) foram refeitas pela ficha em inglês.
- **Base dos números**: a ficha em português mistura liga e todas as competições (Eusébio: 472 gols pelo Benfica em todas, 317 na liga). Jogos e gols agora são **só da liga**, pela ficha em inglês (convenção do modelo de lá). O Mais ou Menos só usa passagens confirmadas assim.
- **Mais ou Menos**: duelo só entre dois jogadores do mesmo clube (Keegan no Scunthorpe contra Lampard no City eram duas perguntas diferentes); sem time reserva; sem jogador cujo nome é de outro mais famoso ("Marcelo" do Wisła); nenhum duelo repetido entre fases.
- **Empréstimos** listados como transferência foram marcados como empréstimo quando a ficha em inglês os marca.

Ferramentas (`scripts/research/`):

- `fetch-infoboxes.ts <saida.json>`: baixa, em lotes, a ficha usada pelo curador e a em inglês de cada jogador verificado, com o Wikidata de cada célula de clube.
- `audit-live-data.ts`: confere as 400 fases de Carreira (fase igual à base, nome de clube, time reserva, passagens sobrepostas); sai com erro se houver problema. Com `--infoboxes … --propose …` deriva as correções; `--manual` e `--careers` recebem as decisões revisadas.
- `live-data-fixes.json`: as correções revisadas (cada uma com o valor esperado antes).
- `fix-live-data.ts`: aplica o JSON e substitui no lugar as fases afetadas (Carreira: mesma resposta; Mais ou Menos: `publish-higher-lower.ts --replace-unfair`). Idempotente; `--dry` só lista.
- `publish-higher-lower.ts --replace-unfair --dry`: lista as fases de Mais ou Menos fora das regras.

### Segunda rodada (2026-11-11)

`live-data-fixes-2.json`, aplicado por `fix-live-data.ts --fixes live-data-fixes-2.json`. Uma rodada posterior sempre vence: rodar de novo a primeira não desfaz a segunda.

- Empréstimo do Coutinho ao Espanyol (2012, da Inter); Lekhwiya aparece como Al-Duhail; St. Louis Strikers (era mostrado como o time universitário); Western United da Austrália (Berisha estava no clube das Ilhas Salomão).
- Os times reserva que a primeira rodada deixou em dúvida foram resolvidos pela ficha em inglês: 13 carreiras refeitas (Negredo, Postiga, Joselu, Llorente, Füllkrug, Konaté, Mikautadze, Huijsen, Diomandé, Vítor Ferreira, Evaldo, Almunia, Goikoetxea); os demais estão certos (times femininos, Mallorca B, Castilla de Benítez, Chicago Fire Sub-23).
- Nome repetido entre jogadores verificados: todos menos o único mais famoso ganham o clube principal ("Alex (Coritiba)"); o mesmo clube, também o ano de nascimento.
- Números da liga: a primeira rodada somava células da ficha em inglês fora dos anos da passagem (Friaça 432 jogos pelo Vasco em 1946-49); essas voltam ao valor da fonte e saem do Mais ou Menos. Células sem ligação agora contam quando o texto nomeia o clube. Os que seguem sem confirmação estão em `live-data-unconfirmed.json`, por motivo.
- País dos clubes conferido com o Wikidata (`check-club-countries.ts`): nenhum divergente.
- Mais ou Menos com rampa de fama (jogador e clube; fama do clube = jogadores T1/T2 que passaram por ele): fases 1–20 só T1 contra T1 em clubes de fama ≥ 30; 21–50 até T2 em fama ≥ 20; 51–80 até T3 em fama ≥ 8; depois todos em fama ≥ 3.

### Quem fez mais? parelho (2026-11-11)

Duelo bom é duelo disputado. Além da diferença mínima (≥ 5 e 40%, por causa da base liga × todas as competições), o maior número fica no máximo 2,5× o menor nas fases 1–20, 2× nas 21–60 e 1,8× depois (`evenDuel` em `higher-lower-snapshot.ts`, conferido na validação com o `level` dos parâmetros). Gols só entre jogadores da mesma posição, nunca goleiro, 5+ gols cada (`comparableGoals`); jogos, qualquer posição. Fases 1–20: um T1 contra um T1 ou T2 nos clubes de fama ≥ 30 (T1 contra T1 só dá uns 45 duelos parelhos, não os 100 dessas fases). `publish-higher-lower.ts --replace-unfair [--dry]` refaz no lugar as fases fora da regra; os duelos das fases refeitas voltam a poder ser sorteados.
