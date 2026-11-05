# Game Design — Football Grid

Versão da engine: `football-grid@1`.

## 1. Regras

1. Grade 3×3. Três critérios de linha, três de coluna. Cada célula exige um jogador que satisfaça o critério da linha **e** da coluna.
2. **9 tentativas** no total (uma por célula, no padrão Immaculate Grid). Um palpite errado consome uma tentativa e deixa a célula vazia; o usuário pode tentar outra célula, mas o total não muda.
3. Cada jogador pode ser usado **uma vez** por partida.
4. A partida termina quando as 9 tentativas acabam ou as 9 células são preenchidas. Não há "desistir" com estado próprio; o usuário pode encerrar antecipadamente (`finish`), o que consome as tentativas restantes.
5. Sem limite de tempo.

Por que 9 e não 6: a tensão vem da escassez (um erro = uma célula perdida para sempre). Com menos de 9 o grid raramente completa; com mais, perde o sentido.

## 2. Tipos de critério (v1)

| `type` | Parâmetro | Semântica | Fonte |
|---|---|---|---|
| `club` | `clubId` | Teve `CareerSpell` verificado (professional ou loan) no clube | CareerSpell |
| `nationality` | `countryId` | `Player.nationalityCountryId` (primária) ou nacionalidade secundária registrada | Player |
| `position` | `positionGroup` ∈ GK/DF/MF/FW | `Player.primaryPositionGroup` | Player |
| `played_in_country` | `countryId` | Teve spell em clube cujo `Club.countryId` = país | CareerSpell + Club |

Fora da v1: competições vencidas, décadas, seleção nacional, estatísticas numéricas. Motivo: exigem entidades não verificadas no pool inicial.

## 3. Combinações permitidas

- Linha e coluna não podem usar o mesmo `type` com o mesmo parâmetro.
- `club × club`: permitido (clássico). `club × played_in_country` do país do próprio clube: proibido (trivial).
- `position × position`: proibido.
- `nationality × played_in_country` com o mesmo país: proibido (trivial para brasileiros).
- Cada eixo deve ter ao menos um critério do tipo `club`. Motivo: identidade visual (escudos) e dificuldade.

## 4. Pool de respostas (pré-computado)

No momento do snapshot, para cada célula, o sistema calcula `eligiblePlayerIds[]` a partir de dados `verified`. Regras:

- Mínimo **8** respostas elegíveis por célula para `kind=daily`; **5** para `practice`. Abaixo disso, o desafio não valida.
- Máximo: sem limite, mas células com > 200 respostas sugerem critério fraco (aviso editorial).
- Validação em partida é lookup no snapshot. **Nenhuma consulta ao banco de jogadores durante a partida.**
- Jogador só entra no pool se `Player.verificationStatus = verified` e o spell usado é `verified`. Spells `youth` não contam.

## 5. Validação de palpite

Input: `cellIndex` (0–8) e `playerId`.

```text
se partida concluída → 409 GAME_ALREADY_COMPLETED
se célula já preenchida → 409 CELL_ALREADY_FILLED
se playerId já usado nesta partida → 409 PLAYER_ALREADY_USED
se playerId ∈ snapshot.cells[cellIndex].eligiblePlayerIds → correto, célula preenchida
senão → errado, célula continua vazia
attemptsUsed += 1 (nos dois últimos casos)
se attemptsUsed == 9 ou filledCells == 9 → COMPLETED
```

Respostas alternativas: cobertas pelo pool (qualquer jogador elegível é "alternativa"). Aliases resolvidos no autocomplete, nunca na validação.

## 6. Feedback por célula

- Correto: célula mostra nome do jogador e (se houver) foto/placeholder. Verde.
- Errado: animação curta de "x", célula volta a vazia, contador de tentativas decrementa. Não revela por que errou (não diz "ele não jogou no clube X").
- Ao terminar: células vazias mostram **um** exemplo de resposta válida (o `exampleAnswerPlayerId` do snapshot, escolhido pelo editor ou o de maior `notabilityTier`).

## 7. Pontuação

```text
score = filledCells   // 0..9
```

Simples, explicável, sem exploração possível. Raridade de resposta **não** entra na v1 (exigiria contagens de jogo por desafio; registrar `ChallengeAnswerStat` fica como sugestão pós-piloto).

## 8. Dificuldade

`difficultyTier` 1–3 sugerido pela média de `eligiblePlayerIds.length` por célula: ≥ 40 → 1; 15–39 → 2; 8–14 → 3. Editor pode sobrescrever.

## 9. Daily vs Practice

Mesmas regras de `CAREER_PATH.md` §11. Practice exclui os últimos 20 grids da sessão.

## 10. Compartilhamento

```text
De Cabeça · Grid #45 · 7/9
🟩🟩⬛
🟩🟩🟩
⬛🟩🟩
decabeca.app/g/45
```

Não lista critérios nem jogadores.

Domínio `decabeca.app` é placeholder (Q3 em `PRD.md`).

## 11. Casos extremos

| Caso | Regra |
|---|---|
| Palpite para célula fora de 0–8 | 400 |
| Jogador elegível em duas células | Vale onde for usado primeiro; `PLAYER_ALREADY_USED` na segunda |
| Dado corrigido após publicação | Snapshot não muda (ADR-002); editorial pode `retire` |
| Tentativas esgotadas com células vazias | COMPLETED, score = células preenchidas |
| `finish` antecipado | COMPLETED, attemptsUsed = 9 |
| Submissão duplicada (idempotency key) | Mesmo resultado, sem consumo |

## 12. Critérios de publicação

- [ ] Nenhuma combinação proibida (§3), checagem automática.
- [ ] Todas as 9 células com mínimo de respostas (§4), checagem automática.
- [ ] Editor preencheu o grid manualmente uma vez (teste de jogabilidade).
- [ ] `exampleAnswerPlayerId` definido para cada célula.
- [ ] `difficultyTier` definido.
- [ ] Data sem conflito.
