# ADR-009 — Modo contra o relógio

Status: aceito (2026-11-06).

## Contexto
O autor quer um timer nas respostas. O público joga no celular, em sessões curtas e com interrupções; um relógio obrigatório puniria quem é interrompido.

## Decisão
- **Dois modos por fase**: sem relógio (padrão, o atual) e **contra o relógio** (opcional, escolhido antes de começar a fase).
- **Sem relógio**: o tempo da fase é medido e mostrado só como informação (resultado e texto de compartilhamento). Não muda estrelas nem pontos.
- **Contra o relógio**: limite por fase (valores iniciais: Career Path 90 s, Grid 180 s). Quando o tempo acaba, a fase termina com o que foi acertado. Ranking próprio do modo.
- **O servidor mede o tempo** (início e prazo gravados na tentativa; ação depois do prazo + 2 s de folga encerra a fase); o relógio da tela é só visual.
- **Uma tentativa por fase, não por modo**: o modo é escolhido uma vez, antes de começar. Jogar de novo contra o relógio depois de ver a resposta seria replay.
- Ranking contra o relógio: estrelas das fases jogadas nesse modo; empate desfeito pelo menor tempo total.

## Consequências
`Attempt` ganha `timed` e `deadlineAt`; a engine continua pura: o Career Path ganhou a jogada `give_up` (fim sem acerto) e o Grid já tinha `finish`, que o servidor usa quando o prazo vence. Os números do limite são ajustados no piloto.
