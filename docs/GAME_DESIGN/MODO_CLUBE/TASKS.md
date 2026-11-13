# Modo Clube — tarefas

Data: 2026-11-13, revisão 4. Ordem e cortes: `ROADMAP.md`. Testes: `TEST_STRATEGY.md`.

Status: TODO, DOING, BLOCKED, REVIEW, DONE. Prioridade: P0 (trava o corte jogável 1), P1 (corte 2), P2 (corte 3), P3 (depois). Tamanho: P (até meio dia), M (até 2 dias), G (até 1 semana), XG (dividir antes de começar). "Feito" significa teste executado e verde, não documento escrito. IDs são estáveis; tarefas novas da revisão 2 começam em MC-140 e as da revisão 3, em MC-200.

## Fase 0 — Auditoria e especificação

| ID | Tarefa | Status | Entrega |
| --- | --- | --- | --- |
| MC-001 | Auditar repositório | DONE | `01-ARQUITETURA.md` §1 |
| MC-002 | Pesquisa em sete frentes | REVIEW | `docs/pesquisa/modo-clube/01..07` (lacunas listadas em cada arquivo) |
| MC-003 | Visão e produto | REVIEW | `00-VISAO-E-PRODUTO.md` (revisão 2) |
| MC-004 | Arquitetura | REVIEW | `01-ARQUITETURA.md` (revisão 2) |
| MC-005 | ADRs 013 a 017 | REVIEW | `docs/ADR/` |
| MC-006 | Engine, tática, campo 2D | REVIEW | `02-MATCH-ENGINE.md` (revisão 2) |
| MC-007 | Jogadores, treino, base, pacote | REVIEW | `03-JOGADORES-E-BASE.md` (revisão 2) |
| MC-008 | Clube, economia, rivais, eventos | REVIEW | `04-CLUBE-E-MUNDO.md` (revisão 2) |
| MC-140 | Competições e calendário | REVIEW | `05-COMPETICOES-E-CALENDARIO.md` |
| MC-141 | Comissão, governança, carreira do treinador | REVIEW | `06-COMISSAO-E-GOVERNANCA.md` |
| MC-142 | Estratégia de testes e roteiro | REVIEW | `TEST_STRATEGY.md`, `ROADMAP.md` |
| MC-218 | Mercado e contratos; saúde, desempenho e bem-estar (revisão 3) | REVIEW | `07-MERCADO-E-CONTRATOS.md`, `08-SAUDE-DESEMPENHO-E-BEM-ESTAR.md` |
| MC-219 | Verificar as fontes citadas na revisão 3 | DONE | `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md`: 5 confirmadas, 6 parciais, 1 divergente; marcas trocadas nos documentos |
| MC-245 | Pedir permissão escrita para usar dados públicos de rastreamento e de eventos na calibragem, ou descartá-los | TODO, P1, P | resposta registrada; MC-204 só começa com permissão |
| MC-009 | Fechar faixas de calibragem com as partidas reais do banco (gols, mando, por divisão) | DONE (gols e resultado das Séries A e B; C e D sem partidas no banco) | `docs/pesquisa/modo-clube/12-calibragem-dados-proprios.md`; tabela de `02` §11 |
| MC-143 | Conferir no regulamento integral da CBF os números de transição da regra financeira (a pesquisa achou divergência) | DONE (regulamento integral lido; `docs/pesquisa/modo-clube/09-regulamentos-conferidos.md`) | tabela de `04` §4.5 sem divergência |
| MC-144 | Conferir requisitos de licença vigentes (fonte lida é de 2017) | DONE no que está publicado (regulamentos de 2026 por série; quadro de licença de clubes por divisão não encontrado) | `06` §2.4 com fonte atual |
| MC-010 | Aprovação do dono e respostas às questões abertas (`ROADMAP.md` §4) | DONE (specs aprovadas em 2026-11-13; questões 14 a 19 decididas; 1 a 13 seguem com a proposta registrada até decisão contrária) | aprovação ou lista de mudanças |

## Fase 2 — Sandbox da engine (concluída)

| ID | Tarefa | Status | Teste executado |
| --- | --- | --- | --- |
| MC-021 | `random.ts` com semente e fluxos | DONE | `sandbox.test.ts` › random |
| MC-022 | `pitch.ts`: campo, conversão time↔mundo, zonas, corredores | DONE | › pitch |
| MC-023 | `shape.ts`: duas formações, âncora por bola, largura, altura da linha | DONE | › shape |
| MC-024 | `movement.ts`: aceleração, velocidade máxima, separação | DONE | › movement |
| MC-025 | `sandbox.ts`: 22 jogadores, passo fixo, bola por roteiro | DONE | › sandbox |
| MC-026 | Três instruções com efeito medido | DONE | › instructions (8 de 8 sementes) |
| MC-027 | Quadros a 4 Hz; trechos = inteiro | DONE | › sandbox |
| MC-028 | Benchmark | DONE | `pnpm --filter @decabeca/match-engine bench` |
| MC-029a | Rota `POST /v1/manager/sandbox` | DONE | `manager.int.test.ts` (3 testes) |
| MC-029b | Página `/tecnico/sandbox` | DONE | `e2e/tecnico.spec.ts` |
| MC-030 | Medir quadros por segundo em celular real; canvas puro ou PixiJS | TODO, P0, P | manual; registrar no ADR-015 |

Não verificado: aparência do campo por olho humano e desempenho em aparelho real.

Benchmark MC-028 (2026-11-13; escopo e ambiente em `02` §11): 94 ms por 90 minutos só de movimento e âncoras; 130 ms com quadros em JSON; quadros de 90 minutos = 3,9 MB brutos, 1,5 MB comprimidos; trecho de 5 minutos = 87 KB comprimido.

## Fundações transversais (revisão 2)

| ID | Tarefa | P | Tam | Dep | Aceite | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| MC-145 | DONE. `match-engine/src/contract.ts`: tipos e esquemas de `MatchInput`, `MatchResult`, eventos, quadros; raiz do pacote exporta só contrato e funções `simulate*` | P0 | M | 025 | `club-domain` e API compilam importando só a raiz; importação profunda falha no lint | `contract.test.ts` (10 testes, inclui caso de lint que falha); `club-domain` ainda não existe, a regra já cobre `packages/**` |
| MC-262 | Direção visual imersiva e premium do modo (`00` §7.1): paleta, tipografia, campo, componentes base, em 360 px e 1.280 px | P0 | M | 146 | aprovada pelo dono antes de MC-250; nenhuma tela do modo fora dela | captura de tela nas duas larguras revisada |
| MC-146 | DONE. `t(key, params)` do modo sobre `Intl` (plural, número, moeda, data) e arquivo `pt-BR` | P0 | M | — | plural e moeda corretos em `pt-BR` e em `en` de teste; chave ausente falha no build | `i18n/i18n.test.ts` (7 testes; chave ausente é erro de tipo, coberto por `@ts-expect-error` no `typecheck`) |
| MC-147 | DONE. Regra de lint: texto literal em `apps/web/src/games/manager/**` é erro | P0 | P | 146 | componente com texto fixo falha | `lint.test.ts` (5 casos que falham, 5 que passam, 1 fora do modo) |
| MC-148 | DONE. Passar a página da sandbox para chaves de tradução | P0 | P | 146, 147 | nenhuma exceção à regra MC-147 no modo | lint e `e2e/tecnico.spec.ts` |
| MC-149 | Engines devolvem chave e parâmetros, nunca frase (explicação, eventos, cartas) | P0 | P | 145 | busca por texto em português nos dois pacotes de domínio não acha mensagem ao usuário | teste que percorre as saídas |
| MC-150 | Grade responsiva do modo: uma, duas e três colunas; atalhos de teclado do campo | P0 | M | 029b | mesma tela em 360 px e 1.280 px sem rolagem lateral; pausa e velocidade por teclado | E2E nas duas larguras |
| MC-151 | Campo 2D em pé no celular em retrato e deitado quando há largura | P1 | M | 029b | jogadores legíveis em 360 px de largura | E2E com captura de tela revisada |
| MC-152 | Pontos de extensão de venda: itens de aparência como dado, limite de carreiras por conta, cenário como arquivo de início | P2 | M | 081 | carreira iniciada por cenário fica fora de ranking; limite respeitado | integração |
| MC-153 | Aparência vendável do modo na loja existente (uniformes, temas de estádio, treinador) | P3 | G | 152 | item comprado aparece e não altera nenhuma variável de simulação | teste de que `MatchInput` é igual com e sem o item |

## Fase 1 — Dados

| ID | Tarefa | P | Tam | Dep | Aceite | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| MC-011 | DONE. `packages/club-domain`; esquema zod do pacote (`03` §1.1), com `kind`, competições, comissão, governança | P0 | G | 145 | pacote inválido é rejeitado com o caminho do erro | `src/pack/schema.test.ts` (8 testes); regras de consistência ficam na MC-017 |
| MC-012 | DONE. Posições, 28 + 6 atributos, nota por função | P0 | M | 011 | nota por função muda com o atributo que a função pesa | `src/player/ratings.test.ts` (4 testes); pesos por função são PARÂMETRO |
| MC-013 | DONE. Gerador de jogador, de elenco e de comissão por semente | P0 | M | 012 | mesmo comando, mesmo resultado; elenco passa na validação | `src/generate/generate.test.ts` |
| MC-014 | DOING (`br-dev-mini` pronto para o corte 0,5, 8 clubes; `br-dev-1` e competições com fases dependem da MC-160). Gerador dos pacotes fictícios `br-dev-1` e `br-dev-mini`, com uma competição de cada tipo de fase | P0 | G | 013, 160 | arquivos idênticos byte a byte entre execuções; volumes do `br-dev-1` dentro de 20% dos reais | teste de `checksum` |
| MC-015 | Importador CSV e JSON com arquivo de mapeamento | P1 | G | 011 | fixture de CSV e de JSON viram o mesmo pacote | unidade |
| MC-016 | Normalização e deduplicação com relatório de conflito | P1 | M | 015 | duplicata nunca é resolvida em silêncio | unidade |
| MC-017 | Validação de consistência (`03` §1.3) | P0 | M | 011 | cada regra tem um caso que falha | unidade |
| MC-018 | Relatório de qualidade e cobertura por clube e divisão | P1 | M | 015–017 | origem por campo soma 100% por clube | unidade |
| MC-019 | Versão, `checksum`, carga na API; carreira presa ao pacote | P0 | M | 011, 081 | pacote novo não altera carreira antiga | integração |
| MC-154 | Critério de publicação de pacote real (`03` §1.6): bloqueia jogador gerado em elenco real e clube abaixo da cobertura | P1 | M | 017, 018 | pacote real com um jogador gerado ou um clube com 21 jogadores não publica | unidade com fixtures que falham |
| MC-155 | Marca `estimado` por campo e regras declaradas de estimativa de atributo ausente | P1 | M | 015 | nenhum campo de identidade pode ser estimado | unidade |
| MC-156 | Pacote real `br-<temporada>`: clubes e competições das quatro divisões conforme regulamento | P1 | G | 160, 015 | número de clubes e de fases confere com `05`, competição por competição | teste por competição |
| MC-157 | Pacote real: elencos e comissões das quatro divisões a partir dos arquivos fornecidos pelo dono | P1 | XG | 154–156 | relatório de cobertura acima do critério nas quatro divisões | linha de comando de publicação |
| MC-020 | Produtor a partir do banco do site (plano de 2026-11-12, adaptado) como uma das entradas | P2 | G | 015 | relatório de qualidade gerado | linha de comando |

## Fase 3 — Engine de partida (nível 1)

| ID | Tarefa | P | Tam | Dep | Aceite e teste |
| --- | --- | --- | --- | --- | --- |
| MC-031 | DONE (2026-11-13; `src/match/state.ts`, `match.test.ts`). Estado completo e serialização (`02` §3) | P0 | M | 145 | desserializar e seguir = seguir direto |
| MC-032 | DONE (2026-11-13; `src/match/control.ts`). Controle de campo e grade de valor de posse | P0 | M | 022 | ponto atrás da defesa vale mais para o atacante mais rápido |
| MC-033 | DONE (2026-11-13; atribuição de tarefas da MC-246, cenário S2 de `coordination.test.ts`). Alvo sem bola por utilidade; cobertura e compensação | P0 | G | 032 | cenário: lateral sobe, volante cobre |
| MC-158 | Histerese de alvos (`02` §5.5) | P0 | M | 033 | trocas de alvo por jogador por minuto abaixo do teto; nenhuma oscilação A-B-A em menos de 2 s |
| MC-159 | Percepção limitada: campo visual, memória envelhecida, atraso de reação, lapso (`02` §5.6) | P0 | G | 033 | jogador não reage a adversário fora do campo visual até vê-lo; `antecipação` alta reduz o atraso |
| MC-034 | DONE (2026-11-13; `src/match/carrier.ts`). Ação com bola: candidatos, softmax; decisão separada de execução com marca no log (`02` §5.7) | P0 | G | 032, 159 | `visão` baixa reduz passes em profundidade tentados; log distingue "escolheu mal" de "executou mal" |
| MC-161 | DONE (2026-11-13; `ball.ts`, `ball.test.ts` com `DT` 0,1 e 0,25). Bola: rolando com atrito, no ar com altura e quique, tempo de chegada em forma fechada (`02` §6.1) | P0 | G | 031 | interceptação independe do tamanho do passo (teste com `DT` de 0,1 e 0,25) |
| MC-035 | DONE (2026-11-13; `src/match/kick.ts`). Passe com erro de execução, recepção, interceptação | P0 | G | 034, 161 | acerto de passe cai com distância e pressão |
| MC-162 | DONE (2026-11-13; `rules/duel.ts` `tackleChance`, `rules/discipline.ts`). Ocupação e contato: discos, proteção de bola, carga (`02` §6.2) | P0 | M | 035 | desarme por trás é mais difícil e gera mais falta |
| MC-036 | DONE (2026-11-13; `rules/duel.ts` `dribbleChance`). Condução, drible × desarme, falta | P0 | M | 162 | drible alto vence mais em 1×1 isolado |
| MC-163 | DONE (2026-11-13; `rules/duel.ts` `aerialScore`, perdedor segue no lance com a bola solta). Disputa aérea e segunda bola (`02` §6.3) | P0 | M | 161 | `impulsão` e altura maiores vencem mais; perdedor disputa o rebote |
| MC-037 | DOING (fôlego e distância na faixa; falta o teste de pressão 5 e a queda no fim). Pressão com gatilhos; fôlego; reavaliação dos parâmetros físicos contra a pesquisa | P0 | G | 033 | pressão 5 gasta mais fôlego e recupera mais alto; distância por jogador e queda no fim na faixa |
| MC-038 | DONE (2026-11-13; `rules/xg.ts`, `kick.ts` `shoot`). Finalização e `xG` | P0 | G | 035 | conversão por distância na faixa de referência |
| MC-164 | DONE (2026-11-13; posição na linha bola-gol, defesa, rebote, saída no um contra um). Goleiro: posicionamento, alcance, reação, rebote, saída (`02` §6.4) | P0 | G | 038 | chute fora do alcance não é defendido; `reflexos` desloca a taxa de defesa |
| MC-039 | DOING (falta, pênalti, cartões, segundo amarelo, reinícios e substituições feitos; falta vantagem). Árbitro: falta, cartão, vantagem, pênalti, reinícios, substituições (`02` §6.5) | P0 | G | 036 | cada regra com cenário próprio |
| MC-165 | DONE (2026-11-13; `kick.ts` `offsideNow`, seis cenários). Impedimento completo: instante do passe, penúltimo adversário, participação, exceções | P0 | M | 039 | seis cenários de regra, incluindo exceções de tiro de meta, lateral e escanteio |
| MC-040 | DOING (reinícios, relógio, acréscimos e prorrogação feitos; bola rolando em ~60 min, acima da faixa; pênaltis de desempate não feitos). Bola parada básica; relógio e acréscimos; prorrogação e pênaltis | P0 | M | 039 | bola rolando entre 52 e 58 minutos |
| MC-041 | Lesão e substituição | P0 | M | 037 | taxas por 1.000 h na faixa de `03` §4 |
| MC-042 | DOING (eventos e estatísticas fecham com o placar; faltam mapas por zona e matriz de duelos). Eventos, estatísticas, mapas, matriz de duelos | P0 | M | 035–041 | soma dos eventos fecha com o placar |
| MC-043 | Explicação: criação × conversão, fatores com número, chaves de mensagem (`02` §11) | P0 | G | 042, 149 | cenário montado devolve a causa montada; partida decidida por conversão diz isso |
| MC-044 | Bancada estatística contra `02` §11 | P0 | M | 042 | todas as linhas na faixa |
| MC-166 | Suíte de zebra Z1 a Z12 (`TEST_STRATEGY.md` §4) | P0 | G | 043, 044 | doze cenários verdes; a engine não recebe qual time é do usuário |
| MC-045 | Torneio de presets | P0 | M | 044 | nenhum preset acima de 60% contra todos |
| MC-047 | Desempenho: partida do usuário até 1 s | P0 | M | 044 | benchmark registrado com ambiente |
| MC-048 | **Portão**: dono assiste a 10 partidas | P0 | — | 044–047, 166 | aprovado ou lista de defeitos |

## Engine por posses (nível 2)

| ID | Tarefa | P | Tam | Dep | Aceite e teste |
| --- | --- | --- | --- | --- | --- |
| MC-046 | Engine por posses em 18 zonas, jogador contra jogador (`02` §12) | P0 | XG | 145, 012 | eventos nomeados; até 2 ms por partida |
| MC-046b | Equivalência **estatística** com o nível 1 | P0 | G | 046, 044, 252 | cinco grupos de métricas equivalentes em toda a matriz de confrontos, pelo protocolo de `TEST_STRATEGY.md` §2.1 |
| MC-167 | Testes de coerência tática próprios do nível 2 | P0 | M | 046 | cada instrução move a métrica declarada no sentido declarado |
| MC-168 | Rodízio de elenco dos rivais por fadiga e por prioridade entre competições | P1 | M | 046, 160 | time em duas competições na semana não repete os onze com fôlego abaixo do limite |

## Competições, calendário e carreira

| ID | Tarefa | P | Tam | Dep | Aceite e teste |
| --- | --- | --- | --- | --- | --- |
| MC-160 | Esquema de competição como dado: fases, origem e destino de participantes, desempates, inscrição (ADR-016) | P0 | G | 011 | as competições de `05` §8 são representáveis sem campo livre |
| MC-169 | Interpretador de fase `liga` (turno único e returno) com critérios de desempate em ordem | P0 | M | 160 | tabela conhecida com empate em cada critério |
| MC-170 | Fase `grupos` | P0 | M | 169 | classificados e melhores colocados entre grupos |
| MC-171 | Fase `mata-mata`: jogo único, ida e volta, prorrogação, pênaltis, vantagem | P0 | M | 160 | cada regra de desempate com caso próprio |
| MC-172 | Destinos: acesso, descenso, vaga em outra competição, transição de tamanho entre temporadas | P0 | G | 169–171 | toda vaga preenchida uma vez; Série C de 20 para 24 por regra do pacote |
| MC-173 | Calendário global: dias, eventos, janelas de data por competição, prioridade, adiamento, descanso mínimo | P0 | G | 160 | nenhum clube joga duas vezes no dia; adiamento registrado |
| MC-174 | Janelas de transferência e de inscrição como eventos do calendário | P1 | P | 173 | operação fora da janela devolve 409 |
| MC-081 | Tabelas Prisma (`01` §5) e módulo `manager` | P0 | M | 011 | migração aplicada; posse testada com dois usuários |
| MC-175 | Livro-caixa como única origem: sem coluna de saldo; cache derivado e conferido | P0 | M | 081 | caixa = soma em todo avanço; cache = soma |
| MC-084 | `POST /v1/manager/calendar/advance`: resolve o intervalo numa transação idempotente e para na próxima decisão | P0 | G | 173, 046, 175 | mesma chave, mesma resposta; duas requisições simultâneas, um efeito |
| MC-176 | Início por escolha livre (`free_choice`) | P0 | M | 081 | qualquer clube das divisões nacionais do pacote; estado inicial igual ao do pacote |
| MC-177 | Início por propostas (`job_offers`): gerador de três propostas distintas em orçamento, torcida, estrutura, comissão, elenco e ambição | P0 | M | 081 | três clubes da última divisão com perfis diferentes segundo uma métrica de distância; reprodutível por semente |
| MC-178 | Propostas dependem de reputação e experiência do treinador | P1 | M | 177, 190 | reputação maior abre clubes de divisão acima |
| MC-179 | Temporada completa sem usuário em `br-dev-1` e `br-dev-mini` | P0 | M | 084 | suíte de `TEST_STRATEGY.md` §6 verde nos dois |
| MC-180 | Copa nacional e supercopa (conteúdo do corte 3) | P2 | M | 171, 156 | formato confere com `05` |
| MC-181 | Estaduais e copas regionais (corte 4) | P3 | XG | 172, dados | depende da questão aberta 3 |
| MC-182 | Continentais (corte 5) | P3 | XG | 171, pacote sul-americano | formato confere com `05` |
| MC-183 | Operações: viagem, concentração, pré-temporada, amistosos, custo e fadiga por distância | P2 | M | 173 | jogo fora a mais de N km aumenta custo e reduz fôlego inicial |

## Comissão, governança e carreira do treinador

| ID | Tarefa | P | Tam | Dep | Aceite e teste |
| --- | --- | --- | --- | --- | --- |
| MC-184 | Modelo de pessoa, vínculo, acúmulo e terceirização (`06` §2.1–2.2) | P0 | M | 011 | acúmulo reduz o rendimento na proporção do parâmetro |
| MC-185 | Departamentos e nível efetivo; versão rasa para o corte 1 (seis departamentos, um número cada) | P0 | M | 184 | departamento sem ocupante tem nível zero e nada quebra |
| MC-186 | Efeito dos departamentos em treino, lesão, moral, observação, comercial, com teto por departamento | P1 | G | 185, 073, 041 | teto de 2 pontos respeitado em 2.000 partidas |
| MC-187 | Mercado de comissão: contratar, demitir, multa, grupo do treinador, laços | P1 | G | 184 | troca de treinador move o grupo dele e só ele |
| MC-188 | Pedidos semanais aos departamentos e sugestões ao vivo do auxiliar e do analista | P1 | M | 186, 043 | auxiliar fraco sugere mais tarde e erra mais em cenário montado |
| MC-189 | Requisitos de licença por competição | P2 | P | 160, 144 | clube sem requisito tem inscrição bloqueada |
| MC-190 | Perfil, reputação, licença e estilo medido do treinador | P1 | M | 042 | estilo calculado bate com o plano usado em 20 partidas |
| MC-191 | Trocar de clube na mesma carreira; clube antigo passa a ser conduzido por regra | P1 | G | 190, 084 | mundo íntegro depois da troca (invariantes) |
| MC-192 | Modelos de propriedade e alçada do usuário (`06` §5.1–5.2) | P1 | G | 081 | pedido acima da alçada devolve 409 sem aprovação |
| MC-193 | Três confianças (direção, torcida, elenco), metas, ultimato e demissão | P1 | M | 192 | sequência de derrotas montada leva a ultimato e depois a demissão |
| MC-194 | Eventos de governança: eleição, troca de dono, virar SAF, aporte, conflito | P2 | M | 192, 128 | cada evento altera metas e caixa conforme o dado |
| MC-195 | Comissão dos rivais: contratação por utilidade e frequência de trocas na faixa | P1 | M | 187 | 30 temporadas: nenhum clube sem treinador além do limite |

## Tática, comandos, treino, economia, torcida, base, rivais, experiência

Tarefas herdadas da revisão 1. Entram em detalhe (aceite e teste por linha) quando a fase começa; a especificação de cada uma já existe no documento citado.

- **Tática (P0 raso, P1 fundo; `02` §8)**: MC-050 formações por fase · MC-051 funções · MC-052 instruções de time com tabela "o que move" · MC-053 instruções individuais · MC-054 marcação · MC-055 precedência · MC-056 familiaridade e complexidade · MC-057 presets de estilo · MC-058 editor (toque, mouse, teclado) · MC-059 notas de setor antes do jogo · MC-060 teste causal por instrução.
- **Comandos e bola parada (P1; `02` §8.6, §9, §10)**: MC-061 protocolo e rota `match/advance` · MC-062 a MC-066 comandos, gritos, substituição, histórico · MC-067 replay · MC-068 a MC-070 bola parada · MC-071 treinador adversário.
- **Treino e desenvolvimento (P1; `03` §3–6)**: MC-072 a MC-079.
- **Economia (P0 raso, P1 fundo; `04` §3–6)**: MC-085 mercado em rodadas de oferta · MC-087 receitas e despesas por linha (`04` §4.2–4.3) · MC-088 patrocínio por propriedade com contrato fixo, variável ou misto · MC-089 TV e premiação por competição · MC-090 obras · MC-092 dívida e crise · MC-093 painel (competência e caixa) · MC-094 testes de rota.
- **Novas de economia**: MC-196 regra financeira por competição e temporada, com escada de sanções (P1, M, dep. 160 e 175; aceite: limite de 2027 aplicado em 2027; bloqueio de registro por dívida em atraso) · MC-197 amortização de compra e resultado na venda (P1, M, dep. 175; aceite: soma amortizada = valor da compra) · MC-198 direito de imagem até 50% e encargos sobre a parte salarial (P2, P) · MC-199 percentual de revenda, taxa de empréstimo e solidariedade a receber (P1, M, dep. 085).
- **Torcida e comercial (P1; `04` §5, §7)**: MC-095 a MC-100.
- **Base (P1 raso, P2 fundo; `03` §7)**: MC-101 a MC-114.
- **Rivais (P0 raso, P1 fundo; `04` §8)**: MC-115 a MC-124.
- **Experiência (P0 raso; `00` §7)**: MC-125 Centro de Decisões · MC-126 seis abas e três camadas · MC-127 delegação por departamento · MC-128 cartas · MC-129 crônica · MC-130 desafios · MC-131 estrelas e perguntas · MC-132 primeira sessão · MC-133 E2E · MC-134 acessibilidade · MC-135 carga · MC-136 revisão de segurança · MC-137 revisão visual em 360 px e 1.280 px · MC-138 teste com jogadores.

## Revisão 3 — tarefas novas

| ID | Tarefa | P | Tam | Dep | Aceite | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| MC-200 | Bancada de desempenho por etapa acumulada, com processador e memória, em quatro cenários (`TEST_STRATEGY.md` §4.2) | P0 | M | 031 | relatório por etapa com ambiente; falha em piora acima de 15% | o próprio comando |
| MC-201 | Medir três formas de guardar o mundo (documento único, híbrido relacional, documento partido) com o pacote fictício grande | P0 | G | 014, 081 | tabela com tamanho, tempo de avanço de um dia e de uma temporada, tempo de abertura, custo por mil carreiras; decisão registrada no ADR-014 | script de medição |
| MC-202 | Atualizações periódicas como funções puras que aceitam intervalo de vários dias (`01` §5.1) | P0 | M | 084 | avançar 30 dias de uma vez = avançar 30 vezes 1 dia, byte a byte | propriedade em teste |
| MC-203 | Testes de plausibilidade de movimento T1 a T10 sobre quadros | P0 | G | 042 | dez métricas dentro das faixas em 200 partidas | `trajectories.test.ts` |
| MC-204 | Faixas de referência de forma do time, velocidades e sequências a partir de dados públicos de rastreamento e de eventos | P1 | M | 245 | faixas com fonte e licença registradas; limites declarados | script de extração |
| MC-205 | Defesa de descanso: âncoras de segurança e termo coletivo (`02` §5.9) | P0 | M | 033 | mais jogadores atrás da bola reduz `xG` sofrido em transição e `xG` próprio posicional | causal, 500 sementes |
| MC-206 | Armadilha de pressão: sombra de cobertura, alvo, direção, zona (`02` §5.10) | P1 | G | 037, 159 | recuperações na zona sobem; contra adversário de bom passe, bolas progressivas sofridas sobem | causal e T10 |
| MC-207 | Autonomia: disciplina tática e improviso por jogador (`02` §5.8) | P1 | M | 034 | mesmo plano, elenco de improviso alto e `decisões` alta rompe instrução com ganho; com `decisões` baixa, com perda | causal |
| MC-208 | Chance, chute e goleiro separados: `xG`, execução, `xG pós-chute`, gols evitados (`02` §7) | P0 | G | 038, 164 | para finalizador e goleiro medianos, gols ≈ soma de `xG`; goleiro melhor evita mais gols sem mudar o `xG` das chances | estatístico |
| MC-209 | Goleiro no modelo de jogo: opção de passe na saída, altura com linha alta, reposição (`02` §6.4.1) | P1 | M | 164 | goleiro adiantado reduz gols de bola nas costas e aumenta gols por cobertura | causal |
| MC-210 | Bola parada defensiva e ofensiva em todas as situações, com esquema por zona, individual ou misto (`02` §8.6) | P1 | G | 040, 163 | cada situação com cenário; esquema muda quem disputa a bola | cenários e causal |
| MC-211 | CORTADA na revisão 4. Memória tática por adversário e repertório (`02` §8.7) | P2 | M | 071, 210 | rotina repetida rende menos contra o mesmo rival; variação treinada recupera o rendimento | simulação de temporada |
| MC-212 | Três valores do jogador e função de valor de mercado por grupos de fatores (`07` §1) | P0 | M | 012 | valor cai perto do fim do contrato e sobe com minutos; valor esportivo difere entre clubes de modelos diferentes | unidade |
| MC-213 | Contrato completo e negociação em dois lados (`07` §2) | P1 | G | 085, 212 | jogador recusa por utilidade própria com motivo registrado | unidade e integração |
| MC-214 | Agentes: entidade, carteira, mesa de negociação, relação persistente (`07` §3) | P1 | G | 213 | acordo descumprido piora a relação e fecha ofertas da carteira | simulação |
| MC-215 | Empréstimos com opção, obrigação, cláusula de minutos, relatório mensal e retorno (`07` §4) | P1 | G | 213 | cláusula descumprida dispara multa e direito de retorno | unidade |
| MC-216 | Clubes parceiros: desenvolvimento, preferência, conhecimento, formação (`07` §5) | P2 | G | 215 | emprestado a parceiro recebe os minutos combinados ou a parceria se deteriora | simulação |
| MC-217 | Mercado que aprende: pesos de utilidade por perfil reagem a resultado observado (`07` §6) | P2 | G | 117, 123 | vantagem de mercado do "usuário ótimo" cai ao longo de 15 temporadas | equilíbrio |
| MC-220 | Inscrição e elegibilidade por competição (`07` §7) | P0 | M | 160 | não inscrito não joga; limite e trocas respeitados | unidade |
| MC-221 | Carga externa medida pela engine e carga interna estimada; frescor; semáforo com erro por nível de comissão (`08` §2) | P1 | G | 042, 186 | carga externa = soma dos eventos de movimento; comissão fraca erra mais | unidade e simulação |
| MC-222 | Lesão com fase, faixa de retorno, restrições e recaída; decisão de retorno (`08` §5) | P1 | M | 041 | retorno antecipado aumenta recaída | simulação |
| MC-223 | Preparação física por perfil de esforço do modelo de jogo (`08` §4) | P1 | M | 073, 037 | preparar um perfil e jogar outro reduz fôlego aos 70 minutos | causal |
| MC-224 | Central de desempenho: disponibilidade, carga, achados do analista em frases com número (`08` §6) | P1 | G | 221, 043, 149 | achado só aparece com fato medido em janela de jogos; sem analista, bloco ausente | integração e E2E |
| MC-225 | Bem-estar na base: escola, alojamento, transporte, permanência por garoto (`08` §7.1–7.2) | P2 | G | 106 | garoto de fora sem alojamento sai mais | simulação |
| MC-226 | Metodologia de formação e instalações da base (`08` §7.3–7.4) | P2 | M | 225, 090 | ênfase técnica produz mais crescimento técnico na base em 5 safras | simulação |
| MC-227 | Geografia altera acesso e desenvolvimento, não potencial; raridade calibrada (`08` §7.5) | P1 | M | 102, 103 | distribuição de potencial igual entre cidades; atributo aos 16 difere por estrutura; força média estável em 30 temporadas | estatístico |
| MC-228 | Equipe como entidade com categoria e gênero; nenhum código assume só masculino (`08` §8) | P1 | P | 011 | pacote fictício com uma equipe feminina carrega e valida | unidade |
| MC-229 | Capacidade de trabalho por profissional e fila de tarefas (`06` §2.5) | P1 | M | 184 | tarefa acima da capacidade atrasa ou perde qualidade | unidade |
| MC-230 | Tela de organograma: postos, vagos, acúmulo, sobrecarga, custo, delegação, tendência | P1 | G | 185, 229, 150 | em 360 px e 1.280 px; posto vago mostra o que falta | E2E |
| MC-231 | Requisitos de participação por competição em cinco grupos, com prazo e sanção (`06` §2.7) | P2 | G | 160, 189 | acesso acende pendências com prazo; descumprir aplica a sanção do dado | simulação |
| MC-232 | Nível de profissionalização calculado e seus usos | P2 | M | 185, 231 | independente da divisão; muda aceitação de propostas | unidade |
| MC-233 | Pessoas que continuam: profissionais mudam de clube com laços; jogador aposentado vira profissional; capitão e lideranças (`06` §6.1) | P2 | M | 187, 077 | ao fim de cada temporada, aposentados elegíveis entram no mercado de comissão com atributos derivados | simulação de 10 temporadas |
| MC-234 | Identidade esportiva duradoura medida do que o clube fez, com efeitos em atração e base (`04` §2.1) | P2 | G | 190, 226 | clube que joga 5 temporadas no mesmo estilo ganha o perfil; troca de treinador não o apaga | simulação |
| MC-235 | Reputação regional (`04` §2.2) | P2 | M | 104 | apoiar escolinhas e revelar jogadores da região aumenta prioridade de captação local | simulação |
| MC-236 | Patrocinador como empresa com aderência e entregas medidas (`04` §5.2.1) | P2 | G | 088 | entrega abaixo do contrato reduz a renovação; empresa regional prefere clube da região | simulação |
| MC-237 | Política de ingresso e sócios em categorias (`04` §7.3.1) | P2 | G | 096, 097 | política popular enche e rende menos; preço agressivo repetido reduz lealdade | simulação |
| MC-238 | Arranjos de estádio e operação do dia de jogo com borderô e incidentes (`04` §6.1–6.2) | P2 | G | 090, 175 | estádio alugado paga por jogo e fica com parte da receita; incidente gera punição do dado | integração |
| MC-239 | Viagem com roteiro, meio, hospedagem e efeito em frescor e treino (`05` §6) | P2 | M | 183, 221 | ficar na região custa mais e preserva frescor | unidade |
| MC-240 | Procedência detalhada no processo de importação; confiança por campo no pacote (`03` §1.7) | P1 | M | 015 | cada valor do pacote real rastreável até arquivo e registro de origem | linha de comando de auditoria |
| MC-241 | Personalidade real: campos de personalidade, ocultos e liderança no pacote com origem e confiança; regras declaradas de estimativa a partir de fatos observáveis; vocabulário só de comportamento esportivo (`03` §1.8) | P0 | M | 155, 149 | campo ausente vira `estimado` com confiança baixa, nunca sorteio; nenhuma chave de mensagem fala de vida privada | unidade sobre as regras de estimativa e teste sobre o catálogo de mensagens |
| MC-242 | CORTADA na revisão 4. Imprensa como clima, em cartas (`04` §9.5) | P3 | M | 128 | carta só dispara com gatilho de estado | unidade |
| MC-243 | Pesquisa com jogadores: questionário para três públicos (`ROADMAP.md` §6) | P1 | M | 010 | respostas suficientes por público; resultado resumido em `docs/pesquisa/modo-clube/` | — |
| MC-244 | Três protótipos de teste (mercado, base, tática) com medição | P1 | G | corte 1 | métricas de `ROADMAP.md` §6 coletadas com eventos de análise já usados no site | sessões gravadas |

## Revisão 4 — tarefas novas (auditoria externa das specs)

| ID | Tarefa | P | Tam | Dep | Aceite | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| MC-246 | DONE (2026-11-13; opção A do dono, células em ADR-018). Prova de coordenação: forma do time, atribuição de tarefas coletivas (`02` §5.11) e bola por roteiro, em seis cenários fixos, antes de qualquer instrução tática | P0 | G | 145, 247 | T1, T2, T3, T5 e T9 dentro das faixas nos seis cenários; nenhum enxame; tarefas atribuídas aparecem no registro | `coordination.test.ts` |
| MC-247 | DONE. Modelo de chegada único (`02` §4.1): reação, giro, aceleração, velocidade máxima; usado por interceptação, cobertura, linha de passe e controle de campo | P0 | M | 145 | nenhuma estimativa de chegada por distância sobre velocidade no código; valores conferidos contra a referência da pesquisa 11 | `kinematics.test.ts` (7 testes, inclui varredura do código contra `/ vmax`) |
| MC-248 | DONE no nível da bola e dos relógios (a equivalência de partida inteira entre `DT` 0,25 e 0,1 roda pelo protocolo na MC-252, quando a engine completa existir). Relógios separados de física, decisão, percepção e coordenação; contato da bola resolvido de forma analítica dentro do passo | P0 | G | 031 | bola a 30 m/s não atravessa jogador nem linha; `DT` 0,25 s equivalente a 0,1 s pelo protocolo §2.1 | `ball.test.ts`: 30 m/s sem túnel; 500 passes aleatórios com o mesmo contato em `DT` 0,25 e 0,1 (≥ 495, diferença de instante < 0,05 s); relógios escalonados |
| MC-249 | Contrato de evidência da explicação (`02` §11): fator com métrica, valor, referência, eventos e peso; parcela "não explicado" | P0 | M | 045 | 500 relatórios recalculados a partir do registro sem divergência; nenhuma frase causal fora da lista com teste causal | `explain.evidence.test.ts` |
| MC-250 | Tela de partida avulsa do corte 0,5: escolher dois times, formação e instruções, assistir, relatório, repetir | P0 | M | 061, 065 | fluxo completo em 360 px e 1.280 px, só com chaves de tradução | Playwright |
| MC-251 | Zebras Z13 a Z22 e invariância por troca de identificadores, ordem de elenco e lado | P0 | G | 047 | dez cenários e a invariância verdes | `zebra.test.ts`, `permutation.test.ts` |
| MC-252 | Arcabouço do protocolo de equivalência (`TEST_STRATEGY.md` §2.1): conjuntos de sementes, `equivalence.ts` com margens e justificativas, cálculo de amostra, relatório por métrica e célula | P0 | G | 046 | relatório gerado para nível 2 contra nível 1 e para os dois valores de `DT` | o próprio comando |
| MC-253 | Manifesto de parâmetros da economia com origem, confiança, faixa e versão; lint contra número econômico fora do manifesto | P0 | M | 087 | todo número de `04`, `07` e `06` no manifesto; fatos das pesquisas 07, 09 e 10 com fonte | lint e esquema |
| MC-254 | Sensibilidade de ±20% por parâmetro e Monte Carlo de 200 mundos (`TEST_STRATEGY.md` §5.2), com verificação de equilíbrio contábil do mundo | P1 | G | 253, 179 | tabela de parâmetros críticos; aceite do Monte Carlo | `test:world` |
| MC-255 | Cinco políticas automáticas e corrida de 50 temporadas (`TEST_STRATEGY.md` §5.1) | P1 | G | 179 | indicadores por política; nenhuma acima de 40% dos títulos depois do ano 15; nenhuma dominada em tudo | `test:world` |
| MC-256 | DONE (2026-11-13; o nível 2 ainda não existe, a proibição de cópia vale para todo arquivo fora do núcleo). Núcleo de regras compartilhado (`rules/`) entre os dois níveis, com teste que proíbe cópia de fórmula no nível 2 | P0 | M | 145 | nível 2 importa disputas, `xG`, fôlego, árbitro e eventos do núcleo | teste de dependência |
| MC-257 | Métricas de trajetória T11 a T13 e normalização por contexto (fase, bloco, zona, placar, número de jogadores) | P1 | M | 203 | faixas por célula de contexto registradas | `trajectories.test.ts` |
| MC-258 | Teto combinado do efeito da comissão sobre a força do time | P1 | P | 186 | todos os departamentos no máximo não passam do teto | unidade e simulação |
| MC-259 | Safra anual mínima e aposentadoria como mecânica de mundo do corte 1 (`03` §7) | P0 | M | 084 | 30 temporadas sem usuário mantêm tamanho de elenco e curva de idade | `test:world` |
| MC-260 | Pacote de lançamento fictício revisado (nomes, escudos, cidades, rivalidades), questão 14 aprovada pelo dono em 2026-11-13 | P1 | G | 014 | revisão editorial completa; nenhum nome de clube ou pessoa real | validação do pacote |
| MC-261 | DONE. Integrar as pesquisas 09, 10 e 11 às specs (regras financeiras por divisão, faixas econômicas das divisões inferiores, constantes e faixas de forma do time) | P0 | M | | nenhuma marca "conferir" ou "não pesquisado" que as pesquisas tenham resolvido | revisão |

Retiradas na revisão 4: MC-211 (memória tática) e MC-242 (imprensa), cortadas; ficam na tabela acima delas só como registro.

## Riscos abertos

- Dados reais das Séries C e D (MC-157) dependem de arquivos do dono e podem não atingir o critério.
- Economia das Séries B, C e D com fonte só para cotas, público, ingresso e poucos balanços; patrocínio, salários por divisão, juros e transferências abaixo do topo seguem sem fonte.
- Efeito de comissão sem evidência numérica; pesos fechados por simulação.
- Formato da Série D de 2027 não publicado.
- Forma de guardar o mundo ainda não decidida (MC-201).
- Dados públicos de rastreamento têm licença que não cobre uso comercial (MC-245); sem permissão, a calibragem de forma do time depende só de literatura.
- Taxa de abandono na base brasileira sem fonte; comissão de agente sem teto de regra no Brasil (parâmetro de jogo).
- Dezessete sistemas, quase todos com versão funda especificada: o risco de escopo cresceu de novo; o corte 1 não mudou de tamanho.
- Jogador real como peça negociável em jogo com anúncio: consulta jurídica pendente.
- Coordenação coletiva é o maior risco técnico da engine: se a prova MC-246 falhar, a arquitetura de decisão muda antes de qualquer instrução.
- Séries C e D sem partidas no banco: alvos de gols e de mando vêm de contagem sobre fonte secundária (pesquisa 11); estatísticas de jogo (finalizações, passes, cartões) só existem para a Série A até 2023.
- Estimativa de esforço do corte 1 (nove a catorze meses de uma pessoa, conta nominal) não foi medida neste projeto; refazer ao fim do corte 0,5.
