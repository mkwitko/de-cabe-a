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
- **Diretoria** (`career/board.ts`): meta por posição, confiança de 0 a 100 que muda a cada jogo pesando o adversário, ultimato de 7 pontos em 5 jogos, demissão. Fim de temporada julga a meta.
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

- 167 testes de domínio, 130 de integração da API, 16 de ponta a ponta (360 e 1280 px).
- Lint, prettier e typecheck só nos arquivos tocados; o repositório inteiro já falhava antes.
- Regras de carreira na versão 4 (`CAREER_RULES_VERSION`).

## 2. Limites conhecidos do que existe

- **Calibração**: quase todos os números são ponto de partida. Só duas medições foram feitas: 5 de 56 carreiras em piloto automático terminaram em demissão em duas temporadas; uma temporada de mercado dá cerca de 140 negócios entre 106 clubes.
- **Desempenho**: o primeiro passo da carreira leva cerca de 3 s no Node por causa da abertura da janela. Não medido em celular.
- **Lesões** não existem. Cansaço na partida assistida conta só os 11 que começam.
- **Empréstimo**: sem opção de compra, sem divisão de salário, sem minutos mínimos, e os clubes do jogo não emprestam entre si.
- **Mercado**: sem agentes, sem pré-contrato, sem inscrição e limite de elenco por competição, sem troca de jogadores, sem parcelas. Os clubes do jogo não têm caixa próprio, só orçamento por temporada.
- **Tática**: sem funções individuais, bola parada ou plano por fase.
- **Demissão**: encerra a carreira; não há proposta de outro clube.
- **Tela de demissão** não tem teste de ponta a ponta.
- **Artes** em cerca de 1 megapixel: ficam moles acima de 1344 px de largura.
- **Engine**: defeitos de mecânica (zagueiro atrás do goleiro, goleiro que passa da bola) são da outra sessão.

## 3. Roadmap

### Próximo (fecha o corte atual)

1. **Calibração por simulação**: rodar centenas de temporadas e ajustar improviso, fôlego, confiança, valores e volume de negócios. Sem isso os sistemas existem mas ninguém sabe se estão justos.
2. **Lesões e disponibilidade**: tipo, dias fora, retorno; semáforo no treino; rodízio com motivo. É o que dá peso ao fôlego e ao elenco.
3. **Desempenho do mercado em celular**: medir e, se preciso, repartir a abertura da janela em passos.
4. **Proposta de emprego depois da demissão** e reputação do treinador.
5. **Zonas de acesso e rebaixamento na tabela**, com o regulamento de cada fase.

### Depois (aprofunda)

6. **Tática completa**: funções por jogador, bola parada, plano por fase, familiaridade com a formação.
7. **Base**: safra anual, promoção de jovens, minutos para promessas.
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
