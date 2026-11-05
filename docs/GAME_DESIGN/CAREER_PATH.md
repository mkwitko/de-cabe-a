# Game Design — Career Path

> **Revisão 2026-11-05 (ADR-007):** daily e treino foram substituídos pela trilha de fases. §11 (Daily vs Practice) e a regra dos 180 dias (§5) não valem mais: cada jogador é resposta de no máximo uma fase; uma tentativa por fase; estrelas 0–3 (acerto em 1–2 = 3, 3–4 = 2, 5–6 = 1). Share: `De Cabeça · Career Path · Fase N · 3/6` + quadrados + estrelas.

Versão da engine: `career-path@1`. Toda regra aqui é **obrigatória** para a v1, salvo seção "Sugestões".

## 1. Regras

1. O sistema escolhe um jogador (definido no snapshot do desafio).
2. A trajetória profissional é uma lista ordenada de clubes (ver §4). Só o primeiro clube está visível no início.
3. O usuário tem **6 tentativas**. Cada tentativa é um palpite (jogador escolhido por autocomplete) **ou** um "pular" explícito.
4. Palpite errado ou "pular" revela o próximo clube da lista (se houver). Palpite certo encerra com vitória.
5. Após 6 tentativas sem acerto, derrota. A trajetória completa e o jogador são revelados.
6. Se a trajetória tiver menos clubes que tentativas restantes, as tentativas excedentes continuam sem revelar nada novo (pista adicional opcional em §3).
7. Não há limite de tempo.

Por que 6: igual ao padrão Wordle (familiar), e permite trajetórias de 4 a 8 clubes com tensão. Diferente do Grid (9) porque as mecânicas diferem; não há motivo para igualar.

## 2. Fluxo do usuário

```text
Home → card "Career Path" (estado do daily) → tela do jogo
  → vê clube 1 → digita no campo (autocomplete, mín. 2 chars) → seleciona jogador → Enviar
  → feedback: ERROU (revela clube 2) | ACERTOU (resultado)
  → ... → tentativa 6 → resultado
Resultado → copiar texto de compartilhamento | jogar Practice | ver histórico
```

## 3. Pistas

- Pista principal: clube da trajetória, em ordem cronológica, um por tentativa.
- Cada clube revelado mostra: nome do clube, país (bandeira) e período (anos: "1993–1994"). Se o spell for empréstimo, marcar "(emp.)".
- Pista extra (somente quando a trajetória já foi totalmente revelada e ainda há tentativas): posição principal. Se ainda sobrar tentativa: nacionalidade. Ambas opcionais no snapshot (`extraHints`).
- Nenhuma pista revela nome, apelido, número de camisa ou foto.

## 4. Montagem da trajetória (regras de dados)

A trajetória do desafio é derivada dos `CareerSpell` do jogador no momento da criação do snapshot:

- Somente spells com `verificationStatus = verified` e `spellType in (professional, loan)`. Categoria de base (`youth`) **excluída**.
- Ordenação: `startDate` ascendente; empate por `endDate`; empate persistente por `sortIndex` manual.
- Empréstimos aparecem como entrada própria, marcados `(emp.)`. Um retorno ao clube de origem após empréstimo **não** gera nova entrada se o spell original ainda estiver aberto (spell contínuo). Se a fonte registra dois contratos separados, gera duas entradas.
- Passagem repetida pelo mesmo clube em contratos distintos = duas entradas, na posição cronológica de cada uma.
- Spells sobrepostos (historicamente possíveis, ex.: cessão parcial) mantêm ordem por `startDate`.
- Datas incompletas: `datePrecision` (year|month|day). Exibição usa só anos. Ordenação usa a data normalizada (ano incompleto → 1º de janeiro) e `sortIndex` resolve empates.
- Seleção nacional **não** entra na trajetória (não é clube).

## 5. Elegibilidade do jogador para desafio

Um jogador só pode ser sorteado/escolhido se:

- `Player.verificationStatus = verified`.
- Trajetória resultante tem **≥ 3 e ≤ 12** clubes.
- Nenhum spell da trajetória com `verificationStatus != verified`.
- Jogador não foi usado em daily de Career Path nos últimos **180 dias**.
- `Player.notabilityTier` ∈ {1, 2, 3} (ver `DATA_QUALITY.md`); tier 4 só em Practice.

## 6. Entrada do usuário e normalização

- Input é `playerId`, escolhido via `GET /players/search?q=`. O cliente não envia texto livre como palpite.
- Busca server-side normaliza `q` e os aliases: NFD → remove diacríticos → minúsculas → remove pontuação → colapsa espaços. Ex.: "Zé Roberto" → "ze roberto". Match por prefixo em tokens ("rob" acha "Roberto Carlos", "Zé Roberto").
- Aliases cobrem: nome canônico, nome completo, apelido(s), grafias alternativas. Dois jogadores com mesmo alias aparecem ambos no autocomplete, com desambiguação (ano de nascimento + clube marcante).
- Palpite com `playerId` inexistente → erro 400. Palpite repetido do mesmo jogador na mesma partida → erro 409 (`DUPLICATE_GUESS`), não consome tentativa.

## 7. Estados da partida

```text
IN_PROGRESS ──(acerto)──▶ WON
     │
     └──(6ª tentativa errada ou skip)──▶ LOST
```

Não existe estado "abandonado" persistido. Partida `IN_PROGRESS` do daily de ontem fica como está (contabiliza como não concluída nas estatísticas, não quebra streak porque streak conta dias com **conclusão**).

## 8. Pontuação

```text
score = WON ? (7 - attemptsUsed) * 10 : 0     // attemptsUsed ∈ 1..6 → 60,50,40,30,20,10
```

- Determinística, sem tempo, sem dificuldade no MVP.
- "Pular" conta como tentativa usada.
- Resultado compartilhável mostra `attemptsUsed/6` (ou `X/6`).

Dificuldade e raridade não entram na pontuação da v1. Motivo: sem baseline de dados de jogo, qualquer peso seria inventado; o campo `difficultyTier` fica no snapshot para análise.

## 9. Dificuldade (editorial, não afeta score)

`difficultyTier` 1–3 definido pelo editor no painel, com sugestão automática: tier 1 se `notabilityTier=1` e ≤ 5 clubes; tier 3 se `notabilityTier=3` ou ≥ 9 clubes; senão 2. Daily deve alternar tiers na semana (sugestão: seg–qua tier 1–2, qui–sáb 2–3, dom 1).

## 10. Desempates

Não há ranking entre usuários no MVP; sem desempate necessário.

## 11. Daily vs Practice

| | Daily | Practice |
|---|---|---|
| Seleção | `Challenge` publicado para a data | Aleatório entre `Challenge` com `kind=practice` e status `published`; exclui os últimos 20 jogados pela sessão (se não sobrar nenhum, sorteia entre todos; rejogar é permitido) |
| Tentativas por sessão | 1 | Ilimitadas; partida `IN_PROGRESS` é retomada antes de sortear outra |
| Streak | Sim | Não |
| Share | "Career Path #123" | "Career Path (treino)" |

## 12. Compartilhamento (sem spoiler)

```text
De Cabeça · Career Path #123 · 3/6
⬛⬛🟩
decabeca.app/c/123
```

Um quadrado por tentativa: ⬛ erro/pular, 🟩 acerto. Derrota: `X/6` e seis ⬛. Nunca inclui clubes nem nome.

Domínio `decabeca.app` é placeholder (Q3 em `PRD.md`).

## 13. Casos extremos

| Caso | Regra |
|---|---|
| Jogador com um clube só na carreira | Inelegível (§5) |
| Trajetória de 3 clubes e 6 tentativas | Tentativas 4–6 mostram pistas extras (§3) ou nada |
| Dois jogadores homônimos | Autocomplete desambigua; `playerId` decide |
| Submissão duplicada (mesma idempotency key) | Retorna o mesmo resultado, não consome tentativa |
| Submissão após `WON/LOST` | 409 `GAME_ALREADY_COMPLETED` |
| Desafio do dia ainda não publicado | 404 `NO_DAILY_CHALLENGE`; home mostra estado vazio |
| Virada do dia durante partida | Partida continua vinculada ao desafio original |
| Correção de dado após publicação | Desafio publicado não muda (ADR-002); editorial pode `retire` com motivo; attempts preservados |

## 14. Critérios de publicação (checklist do editor)

- [ ] Jogador elegível (§5), checagem automática.
- [ ] Trajetória revisada visualmente pelo editor (ordem, empréstimos, anos).
- [ ] Pelo menos 2 aliases além do canônico para jogadores conhecidos por apelido.
- [ ] `difficultyTier` definido.
- [ ] Snapshot gerado e validado pela engine (`validateConfig` sem erro).
- [ ] Data do daily sem conflito (unique por `gameMode + date`).

## 15. Sugestões (não obrigatórias)

- Modo "hardcore" com 4 tentativas (pós-MVP).
- Bônus de raridade (pós-MVP, exige dados de jogo).
