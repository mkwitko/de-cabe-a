# ADR-020 — Modo Clube: carreira solo simulada no navegador, mundo guardado como decisões e fotografias

Status: aceito pelo dono em 2026-11-17. Ele aprovou a carreira solo no navegador e o registro desta medição (MC-201). Revisa o ADR-014 (onde guardar o mundo) e, só para a carreira solo, o item 1 do ADR-015 (o servidor como única autoridade).

## Contexto

O dono quer milhares de carreiras ativas ao mesmo tempo, com multiplayer e campeonatos depois. Na carreira solo, cada carreira tem o próprio mundo: 156 clubes e 3.900 jogadores no pacote fictício grande, e cerca de 4.000 partidas por temporada num mundo brasileiro real (estimativa somando séries, copas e estaduais). O custo cresce em linha reta com o número de carreiras.

Os jogos do gênero (Championship Manager, Football Manager, Brasfoot) rodam inteiros no computador do jogador e só têm detalhe onde a pessoa olha:

- ligas jogáveis, só para consulta ou não carregadas;
- partida detalhada só quando alguém assiste;
- salvamento periódico, não a cada dia.

Os jogos online de escala (Hattrick, Top Eleven) simulam no servidor, mas em rodadas marcadas e em lote.

## Medição (MC-201, 2026-11-17, máquina de desenvolvimento com carga alta)

Scripts:

- `packages/club-domain/src/bench/world.ts`: temporada dia a dia, roda em Node e no navegador.
- `apps/api/src/bench/mc201-storage.ts`: Postgres local, esquema próprio apagado no fim.

Pacote `br-dev-1`: 156 clubes, 3.900 jogadores, 1.586 partidas em 98 dias de jogo.

**Tamanho do mundo**

| Parte | JSON | zstd |
|---|---|---|
| Pacote inteiro (95 % são jogadores com 54 atributos) | 6,7 MB | 659 KB |
| Estado da temporada (tabelas, chaves, calendário) | 0,55 a 0,86 MB | 43 KB |
| Jogadores como diferença binária sobre o pacote, depois de uma temporada | — | 81 KB |

**Avançar uma temporada com placar estatístico (nível 3), sem a engine**

| Onde | Temporada inteira | Dia mais caro |
|---|---|---|
| Node, um núcleo | 14 a 21 ms | 2,5 a 5 ms |
| Chromium sem limite | 14 ms | 3 ms |
| Chromium com CPU 4× mais lenta (celular médio) | 73 ms | 24 ms |
| Chromium com CPU 6× mais lenta (celular fraco) | 111 ms | 29 ms |

Ler o pacote JSON no navegador leva 10, 44 e 124 ms, respectivamente.

**Postgres: um avanço de dia por carreira**

Três rodadas; os valores variam com a carga. A vazão é com 16 carreiras avançando ao mesmo tempo.

| Opção | Gravação por avanço | Avanço p50 | Abrir carreira p50 | Avanços por segundo | Espaço por carreira |
|---|---|---|---|---|---|
| A. Documento inteiro | 702 KB | 29 a 51 ms | 14 a 31 ms | 46 a 157 | 0,7 MB |
| A2. Documento compacto (temporada + diferença dos jogadores) | 124 KB | 5 a 19 ms | 3 a 6 ms | 74 a 1.127 | 0,12 MB |
| B. Uma linha por jogador, 576 atualizadas por dia | ~576 linhas | 19 a 84 ms | 52 a 91 ms | 10 a 258 | 6,3 MB |
| C. Documento partido (temporada por dia, jogadores por semana) | 43 KB, às vezes 124 KB | 3 a 6 ms | 2,5 a 4 ms | 368 a 1.278 | 0,12 MB |
| D. Decisão por dia em linha e fotografia compacta a cada 30 dias | ~100 bytes | 2 a 3,4 ms | 3,6 a 9 ms | 3.193 a 4.123 | 0,12 MB + decisões |

## Decisão

1. **Carreira solo simulada no navegador**, num processo auxiliar da página (Web Worker):
   - o mundo inteiro e a partida da pessoa;
   - a engine é JavaScript puro e determinística, a mesma do servidor.
2. **O servidor guarda decisões e fotografias** (opção D):
   - cada decisão da pessoa é uma linha pequena (escalação, instrução, compra, resposta a carta), com o dia;
   - a fotografia compacta é enviada a cada 30 dias de jogo e ao sair;
   - o estado é a última fotografia mais as decisões depois dela, refeitas com a mesma semente e a mesma versão da engine.
3. **Conferência só quando afeta outros.**
   - **Quando:** ranking, conquista com prêmio, entrada num campeonato.
   - **Como:** o servidor refaz a simulação a partir da fotografia e das decisões, numa fila de baixa prioridade, nos processos auxiliares (ADR-015, revisão).
   - **Fora isso:** trapaça na carreira solo só prejudica a própria pessoa, como num save editado do FM.
4. **Detalhe por liga**, nos dois modos:
   - competições do clube da pessoa: engine por posses (nível 2, MC-046);
   - o resto: placar estatístico (nível 3);
   - engine espacial (nível 1): só a partida que alguém assiste.

   Quanto do mundo carregar pode virar escolha da pessoa ao criar a carreira.
5. **Mundo guardado como diferença sobre o pacote.** O pacote é igual para todos: é baixado uma vez e fica no cache do navegador. A fotografia leva só o que mudou (jogadores em binário, temporada em JSON), com zstd.
6. **Multiplayer e campeonatos no servidor, com rodada marcada.** O servidor é a autoridade, como no ADR-015. A rodada acontece em horário fixo e é simulada em lote numa fila. Uma liga é um mundo só, dividido por todos que jogam nela.
7. **Cópia local e arquivo.** O navegador guarda a última fotografia (IndexedDB) para abrir rápido e jogar com rede ruim. A pessoa pode exportar e importar o save como arquivo; salvar direto no Google Drive fica para depois, como opção, não como lugar principal.

## Capacidade estimada

Premissa: uma temporada jogada em ~5 horas, ou seja, um dia de jogo a cada ~55 s por carreira ativa. Com 10.000 carreiras ativas, isso dá ~180 avanços por segundo.

| | Carreira simulada no servidor, opção A | Carreira no navegador, opção D |
|---|---|---|
| Simulação no servidor | ~4 núcleos com níveis 2 e 3; ~2.700 se tudo fosse nível 1; mais ~47 para as partidas assistidas | perto de zero; só conferências |
| Gravação no banco | ~126 MB/s; não cabe | ~180 linhas pequenas por segundo e ~6 fotografias de 124 KB por segundo; cabe num Postgres pequeno (a máquina de teste fez 3.000 por segundo) |
| Espaço para 1 milhão de carreiras guardadas | ~700 GB | ~120 GB mais as decisões |

## Consequências

- **No navegador do jogador:**
  - o código da engine e do domínio vai para o navegador e pode ser copiado;
  - a primeira abertura baixa o pacote (~660 KB comprimido);
  - num celular fraco, uma temporada com o nível 2 estimado (2 ms por partida no desktop, ~6× mais lento) leva ~20 s, espalhados pelos dias jogados.
- **Conferência:** precisa que a mesma versão da engine rode no servidor e no navegador. Versões antigas ficam no repositório enquanto houver save nelas (como no ADR-015, item 4).
- **Dinheiro e livro-caixa:** na carreira solo, o livro-caixa (`ClubLedgerEntry`, ADR-014) passa a ser reconstruído a partir das decisões. Ele continua sendo a única origem do saldo, mas é gravado em linhas só quando conferido. Multiplayer mantém as linhas no servidor.
- **Tabelas da MC-081:** continuam:
  - `ClubWorld` e `ClubCareer` servem aos dois modos;
  - `ClubWorld.data` passa a ser a fotografia compacta;
  - as decisões ganham tabela própria quando a carreira no navegador for implementada.

## Alternativas

- **Carreira no servidor com documento inteiro (A) ou relacional (B):** medidas acima; custo de gravação e espaço alto demais para milhares de carreiras.
- **Documento partido no servidor (C):** bom no banco, mas mantém toda a simulação no servidor.
- **Save só em arquivo da pessoa ou no Google Drive:** custo zero de armazenamento, mas atrito de login, perda quando a pessoa perde o arquivo, nada entre aparelhos sem o Drive e nenhuma base para conferência. Guardar 120 KB por carreira custa pouco; fica como exportação opcional.
