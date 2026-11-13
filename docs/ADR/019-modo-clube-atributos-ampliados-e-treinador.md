# ADR-019 — Modo Clube: atributos ampliados do jogador e atributos do treinador

Status: proposto, aguarda revisão da lista pelo dono. O dono pediu mais atributos em 2026-11-13 ("acho que quanto mais atributos melhor") mas não viu esta lista; o assistente a montou a partir das pesquisas 15, 16 e 17. Muda o contrato da engine (MC-145) e o esquema do pacote (MC-011).

## Contexto

O jogador tinha 34 atributos (10 técnicos, 11 mentais, 7 físicos, 6 de goleiro) e o treinador só `gameReading` e `flexibility`. As pesquisas do dono pedem separar perceber, decidir e executar; separar passe curto e longo, resistência e recuperação; ter atributos táticos (disciplina, timing, pressão, cobertura) e de criatividade; e um treinador com dimensões independentes (ensinar não é ler o jogo).

## Decisão

1. **Jogador: 34 → 54 atributos**, em seis famílias (escala 1 a 99):
   - Técnicos (14): os 10 atuais (`passing` passa a significar passe curto) + `longPassing`, `longShots`, `weakFoot`, `shielding`.
   - Mentais (14): os 11 atuais + `bravery`, `determination`, `flair` (criatividade e audácia).
   - Perceptivos e táticos (10, família nova): `scanning`, `spatialAwareness`, `tacticalReading`, `bodyOrientation`, `discipline`, `timing`, `pressing`, `covering`, `lossReaction`, `communication`.
   - Físicos (9): os 7 atuais + `recovery` (repetir esforços), `deceleration`.
   - Goleiro (7): os 6 atuais + `sweeping` (sair do gol, cobrir a profundidade).
2. **Treinador: 10 atributos** (escala 1 a 99): `tacticalKnowledge`, `gameReading`, `planning`, `teaching`, `communication`, `development`, `manManagement`, `matchManagement`, `training`, `flexibility`. A engine usa agora: `gameReading` (reação ao placar), `teaching` e `communication` (sincronia coletiva com a familiaridade), `flexibility` (se muda o plano). Os outros entram no corte 1 (treino e desenvolvimento).
3. **Uso na engine** (efeito, não bônus): `longPassing` no erro de lançamento e cruzamento; `longShots` na conversão de chute de longe; `shielding` em proteger a bola no desarme; `scanning` em perceber opções fora do campo visual; `spatialAwareness` e `tacticalReading` em seguir a tarefa coletiva; `flair` no leque de opções criativas (passe em profundidade e nas costas da defesa) e na temperatura da escolha; `discipline` em cumprir a tarefa; `pressing` e `lossReaction` na pressão e na contrapressão; `covering` na tarefa de cobertura; `recovery` na recuperação da fadiga aguda; `deceleration` na meia-volta; `bravery` em bloqueio e bola aérea; `sweeping` na saída do goleiro; `communication` na sincronia do time. `weakFoot` (um quarto dos chutes e passes sai com o pé mais fraco, com erro maior), `bodyOrientation` (domínio limpo sob pressão e menos tempo para decidir), `timing` (corrida de ruptura mais colada à última linha) e `determination` (cansa menos) também têm efeito. Regra: nenhum atributo de jogador sem efeito na partida.
4a. **Atributos de treinador sem efeito ficam ocultos na tela** até ganharem uso: hoje só `gameReading`, `teaching`, `communication` e `flexibility` mudam a partida.
4. **Derivados, não armazenados**: reconhecimento de gatilho, leitura de cobertura, compensação, imprevisibilidade ofensiva e arquétipos são calculados de atributos e familiaridade (pesquisa 17 §6).
5. Pacote, gerador, notas por função e times sintéticos passam a produzir os 54; `ROLE_WEIGHTS` inclui os novos onde pesam (por exemplo, `pressing` e `lossReaction` no atacante de pressão, `covering` e `discipline` no volante de contenção).

## Consequências

- Pacotes antigos deixam de validar; o pacote de desenvolvimento é regenerado. Não há pacote real ainda (ADR-014).
- Calibragem refeita na bancada (`src/calibration/calibrate.ts`).
- Treinador ganha esquema próprio no pacote (`PackStaffSchema` já tem atributos 1 a 20 da comissão; o técnico da partida usa a escala 1 a 99 do contrato da engine, convertida na escalação).
