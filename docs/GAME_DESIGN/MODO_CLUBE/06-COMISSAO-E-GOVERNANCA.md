# Modo Clube — comissão, departamentos, governança e carreira do treinador

Data: 2026-11-13, revisão 4. Evidência: `docs/pesquisa/modo-clube/06-staff-e-governanca.md`. Legenda: FATO, HIPÓTESE, DECISÃO, PARÂMETRO, NÃO PESQUISADO.

Aviso sobre a evidência: as fontes públicas sobre comissão em clubes brasileiros são poucas. Não há organograma completo com contagem por cargo de nenhum clube, nem salário de comissão nas Séries B, C e D, nem medida do efeito de cada profissional. Quase tudo neste documento além dos FATOS marcados é DECISÃO de desenho com PARÂMETRO a calibrar.

## 1. O que a pesquisa sustenta

- FATO: comissão técnica de Série A tem de 10 a 15 pessoas e custa de R$ 600 mil a R$ 1,5 milhão por mês em clubes médios, acima de R$ 2 milhões nos maiores (coluna de executivo; estimativa).
- FATO: treinador de Série A dura em média 8 meses e 18 dias (CIES). No começo de 2026, 59 de 156 clubes das quatro divisões já tinham trocado de técnico, 42 deles na Série D.
- FATO (prática relatada, sem fonte formal): auxiliares, preparador físico, treinador de goleiros e analistas costumam sair com o treinador; existe a "comissão fixa" do clube, que fica.
- FATO: rescisão custa, em regra, os salários até o fim do contrato; casos de R$ 500 mil (treinador e comissão num clube de Série B) a R$ 2 milhões (comissão inteira num clube de Série A).
- FATO: em 2023, só 10 dos 20 clubes da Série A tinham psicólogo, quase sempre um; um clube tinha 7.
- FATO (regulamento de licenças, artigo de 2017, pode estar desatualizado): treinador do profissional precisa de Licença Pro; treinadores da base, de Licença B; médico com 3 anos de experiência; preparador com diploma; diretores remunerados em áreas-chave; equipe sub-20 obrigatória. O Certificado de Clube Formador é condição para receber indenização de formação (categoria A vale dois anos; B, um).
- FATO: na SAF, conselho de administração e conselho fiscal são obrigatórios e o conselho destitui diretores a qualquer tempo; conflitos entre diretor de futebol, executivo-chefe, dono e treinador aparecem na imprensa em vários clubes.
- NÃO PESQUISADO: quem aprova orçamento e quem decide o quê em cada modelo; tamanho de departamento de observação; acúmulo e terceirização; efeito de comissão sobre lesão.

## 2. Modelo

### 2.1 Pessoa

```ts
interface StaffMember {
  id: string; name: string; birthDate: string; nationality: string;
  roles: StaffRole[];                 // o que sabe fazer
  specialties: string[];              // ex.: 'transição ofensiva', 'goleiros jovens', 'futsal', 'região Nordeste'
  attributes: StaffAttributes;        // 1..20, só os que a função usa
  licence?: 'B' | 'A' | 'Pro';
  experienceYears: number; reputation: number;
  philosophy?: PhilosophyVector;      // treinadores e coordenadores
  bias?: ScoutBias;                   // olheiros
  history: StaffSpell[];              // clubes, cargos, resultados
  ties: Array<{ staffId: string; kind: 'trabalha com' | 'formado por' | 'desafeto' }>;
  field: Record<string, 'importado' | 'gerado' | 'ajustado'>;
}
```

Atributos por família (1..20): **campo** (tática, treino técnico, treino físico, goleiros, bola parada, desenvolvimento de jovens, leitura de jogo), **pessoas** (gestão de grupo, motivação, comunicação, disciplina), **saúde** (diagnóstico, reabilitação, prevenção, fisiologia, nutrição, psicologia), **informação** (análise de desempenho, análise de dados, avaliação de nível, avaliação de potencial, conhecimento por região e por mercado), **gestão** (negociação, finanças, comercial, comunicação pública, operações).

### 2.2 Vínculo

```ts
interface StaffAssignment {
  staffId: string; clubId: string;
  posts: StaffPost[];                 // um ou mais: acúmulo
  load: 'integral' | 'parcial' | 'terceirizado';
  group: 'do clube' | 'do treinador'; // quem sai junto na troca de técnico
  contract: { wage: number; until: string; releaseFee: number };
}
```

- **Acúmulo**: uma pessoa em dois postos rende menos em cada um (PARÂMETRO: 70% em cada com dois postos, 50% com três) e só pode acumular postos da mesma família ou vizinhos (auxiliar que treina goleiros; fisioterapeuta que faz massagem; presidente que negocia).
- **Parcial e terceirizado**: custo menor, efeito menor e atraso (o médico terceirizado atende no dia seguinte; a plataforma de vídeo substitui o olheiro regional com menos informação sobre ocultos).
- **Grupo do treinador**: sai com ele e chega com ele. Contratar um treinador é contratar o pacote; a multa de saída inclui o grupo.

### 2.3 Departamentos

Um clube tem departamentos; cada um tem postos, um responsável e um **nível efetivo** calculado de quem ocupa os postos, da carga e da estrutura física (`04-CLUBE-E-MUNDO.md` §6). É o nível efetivo que os outros sistemas leem.

| Departamento | Postos possíveis | O que o nível efetivo alimenta |
|---|---|---|
| Direção de futebol | diretor executivo, gerente, supervisor | negociação, planejamento de elenco, delegação de mercado |
| Comissão técnica | treinador, auxiliares, treinador de goleiros, treinador de bola parada | qualidade do treino tático e técnico, familiaridade, leitura de jogo |
| Preparação física e fisiologia | preparadores, fisiologista | ganho físico, fôlego na temporada, controle de carga |
| Saúde | médico, fisioterapeutas, reabilitação, nutricionista, massagista | risco e duração de lesão, recaída |
| Psicologia | psicólogo | moral, recuperação de confiança, adaptação de jovens e de recém-chegados, resposta a jogo grande |
| Análise | analistas de desempenho, analista de dados | relatório de adversário, explicação de jogo mais detalhada, preparação da semana |
| Observação | chefe, olheiros regionais, análise de mercado | cobertura, precisão de nível e de potencial (`03` §7.4) |
| Base | coordenador, treinadores por categoria, captação | qualidade da safra, desenvolvimento, Certificado de Clube Formador |
| Comercial e marketing | diretor comercial, marketing, comunicação | valor de patrocínio, conversão de campanha |
| Operações | estádio, logística, roupeiro | custo e qualidade de jogo em casa, viagem |

DECISÃO: a organização vem do pacote, clube a clube. Dois clubes da mesma divisão podem ter estruturas muito diferentes. A divisão só entra pelos requisitos de licença.

Referência de partida para o gerador de pacotes fictícios e para completar clubes sem dado (HIPÓTESE; só a faixa de 10 a 15 da Série A e a psicologia têm fonte):

| Porte | Total no futebol profissional | Traço |
|---|---|---|
| Grande | 20 a 30 | todos os departamentos, vários por posto |
| Médio | 12 a 18 | todos, um por posto, nutrição parcial |
| Pequeno | 6 a 10 | análise e goleiros parciais; fisiologia, nutrição e psicologia terceirizadas |
| Mínimo | 3 a 5 | treinador, um auxiliar ou preparador, fisioterapeuta que acumula; presidente negocia; sem análise, sem observação |

### 2.4 Requisitos de licença (regra da competição)

Parâmetro do pacote por competição. FATOS da temporada de 2026, fonte primária (regulamentos específicos de cada série; `docs/pesquisa/modo-clube/09-regulamentos-conferidos.md` item 2; fecha a MC-144 no que existe publicado):

| Requisito | Série A | Série B | Série C | Série D |
| --- | --- | --- | --- | --- |
| Licença do treinador | PRO | PRO ou A | PRO, A ou B | só registro |
| Licença do auxiliar | A | A ou B | A ou B | só registro |
| Estádio, lugares sentados | 12.000 | 6.000 | 4.000 | 1.000 nas fases 1 a 3; 4.000 depois |
| Iluminação | 1.300 lux recomendados | 650 lux no mínimo | 650 recomendados | 650 recomendados |
| Arquibancada temporária | | | proibida | proibida |
| Ingresso mínimo (inteira) | R$ 40 | R$ 20 | R$ 10 | R$ 10 |

Vale também quem está matriculado no curso da licença. O regulamento de licença de clubes mais recente que foi lido é o de 2021: exige programa de base com sub-20, sub-17 e sub-15 em duas competições por ano, coordenador de base, certificado de clube formador, diretor executivo de futebol, preparador físico com registro, médico com três anos de experiência, equipe feminina própria ou em parceria, e gestores administrativo, financeiro, de comunicação, de marketing, ouvidor e oficial de segurança. NÃO ENCONTRADO: o quadro que diz quais desses itens são cobrados de cada divisão. No pacote, esses itens ficam como exigência só nas Séries A e B, marcados como estimativa.

Efeito no jogo: clube que sobe precisa de estádio com a capacidade da nova divisão (ou mandar jogos em outro estádio, `04` §6.1) e de treinador com a licença exigida; um treinador sem licença PRO não pode ser contratado por clube da Série A (limita o próprio usuário no modo de propostas, §6). Descumprir bloqueia inscrição.

### 2.5 Capacidade e organograma vivo

Cada profissional tem **capacidade de trabalho** por semana (PARÂMETRO, em unidades de tarefa): um olheiro cobre N competições, um fisioterapeuta atende N lesionados, um analista prepara N relatórios, um diretor conduz N negociações. Tarefas acima da capacidade ficam na fila ou saem com qualidade menor. Acúmulo de postos divide a mesma capacidade.

A tela de Comissão é o organograma do clube: departamentos, postos ocupados, vagos e acumulados; quem está sobrecarregado; custo por departamento; o que está delegado a quem; e a tendência do que cada departamento entrega (lesões, precisão dos relatórios, conversão comercial) nas últimas semanas. Um posto vago mostra o que o clube deixa de ter.

As três situações de jogo que o modelo precisa produzir:
- **Clube mínimo**: pouco dinheiro, escolher entre um preparador em tempo integral, fisioterapia terceirizada ou um olheiro regional.
- **Clube em crescimento**: disputando duas competições, decidir se o próximo contratado é analista, diretor de futebol ou reforço do departamento de saúde.
- **Clube grande**: departamentos completos; o problema vira orçamento, coordenação e conflito entre áreas (o comercial quer amistoso no exterior, a preparação quer descanso).

FATO (Brinkmann e outros, 2025, Sport Business and Management; `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md` item 1): estudo de 131 clubes brasileiros de competições nacionais em 2019. Só 21 tinham organograma **publicado no site oficial**, e 41 não tinham site; isso mede transparência, não prova que os demais não tenham estrutura interna. Sustenta, com essa ressalva, a decisão de que a maioria dos clubes do pacote tem estrutura rasa.

### 2.6 Áreas além do futebol

Além dos departamentos de §2.3, o modelo aceita postos de **administração** (executivo-chefe, financeiro, jurídico), **estádio e segurança**, **relacionamento com a torcida**, **comunidade e projetos sociais**, **imprensa**. Entram como postos opcionais com efeito em operações de jogo, receita e reputação regional (`04` §6.1 e §7.5). No corte 1 não existem; no corte 2 entram como um nível por área, sem pessoas nomeadas.

### 2.7 Licenciamento e nível de profissionalização

Amplia §2.4. FATO (regulamento de licenciamento de clubes da UEFA, edição 2025, lido; `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md` item 2): os critérios são agrupados em esportivos, de responsabilidade social, de infraestrutura, de pessoal e administração, jurídicos e financeiros, com funções obrigatórias. Descumprir alguns deles (oficial de relacionamento com torcedores, de acessibilidade, treinador de goleiros da base, responsável pela organização de jogos) gera **sanção, não recusa da licença**. O jogo copia essa distinção: há requisitos que excluem e requisitos que multam. FATO (pesquisa 06): a CBF tem regulamento de licenças; a versão lida é de 2017 (MC-144).

DECISÃO: cada competição do pacote pode declarar **requisitos de participação** em cinco grupos: pessoal (licença do treinador, médico, responsáveis designados), infraestrutura (estádio com capacidade e iluminação mínimas, centro de treinamento), formação (categorias obrigatórias, certificado), finanças (regra financeira, `04` §4.5; sem dívida em atraso), administração (balanço publicado). Cada requisito tem prazo antes da inscrição e sanção por descumprimento (multa, inscrição condicional, perda de mando, exclusão).

Como isso vira jogo, e não burocracia: subir de divisão acende uma lista curta de pendências com prazo ("o estádio não tem a capacidade exigida; faltam 4 meses"), e cada pendência tem saídas com custo diferente: obra, aluguel de outro estádio, contratação, parceria. Atender mal custa mando de campo ou dinheiro.

**Nível de profissionalização** do clube (1 amador organizado, 2 semiprofissional, 3 profissional regional, 4 profissional nacional, 5 elite): indicador calculado dos departamentos, da infraestrutura e da saúde financeira, independente da divisão. Usos: resumo na tela do clube, peso na decisão de patrocinadores, jogadores e profissionais de aceitar proposta, e marco de progresso da carreira. Um clube da última divisão pode ser nível 3; um da segunda pode ser nível 2 e pagar por isso.

### 2.8 O que existe no corte 1 (revisão 4)

- **Departamentos são parâmetros fixos do pacote.** Cada clube tem um nível (1 a 5) por departamento, definido no pacote pela divisão e pelo porte. No corte 1 o nível não muda, não há pessoas contratáveis, não há mercado de comissão e não há tela de comissão além de uma leitura ("sua preparação física é nível 2"). O efeito existe (teto de treino, precisão do semáforo, largura das faixas de observação), para que a interface entre sistemas já seja a final.
- **Uma só confiança.** No corte 1 só a confiança da direção existe e decide emprego. As confianças da torcida e do elenco (§5.3) têm campo no estado, ficam inativas e não aparecem na tela.

## 3. O que a pessoa decide

- **Montar a comissão**: contratar, demitir, renovar, promover da base para o profissional, aceitar ou recusar o grupo que um treinador traz.
- **Atribuir**: quem ocupa que posto, quem acumula, o que terceirizar.
- **Dirigir**: um pedido por departamento por semana (ao analista: que adversário estudar; ao chefe de observação: onde procurar; ao preparador: prioridade de carga; ao psicólogo: que jogador acompanhar).
- **Delegar**: deixar um sistema com o responsável (`00` §7).
- **Desenvolver**: pagar curso de licença, dar tempo de campo a um auxiliar jovem; profissionais evoluem com experiência e resultados.

Mercado de comissão: profissionais livres e empregados no pacote; multa para tirar de outro clube; reputação do clube e do treinador pesa na aceitação; quem trabalhou junto tende a aceitar (laços).

## 4. Onde a comissão entra em cada sistema (o elo da cadeia)

| Sistema | Quem | Efeito |
|---|---|---|
| Treino | comissão técnica, preparação | ganho por bloco, teto de complexidade tática, familiaridade por semana |
| Lesão | saúde, preparação | risco por carga, dias fora, recaída |
| Moral | psicologia, gestão de grupo do treinador | amortece queda, acelera adaptação |
| Partida | auxiliar, analista | sugestões ao vivo com a qualidade deles; relatório de adversário antes do jogo; nível de detalhe da explicação depois |
| Observação | observação | `03` §7.4; sem departamento, só se conhece quem aparece em competição transmitida |
| Base | base | qualidade e número da safra; desenvolvimento por categoria |
| Mercado | direção de futebol | desconto ou sobrepreço na negociação; propostas preparadas quando delegado |
| Receita | comercial | valor das ofertas de patrocínio, conversão de campanha |
| Jogo em casa e viagem | operações | custo de operação, fadiga de viagem |

Regra de calibragem: nenhum departamento sozinho muda a força do time em mais do que o equivalente a 2 pontos de atributo médio (PARÂMETRO). O efeito de comissão é real e modesto; o que ganha jogo continua sendo elenco e tática. Sem evidência numérica, os pesos são fechados por simulação: um clube com comissão máxima e elenco mediano não pode superar de forma consistente um clube de elenco bom e comissão mediana.

**Sugestões ao vivo**: durante a partida o auxiliar e o analista apontam um problema por vez ("o lado direito está perdendo os duelos"). A frequência e o acerto dependem dos atributos deles; auxiliar fraco sugere tarde ou errado. É também o tutorial natural do jogo.

## 5. Governança

### 5.1 Modelos de propriedade (dado do clube no pacote)

| Modelo | Quem manda | Dinheiro | Paciência |
|---|---|---|---|
| Associação | presidente eleito e conselho; eleição a cada N temporadas pode trocar a direção e as metas | orçamento apertado pela receita; dívida histórica | varia com a política interna e a torcida |
| SAF com dono | dono ou investidor, conselho de administração | aporte possível, condicionado a plano e a metas; dono pode cortar ou vender | varia com o perfil do dono (construtor, especulador, apaixonado) |
| SAF de grupo | grupo com vários clubes | aporte e empréstimo de jogadores do grupo; o clube pode ser tratado como vitrine | metas de valorização de atletas além de resultado |

Mudança de modelo é evento de mundo (clube vira SAF, dono vende). Efeitos: caixa, dívida, metas, autonomia.

### 5.2 Alçada do usuário

DECISÃO: o usuário é treinador com poderes de diretor de futebol. Formalmente:

| Decide sozinho | Propõe, e a direção aprova ou nega | Não decide |
|---|---|---|
| Tática, treino, escalação, comissão técnica dentro da verba | Compra e salário acima do teto por operação; orçamento anual; obra; venda de ídolo; demitir diretor; empréstimo bancário | Eleição, venda do clube, virar SAF, aporte do dono, a própria demissão |
| Contratações dentro do teto, renovações dentro da política salarial | Preço de ingresso e plano de sócios fora da faixa | Regra de competição |
| Olheiros, base, pedidos aos departamentos | Patrocínio máster e naming rights | |

A direção responde com base em confiança, caixa, perfil do dono e coerência com as metas. Negar é uma resposta com motivo; insistir gasta confiança. Num clube mínimo, onde o presidente acumula tudo, a alçada do usuário é maior e o dinheiro, menor.

### 5.3 Metas, confiança, conflito

- Metas negociadas por temporada: esportiva, financeira, de base, de estilo, de valorização (em SAF de grupo).
- Confiança da direção (0..100) e, separada, **da torcida** e **do elenco**. As três podem divergir, e é daí que saem os conflitos: dono quer vender o ídolo, torcida não; treinador quer verba, conselho quer pagar dívida.
- Conflitos institucionais chegam como cartas com consequência persistente (`04` §9.3): troca de presidente no meio da temporada, diretor que contrata sem consultar, dono que impõe jogador, salário atrasado por decisão de caixa.
- Demissão: ultimato com prazo e meta; depois, rescisão com multa a favor do usuário (reputação e caixa pessoal não existem como moeda; a multa só afeta o clube).

## 6. Carreira do treinador

- **Perfil**: reputação (regional, nacional, continental), licença, histórico, estilo reconhecido (calculado do que o time dele realmente fez em campo: posse, pressão, uso de jovens), relação com imprensa e torcidas.
- **Licença**: começa com a mínima da divisão em que inicia; cursos tomam tempo de calendário; licença insuficiente limita propostas de divisões acima (parâmetro do pacote).
- **Propostas**: geradas a cada janela de mercado de treinadores, por clubes com vaga cuja filosofia e ambição combinam com o perfil. No modo `job_offers`, as três iniciais seguem `00` §1.1.
- **Grupo do treinador**: profissionais que o usuário marca como "meus" o acompanham de clube em clube, se aceitarem.
- **Trocar de clube**: a carreira continua no mesmo mundo; o clube antigo passa a ser conduzido por regra, com o que o usuário deixou.
- **Entre empregos**: avança o calendário até aparecer proposta; pode recusar; reputação cai devagar sem trabalho.
- **Legado**: títulos, acessos, jogadores revelados e estilo ficam na crônica de cada clube por onde passou.

### 6.1 Pessoas que continuam no mundo

Profissionais têm carreira própria: um diretor que trabalhou dez temporadas com o usuário pode sair, assumir um rival e negociar contra ele conhecendo seus hábitos (laço `trabalhou com`). **Jogadores aposentados viram profissionais**: ao encerrar a carreira, um jogador com `liderança` e personalidade adequadas entra no mercado de comissão como auxiliar, treinador de base ou olheiro, com atributos derivados do que foi como jogador e laço com os clubes em que jogou. O ex-capitão do usuário pode voltar como auxiliar anos depois. É barato de implementar (uma conversão no fim da temporada) e é uma das fontes mais fortes de história.

**Capitão e lideranças**: o treinador nomeia capitão e vice; a liderança real emerge da hierarquia do vestiário (`03` §6). Capitão que não é líder reconhecido rende menos; capitão forte reduz o efeito de lapsos coletivos em campo, acelera a adaptação de jovens e amortece conflito.

## 7. Rivais

A comissão dos rivais existe, é paga, evolui e troca de clube. Troca de treinador em rival leva o grupo dele, derruba familiaridade, dá o ganho curto de adesão (`03` §6) e desloca a filosofia. Clubes contratam treinador por utilidade: aderência à filosofia, reputação, custo, disponibilidade. FATO de calibragem: frequência de troca compatível com a real (dezenas por temporada nas quatro divisões, mais na base da pirâmide).

## 8. Estado na carreira

O documento do mundo (ADR-014) ganha: `staff` (só quem mudou em relação ao pacote: atributos, reputação, laços), `assignments` por clube, `departments` (nível efetivo em cache, recalculado quando muda vínculo ou obra), `governance` por clube (modelo, dono, metas, três confianças, calendário de eleição), `coach` do usuário (perfil, licença, grupo). Contratos de comissão do clube do usuário geram lançamentos no livro-caixa como os de jogadores.

## 9. Testes

- Departamento sem ocupante tem nível zero e o sistema dependente funciona no modo degradado, sem erro.
- Acúmulo reduz o rendimento na proporção do parâmetro.
- Troca de treinador move o grupo dele e só ele.
- Teto de efeito por departamento respeitado em simulação de 2.000 partidas.
- Pedido acima da alçada nunca é executado sem aprovação (teste de rota: 409).
- Em 30 temporadas sem usuário, nenhum clube fica sem treinador por mais de N dias e a frequência de trocas fica na faixa.
