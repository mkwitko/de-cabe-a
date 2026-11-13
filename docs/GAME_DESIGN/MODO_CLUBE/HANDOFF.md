# Modo Clube — passagem de contexto para desenvolvimento

Data: 2026-11-13. Documento para uma sessão nova, sem histórico. Leia inteiro antes de qualquer ação. Ele guarda o que não está nos outros documentos: o que já existe, o que foi decidido em conversa, as armadilhas do ambiente e a ordem de trabalho. O que está nas specs não é repetido aqui; é apontado.

## 1. O que é

O De Cabeça F.C. (decabecafc.com.br) é um site de jogos de conhecimento de futebol, em português do Brasil. O **Modo Clube** é um jogo novo dentro dele: carreira de treinador e dirigente, com partida simulada em campo 2D, tática, elenco, mercado, finanças, comissão e competições brasileiras. Visão completa: `00-VISAO-E-PRODUTO.md`.

O dono do projeto pediu jogo completo e diferenciado, feito por desenvolvimento guiado por especificação: documentos primeiro, depois implementação incremental com teste. As specs foram **aprovadas pelo dono em 2026-11-13** (tarefa MC-010). A fase atual é implementação.

## 2. Ordem de leitura

| Ordem | Documento | Para quê |
| --- | --- | --- |
| 1 | este arquivo | contexto, estado, regras de trabalho |
| 2 | `ROADMAP.md` | cortes, dependências, decisões do dono (§4), quem manda em cada decisão (§7) |
| 3 | `TASKS.md` | lista de tarefas com aceite e teste |
| 4 | `00-VISAO-E-PRODUTO.md` | produto; §6.0 diz o que está ativo no corte 1 |
| 5 | `01-ARQUITETURA.md` | pacotes, fronteiras, modelo de dados, segurança, desempenho |
| 6 | `02-MATCH-ENGINE.md` | engine de partida, tática, explicação, campo 2D |
| 7 | `TEST_STRATEGY.md` | camadas de teste, protocolo de equivalência, zebras, trajetórias |
| 8 | ADR-013 a ADR-017 em `docs/ADR/` | decisões de arquitetura aceitas |
| sob demanda | `03` a `08` | jogadores e base, clube e mundo, competições, comissão e governança, mercado, saúde |
| sob demanda | `docs/pesquisa/modo-clube/01` a `12` | evidência e números com fonte |

Não é preciso ler `03` a `08` nem as pesquisas antes de começar o corte 0,5. Leia a seção que a tarefa da vez citar.

Documentos antigos, substituídos pelas specs desta pasta (não seguir): `docs/superpowers/specs/2026-11-12-modo-clube-design.md` e `docs/superpowers/plans/2026-11-12-modo-clube-etapa-1-pacote-de-dados.md`.

## 3. Decisões do dono (não renegociar)

Tomadas em conversa, em ordem de data; todas refletidas nas specs.

1. Pesquisa profunda e desenvolvimento guiado por especificação. Não reduzir escopo de tática, simulação, formação, economia ou gestão.
2. Sistema genérico de pacotes de dados que aceita CSV e JSON: esquema, normalização, deduplicação, versão, validação, relatório de qualidade, atualização de elencos sem alterar carreiras, separação entre dado mestre e estado da carreira. Sem restrições extras ao formato do importador. A origem dos arquivos de entrada é assunto do dono, tratado à parte.
3. Desenvolvimento com dados fictícios determinísticos.
4. Partida de rival não pode ser sorteio de placar: tem de ser simulada por uma engine (nível 2, por posses).
5. Dois modos de início: escolher qualquer clube, ou receber propostas.
6. Jogadores reais nas quatro divisões nacionais no pacote real; personalidade real para jogadores reais (campos do pacote com origem e confiança, `03` §1.8).
7. Comissão técnica e departamentos como sistema, com a realidade de cada divisão; patrocínio e comercial; estaduais, copas e continentais no modelo, entrando por etapa conforme houver dado.
8. Tradução pronta desde a primeira tela (chaves, nunca texto na engine); celular primeiro, jogável em desktop.
9. Planejar o que vender por dinheiro: só aparência, vagas de carreira, cenários e editor (ADR-017). Nada que dê vantagem.
10. Zebras existem: o time pior pode ganhar na raça, por caminhos legítimos, sem ajuste escondido.
11. Decisões de 2026-11-13 sobre as questões 14 a 19 do roteiro:
    - lançamento com **pacote fictício revisado**; o pacote real vem depois, quando passar no critério de cobertura;
    - "justo" entre nível 1 e nível 2 = mesmas distribuições de resultado e de estatística, sem exigir o mesmo tamanho de efeito por instrução;
    - avanço de um dia: percentil 95 até 1,5 s e 99 até 4 s com rodada cheia; dia sem jogos até 300 ms;
    - dinastia permitida até 40% dos títulos depois do ano 15, sem equilíbrio artificial;
    - imprensa e memória tática ficam fora **num primeiro momento** (podem voltar; o desenho está guardado);
    - o **corte 0,5** (partida avulsa jogável) é a primeira entrega.
12. Design **imersivo e premium** em todo o modo (2026-11-13): `00-VISAO-E-PRODUTO.md` §7.1, tarefa MC-262 antes da primeira tela de produto.

Questões 1 a 13 do roteiro (§4) não foram respondidas uma a uma. Vale a proposta registrada na tabela até o dono dizer o contrário. Nenhuma trava o corte 0,5.

## 4. Limites que não mudam

- **Dados de terceiros.** O assistente não extrai nem converte a base do Football Manager nem outra base proprietária de terceiros. O importador é genérico (CSV ou JSON no formato do pacote); o que entra nele é decisão e responsabilidade do dono (ADR-014 item 2). O jogo inteiro é desenvolvido, testado e lançado com pacote fictício.
- **Modo Carreira de jogador não é tocado**: `docs/GAME_DESIGN/CAREER_MODE.md` e `apps/api/src/modules/career`.
- **Privacidade.** Nome, e-mail e projeto do dono nunca vão em requisição a serviço externo (busca, cabeçalho, URL). Buscas na web são genéricas.
- **Nomes e rotas.** `/clube` já existe no site (é a página de assinatura "O Clube"). O Modo Clube usa `/tecnico/*` na web, `/v1/manager/*` na API, `apps/api/src/modules/manager` e `apps/web/src/games/manager`.
- **Sem ajuste escondido na engine** (ADR-013 item 7): nenhuma trava de goleada, compensação de placar ou bônus para o usuário. A engine não recebe a informação de qual time é do usuário; há teste para isso.
- **Determinismo**: gerador pseudoaleatório próprio com semente; no caminho da simulação só soma, subtração, produto, divisão e `Math.sqrt`. Nada de `Math.random`, relógio, `Math.sin`, `Math.exp`.
- **Autoridade do servidor** (ADR-015): a simulação roda na API; o cliente só desenha. A semente não aparece em resposta antes do fim da partida.
- **Dinheiro**: o livro-caixa é a única origem de saldo (ADR-014 item 6b). Não existe coluna de caixa.

## 5. Preferências permanentes do dono

- Qualidade dos dados vem primeiro: dado de jogo é revisto antes de lançar.
- Nenhuma consulta N+1: leituras de banco sempre em lote.
- Toda página ocupa a largura da tela, centralizada; colunas preenchem a largura.
- Jogos imersivos, cada modo com o próprio palco, tela cheia, sem colunas laterais; desempenho vale mais que animação.
- Gasto de tokens baixo: subagentes em lote, modelo mais barato que sirva, instruções curtas, resposta direta.
- Conversa em português. Documentos, código e mensagens de commit em prosa normal.
- O dono já autorizou, de forma permanente, juntar PR verde e publicar sem perguntar. **Nesta frente, porém, nada foi commitado ainda** e não houve pedido de commit: pergunte uma vez, no começo, como ele quer commits e PRs do Modo Clube, e siga o que ele disser.

## 6. Estado do repositório

Monorepo pnpm: `apps/api` (Fastify 5, zod 4, Prisma 7, Postgres), `apps/web` (React 19, Vite 8, Tailwind 4, TanStack Query 5, Playwright), `packages/engine`, `packages/contracts`, e o novo `packages/match-engine`. TypeScript 5.9, vitest, Node 24.12.

Ramo: `feat/modo-clube-sandbox`, criado a partir de `main`. Regra de commit decidida pelo dono (2026-11-13): um commit por tarefa DONE neste ramo, com push; PR para `main` ao fim de cada passo do §9, juntado se verde. Specs, ADRs, pesquisas e sandbox commitados em `f75d854`.

### 6.0 Feito depois da sandbox

- **MC-145** (DONE): `packages/match-engine/src/contract.ts` com esquemas zod estritos de `MatchInput` (jogadores com 34 atributos, ocultos, traços, posições, estado; plano tático; técnico; condições; regras), `TimedCommand`, `MatchEvent`, `Frame` (48 inteiros, com altura da bola), `MatchResult`, `Explanation` com fatores e evidência, `Message` (chave, nunca frase). A raiz (`src/index.ts`) exporta só contrato, gerador e `simulateSandbox`; a rota da sandbox virou chamada a `simulateSandbox`. Regra de lint `matchEngineRootOnly` em `eslint.config.js` para `apps/**` e `packages/**` (exceto o próprio pacote). Teste: `src/contract.test.ts` (10 testes). O quadro da sandbox continua com 47 inteiros (sem altura); a sandbox é descartável.
- **MC-146** (DONE): `apps/web/src/games/manager/i18n/` com `format.ts` (subconjunto ICU sobre `Intl`: argumento, número, moeda em real, data, plural com `#`, select), `pt-BR.ts` (catálogo, `MessageKey`), `index.ts` (`createT`, `t`, `tMessage` para mensagens da engine). Chave ausente é erro de tipo. Teste `i18n/i18n.test.ts`.
- **MC-147** (DONE): `no-restricted-syntax` em `eslint.config.js` para `apps/web/src/games/manager/**/*.tsx` (texto em JSX, em expressão filha de JSX e em atributos de texto). Teste `apps/web/src/games/manager/lint.test.ts`.
- **MC-011** (DONE): pacote `packages/club-domain` (`@decabeca/club-domain`, depende só da raiz de `@decabeca/match-engine`) com `src/pack/schema.ts`: `PackSchema` (jogador com atributos do contrato da engine, personalidade, ocultos, potencial, marca de origem e confiança por campo; clube com estádio, níveis de departamento, perfil, torcida; comissão e vínculos; governança; cidades; escolinhas; competições de base; competições com `phases` provisório até a MC-160). Referências cruzadas e ids duplicados viram erro com caminho; pacote `real` recusa jogador gerado em clube. `kind` é `'real' | 'fictional'` (spec e ADR-014 corrigidos). Teste `src/pack/schema.test.ts`.
- **MC-012, MC-013** (DONE): `club-domain/src/player/ratings.ts` (pesos por função, `roleRating`, `bestRoles`, seis resumos) e `src/generate/player.ts` (atributos por posição, qualidade e idade; jogador; elenco de 25 cobrindo as 13 posições). **MC-014** parcial: `src/generate/pack.ts` gera `br-dev-mini` (8 clubes, força 46 a 74, 200 jogadores, técnico, governança, cidades inventadas), igual byte a byte com `checksum`.
- **MC-247** (DONE): `kinematics.ts`, modelo único de chegada; aceleração revista para 3 a 7 m/s² contra a curva de referência. **MC-248** (DONE no nível da bola): `ball.ts`, contato analítico dentro do passo, relógios escalonados.
- **MC-246** (DONE): `presets.ts` (4-3-3, 4-4-2, 4-2-3-1, plano padrão), `team.ts`, `world.ts`, `trajectories.ts`, `coordination.scenarios.ts`, `coordination.test.ts` (seis cenários, oito sementes, 240 s cada). A primeira rodada falhou em T2 (vão de 23 a 37 m, entre linhas de 23 a 41 m) e o dono escolheu a opção A: manter a atribuição gulosa e calibrar forma e linhas. Diagnóstico e correções: com a bola na nossa área a métrica media "vão" onde a bola estava (célula própria); bloco médio pressionava a 90 m com a defesa em 40 m; zagueiro central subia para apoiar no ataque; jogadores fora da defesa de descanso ficavam fundos na forma; dois companheiros corriam lado a lado trocando tarefas. Células de contexto registradas em ADR-018; faixas não mudaram. Resultado: seis cenários verdes nas oito sementes; motor 45 de 45 testes.
- **MC-148** (DONE): `SandboxPage.tsx` só com chaves; `e2e/tecnico.spec.ts` passa.
- **Passo 6, engine nível 1** (2026-11-13, em andamento): `packages/match-engine/src/match/` (`state.ts` estado serializável, `engine.ts` laço com relógio, reinícios, desarme, falta, cartão, impedimento, bola aérea, goleiro, lesão, comandos ao vivo; `carrier.ts` decisão com bola por utilidade e softmax; `kick.ts` execução com erro, chute por `xG` com fator de finalizador e goleiro, vantagem do mandante; `control.ts` controle de campo; `coach.ts` substituições; `advance.ts` partida em trechos; `fixture.ts` times sintéticos) e núcleo `src/rules/` (`math`, `duel`, `xg`, `value`, `stamina`, `discipline`, `injury`, `explain`). Bancada paralela `src/calibration/` (`calibrate.ts` contra `02` §11, `zebra.ts` para MC-166 e MC-045). Testes: engine 78 verdes. Partida média 860 ms. Calibragem em 200 partidas e o que falta por tarefa: ver status em `TASKS.md` (MC-037, MC-039, MC-040, MC-042, MC-044, MC-158, MC-159, MC-166, MC-045 abertas).
- **Amistoso** (MC-250 e proposta de MC-262): `club-domain/src/match/lineup.ts` escala o time do pacote por função; API `GET /v1/manager/friendly/clubs` e `POST /v1/manager/friendly/advance` (sem estado, refaz a partida até o trecho); página `/tecnico/amistoso` com escolha, partida ao vivo, ajuste do mandante, ir para o fim e relatório; `e2e/amistoso.spec.ts` em 360 e 1.280 px.
- **Branch `feat/modo-clube-taticas`** (2026-11-13, em andamento, não está no `main`): pressão custa fôlego e depende de sincronia (atributos e ensino do treinador), saída de pressão por técnica e calma, bola nas costas (`over`), contra-ataque, saída longa sob pressão, treinador que reage ao placar (`coach.ts` `readTheGame`), fadiga aguda, forma do dia, formações 4-1-4-1, 3-5-2 e losango, 54 atributos e treinador de 10 dimensões (ADR-019, proposto), pesquisas 13 a 17 e `02a-MATRIZ-TATICA.md`. Bancadas: `src/calibration/calibrate.ts` (faixas de `02` §11) e `src/calibration/matchups.ts` (pressão, bloco baixo, 4-3-3 contra 4-4-2, 60 partidas cada). Estado no último commit: prova de coordenação com 12 sementes reprova 4 casos (T1 e T2 pontuais em S2, S3, S4); bancada fora da faixa em faltas (9,6), passes (467), acerto (84%), escanteios; pressão alta vence 63% a 90% e bloco baixo 13%. Diagnóstico principal: o time pressionado aceita passes curtos com cerca de 60% de segurança estimada no próprio terço e é interceptado no caminho (11 por jogo) e no pé (7); a saída longa sob pressão e a bola nas costas ainda são pouco escolhidas. Próximo passo: medir a decisão do portador pressionado (quais opções vê e com que utilidade) antes de mexer em mais parâmetros.
- **ADR-018** (proposto, aguarda o dono): células de contexto das métricas da prova de coordenação, mudadas depois de ver o resultado; tabela separa melhora de comportamento e de medição.

### 6.1 Código que já existe (sandbox, tarefas MC-021 a MC-029b concluídas)

`packages/match-engine` (`@decabeca/match-engine`):

| Arquivo | Conteúdo |
| --- | --- |
| `src/random.ts` | `Rng`, `rngFrom(seed)`, `next` (mulberry32), `between`, `pick`, `fork(r, label)` (não avança o gerador pai) |
| `src/pitch.ts` | `LENGTH = 105`, `WIDTH = 68`, `CENTER`, `BOX_DEPTH`, `Vec2`, `flip`, `dist`, `clamp`, `zoneOf` (12 × 8), `laneOf` |
| `src/shape.ts` | `SLOTS`, `SHAPES` (4-3-3 com bola, 4-1-4-1 sem), `InstructionsSchema` estrito (largura 1 a 5, altura da linha 1 a 5, lateral invertido), `anchor(slot, phase, ball, ins)` |
| `src/movement.ts` | `DT = 0.25`, `Mover`, velocidade máxima `6,0 + 3,2 × (pace/99)`, aceleração `2,5 + 3,0 × (acc/99)`, `moveTowards`, `separate` |
| `src/sandbox.ts` | `createSandbox(seed, instructions)`, `step`, `frame` (47 inteiros, decímetros), `simulate`; a bola segue um roteiro, não há decisão nem disputa |
| `src/sandbox.test.ts` | 14 testes, inclusive causais sobre as três instruções em 8 sementes |
| `src/bench.ts` | bancada: 94 ms por 90 minutos só de movimento, um núcleo |
| `src/index.ts` | exportações; `MATCH_ENGINE_VERSION = 0` |

API: `apps/api/src/modules/manager/manager.routes.ts` com `POST /manager/sandbox` (corpo estrito, sem estado, limite de 60 por minuto) e `manager.int.test.ts` (3 testes). Registrado em `apps/api/src/modules/attempts/public.routes.ts`. `apps/api/package.json` ganhou a dependência `@decabeca/match-engine`; `pnpm-lock.yaml` mudou.

Web: `apps/web/src/games/manager/SandboxPage.tsx` (canvas 2D, interpolação por quadro de animação, pausa, 1×, 2× e 4×, três controles) na rota `/tecnico/sandbox` de `apps/web/src/App.tsx`; `apps/web/e2e/tecnico.spec.ts` passa. O texto da página sai de chaves de tradução (MC-148).

A sandbox é descartável como produto e útil como base: `random.ts`, `pitch.ts` e a ideia de `frame` continuam; `sandbox.ts` é substituído pela engine de verdade.

### 6.2 Documentos (sem commit)

`docs/GAME_DESIGN/MODO_CLUBE/` (specs, revisão 4), `docs/ADR/013` a `017` (aceitos), `docs/pesquisa/modo-clube/01` a `12`.

### 6.3 Outros arquivos sem commit que não são desta frente

`.claude/`, `docs/monetizacao-pesquisa.md`, `docs/monetizacao-plano.md`. Não mexer sem pedido.

## 7. Ambiente: comandos e armadilhas

| Para | Comando |
| --- | --- |
| Testes da engine | `pnpm --filter @decabeca/match-engine test` |
| Bancada | `pnpm --filter @decabeca/match-engine bench` |
| Unidade da API | `pnpm --filter @decabeca/api test:unit` |
| Integração da API (precisa do Postgres) | `pnpm --filter @decabeca/api test:int` (é `vitest run -c vitest.int.config.ts`; o filtro comum não acha arquivos `*.int.test.ts`) |
| Ponta a ponta | `E2E_API_PORT=3011 E2E_WEB_PORT=5184 E2E_LAUNCH_PORT=5185 pnpm --filter @decabeca/web test:e2e` (a porta 3001 costuma estar ocupada) |
| Tipos | `pnpm -r typecheck` |
| Formatação dos arquivos tocados | `npx prettier --write <arquivos>` |

- Postgres local roda no contêiner `de-cabeca-postgres-1`, porta 5432.
- **`pnpm lint` e `pnpm format:check` no repositório inteiro falham** (milhares de avisos em arquivos que não são desta frente; a causa não foi investigada). Rode lint, prettier e typecheck só nos arquivos tocados e diga isso no relato. Não "conserte" o repositório inteiro de carona.
- O componente `Notice` de `apps/web` não tem a propriedade `tone`.
- O repositório não está indexado no CodeGraph; use busca comum.
- A tabela `Match` do banco tem cerca de 46 mil partidas reais (placar, data, clubes), de origem em domínio público. Serve para calibragem; `docs/pesquisa/modo-clube/12-calibragem-dados-proprios.md` já tem os números.

## 8. Números que a engine precisa acertar

Resumo; a tabela completa e as fontes estão em `02-MATCH-ENGINE.md` §11.

| Métrica | Série A | Série B | Série C | Série D |
| --- | --- | --- | --- | --- |
| Gols por jogo | 2,40 | 2,13 | 2,19 | 2,34 |
| Vitória do mandante | 47,6% | 45,9% | 47,4% | 45,2% |
| Empate | 27,5% | 29,8% | 30,3% | 29,6% |

Série A, por time e jogo: 12,6 a 13,6 finalizações, 4,0 a 4,6 no alvo, cerca de 420 passes com 80% de acerto, 13,4 a 15,9 faltas, 2,15 a 2,59 amarelos, 5,05 a 5,51 escanteios, 1,32 a 1,75 impedimentos. Uma temporada sozinha oscila (2,18 a 2,52 gols na Série A): o alvo é faixa, não ponto. Não existe multiplicador por divisão; a diferença sai da qualidade dos jogadores do pacote.

Desempenho: 94 ms por partida só com movimento; meta da engine completa, 1 s por partida do usuário; nível 2 até 2 ms por partida.

## 9. Ordem de trabalho

Princípio do roteiro: o maior risco primeiro. O maior risco é a engine parecer futebol, e dentro dela, a coordenação coletiva.

### Corte 0,5 — partida avulsa jogável (primeira entrega)

A pessoa escolhe dois times fictícios, formação e instruções, assiste à partida no campo 2D ou pula, lê o relatório e joga de novo. Sem conta, sem calendário, sem dinheiro.

| Passo | Tarefas | Saída |
| --- | --- | --- |
| 1 | MC-145 | contrato de entrada e saída da engine em `packages/match-engine/src/contract.ts` |
| 2 | MC-146, MC-147 | tradução por chaves: `t(chave, parâmetros)`; chave ausente falha no build |
| 3 | MC-011, MC-014 (versão mini) | esquema do pacote e pacote fictício pequeno, determinístico |
| 4 | MC-247, MC-248 | modelo único de chegada; relógios separados e contato analítico da bola |
| 5 | **MC-246** | prova de coordenação: forma do time e atribuição de tarefas, com bola por roteiro, em seis cenários; T1, T2, T3, T5 e T9 dentro das faixas. **Se falhar, pare e relate ao dono antes de seguir**: a arquitetura de decisão muda |
| 6 | MC-256, MC-031 a MC-045, MC-047, MC-158 a MC-166 | núcleo de regras e engine nível 1: decisão, execução, disputas, bola, goleiro, árbitro, `xG`, fôlego, substituições, explicação |
| 7 | MC-203, MC-249, MC-200 | testes de trajetória T1 a T10, contrato de evidência, bancada por etapa |
| 8 | MC-050 a MC-052, MC-061, MC-065, MC-262, MC-250 | tática rasa, partida ao vivo, direção visual imersiva e premium, tela de partida avulsa |
| 9 | MC-030, MC-048 | quadros por segundo em celular real; **portão do dono**: dez partidas assistidas, lista de defeitos fechada |

Critério de saída: portão do dono aprovado; zebras Z1 a Z12 verdes; T1 a T10 verdes. O portão é do dono, não do assistente: ao chegar nele, entregue o link e a lista do que observar, e espere.

### Depois

Corte 1 (carreira jogável mínima), cortes 2 a 5: `ROADMAP.md` §2. A estimativa de esforço é refeita ao fim do corte 0,5, com o ritmo medido.

## 10. Como trabalhar

1. Uma tarefa de `TASKS.md` por vez, na ordem do §9. Antes de codar, leia a seção da spec que a tarefa cita.
2. Teste primeiro. Tarefa só vira DONE com o teste dela executado e verde, e o status atualizado em `TASKS.md`.
3. Toda regra com número vem da spec ou do manifesto de parâmetros. Número novo sem fonte entra marcado como PARÂMETRO, com teste que o cobre.
4. Mudou de ideia sobre o desenho? Mude a spec dona (tabela do `ROADMAP.md` §7) na mesma alteração, ou registre em ADR. Código e spec não divergem.
5. Engine: código puro, sem React, DOM, Fastify, relógio ou `Math.random`. Devolve chave e parâmetros, nunca texto.
6. API: corpo estrito com zod, posse da carreira conferida, idempotência em toda escrita com efeito, leitura em lote.
7. Web: só chaves de tradução; 360 px e 1.280 px; alvo de toque de 44 px; teclado e leitor de tela; movimento reduzido respeitado.
8. Relato honesto: teste que falha é relatado com a saída; passo pulado é dito; o que não foi verificado é dito.
9. Ao fim de cada sessão de trabalho, atualize o §6 deste arquivo (o que existe) e o status em `TASKS.md`, para a próxima sessão começar daqui.

## 11. Riscos em aberto

Lista viva no fim de `TASKS.md`. Os que mais pesam agora:

- Coordenação coletiva (MC-246) pode não se sustentar com atribuição gulosa de tarefas; a alternativa (atribuição ótima por matriz de custo, marcação com os três melhores alvos) está em `docs/pesquisa/modo-clube/11-simulacao-e-coordenacao.md`.
- Meta de 1 s por partida do usuário ainda não medida com decisão e disputa.
- Forma de guardar o mundo não decidida; depende da medição MC-201 (só importa a partir do corte 1).
- Economia das divisões inferiores com muita estimativa; entra no manifesto com confiança baixa e passa por análise de sensibilidade.
- Estatística de jogo (finalizações, passes, cartões) só existe com fonte para a Série A até 2023.
