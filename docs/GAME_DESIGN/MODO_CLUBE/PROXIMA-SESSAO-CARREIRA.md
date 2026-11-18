# Modo Clube — próxima sessão: carreira imersiva e completa

Data: 2026-11-17. Para uma sessão nova, sem histórico. Complementa `HANDOFF.md` (de 2026-11-13), que continua sendo a base: ordem de leitura, decisões do dono e regras de trabalho. Este arquivo guarda o que aconteceu depois, na sessão da carreira no navegador, e o que vem a seguir.

## 1. Pedido do dono

- "Quero que tenha todas as features de gestão que tem no Football Manager e ainda mais coisas; quero tornar esse jogo o mais completo de sua categoria e com os melhores designs."
- "Quero que seja altamente imersivo [...] podemos colocar animações 3D e coisas do tipo desde que seja leve, imersivo, premium."
- "Tá melhorando, mas ainda pode melhorar bem mais": pesquisa do GPT (`docs/pesquisa/modo-clube/19-design-imersivo-prompt-gpt.md`) e uso do skill **impeccable** para buscar referências e ter ideias novas.
- Performance sempre: milhares de carreiras ao mesmo tempo, multijogador e campeonatos no futuro (ADR-020).

## 2. Regras que continuam valendo

- **Não edite `packages/match-engine`.** Outra sessão calibra a engine, no worktree `de-cabeca`, branch `feat/modo-clube-taticas`. Os defeitos de mecânica são dela: zagueiro atrás do goleiro na linha de 3 e goleiro que passa da bola.
  - Exceção já aprovada: `live.ts` mais uma linha de export. Qualquer mudança nova na engine pede permissão.
- **Engine e domínio puros e determinísticos:** sem `Math.random` e sem relógio.
  - Em `packages/match-engine/src` e `packages/club-domain/src`, o ESLint proíbe `Math.exp/log/sin/atan/pow/hypot` e `**` não inteiro. Só `+ − × ÷` e `sqrt` dão os mesmos bits em todos os navegadores (ADR-020).
- **Não toque** em `apps/api/src/modules/career` (o Modo Carreira de jogador), em `.claude/` e em `docs/monetizacao-*`.
- **Dados:** só o pacote fictício determinístico (`br-dev-1`). Não extraia nem converta bases de terceiros.
- **Verificações:** lint, prettier e typecheck só nos arquivos tocados, porque o repositório inteiro já falha. Diga isso no relatório.
- **Commits:** um por tarefa, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem push e sem PR, a menos que o dono peça.
- **Relatório:** honesto e em português.
- **Texto da interface:** todo texto do modo sai de `t(key)` em `apps/web/src/games/manager/i18n/pt-BR.ts`. O lint (MC-147) barra texto literal em JSX e strings literais em parâmetros de `t()`; use constantes de módulo (exemplo: `VENUE`).
- **Movimento:**
  - CSS 3D leve está liberado para o Modo Clube: só transform e opacity, uma entrada por tela, nada em repetição, e `prefers-reduced-motion` desliga tudo.
  - WebGL e efeitos em repetição precisam de justificativa.

## 3. Ambiente

- Worktree: `/home/mauricio.oliveira/Documentos/Coding/futuro/de-cabeca-competicoes`, branch `feat/modo-clube-visual`. Último commit: `3882b68`.
- Servidores de desenvolvimento, se ainda estiverem de pé:
  - Web: `http://localhost:5473`. Para reiniciar: `API_URL=http://127.0.0.1:3401 npx vite --port 5473 --strictPort --force` em `apps/web`.
  - API: porta 3401 com `tsx watch` e `DATABASE_URL` apontando para o banco `decabeca_e2e`.
  - O banco de desenvolvimento compartilhado não tem a migração `20261117000000_modo_clube_tables` e **não deve recebê-la**.
- Testes:
  - Domínio: `pnpm --filter @decabeca/club-domain test` (112 testes).
  - API: `pnpm --filter @decabeca/api test:unit` e `test:int` (10 testes de integração da carreira).
  - Ponta a ponta:
    ```
    E2E_API_PORT=3311 E2E_WEB_PORT=5374 E2E_LAUNCH_PORT=5375 npx playwright test e2e/carreira-clube.spec.ts e2e/amistoso.spec.ts
    ```
    Rodar em `apps/web`; são 7 testes.
  - Determinismo: `pnpm --filter @decabeca/web determinism`. Compara Node, Chromium, WebKit e Firefox bit a bit.
- Capturas de tela: um script Playwright com `localStorage.setItem('dc_welcomed', '1')` para pular a tela de boas-vindas. Rode-o em 1280 e 360 px e confira antes de concluir qualquer mudança visual.

## 4. O que já existe (desde o HANDOFF de 11-13)

### Arquitetura (ADR-020, aprovada)
- A carreira solo roda no navegador, num Web Worker (`apps/web/src/games/manager/career/sim.worker.ts`).
- O servidor guarda o dia e um snapshot gzip a cada passo, com trava otimista de dia e temporada (`apps/api/src/modules/manager/career.ts`).
- O pacote é um arquivo estático versionado, `/packs/<id>.<checksum>.json`, gerado pelo plugin `worldPacks` em `apps/web/vite.config.ts` e servido com cache imutável.
- `CAREER_RULES_VERSION = 2` em `packages/club-domain/src/career/save.ts`. Ao mudar regras ou formato do save, suba a versão.
- O amistoso usa um pool de workers na API (ADR-015, revisão).

### Domínio (`packages/club-domain/src`)
- `career/start.ts`: início por escolha livre ou por três propostas; `upcomingFor`.
- `career/advance.ts`: `playDay`, `nextDecision`, `playDecision`, `careerMatch`, `divisionTable` e `startNextSeason`.
- `career/finance.ts`: salários, TV, patrocínio, parcela da dívida em 60 meses e bilheteria por público.
- `finance/ledger.ts`: o livro-caixa é a única fonte do dinheiro.
- `match/quick.ts`: resultado rápido de nível 3.
- `match/moments.ts`: melhores momentos.
- `generate/pack.ts`: economia ancorada na força do clube.

### Tela (`apps/web/src/games/manager/career/ClubCareerPage.tsx`, rota `/tecnico/carreira`)
- **Início:** seletor entre os dois modos. As propostas aparecem como cartas com a faixa nas cores do clube, o escudo e seis eixos em barras douradas.
- **Hub:**
  - Faixa do clube nas cores dele, com data e caixa.
  - Estádio CSS 3D do próximo jogo: arquibancada nas duas cores, refletores e o gramado em perspectiva onde os escudos sobem.
  - Túnel de entrada antes de assistir.
  - Últimos 5 resultados, próximos jogos e mensagens da diretoria, da imprensa e do financeiro.
  - Classificação com escudos e dinheiro da temporada com barras e saldo.
- **Partida:** "Assistir à partida", "Melhores momentos" ou "Só o resultado". A engine roda no aparelho, a tática pode mudar durante o jogo e o placar visto é o que vale. A tela reaproveita `Match` de `FriendlyPage.tsx`.
- **Estilos:** CSS em `apps/web/src/index.css`, nas seções `club-stage`, `club-stadium` e `club-tunnel`, com os tokens `club-*` no `@theme`.

## 5. Pendências conhecidas

- **Direção visual:** MC-262 espera a aprovação do dono, e MC-250 e o portão MC-048 também. O dono acha que o visual "ainda pode melhorar bem mais".
- **Escalação e formação:** todo time joga 4-3-3 com o plano padrão (`PLAN`). Não há escalação nem formação escolhida.
- **Tabela:** não marca as zonas de acesso e rebaixamento. A Quarta Divisão tem grupos e depois mata-mata, então é preciso ler o regulamento de cada fase.
- **Finanças:**
  - O líder da Terceira Divisão perde cerca de R$21M por temporada.
  - Clubes fracos da Primeira lucram muito com TV.
  - Não há premiação.
- **Mensagens:** são derivadas da tela, não guardadas. Uma caixa de entrada de verdade precisa de eventos no save (e de subir `CAREER_RULES_VERSION`).
- **Infraestrutura:**
  - Faltam o R2 para snapshots e o arquivo de pacotes antigos (sem credenciais ainda).
  - Falta o registro de decisões no servidor. Sem ele, a carreira solo não é verificável para ranking ou prêmio.
- **Teste em celular real:** MC-030.

## 6. Próximo trabalho, em ordem

1. **Pesquisa e direção.**
   - Se `docs/pesquisa/modo-clube/19-design-imersivo-pesquisa-gpt.md` existir, leia-o. Se não existir, peça ao dono para rodar o prompt `19-design-imersivo-prompt-gpt.md` no GPT e colar a resposta.
   - Rode o **impeccable**:
     - `impeccable context`;
     - `critique` em `/tecnico/carreira` (desktop e celular);
     - `shape` da carreira como um todo: mapa de telas (Centro de Decisões, Elenco, Tática, Treino, Mercado, Clube, Comissão, Mundo; `00` §7) e os momentos de imersão (pré-jogo, gol, fim de jogo, virada de temporada, título, demissão, proposta).
   - Leve ao dono a direção e o mapa de telas para aprovar (MC-262) antes de construir.
2. **Elenco e escalação:**
   - tela do elenco com atributos, forma, fôlego e moral;
   - escolha de formação e titulares antes do jogo, valendo no `careerMatch` e no resultado rápido.
   Primeiro sistema de gestão porque tudo depende dele.
3. **Tática completa:** funções, bola parada e plano por fase (`02` e `02a`).
4. **Treino, saúde e frescor:** `08`.
5. **Mercado e observação:** `07`.
6. **Diretoria, metas e confiança:** abre a demissão e as propostas (`06`).
7. **Base, estrutura, patrocínio e torcida:** `03` e `04`.
8. **Caixa de entrada guardada no save, premiação e ajuste das finanças.**

Cada sistema entra com:
- um teste de domínio;
- as chaves de tradução;
- um teste de ponta a ponta em 360 e 1280 px;
- as capturas conferidas;
- um commit.

Atualize `TASKS.md` ao concluir cada tarefa.
