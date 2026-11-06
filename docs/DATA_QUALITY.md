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
