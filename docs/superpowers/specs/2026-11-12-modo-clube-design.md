# Modo Clube (treinador + dirigente) — desenho

Data: 2026-11-12. Status: aguardando aprovação do dono. Nome "Modo Clube" é provisório.

## Intenção

Um modo de carreira em que a pessoa é técnico e dirigente do mesmo clube, no espírito de Brasfoot, Elifoot e Football Chairman: pega um clube pequeno, sobe de divisão temporada após temporada, forma jogadores, constrói estrutura e estádio. É o estilo de jogo preferido do dono e o que falta ao De Cabeça para ter progressão de longo prazo.

O diferencial é o que nenhum jogo pesquisado faz: saber futebol dá vantagem dentro da gestão, e os outros jogos do site ajudam a carreira sem nunca serem obrigatórios.

## Objetivos

- Sensação clara de temporada: começo, meio, decisão, fim, balanço, próxima.
- Rodada num toque para quem quer velocidade; partida minuto a minuto com narração para quem quer assistir. Mesmo resultado nos dois.
- Dinheiro sempre curto e sempre uma obra quase ao alcance.
- Apego a jogador formado em casa.
- Carreira inteira jogável sem abrir outro modo.

## Fora do escopo (versão 1)

- América do Sul e Europa (pacotes de dados seguintes, nesta ordem).
- Copas (Copa do Brasil, estaduais, Libertadores). Versão 1 é só liga.
- Multijogador, ligas entre amigos, correção de notas pela comunidade.
- O Modo Carreira de jogador que já existe fechado (`docs/GAME_DESIGN/CAREER_MODE.md`). Não é alterado.

## O que seria fracasso mesmo funcionando

- Temporadas iguais umas às outras.
- Depois de cinco temporadas o clube ganha tudo e a graça acaba.
- Resultado que parece roubado: derrota sem explicação visível.
- Avançar exigir jogar os minijogos, esperar relógio real ou pagar.
- Excesso de telas e menus entre uma rodada e outra.
- Dado errado gritante no elenco (regra do projeto: qualidade de dado vem antes do lançamento).

## Restrições

- Celular primeiro, sessão de 2 a 10 minutos, tela cheia e imersiva, sem colunas laterais.
- Engine pura e com semente em `packages/engine`, como as outras; resultado gravado é imutável.
- Sem IA em tempo de execução (narração por banco de frases).
- Nunca vender força, moeda ou atalho (ADR-012). Anúncio só em pausas.
- Leituras de banco sempre em lote, sem consulta por item.
- Carreira por conta ou por sessão de convidado, como o progresso atual.

## Caminhos considerados

**Onde entra o conhecimento de futebol**
1. Gestão pura, sem quiz. Fiel ao gênero, mas solto do resto do site.
2. Estrelas dos minijogos como combustível obrigatório. Reaproveita tudo, mas vira tela de recompensa.
3. Conhecimento dentro das decisões, gestão anda sozinha.

Escolha do dono: 2 e 3 juntos, com a condição de que os minijogos só facilitam, nunca trancam.

**De quem é o elenco**
Jogadores reais de hoje, fictícios gerados ou reais de todas as épocas. Escolha do dono: jogadores reais, começando com o que o banco tem, com atualizações lançadas como pacotes que a pessoa escolhe.

**Mundo da versão 1**
Só Brasil A e B, Brasil mais Europa, ou tudo. Escolha do dono: Brasil, Séries A e B reais.

**De onde vêm os atributos**
- Copiar o banco do Football Manager ou de sites de fãs que o exibem. O dono pediu este caminho e aceitou o risco. Não foi adotado: são dados proprietários de terceiros e o assistente não fará essa extração.
- Atributos próprios: posição detalhada do Wikidata, nota base por algoritmo, curadoria assistida e revisão do dono. Adotado neste desenho.

O formato de pacote é um arquivo simples sob controle do dono; a origem dos números de pacotes futuros é decisão dele.

## Desenho

### Pacote de dados
- Arquivo versionado com clubes, elencos, posições, atributos, idade e teto.
- Carreira nova escolhe um pacote; carreira em andamento fica no pacote em que nasceu.
- Pacote 1: Séries A e B reais (cerca de 1.200 jogadores, revisados). Séries C e D com clubes reais e elenco gerado.
- Elenco atual não sai direto do banco: passagem sem data de fim não significa "joga lá hoje". Precisa de regra de corte e revisão.

### Jogador
- 13 posições: goleiro, zagueiro, lateral direito, lateral esquerdo, volante, meia central, meia direita, meia esquerda, meia armador, ponta direita, ponta esquerda, segundo atacante, centroavante. Principal e secundárias; fora de posição rende menos.
- Funções escolhidas pelo técnico (falso 9, ala, líbero, pivô).
- Atributos de 1 a 99: finalização, passe, drible, cruzamento, cabeceio, desarme, marcação, posicionamento, visão, velocidade, força, resistência. Goleiro: reflexo, saída do gol, jogo com os pés.
- Evolução: sobe até 24–27 anos, estabiliza, cai depois dos 30 (físico primeiro, visão por último; goleiro mais tarde). Teto escondido. Ritmo depende de minutos jogados, treino e centro de treino.

### Partida
- Simulação por lances: posse, ataque, finalização, desfecho, cada passo uma disputa entre jogadores.
- Saída: lista de eventos com minuto, tipo e envolvidos (gol, assistência, desarme, defesa, escanteio, falta, cartão, lesão, substituição).
- Rodada num toque mostra placar e estatísticas. Minuto a minuto toca a mesma lista com narração e deixa mexer (substituição, postura).
- Cerca de 70% força e decisões, 30% sorte, com trava contra goleada absurda.
- Calibragem por teste: milhares de simulações comparadas com as 46 mil partidas reais do banco (média de gols, vantagem do mandante, zebras).
- Depois da derrota, a tela mostra o motivo (meio-campo dominado, goleiro adversário, expulsão).

### Temporada
- Quatro divisões de 20 clubes, turno e returno, 38 rodadas, quatro sobem e quatro caem. Vagas são dado configurável.
- Fases: pré-temporada (mercado, meta da diretoria), primeiro turno, janela do meio, segundo turno, balanço (prêmios, safra da base, propostas).
- Botão "simular até a próxima decisão".
- Início: três propostas de clubes da Série D.
- Diretoria define meta por temporada e tem confiança visível. Demissão existe; reputação do treinador segue com ele e gera propostas de outros clubes.

### Clube
- Receita: bilheteria, sócio-torcedor, patrocínio, cota de TV por divisão, premiação, venda de jogador (receita principal, como no Brasil real).
- Despesa: salários, manutenção, obras.
- Estrutura em níveis: estádio (capacidade e preço do ingresso), centro de treino, base, departamento médico, rede de olheiros, comercial.
- Custo sobe mais rápido que a renda; cada nível tem manutenção; receita escala com a divisão. Obra leva rodadas, nunca tempo real.
- Base: safra anual na Copinha de janeiro, qualidade ligada ao nível da base, talento escondido.

### Mundo da base (pedido do dono em 2026-11-12)
Meta: profundidade de formação que nenhum jogo do gênero tem.

- **Gerador de jogadores.** Engine própria cria garotos novos: nome, idade, cidade de origem, posição, atributos iniciais e teto escondido. Alimenta a safra dos clubes, os clubes formadores e as escolinhas. Mesma semente, mesmo garoto.
- **Camadas de origem**, da mais crua à mais pronta:
  1. Escolinhas de futsal e campos de cidade pequena (7 a 13 anos): muitos garotos, quase nada revelado, barato de observar.
  2. Clubes formadores que não disputam as Séries A–D (13 a 17): vivem de revelar e vender; negociam com percentual de venda futura.
  3. Categorias de base dos clubes das quatro divisões (sub-15, sub-17, sub-20).
- **Competições de base em todas as idades**: Copinha em janeiro, nacionais sub-17 e sub-20, torneios regionais e de futsal. Servem de vitrine: quem joga bem aparece para todo mundo, e o preço sobe.
- **Olheiros com região e faixa de idade.** Cada olheiro cobre uma área; quanto mais tempo observa, mais atributos e teto revela. Garoto visto cedo custa pouco e é aposta; garoto visto na Copinha é mais certo e mais caro.
- **Vínculo de formação.** Trazer o garoto cedo para a base do clube rende percentual quando ele for vendido adiante, como o mecanismo real de clube formador.
- **Apego.** A ficha do jogador guarda a origem para sempre ("revelado na escolinha de futsal de Mirassol aos 11").

Risco a controlar: volume. Milhares de garotos por temporada não podem virar milhares de telas. A pessoa vê relatórios curtos do olheiro, nunca a lista inteira.

### Conhecimento
- Olheiro: mostra pista da trajetória de um jogador real; reconhecer revela teto e barateia a contratação.
- Jogo decisivo: um lance resolvido por pergunta, valendo bônus limitado.
- Estrelas dos minijogos: viram caixa extra ou treino mais rápido, com teto diário.

### Fim de jogo
- Sala de troféus, recordes, Hall da Fama.
- Desafios como regras ligáveis com conquista (só prata da casa, sem contratações).

## Ordem de construção

1. Pacote de dados
2. Engine de partida e narração
3. Temporada, finanças básicas, diretoria
4. Evolução e gerador de jogadores; base do clube e safra anual
5. Mundo da base: escolinhas, clubes formadores, competições por idade, olheiros por região
6. Estrutura e estádio
7. Momentos de conhecimento e bônus das estrelas

Na etapa 1, depois de gerados, os atributos passam por revisão assistida por IA (aponta nota incoerente com idade, clube, posição e histórico) antes da revisão do dono.

Primeira versão jogável: 1 a 3. Cada etapa tem plano próprio.

## Decisões do assistente (não confirmadas pelo dono)

- Nome provisório "Modo Clube".
- 13 posições, funções separadas, lista de atributos e escala 1–99.
- Formato único de liga para as quatro divisões (a Série D real é diferente).
- Início com três propostas da Série D.
- Versão 1 sem copas.
- Atributos próprios em vez de dados de terceiros.

## Em aberto

- Jogador real como peça negociável num jogo com anúncio: ponto para a consulta jurídica já pendente.
- Como guardar o estado do mundo por carreira (2 mil jogadores evoluindo) sem pesar o banco: fica para o plano da etapa 3.
- Regra de corte para "elenco atual" e quanto da revisão é manual: plano da etapa 1.

## Fontes

Pesquisa de 2026-11-12 (cerca de 90 buscas): Football Chairman (páginas oficiais e lojas), Football GM e Basketball GM (manual e blog), Retro Bowl, Reigns, Kairosoft, Hattrick, Sokker, Battrick, Football Manager (guias de base e estrutura), Elifoot e Brasfoot (Trivela, Lance, Wikipédia), matemática de jogos incrementais (Game Developer). Números internos do Football Chairman, Championship Manager e FIFA Manager não foram encontrados.
