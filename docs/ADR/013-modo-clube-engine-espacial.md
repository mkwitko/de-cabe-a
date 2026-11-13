# ADR-013 — Modo Clube: engine de partida espacial, em dois níveis de fidelidade

Status: aceito pelo dono em 2026-11-13 (specs aprovadas, MC-010). Substitui a decisão "simulação por lances" de `docs/superpowers/specs/2026-11-12-modo-clube-design.md`.

## Contexto
O dono pediu uma partida em que 22 jogadores se movem num campo contínuo, cada um decidindo por conta própria, e em que toda instrução tática muda o resultado. O desenho anterior (lista de eventos sorteados por posse) não sustenta isso: não existe espaço, logo não existe "lateral deixou as costas livres".

Restrição que o pedido não resolve: uma temporada tem milhares de partidas (as quatro divisões nacionais, mais copas e estaduais quando entrarem; ADR-016). Simular todas com 22 agentes custa minutos de processador por temporada e por carreira, num produto grátis.

## Decisão
1. **Pacote novo `packages/match-engine`**, TypeScript puro, sem React, DOM, Fastify ou relógio. Não segue o contrato `GameEngine` de `packages/engine/src/contract.ts`: aquele contrato é de fase de quiz (palpite, pontuação, texto de compartilhar) e não se aplica.
2. **Nível 1, espacial**: campo de 105 × 68, 22 agentes e bola com posição e velocidade, passo fixo de simulação, decisão por utilidade. Usado só nas partidas do clube do usuário.
3. **Nível 2, engine por posses** (decisão do dono em 2026-11-13: jogo de rival não pode ser sorteio de placar). As demais partidas do dia são simuladas lance a lance, sem coordenadas contínuas: a partida é uma sequência de posses que avançam por zonas do campo; cada avanço, drible, cruzamento, finalização e defesa é uma disputa entre jogadores nomeados, com os mesmos atributos, funções, plano tático, fôlego, moral e familiaridade do nível 1. O treinador rival troca jogador e plano durante o jogo. Saída: placar, autores e assistências, finalizações com `xG`, cartões, lesões, minutos e nota por jogador. Custo-alvo: até 2 ms por partida.
4. **Os dois níveis são calibrados um contra o outro.** Teste obrigatório: para os mesmos dois times e planos, as distribuições de placar, finalizações, posse, `xG` e cartões do nível 2 são equivalentes às do nível 1 pelo protocolo de `TEST_STRATEGY.md` §2.1 (conjuntos separados de calibragem e validação, margens congeladas antes, teste de equivalência por dois testes unilaterais, cinco grupos de métricas, matriz de confrontos). Não se exige equivalência causal exata: o nível 2 tem testes próprios de coerência tática, em que cada instrução move a métrica que declara no sentido declarado, sem compromisso com o tamanho do efeito do nível 1. Sem esses testes verdes o nível 2 não entra.
5. O que o nível 2 não tem: posição contínua, replay em campo e explicação espacial ("as costas do lateral"). Tem relatório de jogo por setor e por jogador.
6. **Determinismo**: gerador pseudoaleatório próprio com semente; só `+ − × ÷` e `Math.sqrt` no caminho da simulação (resultado igual em qualquer motor JavaScript); funções transcendentais por tabela. Partida = `versão da engine + semente + estado inicial + lista de comandos`.
7. **Sem ajuste escondido**: nenhuma trava de goleada, nenhuma compensação de placar, nenhum bônus contra ou a favor do usuário. A meta "70% força, 30% sorte" sai do desenho; fica a calibragem contra dados reais.
8. **Revisão 4 (2026-11-13).** (a) Os dois níveis compartilham um núcleo de regras (`rules/`: atributos, disputas, `xG`, fôlego, árbitro, lesão, eventos, explicação) e diferem só no executor espacial; cópia de fórmula no nível 2 é proibida por teste. (b) O nível 1 tem relógios separados de física, decisão, percepção e coordenação, com contato da bola resolvido de forma analítica dentro do passo (`02-MATCH-ENGINE.md` §2). (c) A coordenação coletiva é feita por atribuição de tarefas no nível do time, com custo por tempo de chegada (`02` §4.1 e §5.11), e precisa passar numa prova de coordenação (MC-246) antes de a tabela de instruções crescer.

## Consequências
- O plano `docs/superpowers/plans/2026-11-12-modo-clube-etapa-1-pacote-de-dados.md` continua válido para dados; a lista de atributos cresce (ver `docs/GAME_DESIGN/MODO_CLUBE/03-JOGADORES-E-BASE.md`).
- Dois modelos para manter. O teste do item 4 é o que impede que divirjam.
- Medição de 2026-11-13 (sandbox: só âncoras, movimento e bola por roteiro, sem decisão nem disputa; máquina de desenvolvimento, Node 24.12, um núcleo, média de 20 partidas; detalhes em `02-MATCH-ENGINE.md` §11): 94 ms por 90 minutos. A engine completa custará várias vezes isso; a meta de 150 ms não se sustenta. Nova meta para a partida do usuário: até 1 s por 90 minutos. Com milhares de partidas por temporada (o número exato vem do pacote, ADR-016), isso confirma que o nível 1 não serve para o mundo inteiro.

## Alternativas
- Só eventos (desenho anterior): barato, mas tática vira enfeite. Rejeitado pelo dono.
- Espacial em todas as partidas: fiel, custo de servidor proibitivo.
- Espacial no navegador do usuário (Web Worker): custo zero de servidor, mas o cliente decidiria o resultado. Rejeitado (regra de segurança do projeto).
