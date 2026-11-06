# ADR-009 — Modo contra o relógio

Status: aceito (2026-11-06).

## Contexto
O autor quer um timer nas respostas. O público joga no celular, em sessões curtas e com interrupções; um relógio obrigatório puniria quem é interrompido.

## Decisão
- **Dois modos por fase**: sem relógio (padrão, o atual) e **contra o relógio** (opcional, escolhido antes de começar a fase).
- **Sem relógio**: o tempo da fase é medido e mostrado só como informação (resultado e texto de compartilhamento). Não muda estrelas nem pontos.
- **Contra o relógio**: limite por fase (valores iniciais: Career Path 90 s, Grid 180 s). Quando o tempo acaba, a fase termina com o que foi acertado. Ranking próprio do modo.
- **O servidor mede o tempo** (início gravado na tentativa, cada ação carimbada no servidor); o relógio da tela é só visual. Uma tentativa por fase por modo.

## Consequências
`Attempt` ganha o modo e o prazo; a engine continua pura (o servidor fecha a tentativa vencida). Os números do limite são ajustados no piloto.
