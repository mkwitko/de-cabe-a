# ADR-015 — Modo Clube: partida calculada no servidor em trechos, campo 2D no cliente

Status: aceito pelo dono em 2026-11-13 (specs aprovadas, MC-010). A escolha da biblioteca de desenho depende da prova técnica MC-023.

## Contexto

O usuário pode só ver o placar, assistir à partida ou intervir (instrução, substituição, grito). O resultado não pode ser decidido pelo navegador. O projeto não tem WebSocket e não precisa ganhar um por causa disso.

## Decisão

1. **O servidor é a única autoridade.** O cliente envia comandos; nunca envia placar, posição ou estado.
2. **Partida em trechos por HTTP.** `POST /v1/manager/match/:id/advance { até: minuto | 'fim', comandos: [...] }` simula do ponto atual até o limite pedido e devolve os quadros daquele trecho (posições a 4 Hz, quantizadas em inteiros, mais eventos). O cliente reproduz o trecho com interpolação. Para intervir, o usuário pausa; o comando vai no pedido do trecho seguinte e vale a partir do instante da pausa.
3. **Três modos, um caminho de código**: rápido = um pedido `até: 'fim'` sem quadros; acompanhado = o mesmo pedido com quadros; interativo = vários pedidos com comandos. Sem comando, os três dão o mesmo placar (teste).
4. **Persistência**: semente, estado inicial, comandos com instante, placar e estatísticas finais. Quadros não são guardados; replay = simular de novo com a mesma versão da engine. Versões antigas da engine ficam no repositório enquanto houver partida gravada nelas ou o replay delas é desligado (decidir em MC-067).
5. **Desenho**: pacote `apps/web/src/games/manager/match-view`. Candidata: PixiJS 8 com `@pixi/react`. Só entra se a prova técnica mostrar ganho medido sobre `<canvas>` 2D puro num celular intermediário (22 círculos, bola, linhas e setas são pouca coisa; canvas puro pode bastar e não adiciona dependência). Coordenadas de jogador nunca passam por estado do React.
6. **Limites**: uma partida aberta por carreira; trecho mínimo de 1 minuto de jogo; no máximo 40 comandos por partida; limite de taxa na rota.

## Consequências

- Sem infraestrutura nova (sem WebSocket, sem fila).
- Latência de um pedido a cada pausa; aceitável porque a intervenção já pede pausa.
- Tamanho do trecho: 90 minutos a 4 Hz × 23 objetos × 2 inteiros ≈ 1 MB bruto; com delta e gzip, medir. Se passar de 300 KB, cair para 2 Hz.

## Alternativas

- WebSocket com fluxo contínuo: intervenção sem pausa, mas infraestrutura e estado de conexão novos.
- Simular no navegador e validar no servidor repetindo a simulação: dobra o custo e exige determinismo entre motores em tudo.

## Medição preliminar (2026-11-16, emulada, não substitui MC-030)

Campo 2,5D em `<canvas>` 2D puro (`apps/web/src/games/manager/pitch.ts`), Chromium sem GPU via Playwright (Pixel 7), média de 4 s de partida a 8×:

| Largura  | CPU           | Média | Quadro p95 |
| -------- | ------------- | ----- | ---------- |
| 360 px   | 1×            | 60    | 60         |
| 360 px   | 4× mais lenta | 60    | 60         |
| 360 px   | 6× mais lenta | 57    | 60         |
| 1.280 px | 1×            | 59    | 60         |
| 1.280 px | 4× mais lenta | 44    | 30         |

O script do quadro gasta cerca de 5% do tempo; o resto é rasterização em software do navegador sem GPU, então o número de 1.280 px com CPU lenta é pessimista. O piso de 30 quadros se manteve. PixiJS continua sem motivo para entrar. MC-030 segue aberta: falta medir num celular intermediário real.

## Revisão (2026-11-16): simulação fora da linha da API e partida viva

**Problema medido.** Cada trecho simulava do pontapé inicial até o tique pedido, na linha principal do Node. Um trecho do fim do jogo custava quase uma partida inteira (1 a 5 s, conforme a carga da máquina), e nesse tempo a API não respondia a mais ninguém. Os melhores momentos simulavam a partida inteira num pedido só.

**Decisão.**

1. **Simulação em processos auxiliares** (`apps/api/src/modules/manager/match-pool.ts`): um `worker_threads` por núcleo menos um. A mesma partida (semente, clubes e planos) vai sempre para o mesmo processo. Fila de até 8 pedidos por processo; acima disso, 503 na hora em vez de deixar todos lentos. A linha principal da API não simula mais.
2. **Partida viva** (`packages/match-engine/src/match/live.ts`, `advanceLiveMatch`): o processo mantém o estado da partida entre trechos e guarda uma cópia a cada minuto de jogo. O trecho seguinte custa só os seus tiques. Um comando que o estado ainda não viu volta à última cópia antes dele, então a pessoa muda o plano no minuto que está na tela mesmo com o servidor adiantado. Cópias compartilham os eventos já fechados; uma cópia custa ~2 ms em vez de ~30 ms.
3. **O pedido continua puro.** A partida viva é só um atalho: o mesmo pedido dá a mesma resposta que simular do zero (teste `live.test.ts`). Se o processo cair ou descartar a partida (até 40 vivas por processo, a mais antiga sai), o pedido seguinte simula do zero e responde igual.
4. **Melhores momentos lance a lance** (`POST /v1/manager/friendly/moment`): o servidor simula só até o próximo lance terminar e devolve os quadros dele. O cliente pede o seguinte enquanto mostra o atual e pode mudar o plano entre lances, como na partida completa. Os lances saem iguais aos do corte da partida inteira (teste `match-jobs.test.ts`).
5. O item 2 da decisão original muda: intervir não exige mais pausa.

**Medição (máquina de desenvolvimento com carga alta, aquecida).** Partida inteira em trechos de 1 minuto: ~1,3 s no total, contra a soma quadrática de antes. Comando 1 minuto atrás no fim do jogo: ~60 ms. Seis simulações de fim de jogo ao mesmo tempo: `/v1/health` continuou em ~0,2 s, o mesmo tempo de quando o servidor está parado.

**Limites conhecidos.** Uma partida viva ocupa alguns MB, quase tudo cópias. Com vários servidores, o balanceador precisa mandar a mesma partida ao mesmo servidor. Se não mandar, o pedido continua correto, só que mais caro. A partida de fundo da carreira continua no nível 2 (MC-046), sem quadros.
