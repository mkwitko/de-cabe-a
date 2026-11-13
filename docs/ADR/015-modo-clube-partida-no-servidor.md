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
