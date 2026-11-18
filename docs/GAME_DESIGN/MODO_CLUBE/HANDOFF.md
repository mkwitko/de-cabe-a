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
- **Branch `feat/modo-clube-taticas`** (2026-11-13, em andamento, não está no `main`): pressão custa fôlego e depende de sincronia (atributos e ensino do treinador), saída de pressão por técnica e calma, bola nas costas (`over`), contra-ataque, saída longa sob pressão, treinador que reage ao placar (`coach.ts` `readTheGame`), fadiga aguda, forma do dia, formações 4-1-4-1, 3-5-2 e losango, 54 atributos e treinador de 10 dimensões (ADR-019, proposto), pesquisas 13 a 17 e `02a-MATRIZ-TATICA.md`. Bancadas: `src/calibration/calibrate.ts` (faixas de `02` §11) e `src/calibration/matchups.ts` (pressão, bloco baixo, 4-3-3 contra 4-4-2, 60 partidas cada). Estado no último commit: prova de coordenação com 12 sementes reprova 4 casos (T1 e T2 pontuais em S2, S3, S4); bancada fora da faixa em faltas (9,6), passes (467), acerto (84%), escanteios; pressão alta vence 63% a 90% e bloco baixo 13%. Diagnóstico principal: o time pressionado aceita passes curtos com cerca de 60% de segurança estimada no próprio terço e é interceptado no caminho (11 por jogo) e no pé (7); a saída longa sob pressão e a bola nas costas ainda são pouco escolhidas. Próximo passo: medir a decisão do portador pressionado (quais opções vê e com que utilidade) antes de mexer em mais parâmetros. Medido em 2026-11-13 (`matchups.ts`, 60 partidas por confronto): bloco alto sozinho e intensidade 5 sozinha já vencem perto de 70%; o time pressionado faz cerca de 120 passes por jogo no próprio campo e os passes estimados em 90% ou mais completam 88% (perto de 14 perdas por jogo pelo volume); cada recuperação alta vale perto de 0,09 de `xG` (referência Opta: cerca de 25% viram chute de 0,11, ou seja, perto de 0,03). Hipóteses testadas sem efeito: marcação atrás da bola menor no bloco alto, ruído de estimativa menor (`noise` 0,06), marcador colado baixando a segurança do passe, sincronia de pressão centrada em 1, calma reduzindo o efeito da pressão na escolha. Hipótese que piorou (revertida): decidir na hora quando pressionado. Melhoraram um pouco: alcance de interceptação menor, bloqueio no pé menor, bola nas costas com risco realista (`OVER_RISK`), saída longa sob pressão. Rodada com 300 partidas por confronto e margem de 95% (`matchups.ts` agora imprime a margem; lição: com 60 partidas a margem é de cerca de 12 pontos e várias conclusões anteriores eram ruído): pressão alta contra bloco médio 64% a 70% ±5, bloco baixo contra bloco médio 14% a 21% ±4, 4-3-3 contra 4-4-2 36% ±5. Sem efeito mensurável: marcação só até 24 m da bola (piorou a defesa da área, revertida), marcação mais folgada longe da bola, cansaço progressivo a partir de 0,75 de fôlego, contra-ataque menos acelerado. Achado corrigido: o peso da perda de bola dependia de onde estava quem passava, não de onde a bola seria perdida, o que tornava o chutão de alívio caro demais. Achado de calibragem: reduzir o ruído de decisão tirou os chutes de média chance (6 chutes por time a 0,31 de `xG`); a reserva do chute foi recalibrada para +0,01 (14 chutes, 0,10 por chute, 2,6 gols). Estado em `cf6a8a2` e seguintes (300 partidas): bancada geral quase toda na faixa (gols 2,44, chutes 13,8, no alvo 4,3, passes 414, acerto 81%, amarelos 2,0, vermelhos 0,10, escanteios 5,2, impedimentos 1,36, mandante/empate/visitante 46/30/24); `xG` por chute 0,087 fica abaixo da faixa de 0,10 a 0,12, que vem da Premier League (2,4 gols em 26 chutes da Série A dá 0,092). Equilíbrio de estilos ainda reprova: pressão alta contra bloco médio 63% ±5, bloco baixo contra bloco médio 13% ±4, pressão alta contra bloco baixo 82% ±4. Origem: depois de recuperação alta, 45% viram chute (referência Opta 20% a 25%); o bloco baixo faz 0,05 de `xG` de transição e sofre 0,9 de bola parada. Mudanças sem efeito nesta rodada: treinador que muda para saída longa ao ser pressionado, meio segundo de domínio depois de roubar a bola, atacante mais alto no plano de contra-ataque (`COUNTER_OUTLET`). Rodada de 2026-11-16 (300 partidas, margem 95%): bancada geral na faixa em gols 2,47, chutes 12,7, no alvo 4,1, `xG` por chute 0,105, amarelos, vermelhos e distância; perto em passes (396), faltas (12,9), escanteios (4,97) e impedimentos (1,92). Mecanismos novos: goleiro e tiro de meta saem longo quando a pressão vem alta; corridas de ruptura no contra-ataque (onside); atraso de transição de quem perde a bola (até 1 s, menor com `lossReaction`); defensor quase não faz falta dentro da própria área (pênaltis 0,6 → 0,3 por jogo); bloco baixo com a linha na entrada da área (`LOW_FLOOR_EXTRA`); exigência do plano contra entrosamento (`DEMAND_COST`). Confrontos: pressão contra bloco médio 52% a 61% ±6 (perto do limite de 60%), bloco baixo contra bloco médio 21% ±5, pressão contra bloco baixo 78% ±5 (reprova), 4-3-3 contra 4-4-2 37% ±5. Prova de coordenação: S3 (bloco baixo) reprova 7 de 12 sementes por T1 e T2 com a linha mais alta; proposta de célula por bloco no ADR-018, não aplicada. Push bloqueado: a conta do GitHub desta máquina mudou para `mkwitko2` (sem permissão); commits locais em `feat/modo-clube-taticas`. Próxima hipótese de mecanismo: a saída do time pressionado não tem homem livre nem terceiro homem (pesquisa 15 fase 2), então todo passe curto vai para um jogador marcado. Próximas hipóteses: número de jogadores engajados na pressão (hoje press, cobertura, linha e três marcações correm todos em velocidade máxima, sem homem livre para a saída) e o que acontece depois da recuperação alta (o time que perde deveria recompor a tempo em parte dos casos).
- **`xG` fiel e excesso de chances corrigido na origem** (2026-11-16, aviso do dono): o intercepto do `xG` tinha sido baixado de −1,1 para −1,4 para acertar a média de gols; voltou para −1,1 (`02` §7). Com a fórmula fiel, a bancada deu 3,33 gols e 0,132 de `xG` por chute. Diagnóstico por distância (script de rastreio, 30 partidas): 11% dos chutes a menos de 6 m com 0,40 de `xG` (referência perto de 6%), metade dos chutes de 25 m a 35 m (referência perto de 8%), 2% de cabeceios (referência 15% a 20%). Causas e correções: (1) o atacante recebia a 20 m a 30 m e conduzia uns 4 s até a pequena área sem nenhum evento, com o zagueiro a 2 m a 4 m segurando a zona e a tarefa de pressão com um meia que corria atrás; agora, perto do próprio gol, a pressão é feita pelo lado do gol, no caminho do portador (`team.ts`), e todo defensor no terço defensivo entra no desarme (`engine.ts`); o desarme na área voltou para 0,7 e a falta na área ficou em 0,15. (2) O erro de avaliação do portador era absoluto (±0,036), e como o chute vale o gol inteiro, uma chance de 1% parecia 5% e vencia o passe; agora o erro no chute é proporcional à chance (`carrier.ts`). (3) A reserva fixa do chute foi trocada por um valor de sequência (rebote e escanteio) proporcional à chance (`SHOT_FOLLOW_UP` 1,6). (4) Bola acima do peito na zona de finalização vira cabeceio de primeira. Resultado (300 partidas): gols 2,46, chutes 12,4 (faixa começa em 12,6), no alvo 4,1, `xG` por chute 0,114, amarelos, vermelhos e distância na faixa; escanteios 4,5, passes 405, faltas 12,9 e impedimentos 2,0 fora. Distribuição (30 partidas): 30% dos chutes a menos de 11 m, 18% de 11 m a 16,5 m, 27% de 16,5 m a 25 m, 24% de 25 m a 35 m (ainda alto); cabeceios 5% (ainda baixo, poucos cruzamentos: 6,6 por time). Prova de coordenação: S3 continua reprovando (5 de 12 sementes), à espera do item 7 do ADR-018. O torneio de estilos (`zebra.ts`) não foi refeito depois disso.
- **Custo da pressão** (2026-11-16, 300 partidas por confronto, margem 95%): carga sem a bola maior (0,28 por ponto de intensidade acima de 3, bloco alto +0,2); quem pressiona cansado dá menos bote (de 100% com fôlego 0,75 a 40% com fôlego 0); exigência do plano sem entrosamento também faz errar a troca de tarefa no momento do passe (antes só na reavaliação periódica). Efeito pequeno: pressão contra bloco médio 60% ±6, bloco baixo contra bloco médio 22% ±5, pressão contra bloco baixo 74% ±5, 4-3-3 contra 4-4-2 35% ±5. Com entrosamento 0,2 a pressão ainda rouba 11,7 bolas altas por jogo (com 1,0, 13,1): as recuperações altas vêm de posicionamento (interceptação de passe curto estimado em 80% a 100% de segurança, bola longa estimada em 60%), não do bote. O fôlego do time que pressiona termina em 0,50 contra 0,58. Diagnóstico do bloco baixo: a qualidade dos chutes que ele sofre é igual à de um jogo normal; o problema é volume (24 chutes sofridos contra a pressão) e posse: só 16% das posses do bloco baixo chegam ao terço final (normal 29%), 67% começam no próprio terço, e a primeira ação depois de roubar é passe curto em 48% dos casos e bola nas costas em 7%. Próximo passo: a segurança estimada do passe sob pressão (`passSafety`) e a saída do bloco baixo pelo contra-ataque.
- **H1 da pesquisa 18 confirmada e corrigida** (2026-11-16): auditoria de calibração do passe (pressão contra bloco médio, passes do time pressionado no próprio campo): passes curtos estimados em 98% a 99% completavam 89% a 91%; bolas longas estimadas em cerca de 70% completavam 44% a 53%; as falhas dos passes "seguros" eram interceptação no voo (4,6 por jogo). Causa: `passSafety` somava o tempo de reação do defensor (0,45 s a 0,95 s), mas na simulação o defensor muda de alvo no mesmo passo em que o passe sai. Agora a estimativa usa a mesma física (sem atraso): passe curto estimado em 98% completa 97%, interceptações desses passes 0,6 por jogo. `LOFT_RISK` recalibrado pelo medido (0,7 → 0,55). Confrontos (300, margem 95%): pressão contra bloco médio 51% ±6, bloco baixo contra bloco médio 27% ±5, pressão contra bloco baixo 71% ±5, 4-3-3 contra 4-4-2 37% ±5. Bancada: gols 2,16, chutes 11,5, `xG` por chute 0,113, acerto de passe 82,5% (acima da faixa), faltas 10,5, impedimentos 1,08. Subir `SHOT_FOLLOW_UP` para 1,8 só acrescentou chutes ruins (0,095 por chute) e foi revertido. Próximos: H5 (compactação dos cinco mais próximos da bola no bloco baixo) e H6 (saída do bloco baixo: pivô, segunda bola).
- **Tempo de leitura do passe na simulação** (2026-11-16, aviso do dono: a correção anterior tirou o atraso da conta do passador em vez de dar atraso ao defensor). Agora o defensor leva um tempo para ler o passe e, nesse tempo, segue o rumo em que estava (`reactUntil` em `world.ts`); o passador estima com a mesma física (`readingArrival` em `control.ts`). O atraso é `PASS_READ` × tempo de reação (antecipação e concentração voltam a pesar). Com o tempo de reação inteiro (0,45 s a 0,95 s, feito para evento súbito), a defesa ficou lenta demais: 2,77 gols, 0,127 de `xG` por chute, 3,1 impedimentos, pressão 66% e 80%. Com `PASS_READ` 0,4 (0,18 s a 0,38 s): bancada com gols 2,29, chutes 12,3, `xG` por chute 0,113, passes 420, impedimentos 1,43 na faixa; acerto 82,6%, faltas 10,3, cartões e escanteios fora. Confrontos: pressão contra bloco médio 59% ±6, bloco baixo contra bloco médio 18% ±4, pressão contra bloco baixo 75% ±5, 4-3-3 contra 4-4-2 37% ±5 (a versão sem atraso dava 51%, 27% e 71%: melhor no equilíbrio, mas sem antecipação nem concentração na leitura do passe). Calibração do passe curto seguro: estimado 98%, real 92% a 93% (sem atraso: 97%). Também: a chance de travar o passe no pé (`footBlock`) é a mesma no chute e na estimativa; quem está ao lado do chute não alcança a bola até ela se afastar 2,5 m do ponto do chute (antes, só no primeiro passo).
- **Comparação pareada** (2026-11-16, pesquisa 18 §3): `DUMP=arquivo` em `matchups.ts` guarda cada partida; `paired.ts` compara duas versões nas mesmas sementes com intervalo de 95% por bootstrap determinístico. A diferença de `xG` é a métrica mais sensível (intervalo de cerca de ±0,15 contra ±7 pontos na taxa de vitória). Versão de base: `git worktree add` no commit anterior.
- **Passe e chute de primeira** (2026-11-16, pesquisa 18 §2.4): quando o adversário mais rápido chega ao recebedor antes do tempo de domínio, ele decide na hora; se a melhor ação for passe, cruzamento, alívio ou chute, joga de primeira (erro maior, menor com técnica); se não, domina normalmente. Eventos de passe e chute marcam `firstTime`. Dispara cerca de 37 vezes por jogo no time pressionado (66% de acerto, igual à média). Comparação pareada nos confrontos: sem efeito significativo (falta quem ofereça a linha livre: terceiro homem). Bancada (300): gols 2,68 (fora), chutes 13,3, no alvo 4,5, `xG` por chute 0,110, passes 457 (fora), faltas 8,0 (fora). Dificuldade de referência: as faixas de `02` §11 misturam `xG` por chute da Premier League (0,10 a 0,12) com gols por jogo da Série A (2,2 a 2,5); 13 chutes por time a 0,11 dão 2,9 de `xG` por jogo, incompatível com 2,2 a 2,5 gols. Decisão do dono pendente: uma liga de referência para todas as faixas.
- **Busca do espaço livre, falta tática e `onLoss`** (2026-11-16). Apoio e entrelinhas escolhem, entre nove pontos próximos, o mais longe dos adversários (sem efeito significativo no equilíbrio). Falta tática como decisão de contexto (contra-ataque de até 8 s, portador a partir de 45 m correndo para o gol, no máximo quatro defensores atrás da bola; mais provável com leitura tática, bem menos com amarelo; a regra 12 adverte na maioria): cerca de 1,2 por time por jogo, 58% com amarelo. Auditoria estática do dono (2026-11-16) apontou instruções do contrato sem efeito na partida; confirmado nesta branch: `onLoss`, `pressTriggers`, `forceDirection` e `offsideTrap` não eram lidos (só `onWin` era). `onLoss` agora tem efeito: por 5 s depois de perder a bola, o time que contrapressiona e tem pelo menos tantos jogadores quanto o adversário a 10 m da bola caça a bola com um segundo pressionador; senão, e sempre no `regroup`, o bloco recua e só engaja a 35 m do próprio gol. Sem a condição de superioridade a bancada foi a 3,3 gols e 16,5 chutes. Com ela: gols 2,49, chutes 13,5, `xG` por chute 0,106; recuperação em 5 s depois de perder 18% de todas as perdas; quem rouba chuta em 20 s em 6,6% (Peters et al. 2025: 5,5% a 6,4%). Confrontos (300): `regroup` contra contrapressão 36% ±5 (gols 1,28 a 1,29), pressão contra bloco médio 55% ±6, bloco baixo (agora `regroup`) contra bloco médio 27% ±5, pressão contra bloco baixo 77% ±5. Pendentes da auditoria: `pressTriggers`, `forceDirection`, `offsideTrap` (sem efeito ainda; esconder na tela até terem), percepção com memória (MC-159), defesa de descanso com geometria (MC-205), defesa da área por região, combinações planejadas e segunda bola, métricas de transição no resumo da bancada (hoje em scripts avulsos), T4, T6 a T8 e T10.
- **`pressTriggers`, `offsideTrap` e `forceDirection`** (2026-11-16). Gatilhos: passe para trás (a maior parte da velocidade da bola indo para o próprio gol), domínio ruim, bola na lateral e recebedor de costas disparam para o time sem a bola e, por 2 s, o bloco pressiona 20 m além do alcance normal. Roubadas altas sem, com dois e com quatro gatilhos: 4,4, 5,2 e 7,5 por jogo (primeira versão, alcance ilimitado). Bancada: gols 2,64 com os dois gatilhos padrão (2,49 sem). Armadilha: com gatilho ou com o passador fechado (um defensor a 2,5 m), a linha sobe até 5 m, menos para quem tem pouca concentração ou pouca familiaridade (habilita o atacante); impedimentos do adversário 1,82 → 2,01 por jogo e gols sofridos 1,38 → 1,25 (300 partidas, sem teste pareado). Direção da pressão: o pressionador fica 3 m no ombro que fecha (dentro para mandar para fora); efeito medido quase nulo (recepções do adversário nos corredores laterais 33,9% sem, 33,9% para fora, 33,4% para dentro, 15 partidas). Pela regra do dono (instrução sem efeito engana), `forceDirection` deve ficar oculta na tela até ganhar efeito mensurável.
- **Defesa da área e decisão de chute** (2026-11-16, ordem aprovada item 4). Diagnóstico: bola recuperada a menos de 40 m do gol terminava em chute 38% a 46% das vezes (Opta: 13% a 21%); 1,35 chute por time por jogo nos 3 s seguintes, a 21 m em média; 47% dos chutes de fora da área (referência 35% a 40%), 27% de mais de 25 m. Causa principal: o passador estima interceptação com a física do voo, mas o chutador ignorava os corpos na linha, que no voo bloqueiam de fato. Agora `shotClear` (`control.ts`) projeta na boca do gol a sombra do alcance de bloqueio de cada defensor de linha (o mesmo do voo, mais 2 m/s de passo durante a viagem); o chutador lê de 30% a 80% disso pela `decisões`. Calibração: chutes vistos 80% a 100% livres bloqueados 13%. Defesa da área (`team.ts`): sem a bola perto do nosso gol, última linha pelo menos 5 m mais funda que a bola e meio 2 m, última linha fechando para a boca do gol a partir de 30 m. Resultado (bancada 300): gols 2,74, chutes 12,1, no alvo 4,1, `xG` por chute 0,128, de fora da área 35%, bloqueados 25%; recuperação alta vira chute em 30% a 39%. Pareado contra o commit anterior (300 por confronto): chutes caem 2 a 4,7 por time; diferença de `xG` e vitória sem mudança significativa (pressão contra bloco baixo 78% ±5, bloco baixo contra médio 18% ±4, médio contra médio 37%). Conclusão: o desequilíbrio de estilos vem da criação (`xG` 3,10 contra 0,83 na pressão contra bloco baixo), não do volume de chutes. Faltas 9,0 (sem falta em disputa aérea, carga ou puxão: próximo passo), escanteios 4,6, impedimentos 1,8 fora.
- **Disputa aérea e falta nela** (2026-11-16, ordem aprovada item 6). Medido: de cerca de 210 bolas altas por jogo, 66 são tocadas no alto e só 4,2 viram disputa com adversário a 1,8 m (referência: 35 a 40 duelos aéreos por jogo); com adversário a 4 m, 20. Mudanças: falta na disputa aérea (`aerialFoulChance`), adversário que chega em 0,5 s também disputa, defensores de linha atacam a bola alta na própria área (antes só o goleiro). Disputas sobem para 6 por jogo e as faltas só de 9,0 para 9,3: a causa está na marcação (ninguém acompanha o alvo da bola longa), não na regra do duelo. Bancada (300): gols 2,60, chutes 12,3, `xG` por chute 0,127, escanteios 4,7. Próximo: marcação do alvo da bola longa e da área no cruzamento (cabeceios 6% dos chutes, referência 15% a 18%).
- **Cruzamento e cabeceio** (2026-11-16, item 5). Antes: 8,2 cruzamentos por time, sempre para a marca do pênalti com chance fixa; 46% iam direto para a defesa e 5% viravam cabeceio; cabeceios 6% dos chutes. Agora: escolha de zona (primeiro pau, marca, segundo pau) pela física de chegada; atacantes e defensores atacam o cruzamento sem atraso de reação (antes os dois lados reagiam como a um evento súbito, e na primeira tentativa só os atacantes antecipavam: 31% dos cruzamentos viravam cabeceio e 3,35 gols); erro de queda do cruzamento 1,8 vez o da bola longa. Bancada (300): gols 2,79 (fora), chutes 13,1 (dentro), no alvo 4,4, `xG` por chute 0,126, escanteios 5,6 (pouco acima), impedimentos 1,73 (dentro), faltas 8,9. Cabeceios 20% dos chutes (40 partidas). Os gols acima da faixa voltam à decisão pendente da liga de referência: 13 chutes a 0,12 dão cerca de 3 de `xG` por jogo.
- **Falta do defensor driblado** (2026-11-16, item 6): 15% a 35% pela `agressividade`. Efeito pequeno (faltas 8,9 → 9,2 por time; bancada 300: gols 2,91, chutes 13,0). Duelos por time (20 partidas): 6,5 dribles (2,5 vencidos; referência perto de 9 a 10 tentados), 22 desarmes (9,6 vencidos), cerca de 6 disputas aéreas por jogo. Faltas por tipo: 4,0 por trás, 3,4 de frente, 0,8 tática, 0,4 aérea. O que falta para chegar a 10,5 (Premier League) ou 14 (Série A) é sobretudo duelo aéreo (35 a 40 por jogo na referência), que depende da marcação do alvo da bola longa.
- **Fadiga na decisão e na técnica** (2026-11-16, item 7): a temperatura da escolha sobe até 60% com fôlego 0 (já previsto em `02` §5.4, não estava no código); bola alçada erra mais, chute no alvo cai e a conversão cai até 15% com fôlego 0. Bancada (300): gols 2,58, chutes 12,3, no alvo 3,9, `xG` por chute 0,123, escanteios 5,1 (dentro).
- **Todo atributo tem efeito** (2026-11-16, item 8, ADR-019). Teste novo: uma partida lê todos os 54 atributos. Faltavam `marking`, `offTheBall`, `leadership` e `distribution` (efeitos no ADR-019 item 3). Script de efeito (mesma partida com o atributo +30 em todos, compara o log): só atributos de lance raro (pênalti, bola parada direta, chute de longe, goleiro) não mudam uma partida isolada. Bancada (300): gols 2,46, chutes 12,3, no alvo 4,0, `xG` por chute 0,120, acerto 80,6%, escanteios 5,1 (gols, no alvo, `xG` por chute, acerto, escanteios e distância na faixa); fora: chutes (pouco), passes 437, faltas 9,1, amarelos 2,05, vermelhos 0,07, impedimentos 1,78. Prova de coordenação: 10 de 10 cenários passam, inclusive S3 (pode ser efeito das sementes; o item 7 do ADR-018 continua com o dono).
- **Métricas de transição na bancada** (2026-11-16, auditoria): `summary.ts` conta recuperações a menos de 40 m do gol adversário, quantas terminam em chute, perdas e recuperações em até 5 s; `calibrate.ts` imprime, `paired.ts` compara a parcela que vira chute. Bancada (300): 8,3 recuperações altas por time, 35% terminam em chute (Opta 13% a 21%: segue o maior desvio de realismo), 18% das perdas recuperadas em 5 s.
- **Estado ao fim da rodada de 2026-11-16** (ordem aprovada 1 a 8 feita). Confrontos (300, margem 95%): pressão contra bloco médio 60% ±6 (no limite), pressão contra bloco baixo 74% ±5 (reprova), bloco baixo contra bloco médio 24% ±5 (reprova), 4-3-3 contra 4-4-2 36% ±5. Bancada: gols 2,46, chutes 12,3, `xG` por chute 0,120, no alvo 4,0, escanteios 5,1 na faixa; passes 437, faltas 9,1, amarelos 2,05, vermelhos 0,07, impedimentos 1,78 fora. Próximos, por tamanho do desvio: (1) recuperação alta vira chute em 35% (Opta 13% a 21%); metade dos chutes em até 3 s vem de bola ganha a cerca de 20 m do gol (sobra de cruzamento ou rebatida), separar esse caso antes de mexer; (2) duelo aéreo cerca de 6 por jogo (referência 35 a 40), que depende da marcação do alvo da bola longa, e com ele as faltas; (3) criação do bloco baixo (0,8 a 1,0 de `xG`): pivô, segunda bola, contra-ataque; (4) percepção com memória (MC-159), defesa de descanso com geometria (MC-205), T4, T6 a T8 e T10. Decisões do dono pendentes: liga de referência das faixas, item 7 do ADR-018 (S3 agora passa nas 12 sementes, sem mudança de célula), aprovação do ADR-019.
- **Série A como referência** (2026-11-16, decisão do dono: Brasileirão Série A como referência principal, outras ligas como secundárias). Única faixa que não era da Série A: `xG` por chute (Premier League 0,10 a 0,12); agora 0,085 a 0,10, derivada de gols sobre chutes da própria Série A. Apoio: StatsBomb (comparação Brasil contra cinco grandes ligas, 2023) dá cerca de 2,2 de `xG` por jogo no Brasil, com mais chutes e de pior qualidade. Achado: os gols ficavam 17% abaixo do `xG` porque o `xG` publicado já embute os bloqueios e o voo bloqueava de novo (dupla contagem); corrigido (gols/`xG` 0,99). Bancada (300): gols 2,85 e `xG` por chute 0,109 fora; chutes 13,2, no alvo 4,3, escanteios 5,5, acerto, distância dentro. Com gols ≈ `xG`, o excesso de gols agora é excesso de chance: 2,88 de `xG` por jogo contra cerca de 2,2 a 2,4. Prioridade: cortar na origem (recuperação alta que vira chute 37%, Opta 13% a 21%; defesa de transição).
- **Origem do excesso de `xG` e escanteio** (2026-11-16). Medido: recuperações altas vêm de perdas na saída de bola (passe curto interceptado 3,9 por time, desarme 1,4, bola longa 1,2), não de sobra de cruzamento; o chute vem em média 16 s depois. Passes por terço: 261 no próprio, 149 no meio, 24 no final por time (referência europeia: 24% a 28% no terço final; aqui 5%); posses que chegam ao terço final 19,5 por time, 44% terminam em chute. Testados e revertidos: domínio mais rápido (gols 3,28, distribuição igual), `SHOT_FOLLOW_UP` 1,15 (chutes 8,7, `xG` igual). O `xG` total (~2,9 a 3,0) não cede a parâmetros de decisão; vem do posicionamento. Bola parada respondia por 36% do `xG`; escanteio dava 0,46 chute e 0,055 de `xG` por cobrança (referência perto de 0,03), sem organização de bola parada (cada um na posição de jogo corrido). Agora há esquema padrão de escanteio e até três defensores atacam o cruzamento: a defesa ganha o primeiro toque em 33% (antes 16%). Bancada (300): gols 2,69, `xG` por chute 0,115, chutes 13,0, escanteios 5,8. Teste de visão passou a usar seis sementes (com duas ficava no ruído). Próximo: por que o time roda a bola no próprio terço e chega pouco, mas chega bem, ao terço final (posicionamento de apoio e linhas do adversário).
- **Progressão pelo meio** (2026-11-16, diagnóstico). Amostragem das opções do portador (RNG restaurado): no próprio terço, 2,3 opções de passe para a frente além de 10 m (0,5 com segurança acima de 85%); a escolha é razoável (melhor opção lateral 46%, frente 40%), condução nunca é a melhor. No terço do meio, 1,1 opção para a frente (0,1 segura); melhor opção: lateral 26%, condução 26%, segurar 22%, frente 9%. Com a bola no meio: 4,6 companheiros mais de 5 m atrás, 2,1 na linha, 2,3 à frente (só um atacante em profundidade; os pontas em `width` a 6 m à frente da bola). Testado e revertido: pontas a até 10 m da última linha e segundo atacante em profundidade (terço final de 24 para 30 passes, `xG` 3,11). Conclusão: o desvio de distribuição de passes (5% no terço final contra 24% a 28%) é do modelo de posicionamento com bola (apoios, linhas de passe à frente, terceiro homem), não de parâmetro; pede um desenho próprio (pesquisa de jogo posicional) antes de código.
- **Jogo posicional: medição e goleiro** (2026-11-17). Pesquisa de jogo posicional recebida (GPT): recomenda experimentos isolados (0 linha de base, 1 ocupação, 2 terceiro homem e rotações, 3 cobertura das linhas, 4 decisão do portador) e avisa que os 24% a 28% de passes no terço final não foram conferidos com a mesma definição. Medido com outra régua (40 partidas): 448 passes por time, 38 feitos no terço final (8,5%), 15,9 completados para dentro dele, 25% dos passes na metade adversária. A referência com a mesma definição (FBref "1/3", passes completados para o terço final, por time na Série A) ainda não foi conferida; não usar 24% a 28% como meta. Achados da linha de base: no meio, os alvos das tarefas com bola estão à frente (largura +9 m, entrelinhas +12 m, profundidade +24 m), mas os jogadores ficam 7 a 14 m atrás deles; 45% das amostras no meio são nos primeiros 5 s da posse (transição). Correr mais para a frente com a bola quase não muda (entrelinhas -1,3 para +1,1 m). Condução com risco só na parte disputada (zagueiro livre avança): tempo no próprio terço cai, mas gols 3,19 e passes no terço final iguais; revertido. Relato do amistoso (lado visual): zagueiros atrás do goleiro. Causa: a defesa de descanso fica 16 m atrás da bola, então com a bola a 20 a 30 m ficava na linha do gol. Corrigido (`team.ts`): com a bola, âncoras de linha pelo menos 4 m à frente do goleiro e defesa de descanso 8 m; teste de regra (antes 2,3% dos quadros por jogador, agora abaixo de 0,1%); goleiro à frente da bola e se afastando do gol 2,2% para 0,2% dos quadros (o resto é bola parada junto à linha de fundo). Bancada (300): gols 2,81, `xG` por chute 0,108, chutes 13,3, no alvo 4,3, escanteios 5,4, impedimentos 1,37 (dentro); passes 444, faltas 9,6, vermelhos 0,10 fora.
- **Calibração da estimativa de passe** (2026-11-17, commit `8258ac6`). Teste de calibração (estimado contra realizado, 40 partidas): passes rasteiros estimados em 14% a 55% chegavam em 69% a 79%. Causas: a estimativa olhava a posição atual do recebedor e o chute mira até 1,5 s à frente; o ponto final era contado duas vezes (77% das ameaças previstas); companheiro impedido era opção. Corrigido; estimativa e resultado batem de 55% a 99%; abaixo de 15% ainda pessimista (1% estimado, 34% real). Com isso a bola sobe: passes por terço 189/196/42 (antes 250/148/25), completados para o terço final 24 (antes 15,9), metade adversária 34% (antes 25%). E aparece a defesa fraca que o erro escondia: bancada (300) gols 3,86, chutes 17,5, acerto 76%, impedimentos 1,44 (na faixa). AVISO: até corrigir, partida deste ramo não é retrato do jogo; decisão de chutar e defesa da área foram calibradas sobre o erro e precisam de revisão. Diagnóstico da defesa: no chute, só 3,9 defensores de linha estão entre a bola e o gol e 0,75 no ângulo do chute; 5,9 estão à frente da bola (atacantes na âncora 1,9, zagueiros na âncora 1,15, volante guardando a zona 0,76); um terço dos chutes vem depois de conduzir 10 m ou mais (`xG` por chute 0,15). Testados e revertidos: marcador mais perto do condutor perto do gol (2 m para 1 m ou 0,6 m: gols 3,73 e 3,94), `SHOT_FOLLOW_UP` 1,3 e 1,1 (chutes 15,6 e 12,4, gols 4,19 e 3,64: a qualidade sobe e compensa), corrida de recomposição para a linha bola-gol (gols 3,57 a 3,61). Próximo: frear o condutor (contenção e cobertura: o segundo defensor fecha o caminho do gol; hoje um só pressiona), revisar a defesa da área e a decisão de chutar sobre a estimativa nova, e o resíduo pessimista abaixo de 15%.
- **Defesa perto do gol depois da correção do passe** (2026-11-17, diagnóstico; nada entrou no código). Comparado ao commit anterior à correção: chutes logo depois de receber um passe (condução menor que 3 m) foram de 1,93 para 4,02 por time; `xG` de jogada 0,63 para 0,92 e de bola parada 0,53 para 0,70 por time. Nas recepções a até 22 m do gol: defensor mais próximo a 3,7 m, 1,2 defensor a 5 m, 3,7 defensores na área, 5,4 não estão entre o recebedor e o gol; os mais próximos são o pressionador (0,80) e jogadores na âncora (0,74), raramente um marcador (0,21), porque a marcação exclui de propósito quem está a menos de 8 m da bola (evita aglomeração). Com a bola no terço final, o condutor tem o defensor mais próximo a 3,7 m e só 14% do tempo alguém a distância de desarme; o pressionador está a 6,1 m e entre o condutor e o gol em 43% das vezes. Testados e revertidos (150 partidas, ruído de cerca de ±0,1 gol): segundo pressionador entre a bola e o gol perto da área (3,45 a 3,79), corrida de recomposição para a linha bola-gol (3,57 a 3,61), as duas juntas (3,07 a 3,51 conforme o limite, sem tendência clara), marcação colada do lado da bola perto da área (3,57 a 3,68), marcar também o recebedor perto do gol (3,47 a 3,71). Nenhuma alavanca isolada tira mais de 10%. Conclusão: a defesa perto do gol precisa de desenho próprio (quem marca o recebedor, quantos ficam na área, contenção e cobertura juntas, linha), não de mais um ajuste. Também: as faixas altas da estimativa de passe ficaram otimistas (98% estimado, 90% real no meio; 97% e 89% no terço final).
- **Rodada de 2026-11-17 à tarde: defensor ideal, goleiro, métrica da Opta.**
  - **Método.** Com 150 partidas, a média de gols oscila cerca de ±0,16 só por acaso. Os ganhos de "10%" medidos antes com 150 partidas estão dentro do ruído. Decidir com 600 partidas (cerca de 3,5 min).
  - **Defensor ideal** (`02` §5.12): com cumprimento sempre, leitura do passe na hora, antecipação de 1 s e marcação a 1 m, os gols caem de 3,86 para 2,63. O excesso vem da defesa. O marcador fica a 6–10 m do ponto em todas as variantes. Trocar quem pega a marca não resolve.
  - **Bug do goleiro corrigido** (`a3c1dd1`): na bola longa que ninguém alcançava em voo, ele corria até onde a bola morreria. O atacante dominava antes e chutava com o gol vazio. Agora ele só sai se encontra a bola em voo antes do adversário mais rápido. Em 2000 partidas, mesmas sementes: gols de 3,80 para 3,61 (−5%). A medida de 600 partidas (3,92 para 3,49) era otimista.
  - **Métrica da Opta, recuperação alta que vira chute** (`045982f`, depois corrigida). A primeira correção usou uma janela de 10 s que veio de memória, sem fonte. A busca não confirmou essa janela. Pelas fontes achadas (Sky Sports; Opta Analyst via premierleague.com, Premier League 2025/26: 14,9%), conta a sequência que começa em jogo corrido a até 40 m do gol adversário e termina em chute. A sequência acaba quando o adversário toma a bola ou o jogo para (falta, impedimento, lateral, escanteio, tiro de meta, tiro livre, gol). Medido assim em 200 partidas: 18,2 recuperações altas por jogo, 29,4% viram chute (referência 13% a 21%). Contagens antigas: 38% pela posse inteira e 26% com a janela de 10 s; nenhuma das duas segue a definição.
  - **Conversão por distância** (120 partidas):

    | Distância | Conversão | `xG` do motor | Nota |
    |---|---|---|---|
    | até 6 m | 0,16 | 0,30 | abaixo do `xG` |
    | 16,5–20 m | 0,085 | 0,072 | acima do `xG` |
    | 20–25 m | 0,067 | 0,049 | acima do `xG` |

    No total os gols ficam perto do `xG`, mas a divisão pela parte livre (`shotClear`) desloca gol de perto para longe. Não muda a média. Fica para depois.
  - **Achado principal em aberto: conduções longas até o chute.** São 5,0 por time por jogo, de 20 m em 4,4 s, a 4,8 m/s. No caminho, os defensores do lado do gol caem de 4,2 para 1,6. A primeira medida (6,7) contava através de bola parada e foi corrigida. Em geral o pressionador está a 1–3 m, mas o desarme só acontece a até 1,4 m (só 9% do tempo da condução no campo adversário). Os defensores da linha só entram no lance a até 1,0 m fora do terço defensivo. Ampliar essa zona para 45 m e 60 m mudou pouco (3,60 e 3,54 contra 3,69, em 300 partidas). Também em aberto: só 3,6 passes completos para dentro da área por time, contra 9,8 chutes de dentro dela. Quem chega à área chuta quase sempre.
- **Contenção do condutor** (2026-11-17, `58f31ad`, `02` §5.12). Na nossa metade, o defensor de linha mais próximo do lado do gol, a até 6 m, sai para fechar o condutor. Em 2000 partidas: gols 3,61 para 3,44, faltas 10,9 para 12,3, amarelos 2,47 para 2,91 (fora da faixa). Ruído com 600 partidas: cerca de ±0,1 gol. Uma instrumentação que consome sorteio muda a amostra inteira. Cartões por tipo de falta (200 partidas, por time):

  | Tipo | Faltas | Taxa de cartão | Amarelos |
  |---|---|---|---|
  | De frente | 5,1 | 0,13 | 0,65 |
  | Por trás | 4,7 | 0,25 | 1,15 |
  | Tática | 1,95 | 0,60 | 1,16 |
  | Aérea | 0,56 | 0,11 | 0,06 |

  Ordem proposta: primeiro as faltas de disputa aérea, que estão baixas. Depois calibrar o cartão por falta, com a Série A em cerca de 0,16 amarelo por falta.
- **Defensor recém-batido volta para a contenção** (2026-11-18, `4993c56`, `02` §5.12). Quem está até 2 m atrás do condutor também conta para a contenção. Em 2000 partidas, mesmas sementes: gols 3,53 para 3,23, gols por chute 0,137 para 0,129, chutes 12,9 para 12,5, faltas 11,5 para 12,8, amarelos 2,74 para 3,17. Cartões por tipo de falta depois da mudança (200 partidas, por time):

  | Tipo | Faltas | Taxa de cartão | Amarelos |
  |---|---|---|---|
  | De frente | 5,40 | 0,12 | 0,66 |
  | Por trás | 5,00 | 0,26 | 1,29 |
  | Tática | 2,01 | 0,59 | 1,19 |
  | Aérea | 0,47 | 0,07 | 0,03 |

  As duas faixas com fonte apontam para a mesma causa: faltas abaixo (12,8 contra 13,4 a 15,9) e amarelos acima (3,17 contra 2,15 a 2,59). Faltam faltas comuns, que quase nunca dão cartão, como as das disputas aéreas. O próximo passo, a disputa aérea, depende da referência de duelos aéreos por jogo com fonte e mesma definição.
- **Marcação que persiste** (2026-11-17, não entrou). Das marcas perdidas, 32% somem porque o atacante chega a menos de 8 m da bola, 25% porque ele fica atrás da bola e 26% por ranking. Testado em 2000 partidas: manter a marca até 3 m da bola deu 3,43 gols. Somar 8 m de vantagem a quem já é marcado na lista de perigo, mantendo a marca até 5 m, deu 3,39. A base é 3,44. Nenhuma diferença, e as duas reprovam o vão da última linha em S3. Conclusão: a escolha de quem marcar pesa pouco nos gols.
- **Transição depois da perda alta** (2026-11-17, só medição, 40 partidas).
  - Das recuperações a até 40 m do gol adversário que viram chute, metade chuta em menos de 3 s. A bola é recuperada a cerca de 25 m do gol, quase sempre interceptando passe da saída.
  - Defensores do lado do gol: 4,3 na recuperação e 3,1 dois segundos depois quando vira chute; 5,0 e 5,7 quando não vira.
  - 2 s depois da perda, quem está à frente da bola volta a 3 m/s ou menos rumo ao próprio gol. São sobretudo atacantes, que ficam altos por desenho, e zagueiros que correm de volta. Nada quebrado na física: aceleração e virada valem igual para os dois lados.
  - Saída de bola: 187 passes por time no próprio terço. São 9,9 interceptações por time: bola longa de 50% a 90% de chance estimada (2,2), passe curto estimado em 99% (1,9) e bola longa abaixo de 50% (1,5).
  - Bloqueios por falta de referência publicada na mesma definição:
    1. passes longos por time na Série A (FBref, 30 jardas);
    2. completude e volume de passes no terço defensivo;
    3. disputas aéreas por jogo.
  - Sem essas referências, os próximos ajustes seriam calibração sem fonte, que o dono vetou.
- **Estado da bancada ao fim de 2026-11-17** (2000 partidas, `4af1120`).
  - Dentro da faixa: acerto de passe 79,9%, impedimentos 1,45, vermelhos 0,14, distância 9,9 km.
  - Fora da faixa: gols 3,33 (2,2 a 2,5); chutes 16,3 (12,6 a 13,6); no alvo 5,4; gols por chute 0,102 (0,085 a 0,10); passes 439 (415 a 428); faltas 11,8; amarelos 2,82; escanteios 6,6.
  - A bancada agora compara gols sobre chutes com a faixa de conversão. O `xG` por chute do motor (0,126) sai sem faixa (`22d8311`).
  - Entraram nesta rodada:
    - `LOFT_COST` 0,01 (`8629e20`): passes de 40 m ou mais de 18% para cerca de 13%; teto de 13,8% do quarto time mais direto da Série A 2025 (Flashscore).
    - Impedimento lido pelo passador recalibrado (`4af1120`).
  - Dependências: escanteios vêm 4,3 por time de chute bloqueado (`engine.ts`, 0,72 dos bloqueios vão a escanteio). Escanteios, cartões e chutes no alvo dependem do excesso de chutes. Calibrar esses parâmetros antes de corrigir o volume de chances inverteria o ajuste depois.
  - Origem que sobra: chances demais. Os gols por chute estão quase na faixa; o volume de chutes está 25% acima.
- **`SHOT_FOLLOW_UP` de 1,6 para 1,2** (2026-11-17). Medido no próprio motor (150 partidas): os chutes seguintes do mesmo time, até perder a bola e em até 90 s, somam cerca de 0,2 de `xG` por unidade de chance. Em 2000 partidas:

  | Medida | Antes | Depois | Faixa Série A |
  |---|---|---|---|
  | Chutes por time | 16,3 | 12,9 | 12,6 a 13,6 |
  | Passes por time | 439 | 419 | 415 a 428 |
  | Escanteios por time | 6,6 | 5,8 | 5,05 a 5,51 |
  | No alvo por time | 5,4 | 4,7 | 4,0 a 4,6 |
  | Gols por jogo | 3,33 | 3,47 | 2,2 a 2,5 |
  | Gols por chute | 0,102 | 0,134 | 0,085 a 0,10 |

  Com menos chute ruim, o time trabalha a bola até uma chance melhor. O excesso agora é só de qualidade de chance (`xG` por chute 0,172): a defesa perto do gol.
- **Impedimento pelo tempo do lance** (2026-11-17, decisão do dono). O ajuste que piorava a leitura do passador (10% na linha, certeza a 3,6 m) foi desfeito. A leitura voltou a 30% na linha e certeza a 2 m, aplicada sobre o que ele percebe com atraso `PERCEPTION_LAG` (0,45 s). Impedimentos 1,29 por time (faixa 1,32 a 1,75). Próximo passo: o atacante que sai cedo na corrida conforme o `timing`.
- **Atacante sozinho rumo ao gol** (2026-11-17 à noite, só medição; nada entrou).
  - As melhores chances vêm de condução de 10 m ou mais até o chute: `xG` de 0,23 a 0,25 por chute, cerca de 1,0 de `xG` por time por jogo, de 1,57 em jogo corrido. Na hora do chute há em média 0,7 defensor de linha entre o chutador e o gol.
  - Medida: 8,6 lances por time por jogo com o portador a menos de 25 m do gol e nenhum defensor de linha do lado do gol. Esses lances nascem depois de desarme (2,2), bola longa (2,1), passe (2,0) e passe por cima (1,2). A pressão no passador é baixa (0,17). Essa medida não é "grande chance" da Opta (lance em que se espera o gol) e não se compara com ela; a comparação anterior com "cerca de 2 por time" usava número de memória e foi retirada.
  - Protótipos, todos revertidos:

    | Protótipo | Partidas | Gols por jogo | Nota |
    |---|---|---|---|
    | Base | 2000 | 3,53 | |
    | Goleiro sai a 16 m quando o atacante está sozinho | 600 | 2,93 | chutes 11,3; 5,5 abafadas por time (era 1,35) |
    | Goleiro sai a 25 m | 600 | 2,97 | |
    | Perseguição pelo mais próximo | 600 | 3,77 | |
    | Goleiro a 20 m mais perseguição | 600 | 2,87 | |
    | Linha recua 4 m com bola sem pressão | 600 | 3,97 | |
    | Linha recua 8 m com bola sem pressão | 600 | 4,52 | |
    | Linha sobe 4 m com bola sem pressão | 600 | 3,21 | |

  - Leitura:
    - O goleiro que sai faz efeito, mas o volume de abafadas mostra o defeito anterior: o atacante fica sozinho vezes demais.
    - A linha que recua sem pressão, como no futebol real, piora no motor, e a que sobe melhora. O espaço que o motor entrega está entre as linhas e à frente da defesa, não nas costas dela.
    - Próximo passo: medir a compactação (distância entre as linhas e largura) contra referência publicada e corrigir a forma sem a bola. Não inverter o princípio da linha.
- **Forma do time** (2026-11-17, só medição; nada entrou).
  - Medida em 10 partidas, fora dos 8 s seguintes à troca de posse:

    | Situação | Comprimento | Largura |
    |---|---|---|
    | Sem a bola | 27,5 a 30,6 m | 41 a 46 m |
    | Com a bola | 41 a 50 m | 59 a 60 m |

  - A faixa de `02` §11 (31 a 46 m de comprimento, 35 a 48 m de largura, "tudo maior com a posse") não separa com e sem a bola. Por isso não serve para calibrar a largura com a bola.
  - Os 60 m vêm da tarefa `width`: os dois pontas a 3 m das laterais.
  - Teste revertido: o ponta do lado longe da bola entra 12 m. A largura caiu para 46,7 m, mas os gols ficaram iguais (3,56 em 600 partidas) e a prova reprovou S3 e T9.
  - Pendente: largura publicada com a bola. Sem a bola, o time fica até um pouco abaixo do comprimento da faixa, então a forma defensiva não é o defeito.
- **Atacante sozinho, métrica corrigida** (2026-11-17, só medição).
  - Definição nova: nenhum defensor de linha a até 5 m da linha que liga o portador ao gol, com ele a menos de 25 m do gol.
  - A conta por x antiga marcava como sozinho o ponta perto da linha de fundo com zagueiros na área.
  - Resultado: 8,2 lances por time por jogo, de 1,4 s em média; 34% terminam em chute, cerca de 2,8 chutes por time.
  - Último passe antes: bola longa 2,4, passe 1,8, desarme 1,5, passe por cima 1,2, passe em profundidade 0,7.
  - No passe que antecede o lance, o recebedor está a 34 m do gol, com 4,3 defensores à frente dele e o mais próximo a 5,4 m. Só em 3% dos casos ele já estava atrás da última linha.
  - Ou seja: o atacante não recebe nas costas da defesa. Ele recebe na frente e passa por ela nos segundos seguintes.
  - Sem referência publicada de grandes chances ou de distância média do chute (a página da Driblab não abre por leitura simples), não dá para dizer quanto disso é excesso. Um lance de 1,4 s sem defensor no caminho nem sempre é grande chance; só 2,8 chutes por time saem deles. Para comparar com grande chance é preciso a mesma definição (chance em que se espera o gol), não esta.
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
