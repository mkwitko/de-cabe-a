# Modo Clube — status e roadmap da carreira

Data: 2026-11-17. Estado do worktree `de-cabeca-competicoes`, branch `feat/modo-clube-visual`, depois da sessão que construiu a carreira nas salas do estádio e o mercado. Complementa `PROXIMA-SESSAO-CARREIRA.md` (regras de trabalho e ambiente continuam valendo). Nada foi enviado ao remoto.

## 1. O que já existe

### Mundo visual

A carreira acontece dentro do estádio à noite. Cada destino é uma cena fixa (arte própria, FLUX 3 no desktop do dono, prompts e sementes em `docs/pesquisa/modo-clube/arte/placas-clube.json`), com a interface montada por cima. São 14 imagens em `apps/web/public/img/clube/`, deitada e em pé.

| Sala | Arte | O que faz |
|---|---|---|
| Sala do técnico | `sala` | Próximo jogo sobre a janela, classificação, forma, próximos jogos, mensagens, dinheiro |
| Vestiário | `vestiario` | Formação, onze titulares por posição, plano de jogo |
| Campo de treino | `treino` | Intensidade da semana, entrosamento, fôlego do elenco |
| Mercado | `olheiro` | Propostas, negociações, alvos, seu elenco, noticiário |
| Diretoria | `diretoria` | Meta, confiança, ultimato |
| Escolha de clube | `campo` | Início da carreira |
| Túnel | `tunel` | Entrada antes da partida assistida e saída na demissão |

### Sistemas

- **Escalação** (`career/squad.ts`): formação e onze titulares valem na partida assistida e no resultado rápido. Jogador fora de posição rende menos (7%, 15%, 25%), para você e para todos os clubes.
- **Plano de jogo**: bloco, pressão, ritmo, largura e risco entram na partida assistida. O resultado rápido não tem tática.
- **Treino e fôlego** (`career/training.ts`): intensidade leve, normal ou forte troca fôlego por entrosamento. Titular deixa 28% de fôlego no jogo. Os adversários cansam pelos dias desde o último jogo deles.
- **Diretoria** (`career/board.ts`): meta por posição, confiança de 0 a 100 que muda a cada jogo pesando o adversário, ultimato de 6 pontos em 5 jogos, demissão. Fim de temporada julga a meta.
- **Lesões** (`career/health.ts`): tipo, dias fora e volta; o técnico do jogo escala só quem está apto, e os adversários também perdem jogadores.
- **Evolução dos jogadores** (`career/development.ts`, `career/years.ts`): a cada virada todos envelhecem. O potencial é teto, não destino: o quanto cada um cresce depende de determinação (profissionalismo, ambição, resiliência), minutos jogados, intensidade do treino, estrutura do clube e um sorteio fixo pela semente. Veteranos caem e se aposentam a partir dos 36 (goleiros dois anos depois, níveis baixos antes).
- **Safra da base**: de 3 a 6 garotos de 15 a 17 anos por clube a cada virada, conforme a estrutura. Primeiro contrato paga dois quintos do salário de mercado do nível. Os garotos do seu clube ficam na **base** (lista no Campo de treino): têm contrato, não podem ser escalados, crescem no ritmo normal. Você sobe quem quiser; aos 19 anos sobem sozinhos. No elenco, quem joga cresce mais e quem fica parado cresce menos.
- **Save enxuto** (`career/save.ts`): nenhum atributo é gravado. Guarda-se um caractere de crescimento por jogador por temporada e as transferências; ao carregar, o pacote é reconstruído a partir do original. 104 KB em 10 temporadas.
- **Caixa de entrada** (`career/inbox.ts`): fatos guardados no save, até 40. Resultados, ultimato, meta, transferências, janela, cansaço, caixa no vermelho, premiação, contratos, empréstimos.
- **Finanças**: livro-caixa como única fonte; premiação por posição no fim da temporada.
- **Mercado** (`market/`):
  - **Valor** (`value.ts`): salário de referência do nível no pacote, vezes meses por idade, vezes potencial (só jovens), vezes contrato restante.
  - **Plano de elenco** (`plan.ts`): titular, reserva de cada vaga, necessidades e sobras de cada clube.
  - **Orçamento** (`books.ts`): verba de transferência e teto de folha por receita e apetite de risco.
  - **Duas mesas** (`deals.ts`): preço com o clube (piso oculto, contrapropostas que descem) e contrato com o jogador (salário, anos, papel, multa; lealdade, ambição, degrau de clube).
  - **Clubes negociando entre si** (`rounds.ts`): a cada 14 dias de janela, cada clube pontua candidatos (necessidade, encaixe, evolução, revenda, custo, folha) e senta nas duas mesas. Cada negócio guarda os motivos.
  - **Competência dos dirigentes** (`judgement.ts`): observação define o erro sobre jogadores de fora; futebol define o erro sobre o próprio elenco e a mão na mesa. O erro depende da semente da carreira e diminui com o tempo de casa.
  - **Você no mercado** (`talks.ts`): negociar compra em rodadas, responder propostas (aceitar, recusar, pedir valor), pôr à venda.
  - **Contratos** (`contracts.ts`): vencimento na virada, renovação, jogador livre sem taxa, teto de folha da diretoria.
  - **Empréstimos** (`loans.ts`): pegar e ceder por uma temporada, com volta no fim.
  - **Multa rescisória**: fecha o preço quando é paga; clubes escrevem 3 vezes o valor.
  - **Observação para você**: nota e potencial de quem é de outro clube aparecem como faixa.

### Qualidade

- 176 testes de domínio, 130 de integração da API, 16 de ponta a ponta (360 e 1280 px).
- Bancada de calibração: `pnpm --filter @decabeca/club-domain calibrate` (variáveis `SEEDS`, `SEASONS`, `WORLD_SEASONS`). Joga carreiras inteiras com políticas fixas (piloto automático, treino leve, treino forte, vendedor, renovador) e mede o mundo.
- Lint, prettier e typecheck só nos arquivos tocados; o repositório inteiro já falhava antes.
- Regras de carreira na versão 8 (`CAREER_RULES_VERSION`).

## 2. Limites conhecidos do que existe

- **Calibração**: três rodadas da bancada (24 carreiras de 3 temporadas por política, mundo de 5 temporadas; amostra pequena). Última medição, antes da base separada:
  - Mandante vence 45%, empate 25,1%, visitante 29,8%; 2,56 gols por jogo.
  - Demissão em piloto automático: 11,6% por temporada (primeira divisão 0%, segunda 4 de 6 carreiras, terceira 3 de 6, quarta 1 de 6). O piloto não contrata nem renova, e o clube dele perde força (70,1 para 63,9 na primeira divisão em 3 temporadas), então o número mede um técnico passivo, não uma pessoa jogando.
  - Renovar todo contrato que vence piorou a demissão (17,9% por temporada). Causa não investigada.
  - Treino forte 1,383 ponto por jogo, leve 1,352, normal 1,378: a diferença é pequena.
  - Folhas salariais do mundo: ×1,13 em 5 temporadas. Negócios: 131 a 200 por temporada.
  - Jogadores sem clube: 702 na quinta temporada, e subindo.
  - Força média por divisão depois de 5 temporadas: +0,5, −0,1, −1,5, −1,1.
  - Terceira divisão fecha a primeira temporada com caixa negativo (−R$5,6 mi com receita de R$7,6 mi): a economia do pacote está errada ali.
- **Desempenho**: o primeiro passo da carreira leva cerca de 3 s no Node por causa da abertura da janela. Não medido em celular.
- **Base**: é uma lista no Campo de treino, sem sala nem arte própria, sem jogos da base, sem treino próprio. Os clubes do jogo não têm base separada: os garotos deles entram direto no elenco.
- **Carregamento** de carreira longa cresce com o número de temporadas (cerca de 2,5 s em 10 temporadas no Node).
- **Empréstimo**: sem opção de compra, sem divisão de salário, sem minutos mínimos, e os clubes do jogo não emprestam entre si.
- **Mercado**: sem agentes, sem pré-contrato, sem inscrição e limite de elenco por competição, sem troca de jogadores, sem parcelas. Os clubes do jogo não têm caixa próprio, só orçamento por temporada.
- **Tática**: sem funções individuais, bola parada ou plano por fase.
- **Demissão**: encerra a carreira; não há proposta de outro clube.
- **Tela de demissão** não tem teste de ponta a ponta.
- **Artes** em cerca de 1 megapixel: ficam moles acima de 1344 px de largura.
- **Engine**: defeitos de mecânica (zagueiro atrás do goleiro, goleiro que passa da bola) são da outra sessão.

## 3. Roadmap

### Próximo (fecha o corte atual)

1. **Calibração, segunda volta**: demissão nas divisões 2 e 3, por que renovar tudo piora, jogadores sem clube acumulando, finanças da terceira divisão. Rodar com mais sementes.
2. **Base, segunda camada**: sala própria, clubes do jogo com base, jogos da base.
3. **Desempenho do mercado em celular**: medir e, se preciso, repartir a abertura da janela em passos.
4. **Proposta de emprego depois da demissão** e reputação do treinador.
5. **Zonas de acesso e rebaixamento na tabela**, com o regulamento de cada fase.

### Depois (aprofunda)

6. **Tática completa**: funções por jogador, bola parada, plano por fase, familiaridade com a formação.
8. **Comissão**: pessoas contratáveis nos departamentos, que hoje são níveis fixos do pacote.
9. **Mercado, segunda camada**: agentes na mesa, pré-contrato, empréstimo com cláusulas, troca e parcelas, inscrição por competição, caixa real dos clubes do jogo.
10. **Torcida, patrocínio e estrutura**: confiança da torcida, contratos comerciais, obras.
11. **Cartas de evento** e crônica do clube (linha do tempo, sala de troféus).

### Infraestrutura

12. R2 para snapshots e arquivo de pacotes antigos.
13. Registro de decisões no servidor, para a carreira solo ser verificável em ranking.
14. Teste em celular real (MC-030) e revisão final do impeccable.
15. Traduções en e es.

## 4. Para quem continuar

- Teste de ponta a ponta: `E2E_API_PORT=3311 E2E_WEB_PORT=5374 E2E_LAUNCH_PORT=5375 npx playwright test e2e/carreira-clube.spec.ts e2e/amistoso.spec.ts` em `apps/web`. Não edite arquivos do domínio enquanto a suíte roda: ela lê o código-fonte ao vivo.
- Arte nova: `memory/desktop-flux-art.md` descreve como gerar no desktop pelo Tailscale. Use o servidor que já está de pé; não rode passos do `desktop.sh` que derrubam o worker do dono.
- Qualquer estado novo da carreira entra em `CareerWorld`, em `save.ts` (gravar e carregar) e, se mudar resultado para o mesmo mundo, sobe `CAREER_RULES_VERSION`.
- Leituras derivadas do pacote ficam em `lib/pack-cache.ts`, por clube, e atravessam transferências com `carryCache`. Cada carreira tem o próprio objeto de pacote.
