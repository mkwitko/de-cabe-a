/**
 * Modo Clube messages in Brazilian Portuguese (ADR-017). Every text the person
 * reads in the mode comes from here; other languages implement the same keys.
 */
export const ptBR = {
  'sandbox.title': 'Prancheta',
  'sandbox.intro':
    'Teste da engine do Modo Clube. O time amarelo segue as instruções abaixo; a bola circula sozinha. Mude uma instrução e veja o time se reposicionar.',
  'sandbox.loading': 'Carregando a prancheta…',
  'sandbox.loadError': 'Não deu para carregar',
  'sandbox.pitchLabel': 'Campo visto de cima com os 22 jogadores e a bola',
  'sandbox.status':
    'Minuto {minute}. Bola {third, select, defence {na defesa} middle {no meio} other {no ataque}} do time amarelo.',
  'sandbox.pause': 'Pausar',
  'sandbox.resume': 'Continuar',
  'sandbox.speed': 'Velocidade',
  'sandbox.speedValue': '{speed}×',
  'sandbox.instructions': 'Instruções do time amarelo',
  'sandbox.width': 'Largura: {value} de 5',
  'sandbox.lineHeight': 'Altura da linha de defesa: {value} de 5',
  'sandbox.inverted': 'Lateral direito por dentro com a bola',

  'career.title': 'Modo Clube',
  'career.loadError': 'Não deu para carregar a carreira',
  'career.startTitle': 'Como você quer começar?',
  'career.mode': '{m, select, job_offers {Começar por baixo} other {Escolher o clube}}',
  'career.modeHint':
    '{m, select, job_offers {Três propostas da última divisão, cada uma um desafio diferente.} other {Qualquer clube das divisões nacionais, com elenco, caixa e estrutura do jeito que estão.}}',
  'career.axis':
    '{a, select, budget {Dinheiro} crowd {Torcida} structure {Estrutura} staff {Comissão} squad {Elenco} other {Ambição}}',
  'career.axisValue':
    '{a, select, budget {Dinheiro} crowd {Torcida} structure {Estrutura} staff {Comissão} squad {Elenco} other {Ambição}}: {n} de 100',
  'career.reputation': 'Reputação {n}',
  'career.accept': 'Assumir o {club}',
  'career.divisions': 'Divisões',
  'backup.title': 'Cópia de segurança',
  'backup.text':
    'Baixe um arquivo com a sua carreira e guarde. Se um dia precisar, restaure por aqui, mesmo em outro aparelho. Restaurar troca a carreira em andamento.',
  'backup.export': 'Baixar a carreira',
  'backup.import': 'Restaurar de um arquivo',
  'backup.confirm': 'Restaurar vai substituir a carreira em andamento. Continuar?',
  'backup.error': 'Não deu para concluir',
  'career.computing': 'Montando a temporada no seu aparelho…',
  'career.stage.pack': 'Baixando o mundo do futebol…',
  'career.stage.open': 'Montando elencos, calendário e finanças…',
  'career.stage.market': 'Os clubes estão negociando no mercado…',
  'career.stage.turn': 'Virando a temporada: acessos, rebaixamentos e contratos…',
  'career.stage.save': 'Guardando a carreira…',
  'career.where': '{division}, temporada {season}',
  'career.cashLabel': 'Caixa',
  'career.venue': '{v, select, home {Em casa} other {Fora de casa}}',
  'career.dateLong': '{d, date, long}',
  'career.last': 'Último jogo',
  'career.score': '{a}–{b}',
  'career.today': 'Hoje',
  'career.tunnel': 'Entrando em campo',
  'career.form': 'Últimos jogos',
  'career.formEmpty': 'Nenhum jogo ainda nesta temporada.',
  'career.formResult': '{r, select, W {V} D {E} other {D}}',
  'career.formLabel':
    '{r, select, W {Vitória} D {Empate} other {Derrota}}, {a} a {b}, contra o {opp}',
  'career.fixtures': 'Próximos jogos',
  'career.fixturesAll': 'Ver o calendário ({n} jogos)',
  'career.fixturesLess': 'Ver só os próximos',
  'career.venueShort': '{v, select, home {Casa} other {Fora}}',
  'career.inbox': 'Caixa de entrada',
  'career.todo': 'Pede resposta',
  'career.todoEmpty': 'Nada esperando por você.',
  'career.news': 'Notícias',
  'career.todoText':
    '{k, select, bid {O {club} fez proposta de {fee} por {name}.} approach {O {club} procurou você para o cargo de técnico.} agentOffer {O empresário oferece {name}{where}. Está disponível no Mercado.} leaveRequest {{name} pediu para sair.} other {{n} jogadores terminam o contrato este ano.}}',
  'career.todoGo':
    '{k, select, bid {Responder no Mercado} approach {Ver convite} agentOffer {Ver no Mercado} leaveRequest {Responder no Mercado} other {Ver no Mercado}}',
  'guide.title': 'Primeiros passos',
  'guide.step': 'Primeiros passos: {n} de {total}',
  'guide.text':
    '{k, select, vestiario {Vestiário: monte a escalação e a tática do time. Sem isso, o treinador escolhe por você.} mercado {Mercado: a janela de transferências está aberta. Aqui você contrata, vende e responde às propostas.} diretoria {Diretoria: veja a meta da temporada e a confiança do presidente. É por ela que você é cobrado.} other {Jogar: volte à sala do técnico e jogue a partida. Assista ou veja só o resultado.}}',
  'guide.go':
    '{k, select, vestiario {Ir ao Vestiário} mercado {Ir ao Mercado} other {Ir à Diretoria}}',
  'guide.next': 'Próximo',
  'guide.skip': 'Pular guia',
  'guide.done': 'Entendi',
  'career.from':
    '{f, select, board {Diretoria} press {Imprensa} staff {Comissão} market {Mercado} other {Financeiro}}',
  'career.msgWelcome':
    'Bem-vindo ao {club}. A diretoria espera trabalho sério desde o primeiro jogo da {division}.',
  'career.why': 'Por que deu esse resultado',
  'career.whySide': '{s, select, for {A favor} other {Contra}}',
  'career.whyFact':
    '{k, select, quality {A diferença de qualidade entre os elencos pesou.} out {{n, plural, one {# titular desfalcado (lesão, suspensão ou limite de estrangeiros) mudou o time.} other {# titulares desfalcados (lesão, suspensão ou limite de estrangeiros) mudaram o time.}}} tired {As pernas cansadas do time titular pesaram.} owed {Os salários atrasados abateram a força do time.} rivalShort {O adversário veio desfalcado ou cansado.} travel {A viagem de {n} km pesou no visitante.} crowd {O estádio com {n}% de ocupação mexeu com o mandante.} other {}}',
  'career.msgWin': 'Vitória por {a} a {b} sobre o {opp}. A torcida saiu cantando.',
  'career.msgDraw': 'Empate em {a} a {b} com o {opp}. Um ponto para a conta.',
  'career.msgLoss': 'Derrota por {a} a {b} para o {opp}. A imprensa cobra reação.',
  'career.msgCash': 'O caixa ficou negativo. A diretoria quer as contas em ordem.',
  'career.net': 'Saldo da temporada',
  'career.cash': '{value, number, currency}',
  'career.next': 'Próximo jogo',
  'career.rooms': 'Salas do clube',
  'career.roomShort':
    '{r, select, sala {Sala} vestiario {Vestiário} treino {Treino} mercado {Mercado} other {Diretoria}}',
  'career.leave': 'Sair para os jogos',
  'career.goMatch': 'Ir para o jogo',
  'career.goDeadline': 'Janela fecha hoje',
  'career.goSeason': 'Virar a temporada',
  'career.fixtureShort': '{home} × {away}',
  'career.room':
    '{r, select, sala {Sala do técnico} vestiario {Vestiário} treino {Campo de treino} mercado {Mercado} other {Diretoria}}',
  'squad.title': 'Escalação',
  'squad.col': '{c, select, pos {Pos.} name {Jogador} age {Idade} fresh {Fôlego} other {Nota}}',
  'squad.formation': 'Formação',
  'squad.auto': 'Escalação do treinador',
  'squad.strength': 'Força do time',
  'squad.foreigners':
    'Estrangeiros: {named}/{limit}{over, select, true { — acima do limite: os últimos ficam de fora} other {}}',
  'squad.list': 'Elenco',
  'squad.pick': 'Quem joga de {role}?',
  'squad.hint':
    'Toque numa posição do campo e depois no jogador, ou no jogador e depois na posição. Duas posições seguidas trocam os jogadores de lugar. No computador, dá para arrastar. A escolha vale no próximo jogo.',
  'squad.placing': 'Toque na posição de {name} no campo.',
  'squad.slot': '{role}: {name}, nota {n}, {known}',
  'squad.choose': '{name}, {age} anos, nota {n}, {known}',
  'squad.starter': 'Titular',
  'squad.fresh': 'Fôlego {n}%',
  'market.open': 'Janela aberta',
  'market.closed':
    'Janela fechada. As janelas da CBF vão até 27 de março e de 20 de julho a 11 de setembro; jogadores sem clube podem ser contratados a qualquer momento.',
  'market.cash': 'Caixa {cash}',
  'market.wageRoom': 'Folha: cabe mais {room} por mês',
  'market.noClub': 'Sem clube',
  'market.until': 'Contrato até {year}',
  'market.band': '{lo} a {hi}',
  'market.potential': 'Potencial {lo} a {hi}',
  'market.clause': 'Multa {fee}',
  'market.clauseSellOn':
    'Revenda {pct}%{mine, select, true { para o seu clube} other { para o clube que vendeu}}',
  'market.clauseBuyBack':
    'Recompra por {price} até {year}{mine, select, true { (seu clube)} other { (do clube que vendeu)}}',
  'market.clauseLoan':
    '{kind, select, option {Opção de compra} other {Obrigação de compra}}: {price}{mine, select, true { (a favor do seu clube)} other { (a favor de quem pegou)}}',
  'market.unhappy':
    '{s, select, unhappy {Insatisfeito com os minutos} asked {Pediu para sair} other {Aguarda a promessa de minutos}}',
  'market.sellOnLabel': 'Percentual de revenda (0 a 30%)',
  'market.buyBackLabel': 'Recompra (100 a 200% do valor; vazio = sem)',
  'market.buyBackSeasons': 'Temporadas da recompra',
  'market.netFee':
    'O comprador desconta o que você pede: a proposta vira {fee}; no seu preço, {ask}.',
  'market.buyBackGo': 'Recomprar por {price}',
  'market.optionGo': 'Exercer a opção de compra por {price}',
  'market.loanKind': 'Cláusula do empréstimo',
  'market.loanKindName': '{k, select, option {Opção de compra} other {Obrigação de compra}}',
  'market.borrowWith': 'Com cláusula',
  'market.lendWith': 'Ceder com cláusula',
  'market.requests': 'Jogadores que pediram para sair',
  'market.requestText':
    '{name} diz que joga menos do que merece e pediu para sair. Você pode pô-lo na lista, prometer minutos (será cobrado) ou recusar (ele guarda rancor e o vestiário sente).',
  'market.pleaList': 'Pôr na lista',
  'market.pleaPromise': 'Prometer minutos',
  'market.pleaRefuse': 'Recusar',
  'market.payClause': 'Pagar a multa',
  'market.imageLabel': 'Direito de imagem (parte do salário)',
  'market.imageUsual': 'Padrão do clube',
  'market.imageShare': '{s}% do salário',
  'market.imageHint':
    'Lei Pelé: até 40%. Sem encargos para o clube e menos imposto para o jogador, mas quanto maior a parcela, maior o risco de a Justiça do Trabalho reclassificar como salário (a partir de 10%).',
  'market.yourClause': 'Multa rescisória em reais (opcional)',
  'market.borrow': 'Emprestar',
  'market.borrowFor': 'Pegar {name} emprestado até o fim da temporada por {fee}',
  'market.lend': 'Ceder',
  'market.unlend': 'Não ceder',
  'market.lendFor':
    '{on, select, true {Tirar {name} da lista de empréstimo} other {Oferecer {name} por empréstimo}}',
  'market.forLoan': 'Para empréstimo',
  'market.onLoan': 'Emprestado pelo {club}',
  'market.renew': 'Renovar',
  'market.renewFor': 'Renovar o contrato de {name}',
  'market.freeTalk': 'Sem clube: não há taxa de transferência.',
  'market.renewTalk': 'Renovação: ele diz quanto quer para ficar.',
  'market.mine': 'Seu elenco',
  'market.sections': 'Partes do mercado',
  'market.section':
    '{s, select, buy {Contratar} mine {Seu elenco} scout {Olheiros} other {Negócios}}',
  'market.more': 'Ver os {n} jogadores',
  'market.fewer': 'Ver só os primeiros',
  'market.targets': 'Jogadores no mercado',
  'market.position': 'Posição',
  'market.all': 'Todas',
  'market.value': 'Valor {value}',
  'market.wage': '{wage} por mês',
  'market.talk': 'Negociar',
  'market.talkFor': 'Negociar {name}, {age} anos, nota {n}, valor {value}',
  'market.no':
    '{r, select, window {Janela fechada} embargo {Proibido de contratar} squadFull {Elenco cheio} theirSquad {Clube não libera} cold {Conversa encerrada} justMoved {Recém-contratado} abroad {Jogando no exterior} loyal {Não quer sair} stepDown {Não aceita descer} role {Não vem para o banco} other {Sem acordo}}',
  'market.part': '{p, select, starter {Titular} cover {Reserva imediato} other {Sobra no elenco}}',
  'market.list': 'Pôr à venda',
  'market.unlist': 'Tirar da lista',
  'market.listed': 'À venda',
  'market.listFor': '{on, select, true {Tirar {name} da lista} other {Pôr {name} à venda}}',
  'market.talks': 'Negociações',
  'market.asks': 'O {club} pede {fee}.',
  'market.mood':
    '{m, select, starter {Ele é titular lá: o clube cobra mais.} cover {Ele é o reserva imediato lá.} other {Ele sobra no elenco de lá: o clube aceita menos.}}',
  'market.left': '{n, plural, =0 {Última oferta.} one {Resta # oferta.} other {Restam # ofertas.}}',
  'market.yourFee': 'Sua oferta em reais',
  'market.offer': 'Oferecer',
  'market.payAsk': 'Pagar o pedido',
  'market.drop': 'Desistir',
  'market.agreed': 'Preço fechado com o {club}: {fee}.',
  'market.wants':
    '{name} pede {wage} por mês, {years, plural, one {# ano} other {# anos}}, como {role}.',
  'market.role':
    '{r, select, starter {titular} rotation {jogador de rodízio} backup {reserva} other {promessa}}',
  'market.yourWage': 'Salário por mês em reais',
  'market.years': 'Anos de contrato',
  'market.roleLabel': 'Papel prometido',
  'market.propose': 'Propor',
  'market.previewTitle': 'O que muda se fechar assim',
  'market.previewCash': 'Caixa depois da taxa: {after} (hoje {now})',
  'market.previewBill': 'Folha mensal: {after} ({delta} por mês), hoje {now}',
  'market.previewRoom': 'Espaço salarial que sobra: {room}',
  'market.previewOver': 'Passa do teto da diretoria em {over}.',
  'market.previewEnters': 'Entra no time ideal com nota {rating}.',
  'market.previewPushes': 'Tira {name} (nota {old}) do time ideal.',
  'market.previewBench': 'Não entra no time ideal: fica como reserva.',
  'market.previewRenew': 'Já está no elenco: o time ideal não muda.',
  'market.takeAsk': 'Aceitar o pedido',
  'market.bids': 'Propostas recebidas',
  'market.bidText': 'O {club} oferece {fee} por {name}.',
  'market.accept': 'Aceitar',
  'market.refuse': 'Recusar',
  'market.yourPrice': 'Seu preço em reais',
  'market.counter': 'Pedir esse valor',
  'market.saidFee':
    '{k, select, accept {Preço fechado. Agora o contrato com o jogador.} counter {O clube não aceitou e fez um novo pedido.} insult {A oferta ofendeu o clube, que encerrou a conversa até a próxima temporada.} other {O clube encerrou a conversa até a próxima temporada.}}',
  'market.saidTerms':
    '{k, select, accept {{name} assinou. Negócio fechado.} counter {{name} não aceitou e fez um novo pedido.} impatient {O empresário de {name} perdeu a paciência: o pedido subiu.} loyal {{name} não quer deixar o clube dele.} stepDown {{name} não aceita descer de nível.} role {{name} não vem para ser reserva.} other {{name} encerrou a conversa.}}',
  'market.saidBid':
    '{k, select, sold {{name} vendido.} raised {O clube subiu a oferta.} refused {Proposta por {name} recusada.} tooDear {O clube desistiu de {name}.} squadThin {Seu elenco ficaria abaixo do mínimo: negócio desfeito.} budget {O clube não tem como pagar: negócio desfeito.} other {{name} não quis ir: negócio desfeito.}}',
  'market.saidNo':
    '{r, select, loansOut {O clube já tem seis jogadores emprestados, o limite da FIFA.} loansIn {Seu clube já tem seis jogadores emprestados de outros, o limite da FIFA.} pairLimit {Já são três empréstimos com esse clube nesta temporada, o limite da FIFA.} scout_busy {Todos os seus olheiros já estão viajando.} scout_cash {O caixa não cobre a viagem do olheiro.} scout_already {Já há um olheiro nessa região.} scout_area {Não há clubes nessa região.} cash {Seu caixa não cobre esse valor.} wageCap {A diretoria barrou: esse salário não cabe na folha.} noMinutes {Ele não viria: não jogaria no seu time.} starter {O clube não empresta um titular.} theirSquad {O clube não tem elenco para liberar.} embargo {Fair play financeiro: o clube está proibido de contratar nesta temporada.} squadFull {Seu elenco está cheio.} window {A janela está fechada.} cold {Essa conversa foi encerrada até a próxima temporada.} other {Não foi possível fazer isso agora.}}',
  'market.news': 'Negócios entre clubes',
  'market.scouts': 'Olheiros',
  'market.scoutsInfo':
    '{n, plural, one {Você tem # olheiro.} other {Você tem # olheiros.}} Cada viagem leva 4 semanas e traz os melhores jogadores da região que você ainda não conhecia; um relatório de um só jogador (em Elencos) leva 1 semana e conta mais. Cada relatório e cada jogo contra o clube de um jogador aumentam o quanto você o conhece; sem novas informações, o conhecimento cai com o tempo. Quanto mais você conhece, mais perto da verdade ficam a nota e o potencial. Na lista do mercado só aparecem jogadores que o clube conhece.',
  'market.scoutsKnown':
    '{n, plural, =0 {Nenhum jogador nos seus arquivos ainda.} one {# jogador nos seus arquivos.} other {# jogadores nos seus arquivos.}}',
  'market.scoutAway': '{area}: volta em {date}',
  'market.scoutArea': 'Região',
  'market.scoutSend': 'Mandar olheiro',
  'market.saidScout': 'Olheiro a caminho: {area}.',
  'market.knowledge': 'Conhecimento {k}%',
  'market.unknown': 'Desconhecido',
  'market.agent': 'Empresário: {name}{size, select, big { (grande agência)} other {}}',
  'market.agentGreed': 'comissão {n}%',
  'market.agentPatience': '{n, plural, one {paciência de # rodada} other {paciência de # rodadas}}',
  'market.offered': 'Oferecidos por empresários',
  'market.offeredInfo':
    'Empresários que trabalham com o seu clube oferecem jogadores que encaixam no elenco. A relação melhora a cada negócio fechado e piora a cada conversa rompida.',
  'market.seenAgo':
    '{n, plural, =0 {visto este mês} one {visto há # mês} other {visto há # meses}}',
  'market.scoutCost': 'Custo da viagem: {cost}',
  'market.squads': 'Elencos',
  'market.squadsInfo':
    'Um relatório de um só jogador ocupa um olheiro por uma semana e custa até {cost}.',
  'market.squadsPick': 'Clube',
  'market.squadsNone': 'Escolha um clube',
  'market.watch': 'Pedir relatório',
  'market.watchFor': 'Pedir relatório de {name}',
  'market.watching': 'Olheiro observando',
  'market.noNews': 'Nenhum negócio ainda nesta janela.',
  'market.deal':
    '{to} contratou {name} do {from} por {fee} para ser {for, select, starter {titular} other {reserva}}.',
  'market.judged': 'Avaliaram ele em nota {seen}. Diretoria de futebol nível {office} de 5.',
  'market.why':
    'Por quê: necessidade {need}, encaixe {fit}, evolução {growth}, revenda {resale}, custo −{cost}, folha −{wages}.',
  'market.bought': '{name} contratado junto ao {club} por {price}.',
  'market.sold': '{name} vendido ao {club} por {price}.',
  'inbox.contractEnded': 'O contrato de {name} acabou e ele deixou o clube.',
  'inbox.contractKept': '{name} ficou mais um ano: sem ele o elenco não teria gente para jogar.',
  'inbox.injury':
    '{name} se machucou: {kind}. Fora por {days, plural, one {# dia} other {# dias}}.',
  'health.kind':
    '{k, select, knock {pancada} muscle {lesão muscular} sprain {entorse} other {lesão grave}}',
  'health.out': '{n, plural, one {Lesionado: volta em # dia} other {Lesionado: volta em # dias}}',
  'health.outLabel': 'Lesionado',
  'squad.banned': 'Suspenso',
  'career.bannedOurs': 'Suspensos do seu time: {names}',
  'career.bannedTheirs': 'Desfalques do adversário por suspensão: {names}',
  'inbox.crop':
    '{n, plural, one {# garoto chegou} other {# garotos chegaram}} à base. Veja no Campo de treino quem merece subir.',
  'inbox.solidarity':
    '{name}, formado no clube, foi vendido: a solidariedade rendeu {fee} ao caixa.',
  'inbox.agentOffer':
    '{agent} oferece {name}{club, select, none { (sem clube)} other {, do {club}}}. Ele está no Mercado, em Oferecidos por empresários.',
  'inbox.homecoming':
    '{agent}, empresário de {name}, diz que ele quer voltar do exterior e procurou o seu clube. Ele pede {wage} por mês; a conversa está aberta no Mercado.',
  'inbox.watched': 'Chegou o relatório do olheiro sobre {name}: agora você o conhece melhor.',
  'inbox.scouted':
    '{n, plural, =0 {O olheiro voltou de {area} sem nomes novos.} one {O olheiro voltou de {area} com # jogador novo nos arquivos.} other {O olheiro voltou de {area} com # jogadores novos nos arquivos.}}',
  'inbox.cameUp':
    '{n, plural, one {# garoto fez 19 anos e subiu} other {# garotos fizeram 19 anos e subiram}} da base para o elenco.',
  'academy.title': 'Base',
  'academy.hint':
    'Na base o garoto cresce no ritmo dele. No elenco cresce mais se jogar e menos se ficar parado. Aos 19 anos ele sobe sozinho.',
  'academy.empty': 'Nenhum garoto na base agora. A próxima safra chega na virada da temporada.',
  'academy.line': '{age} anos, nota {rating}, potencial {lo} a {hi}',
  'academy.promote': 'Subir',
  'academy.promoteName': 'Subir {name} para o elenco',
  'inbox.contractsEnding':
    '{n, plural, one {# jogador termina} other {# jogadores terminam}} o contrato no fim da temporada. Renove no Mercado quem você quer manter.',
  'inbox.clausePaid': 'O {club} pagou a multa de {name}: {fee}. Ele foi embora.',
  'inbox.sellOn': '{name} foi revendido: o percentual de revenda rendeu {fee} ao caixa.',
  'inbox.optionBought': '{name} foi comprado do {club} pela cláusula do empréstimo: {fee}.',
  'inbox.optionSold': 'O {club} exerceu a compra de {name}: {fee} no caixa.',
  'inbox.unhappy': '{name} está insatisfeito: joga menos do que acha que merece.',
  'inbox.leaveRequest': '{name} pediu para sair. Responda no Mercado.',
  'inbox.promiseKept': '{name} viu a promessa de minutos cumprida e se acalmou.',
  'inbox.promiseBroken': '{name} não teve os minutos prometidos e pediu para sair de novo.',
  'inbox.loanIn': '{name} chegou por empréstimo do {club}, por {fee}.',
  'inbox.loanOut': '{name} foi emprestado ao {club}, por {fee}.',
  'inbox.loanBack': 'Fim do empréstimo de {name} ({club}).',
  'inbox.bid': 'O {club} fez proposta de {fee} por {name}. Responda no Mercado.',
  'inbox.fairplay':
    '{s, select, 1 {Fair play financeiro: os salários fecharam a temporada em {cost}% da receita, acima do limite da CBF. Advertência pública.} 2 {Fair play financeiro: segunda temporada acima do limite ({cost}%). Multa de {fine}.} 3 {Fair play financeiro: terceira temporada acima do limite ({cost}%). Multa de {fine} e registro de atletas bloqueado: o clube não pode contratar.} other {Fair play financeiro: o clube segue acima do limite ({cost}%). Multa de {fine}, registro bloqueado e {points} pontos a menos na tabela.}}',
  'inbox.directors':
    '{mine, select, yes {{why, select, sale {O clube foi vendido. O novo dono} other {Eleição no clube. A nova diretoria}} é {h, select, short {imediatista: quer resultado já, com mais verba para reforços e menos paciência.} long {de longo prazo: segura verba para estrutura e base e dá tempo ao trabalho.} other {equilibrada.}} A meta da temporada foi refeita.} other {{why, select, sale {O {club} foi vendido} other {O {club} elegeu nova diretoria}}, {h, select, short {imediatista} long {de longo prazo} other {equilibrada}}.}}',
  'inbox.election':
    '{mine, select, yes {{r, select, reelected {Eleição no clube: situação reeleita. A diretoria segue e a sua confiança também.} other {Eleição no clube: a oposição venceu. {out, select, yes {O novo presidente quer treinador próprio: você foi demitido.} other {O novo presidente manteve você, mas a confiança recomeça do zero e a meta foi refeita.}}}}} other {{r, select, reelected {No {club}, a situação foi reeleita.} other {No {club}, a oposição venceu a eleição}}{h, select, short {, com diretoria imediatista.} long {, com diretoria de longo prazo.} other {.}}}}',
  'inbox.electionYear':
    'Ano de eleição: a diretoria olha para o voto de fim de temporada. Mais pressa por resultado, mais verba para reforços e menos para estrutura.',
  'inbox.fairplayRival':
    'Fair play financeiro: o {club} começa a temporada com {points} pontos a menos.',
  'inbox.hired': 'Você assumiu o {club}. A direção começa do zero com você.',
  'inbox.empty': 'Nenhuma mensagem ainda.',
  'inbox.agentOffers': 'Empresários ofereceram {n} jogadores: {names}.',
  'inbox.open':
    '{r, select, mercado {Abrir o mercado} treino {Ver o treino} vestiario {Ver o elenco} other {Falar com a diretoria}}',
  'inbox.more': 'Ver as {n} mensagens',
  'inbox.less': 'Ver só as últimas',
  'inbox.ultimatum':
    'Ultimato: {points, plural, one {# ponto} other {# pontos}} {matches, plural, one {no próximo jogo} other {nos próximos # jogos}}, ou o contrato acaba.',
  'inbox.ultimatumMet': 'Ultimato cumprido. A direção recua.',
  'inbox.goal':
    '{met, select, true {Meta cumprida} other {Meta não cumprida}}: o clube terminou em {position}º e a meta era o {goal}º lugar.',
  'inbox.sponsor':
    'Contrato renovado com {name}: {value} por ano, {years, plural, one {por # temporada} other {por # temporadas}}.',
  'inbox.calledUp':
    '{name} foi convocado pela seleção e desfalca o clube na data FIFA: os jogos seguem sem ele.',
  'inbox.suspension':
    '{why, select, yellows {{name} recebeu o terceiro amarelo e cumpre suspensão automática no próximo jogo da competição.} red {{name} foi expulso e cumpre suspensão automática no próximo jogo da competição.} other {O STJD julgou a expulsão de {name}: mais {n, plural, one {# jogo} other {# jogos}} de suspensão.}}',
  'career.fx': '{c, select, USD {Dólar} other {Euro}}',
  'career.fxRate': 'R$ {rate, number, ::.00} ({change, number, ::+.0}% no ano)',
  'inbox.fx':
    '{up, select, true {O real desabou: o {c, select, USD {dólar} other {euro}} subiu {change, number, ::.0}% no mês e vale R$ {rate, number, ::.00}. Contratar no exterior ficou mais caro; vender para fora rende mais.} other {O real se valorizou: o {c, select, USD {dólar} other {euro}} caiu {change, number, ::.0}% no mês e vale R$ {rate, number, ::.00}. Contratar no exterior ficou mais barato; vender para fora rende menos.}}',
  'inbox.owners':
    'A temporada fechou no vermelho. Os donos do clube aportaram {value} para cobrir parte do prejuízo; o resto vira dívida.',
  'inbox.arrears':
    '{n, plural, one {O caixa está no vermelho e os salários do mês não foram pagos. O elenco sente: rende menos em campo.} other {Salários atrasados há # meses. O vestiário está em pé de guerra{n, select, 2 { — no terceiro mês a Lei Pelé deixa os jogadores rescindirem} other {: quem tem mercado pode ir embora de graça}}.}}',
  'inbox.arrearsPaid': 'Os salários atrasados foram quitados. O vestiário respira de novo.',
  'inbox.imageClaim':
    '{name} ganhou na Justiça do Trabalho: o direito de imagem era salário disfarçado. O clube pagou {value} em encargos atrasados e multa.',
  'inbox.walkout':
    '{name} entrou na Justiça pelos salários atrasados, rescindiu o contrato e saiu de graça.',
  'inbox.coachSacked': 'O {club} demitiu o técnico. A vaga está aberta.',
  'inbox.coachHired':
    'O {club} contratou {coach}, de estilo {style, select, attacking {ofensivo} defensive {defensivo} pressing {de pressão} possession {de posse de bola} direct {direto} other {equilibrado}}.',
  'career.rivalCoach':
    'Técnico rival: {coach}, de estilo {style, select, attacking {ofensivo} defensive {defensivo} pressing {de pressão} possession {de posse de bola} direct {direto} other {equilibrado}}.',
  'board.dna':
    'Identidade do clube: jogo {s, select, attacking {ofensivo} defensive {defensivo} pressing {de pressão} possession {de posse de bola} direct {direto} other {equilibrado}}. Mudar o estilo custa tempo: a torcida e a diretoria se acostumam devagar.',
  'inbox.approach':
    'O {club} demitiu o técnico e sondou você para o cargo. A proposta vale enquanto a vaga estiver aberta.',
  'career.approach': 'Proposta do {club}',
  'career.approachText': 'O {club} ({division}) quer você como técnico.',
  'career.approachTake': 'Aceitar e assumir o {club}',
  'inbox.press':
    'A imprensa fala em crise: {n} jogos sem vencer. A cobrança chega à diretoria, e a paciência com o técnico encurta.',
  'inbox.protest':
    'A torcida protestou depois da derrota: cobra a diretoria e o técnico. A paciência do conselho diminuiu.',
  'inbox.closedDoors':
    'Jogo de portões fechados, por punição do STJD: sem torcida, sem bilheteria.',
  'inbox.courtBan':
    'Confusão no nosso estádio. O STJD vai nos tirar {n, plural, one {# mando de campo} other {# mandos de campo}}, a partir do segundo jogo em casa.',
  'inbox.tired':
    '{n, plural, one {# titular saiu} other {# titulares saíram}} do jogo com menos de metade do fôlego. Vale rodar o elenco.',
  'inbox.window':
    '{open, select, true {A janela de transferências abriu.} other {A janela de transferências fechou.}}',
  'inbox.quota':
    '{source, select, copa {Copa do Brasil: {line, select, prize {premiação da final} other {cota da {phase}ª fase}} creditada, {amount}.} serieC {Série C: {line, select, advance {cota da fase final (quadrangular)} other {cota}} creditada, {amount}.} serieD {Série D: {line, select, prize {cota da final} other {cota da {phase}ª fase}} creditada, {amount}.} other {Direitos de TV da Série A: parte por colocação creditada, {amount}.}}',
  'inbox.estadual':
    '{position, select, 1 {Campeões do {name}!} other {{name}: {champion} é o campeão.}}{paid, select, true { Premiação creditada, {prize}.} other {}}',
  'inbox.season':
    'Temporada {season}: {champion} campeão da divisão. {move, select, promotion {O clube subiu.} relegation {O clube caiu.} other {O clube fica onde está.}}',
  'inbox.copaDraw':
    'Sorteio da Copa do Brasil ({phase}): {legs, select, 2 {ida e volta contra {opp}, com a ida {home, select, true {em casa} other {fora}}.} other {jogo único contra {opp}, {home, select, true {em casa} other {fora}}.}}',
  'inbox.copaOut':
    'Eliminados da Copa do Brasil {phase}{by, select, penalties {, nos pênaltis} penaltyDraw {, nos pênaltis} other {}}. O foco volta ao campeonato.',
  'inbox.copaTitle': 'Campeões da Copa do Brasil! A taça é nossa.',
  'copa.phase':
    '{p, select, fase-1 {1ª fase} fase-2 {2ª fase} fase-3 {3ª fase} fase-4 {4ª fase} fase-5 {5ª fase} oitavas {Oitavas de final} quartas {Quartas de final} semifinal {Semifinal} other {Final}}',
  'copa.phaseIn':
    '{p, select, fase-1 {na 1ª fase} fase-2 {na 2ª fase} fase-3 {na 3ª fase} fase-4 {na 4ª fase} fase-5 {na 5ª fase} oitavas {nas oitavas de final} quartas {nas quartas de final} semifinal {na semifinal} other {na final}}',
  'copa.leg': '{legs, select, 2 {{leg, select, 1 {ida} other {volta}}} other {jogo único}}',
  'copa.label': '{name}, {phase}, {leg}',
  'copa.congested':
    'Semana cheia: {n, plural, one {# dia} other {# dias}} desde o último jogo. Vale rodar o elenco.',
  'copa.rest': '{n}d',
  'cup.title': 'Copa do Brasil',
  'cup.mine': 'Seu caminho',
  'cup.pens': 'pên.',
  'cup.empty': 'Sem partidas desta fase ainda.',
  'review.copa': 'Copa do Brasil: até {phase}.',
  'board.goal': 'Meta da temporada',
  'board.structure': 'Estrutura do clube',
  'market.officeCash': 'Caixa',
  'market.officeBoard': 'Diretoria',
  'market.officeBoardText':
    '{h, select, short {Imediatista} long {De longo prazo} other {Equilibrada}}, {c, select, high {bem avaliada} low {mal avaliada} other {de gestão mediana}}',
  'market.officeWork': '(em obra)',
  'market.officeFame': 'Fama',
  'board.fame':
    'Fama: {national} no Brasil, {continental} na América do Sul, {international} no mundo (de 0 a 100). Títulos e campanhas aumentam; o tempo sem conquistas devolve à história do clube.',
  'board.upkeep': 'Manutenção da estrutura: {cost} por temporada, descontada mês a mês.',
  'board.front':
    '{f, select, training {Centro de treinamento} youth {Categorias de base} medical {Departamento médico} scouting {Olheiros} football {Diretoria de futebol} stadium {Estádio} other {Estrutura}}',
  'board.level': 'Nível {n} de 5',
  'board.seats': '{n, number} lugares',
  'board.cost': 'Próxima obra: {cost}',
  'board.workWhen': 'Toda obra aprovada fica pronta na virada da temporada.',
  'board.building': 'Em obra',
  'board.top': 'No nível máximo.',
  'board.propose': 'Propor obra',
  'board.proposeName': 'Propor obra: {f}',
  'board.workYes': 'A diretoria aprovou a obra: {f} fica pronta na virada da temporada.',
  'board.workNo':
    '{r, select, cash {A diretoria negou: o caixa não cobre a obra e a reserva que ela quer manter.} horizon {A diretoria negou: obra cara demais para quem quer resultado agora.} useless {A diretoria negou: o estádio não lota, ampliar seria dinheiro jogado fora.} busy {Já há uma obra nessa frente.} top {Essa frente já está no nível máximo.} other {A diretoria negou.}}',
  'board.electionYear': 'Ano de eleição',
  'board.directors':
    '{h, select, short {Diretoria imediatista: quer resultado já, libera mais verba para reforços e tem pouca paciência com derrotas.} long {Diretoria de longo prazo: segura verba para estrutura e base, dá tempo ao trabalho.} other {Diretoria equilibrada: cobra resultado sem abrir mão do planejamento.}} Competência {n} de 100.',
  'board.goalText': 'Terminar a {division} até o {n}º lugar.',
  'board.position': 'Hoje o clube é o {n}º.',
  'board.confidence': 'Confiança da direção',
  'board.state':
    '{s, select, high {Prestigiado} steady {Estável} pressed {Pressionado} other {Na corda bamba}}',
  'board.last': 'O que mexeu na confiança',
  'board.none': 'Nada ainda. A confiança muda a cada jogo seu.',
  'board.result':
    '{r, select, W {Vitória} D {Empate} other {Derrota}} {odds, select, favourite {como favorito} underdog {como azarão} other {em jogo parelho}}',
  'board.reason':
    '{k, select, cash {Salários atrasados} goalMet {Meta da temporada cumprida} goalMissed {Meta da temporada não cumprida} fairplay {Fair play financeiro: salários acima do limite} protest {Protesto da torcida} homegrown {A torcida aplaude os crias da casa} locals {A torcida se vê nos jogadores da terra} press {Crise na imprensa} derby {Clássico perdido no estadual} exit {Eliminação precoce no estadual} identity {Estilo de jogo e identidade do clube} other {Ultimato cumprido}}',
  'board.up': '+{n}',
  'board.down': '−{n}',
  'board.ultimatum': 'Ultimato',
  'board.ultimatumText':
    'A direção quer {points, plural, one {# ponto} other {# pontos}} {matches, plural, one {no próximo jogo} other {nos próximos # jogos}}. Sem isso, o contrato acaba.',
  'board.fairplay': 'Fair play financeiro',
  'board.fairplayCost': '{n}%',
  'board.fairplayLimit': 'da receita vai em salários. O limite da CBF é {n}%.',
  'board.fairplayNoLimit': 'da receita vai em salários. Esta divisão não tem limite da CBF.',
  'board.fairplayState':
    '{s, select, 0 {{over, select, yes {Acima do limite. Se a temporada terminar assim, vem advertência.} other {Dentro do limite.}}} 1 {Advertência. Mais uma temporada acima do limite e vem multa.} 2 {Multado. Mais uma temporada acima do limite e o registro de atletas é bloqueado.} 3 {Registro bloqueado: sem contratações nesta temporada. Mais uma acima do limite e o clube perde pontos.} other {Registro bloqueado. O clube começou a temporada com {points} pontos a menos.}}',
  'board.calm': 'Sem ultimato. Abaixo de 25 de confiança, a direção dá um prazo.',
  'board.fired': 'A direção encerrou seu contrato',
  'board.firedText': 'O ultimato não foi cumprido. O {club} segue sem você.',
  'board.restart': 'Começar outra carreira',
  'board.offers': 'Clubes que querem você',
  'board.take': 'Assumir',
  'board.takeName': 'Assumir o {club}',
  'training.week': 'Semana de treino',
  'training.intensity': '{i, select, light {Leve} normal {Normal} other {Forte}}',
  'training.recovery': 'Fôlego volta {n, number}% por dia',
  'training.target': 'Entrosamento vai a {n}%',
  'training.drill': 'Entrosamento hoje',
  'training.drillHint':
    'Time entrosado pressiona junto e segue o plano. Conta na partida assistida e no resultado.',
  'training.next':
    '{n, plural, =0 {Jogo hoje.} one {Próximo jogo em # dia.} other {Próximo jogo em # dias.}}',
  'training.noMatch': 'Sem jogo marcado.',
  'training.cost': 'Cada titular deixa {n}% de fôlego no jogo.',
  'training.fresh': 'Fôlego para o próximo jogo',
  'training.freshHint': 'Quem está cansado rende menos. Troque no Vestiário ou alivie a semana.',
  'training.state': '{s, select, ready {Pronto} tired {Cansado} other {Esgotado}}',
  'training.player': '{name}: fôlego {n}%, {state}',
  'training.count':
    '{n} {s, select, ready {{n, plural, one {pronto} other {prontos}}} tired {{n, plural, one {cansado} other {cansados}}} other {{n, plural, one {esgotado} other {esgotados}}}}',
  'squad.known':
    '{l, select, 3 {Da posição} 2 {Sabe jogar ali} 1 {Improvisado} other {Fora de posição}}',
  'squad.plan': 'Plano de jogo',
  'squad.planHint':
    'O plano vale quando você assiste à partida ou vê os melhores momentos. Em "Só o resultado" conta apenas a escalação.',
  'squad.age': '{n} anos',
  'squad.scored':
    '{g, plural, one {# gol} other {# gols}}, {a, plural, one {# assistência} other {# assistências}}',
  'squad.role':
    '{r, select, goalkeeper {Goleiro} sweeperKeeper {Goleiro líbero} centreBack {Zagueiro} libero {Líbero} supportFullBack {Lateral} invertedFullBack {Lateral por dentro} wingBack {Ala} anchor {Volante} deepPlaymaker {Volante armador} boxToBox {Meia área a área} playmaker {Armador} wideWinger {Ponta aberto} insideForward {Ponta por dentro} targetMan {Pivô} falseNine {Falso nove} advancedForward {Centroavante} other {Jogador}}',
  'squad.position':
    '{p, select, GK {GOL} CB {ZAG} RB {LD} LB {LE} DM {VOL} CM {MC} RM {MD} LM {ME} AM {MEI} RW {PD} LW {PE} SS {SA} other {ATA}}',
  'career.date': '{d, date, short}',
  'career.builtHere': 'Último passo calculado neste aparelho em {ms} ms.',
  'career.play': 'Só o resultado',
  'career.watchFull': 'Assistir à partida',
  'career.watchHighlights': 'Melhores momentos',
  'career.lastResult': '{home} {a} × {b} {away}',
  'career.seasonOver': 'Temporada encerrada.',
  'review.title': 'Balanço da temporada {season}',
  'review.position': '{n}º de {places} na {division}',
  'review.verdict':
    '{v, select, met {Meta cumprida (até o {goal}º).} fired {Você foi demitido durante a temporada.} other {Meta não cumprida (até o {goal}º).}}',
  'review.confidence': 'Confiança da direção: {from} para {to}.',
  'review.champion': 'Campeão da {division}!',
  'review.championOther': 'Campeão da divisão: {name}.',
  'review.move': '{m, select, promotion {Acesso conquistado!} other {Rebaixado.}}',
  'review.revenue': 'Receitas de competições e TV',
  'review.cup': 'Campeão: {name}!',
  'review.record':
    '{w, plural, one {# vitória} other {# vitórias}}, {d, plural, one {# empate} other {# empates}}, {l, plural, one {# derrota} other {# derrotas}}. Gols: {gf} pró, {ga} contra.',
  'review.bestWin': 'Maior vitória: {score} contra {opponent}',
  'review.worstLoss': 'Pior derrota: {score} contra {opponent}',
  'review.used': 'Mais utilizados',
  'review.usedRow': '{name}: {n, plural, one {# jogo como titular} other {# jogos como titular}}',
  'history.title': 'História',
  'history.none': 'Nenhuma temporada completa ainda.',
  'history.row':
    '{club}, {n}º na {division} (meta {goal}º{met, select, met {, cumprida} fired {, demitido} other {, não cumprida}})',
  'history.title1': 'Campeão',
  'history.promoted': 'Acesso',
  'history.relegated': 'Rebaixado',
  'share.season': 'Compartilhar temporada',
  'share.career': 'Compartilhar carreira',
  'share.story': 'Formato story',
  'share.copy': 'Copiar texto',
  'share.copied': 'Texto copiado!',
  'share.busy': 'Gerando…',
  'share.brand': 'DE CABEÇA F.C. · MODO CLUBE',
  'share.url': 'decabecafc.com.br',
  'share.headline':
    '{h, select, titleUp {Campeão e acesso!} title {Campeão da {division}!} cup {Campeão: {cup}!} up {Acesso histórico!} down {Rebaixado, a volta por cima vem aí} escaped {Escapou do rebaixamento} fired {Demitido no meio da temporada} met {Meta cumprida} other {Meta não cumprida}}',
  'share.seasonLine': '{club} na temporada {season}',
  'share.posLine': '{n}º de {places} na {division}',
  'share.goalLine':
    '{met, select, yes {Meta cumprida (até o {goal}º)} other {Meta não cumprida (até o {goal}º)}}',
  'share.recordLine': '{w}V {d}E {l}D · gols {gf} × {ga}',
  'share.topLine': 'Mais utilizado: {name}',
  'share.careerTitle': 'Minha carreira como técnico',
  'share.careerSeasons': '{seasons, plural, one {# temporada} other {# temporadas}}',
  'share.careerStats':
    '{titles, plural, =0 {nenhum título} one {# título} other {# títulos}} · {ups, plural, =0 {nenhum acesso} one {# acesso} other {# acessos}}',
  'share.careerClubs': '{clubs}',
  'share.careerBest':
    'Melhor temporada: {season}, {n}º na {division}{club, select, none {} other { com o {club}}}',
  'share.careerBestTitle':
    'Melhor temporada: {season}, campeão da {division}{club, select, none {} other { com o {club}}}',
  'review.scorers': 'Gols e assistências na liga',
  'review.topScorer': 'Artilheiro do clube: {name} ({n, plural, one {# gol} other {# gols}})',
  'review.topAssister':
    'Líder em assistências: {name} ({n, plural, one {# assistência} other {# assistências}})',
  'review.artilharia':
    'Artilheiro da divisão: {name} ({club}), {n, plural, one {# gol} other {# gols}}',
  'history.scorer': 'Artilheiro: {name} ({n, plural, one {# gol} other {# gols}})',
  'history.top': 'Mais utilizado: {name} ({n, plural, one {# jogo} other {# jogos}})',
  'career.preseason': 'Pré-temporada',
  'career.preseasonText':
    '{n, plural, one {Falta # dia} other {Faltam # dias}} para a estreia, em {d, date, long}.',
  'career.preseasonDebut': 'Estreia',
  'career.preseasonWhy':
    'O elenco se reapresentou. A janela está aberta: monte o grupo, ajuste o treino e avance um dia de cada vez.',
  'career.preseasonTraining': 'Treino',
  'career.preseasonDay': 'Avançar um dia',
  'career.preseasonSkip': 'Ir para a estreia',
  'career.deadline': 'Último dia da janela',
  'career.deadlineText':
    'A janela de transferências fecha em {d, date, long}. Depois dela, só dá para contratar jogadores sem clube.',
  'career.deadlineWhy':
    'Você chegou no último dia da janela: se quiser reforçar ou vender alguém, é agora. Se não, feche a janela e siga para o jogo.',
  'career.deadlineMarket': 'Fazer contratações',
  'career.deadlineGo': 'Fechar a janela',
  'career.nextSeason': 'Começar a temporada {season}',
  'bridge.title': 'O que vem aí',
  'bridge.happened': 'O que aconteceu',
  'bridge.carried': 'O que fica para a temporada',
  'bridge.ahead': 'Problemas pela frente',
  'bridge.close': 'Entendi',
  'bridge.season':
    '{move, select, promotion {Acesso conquistado.} relegation {Rebaixamento.} other {{fired, select, true {Demissão no meio do ano.} other {{champion, select, true {Título da divisão.} other {Temporada na mesma divisão.}}}}}}',
  'bridge.sale': 'Venda: {player} por {fee, number, currency}.',
  'bridge.idol': '{name} foi o mais utilizado, com {starts} jogos como titular.',
  'bridge.crisis':
    '{what, select, ultimatum {A diretoria deu um ultimato.} cashRed {O caixa ficou no vermelho.} other {Salários atrasaram.}}',
  'bridge.cash': 'Caixa: {from, number, currency} para {to, number, currency}.',
  'bridge.squad': 'Elenco: {lost} saíram, {won} chegaram.',
  'bridge.confidence': 'Confiança da direção: {from} para {to}.',
  'bridge.election': 'Há eleição no clube nesta temporada.',
  'bridge.contracts':
    '{players, plural, one {# contrato termina} other {# contratos terminam}} no fim da temporada.',
  'bridge.ageing':
    '{players, plural, one {# jogador tem} other {# jogadores têm}} 32 anos ou mais.',
  'bridge.goal': 'Nova meta da direção: terminar até o {position}º lugar.',
  'career.turn':
    'Temporada {season}: {champion} campeão da divisão. {move, select, promotion {Seu clube subiu!} relegation {Seu clube caiu.} other {Seu clube fica na divisão.}}',
  'career.momentTitle': '{m, select, champion {Campeão!} promotion {Subimos!} other {Rebaixado}}',
  'career.momentText':
    '{m, select, champion {O {club} ganhou a divisão em {season} e sobe com a taça.} promotion {O {club} está na divisão de cima. {champion} fechou {season} com o título.} other {O {club} caiu de divisão em {season}. {champion} ficou com o título.}}',
  'career.momentGo': 'Seguir para {season}',
  'career.money': 'Dinheiro na temporada {season}',
  'career.moneyKind':
    '{k, select, wages {Salários} debt {Parcela da dívida} interest {Juros da dívida} tv {Direitos de TV} quota {Cota de participação} advance {Cota por fase} prize {Premiação de final} sponsors {Patrocínio} tickets {Bilheteria} members {Sócios} owners {Aporte dos donos} cups {Campeonato estadual} transfers {Transferências} travel {Viagens} agent {Comissões de empresários} scouting {Olheiros} lawsuit {Condenação trabalhista} fine {Multa do fair play} upkeep {Manutenção da estrutura} works {Obras} other {Outros}}',
  'career.table': 'Classificação',
  'career.colRecord': '{c, select, won {V} drawn {E} other {D}}',
  'career.zoneUp': 'Sobem {n}',
  'career.zoneDown': 'Caem {n}',
  'career.estadualKnockout': 'Mata-mata do estadual',
  'career.estadualStage':
    '{s, select, quartas {Quartas} semi {Semifinal} final {Final} other {Fase}}',
  'career.estadualTie': '{played, select, true {{home} {a} x {b} {away}} other {{home} x {away}}}',
  'career.estadualChampion': 'Campeão: {name}',
  'career.col': '{c, select, pos {#} club {Clube} played {J} gd {SG} other {P}}',
  'friendly.continue': 'Continuar',
  'friendly.title': 'Amistoso',
  'friendly.kicker': 'Modo Clube · partida avulsa',
  'friendly.intro':
    'Escolha os dois clubes, monte o seu plano e assista. Você comanda o mandante; o visitante segue o treinador dele.',
  'friendly.home': 'Mandante · seu time',
  'friendly.away': 'Visitante',
  'friendly.club': 'Clube',
  'friendly.formation': 'Formação',
  'friendly.block': 'Altura do bloco',
  'friendly.blockValue': '{v, select, low {Baixo} mid {Médio} other {Alto}}',
  'friendly.press': 'Pressão: {v} de 5',
  'friendly.tempo': 'Ritmo: {v} de 5',
  'friendly.width': 'Largura: {v} de 5',
  'friendly.risk': 'Risco no passe: {v} de 5',
  'friendly.play': 'Começar a partida',
  'friendly.watch': 'Como assistir',
  'friendly.watchValue':
    '{v, select, full {Partida completa} extended {Melhores momentos estendidos} highlights {Melhores momentos} goals {Só os gols} other {Só o resultado}}',
  'friendly.moment': 'Lance {n}',
  'friendly.preparing': 'Carregando a partida…',
  'friendly.preparingMoment': 'Preparando o próximo lance…',
  'friendly.loading': 'Preparando o jogo…',
  'friendly.loadError': 'Não deu para carregar a partida',
  'friendly.pitchLabel': 'Campo da partida: {home} de círculos, {away} de quadrados, e a bola',
  'friendly.clock': "{minute}'",
  'friendly.period': '{p, select, 1 {1º tempo} 2 {2º tempo} other {Prorrogação}}',
  'friendly.pause': 'Pausar',
  'friendly.resume': 'Continuar',
  'friendly.speed': 'Velocidade',
  'friendly.speedValue': '{speed}×',
  'friendly.skip': 'Ir para o fim',
  'friendly.tactics': 'Ajustar o time',
  'friendly.tacticsHint': 'Vale a partir do minuto na tela.',
  'friendly.feed': 'Lances',
  'friendly.feedEmpty': 'Bola rolando. Gols, cartões e trocas aparecem aqui.',
  'friendly.event.goal': "{minute}' Gol de {team}",
  'friendly.event.yellow': "{minute}' Amarelo para {team}",
  'friendly.event.red': "{minute}' Vermelho para {team}",
  'friendly.event.sub': "{minute}' Substituição em {team}",
  'friendly.event.injury': "{minute}' Lesão em {team}",
  'friendly.event.save': "{minute}' Defesa do goleiro de {team}",
  'friendly.event.command': "{minute}' Você mudou o plano",
  'friendly.fullTime': 'Fim de jogo',
  'friendly.report': 'Relatório',
  'friendly.why': 'Por que deu esse resultado',
  'friendly.noFactor': 'Jogo equilibrado: nenhum fator se destacou.',
  'friendly.creation': 'Criação (saldo de gols esperados): {v, number}',
  'friendly.conversion': 'Conversão (gols menos gols esperados, saldo): {v, number}',
  'friendly.stat.possession': 'Posse',
  'friendly.stat.shots': 'Finalizações',
  'friendly.stat.onTarget': 'No alvo',
  'friendly.stat.xg': 'Gols esperados',
  'friendly.stat.passes': 'Passes',
  'friendly.stat.passAccuracy': 'Acerto de passe',
  'friendly.stat.fouls': 'Faltas',
  'friendly.stat.corners': 'Escanteios',
  'friendly.stat.cards': 'Cartões',
  'friendly.percent': '{v, number, percent}',
  'friendly.decimal': '{v, number}',
  'friendly.again': 'Jogar de novo',
  'friendly.change': 'Trocar os times',

  'match.explain.finishing':
    'Seu time fez {goals} gols com {xg, number} de gols esperados: a finalização decidiu.',
  'match.explain.keeper':
    '{team, select, 0 {Seu goleiro evitou {saved, number} gols além do esperado.} other {O goleiro deles evitou {saved, number} gols além do esperado.}}',
  'match.explain.keeperConceded':
    '{team, select, 0 {Seu goleiro sofreu {conceded, number} gols além do esperado.} other {O goleiro deles sofreu {conceded, number} gols além do esperado.}}',
  'match.explain.setPieces':
    'Bola parada: {xgFor, number} de gols esperados a favor contra {xgAgainst, number}.',
  'match.explain.transition':
    'Transição (bola recuperada e ataque rápido): {xgFor, number} a favor contra {xgAgainst, number}.',
  'match.explain.positional':
    'Ataque organizado: {xgFor, number} de gols esperados a favor contra {xgAgainst, number}.',

  'common.money': '{value, number, currency}',
  'common.percent': '{n}%',
  'market.details': 'Mais sobre ele',
  'player.open': 'Ficha de {name}',
  'player.close': 'Fechar a ficha',
  'player.age': '{n} anos',
  'player.group':
    '{g, select, technical {Técnica} mental {Mental} tactical {Tática} physical {Físico} other {Goleiro}}',
  'player.attr':
    '{a, select, firstTouch {Domínio} passing {Passe curto} technique {Técnica} dribbling {Drible} crossing {Cruzamento} finishing {Finalização} heading {Cabeceio} tackling {Desarme} marking {Marcação} setPieces {Bola parada} longPassing {Passe longo} longShots {Chute de longe} weakFoot {Perna fraca} shielding {Proteção de bola} decisions {Decisão} vision {Visão de jogo} anticipation {Antecipação} positioning {Posicionamento} offTheBall {Sem a bola} composure {Frieza} concentration {Concentração} teamwork {Espírito de equipe} workRate {Disposição} leadership {Liderança} aggression {Agressividade} bravery {Coragem} determination {Determinação} flair {Improviso} scanning {Olhar o jogo} spatialAwareness {Noção de espaço} tacticalReading {Leitura tática} bodyOrientation {Corpo orientado} discipline {Disciplina} timing {Tempo de bola} pressing {Pressão} covering {Cobertura} lossReaction {Reação à perda} communication {Comunicação} acceleration {Aceleração} pace {Velocidade} agility {Agilidade} balance {Equilíbrio} strength {Força} stamina {Resistência} jumping {Impulsão} recovery {Recuperação} deceleration {Freada} reflexes {Reflexos} handling {Segurança} oneOnOne {Mano a mano} commandOfArea {Comando da área} distribution {Reposição} gkPositioning {Posição do goleiro} other {Saída de bola}}',
  'player.best': 'Rende mais de {role}: nota {n}',
  'player.part':
    '{p, select, starter {Está no plano do time titular} cover {Primeiro reserva} other {Sobra no elenco}}',
  'player.inXi': 'Joga no time de hoje',
  'player.positions': 'Posições',
  'player.fresh': 'Fôlego',
  'player.injury': 'Lesão',
  'player.wage': 'Salário',
  'player.until': 'Contrato até',
  'player.value': 'Valor',
  'player.release': 'Multa',
  'player.agent': 'Empresário',
  'player.noContract': 'Sem contrato profissional',
  'player.none': 'Nenhuma',
  'player.facts': 'Contrato e saúde',
  'common.minutes': '{n, plural, =0 {nenhum minuto} one {# minuto} other {# minutos}}',
} as const satisfies Record<string, string>;

export type MessageKey = keyof typeof ptBR;
