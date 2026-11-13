# Modo Clube — roteiro

Data: 2026-11-13, revisão 4. Tarefas: `TASKS.md`. O objetivo deste documento é impedir que 17 sistemas virem um projeto que não termina: cada sistema entra primeiro em versão rasa, e nenhum é aprofundado antes de existir uma carreira jogável.

## 1. Princípios de ordem

1. **O maior risco primeiro.** A engine de partida é construída e aprovada pelo dono antes de qualquer tela de gestão.
2. **Raso antes de fundo.** Um sistema raso é um número, uma decisão e um efeito real. O fundo vem depois, sem trocar a interface entre sistemas.
3. **Modelo geral, conteúdo por etapa.** Competições, comissão e governança nascem com o modelo final; o conteúdo (copas, estaduais, cargos raros, SAF de grupo) entra em cortes.
4. **Pacote fictício até o fim do corte 1.** O pacote real corre em paralelo e não trava o jogo.
5. **Tradução e desktop desde a primeira tela**, porque custam quase nada no começo e muito depois.

## 2. Cortes

### Corte 0 — Especificação (agora)

Entrega: documentos `00` a `08`, pesquisas 01 a 12, ADRs 013 a 017, `TEST_STRATEGY.md`, este roteiro, sandbox. **Concluído: o dono aprovou as specs em 2026-11-13 (MC-010).**

### Corte 0,5 — Partida avulsa jogável (aprovado pelo dono em 2026-11-13)

Antes de qualquer carreira: a pessoa escolhe dois times do pacote fictício, escolhe formação e instruções de time, assiste à partida no campo 2D (ou pula), lê o relatório e joga de novo. Sem conta, sem calendário, sem dinheiro, sem banco além do registro da partida.

Por que existe: é o menor produto que prova a aposta inteira (a engine parece futebol, a tática muda o jogo, a explicação é verdadeira) e é onde o portão do dono (MC-048) acontece. Tudo o que ele usa é reaproveitado no corte 1 sem retrabalho. Se a partida avulsa não for boa, nenhum sistema de gestão salva o modo, e descobre-se isso meses antes.

Tarefas: MC-145, MC-146, MC-147, MC-011, MC-014 (versão mini), prova de coordenação MC-246, engine nível 1 (MC-031 a MC-045, MC-047, MC-158 a MC-166), MC-203, MC-248, MC-249, tática rasa (MC-050 a MC-052), partida ao vivo (MC-061, MC-065), direção visual imersiva e premium (MC-262), relatório, MC-030, portão MC-048, tela de partida avulsa MC-250.

Critério de saída: dez partidas assistidas pelo dono com lista de defeitos fechada; suíte de zebra Z1 a Z12 verde; T1 a T10 verdes; FPS medido em celular real.

### Corte 1 — Carreira jogável mínima

O que a pessoa consegue fazer: começar por escolha livre ou por propostas; ver o elenco; escolher formação com e sem bola e um punhado de instruções; assistir ou pular a partida; ler o relatório; contratar e vender de forma simples; ver caixa e folha; avançar o calendário por uma temporada inteira das quatro divisões, com acesso e descenso; ser demitido.

| Bloco | Tarefas | Versão rasa do sistema |
| --- | --- | --- |
| Fundações | MC-145 a MC-150, MC-030, MC-200 a MC-202, MC-228, MC-241 | contrato da engine, tradução, grade responsiva, bancada de desempenho, forma de guardar o mundo decidida por medição |
| Dados | MC-011 a MC-014, MC-017, MC-019 | pacote fictício com competições de todos os tipos |
| Engine nível 1 | MC-031 a MC-045, MC-047, MC-158 a MC-166, MC-203, MC-205, MC-208, portão MC-048 | completa no essencial; armadilha de pressão, autonomia, goleiro no modelo de jogo e bola parada completa ficam para o corte 2 |
| Engine nível 2 | MC-046, MC-046b, MC-167 | completa |
| Competições e calendário | MC-160, MC-169 a MC-173, MC-179 | liga, grupos, mata-mata; só as quatro divisões como conteúdo |
| Carreira | MC-081, MC-084, MC-175 a MC-177 | dois modos de início, avanço por dia |
| Tática | MC-050 a MC-052, MC-055, MC-058 a MC-060 | duas formações, cerca de doze instruções de time, funções padrão |
| Partida ao vivo | MC-061, MC-065 | assistir, pausar, substituir, mudar instrução de time |
| Elenco e mercado | MC-085 (uma rodada de oferta por janela), MC-212, MC-220, MC-115 a MC-117, MC-122 | três valores, comprar, vender, renovar, inscrever; sem agentes e sem empréstimo; rivais sãos |
| Finanças | MC-087 (seis linhas de receita, cinco de despesa), MC-093 | caixa, folha, resultado |
| Comissão | MC-184, MC-185 | seis departamentos com um nível cada, sem mercado de pessoas |
| Diretoria | MC-193 (só confiança da direção) | meta, confiança, demissão |
| Experiência | MC-125, MC-126, MC-133, MC-134 | Centro de Decisões e abas |

Fora do corte 1, de propósito (a revisão 3 acrescentou muita profundidade; nada dela entra aqui além do que a tabela lista): treino detalhado (atributos evoluem só por idade e minutos), base como sistema (categorias, promoção, escolinhas; fica só a safra anual gerada como mecânica de mundo, `03` §7), olheiros, torcida além de público por jogo, patrocínio além de um contrato fixo, governança além da confiança da direção (as confianças da torcida e do elenco ficam inativas, `06` §2.8), comissão além de níveis fixos do pacote, saúde além da camada única de `08` §9, cartas, crônica, comandos individuais, gritos, bola parada editável, copas.

Critério de saída: uma pessoa de fora joga três temporadas sem ajuda e sem ferramenta de desenvolvimento; suíte de zebra e de equilíbrio verdes; custo de servidor por temporada medido.

### Estimativa de esforço (revisão 4)

Conta feita sobre `TASKS.md`, somando o tamanho nominal de cada linha não concluída (P = meio dia, M = 2 dias, G = 5 dias):

| Prioridade | Linhas | Dias de trabalho nominais |
| --- | --- | --- |
| P0 (cortes 0,5 e 1) | 62 | cerca de 190 |
| P1 (corte 2) | 38 | cerca de 126 |
| P2 (corte 3) | 20 | cerca de 66 |
| P3 | 4 | cerca de 27 |

Limites dessa conta: várias linhas cobrem intervalos de tarefas (uma linha, quatro tarefas), e tamanho nominal não inclui calibragem, que na engine costuma custar mais que a implementação. Leitura honesta: o corte 1 inteiro é da ordem de **nove a catorze meses de uma pessoa em tempo integral** em desenvolvimento tradicional. O ritmo com agentes de código é mais rápido na escrita e igual na calibragem e na revisão do dono; não há medição neste projeto que permita prometer um número. O corte 0,5 é cerca de um terço do P0. A estimativa é refeita ao fim do corte 0,5, com o ritmo medido.

### Corte 2 — Profundidade de clube

Treino e desenvolvimento (MC-072 a MC-079); comissão completa e mercado de pessoas (MC-186 a MC-188, MC-195); governança (MC-192 a MC-194); carreira do treinador (MC-178, MC-190, MC-191); economia funda (MC-088 a MC-092, MC-196 a MC-199); torcida e comercial (MC-095 a MC-100); comandos, gritos, bola parada, treinador adversário (MC-062 a MC-071); cartas e crônica (MC-128, MC-129); rodízio dos rivais (MC-168); base rasa com olheiros e categorias (MC-101 a MC-109 em versão simples).

Em paralelo, trilha de dados: importador, critério de publicação e pacote real (MC-015, MC-016, MC-018, MC-154 a MC-157).

Acrescentado pela revisão 3 ao corte 2: mercado completo com agentes e empréstimos (MC-213 a MC-215); saúde e desempenho (MC-221 a MC-224); organograma e capacidade (MC-229, MC-230); engine funda (MC-206, MC-207, MC-209, MC-210); raridade e geografia do talento (MC-227); procedência de dados (MC-240); pesquisa com jogadores e protótipos (MC-243, MC-244).

### Corte 3 — Mundo da base e copa nacional

Mundo da base completo (MC-110 a MC-114); IA rica dos rivais (MC-118 a MC-124); copa nacional e supercopa (MC-180); operações e logística (MC-183); licenças (MC-189); desafios e integração com o resto do site (MC-130, MC-131); pontos de extensão de venda (MC-152).

Acrescentado pela revisão 3 ao corte 3: bem-estar, metodologia e instalações da base (MC-225, MC-226); clubes parceiros e mercado que aprende (MC-216, MC-217); licenciamento e profissionalização (MC-231, MC-232); pessoas que continuam (MC-233); identidade e reputação regional (MC-234, MC-235); comercial fundo, estádio e viagens (MC-236 a MC-239). Memória tática (MC-211) foi cortada na revisão 4.

### Corte 4 — Estaduais e copas regionais

MC-181. Depende da questão aberta 3 e de dados de clubes que só disputam estadual.

### Corte 5 — Continentais

MC-182. Depende de pacote sul-americano.

### Depois

Europa; venda de aparência (MC-153); idiomas `en` e `es` escritos; futebol feminino (só campo de modelo até lá); observação internacional; seleções.

## 3. Dependências que mandam na ordem

```text
contrato da engine (145) ─┬─> engine nível 1 (031…048) ──> portão do dono
                          ├─> engine nível 2 (046) ──> equivalência (046b)
                          └─> esquema do pacote (011) ─┬─> esquema de competição (160) ─> interpretador (169…172) ─> calendário (173)
                                                       ├─> pacote fictício (014)
                                                       └─> comissão rasa (184, 185)
tabelas e livro-caixa (081, 175) ──> avanço do calendário (084) <── nível 2, calendário
avanço (084) ──> inícios (176, 177) ──> temporada completa sem usuário (179) ──> telas do corte 1
tradução (146, 147) ──> toda tela
```

A engine nível 1 e o bloco de dados e competições não dependem um do outro além do contrato (MC-145): podem andar em paralelo.

## 4. Questões abertas para o dono

| # | Questão | O que trava | Proposta |
| --- | --- | --- | --- |
| 1 | Nome público do modo e rota (`/clube` já é a assinatura; hoje uso `/tecnico`) | telas, textos | manter `/tecnico` até decidir |
| 2 | Temporada do primeiro pacote real: 2026 ou 2027 | MC-156 | 2026, porque os formatos estão publicados; os de 2027 da Série C e da Série D ainda não existem |
| 3 | Estaduais só com clubes das quatro divisões nacionais, como passo intermediário? | MC-181 | sim; divisões estaduais de acesso e clubes sem divisão nacional ficam para depois |
| 4 | Escolha livre: quem escolhe um gigante pode ser demitido? | MC-193 | sim, com paciência maior na primeira temporada |
| 5 | Uma carreira por conta na versão grátis, e vagas extras como venda? | MC-152 | sim |
| 6 | Critério de cobertura para publicar pacote real (`03` §1.6): os percentuais propostos servem? | MC-154 | 30% de atributos estimados no máximo nas duas primeiras divisões, 60% nas duas últimas |
| 7 | A Série D real tem 96 clubes (cerca de 2.500 jogadores). Se as Séries C e D não atingirem o critério de dados, o pacote real sai só com A e B, ou espera? | MC-157 | esperar, conforme a decisão de jogadores reais nas quatro divisões; o jogo roda no pacote fictício enquanto isso |
| 8 | Efeito de comissão limitado a cerca de 2 pontos de atributo por departamento: aceita? | MC-186 | sim; elenco e tática continuam decidindo |
| 11 | No modo de propostas, a primeira temporada é a Série D real (grupos de 6 e mata-mata: de 10 a 24 jogos). Aceita esse começo curto, ou prefere um formato próprio de liga para a última divisão no jogo? | MC-177 | formato real, com pré-temporada e estadual quando existirem; rever depois de teste com jogadores |
| 9 | Corte 1 sem treino detalhado, sem base e sem cartas: aceita esse recorte? | todo o corte 1 | sim; é o que torna o corte 1 terminável |
| 10 | Jogador real negociável em jogo com anúncio, com personalidade real atribuída (decidido pelo dono em 2026-11-13) | publicação do pacote real | consulta jurídica já pendente; levar a ela o vocabulário de `03` §1.8 |
| 12 | A revisão 3 trouxe cerca de 40 tarefas de profundidade. Confirmar que nenhuma entra no corte 1 além das seis listadas | corte 1 | sim: o corte 1 mantém o tamanho |
| 13 | Forma de guardar o mundo: decidir por medição (MC-201) em vez de escolher agora | MC-081 | sim |

| 14 | Lançar com pacote fictício revisado (clubes e jogadores inventados, com cuidado editorial) e trazer o pacote real depois? | data de lançamento, MC-154 a MC-157, consulta jurídica | **DECIDIDO pelo dono (2026-11-13): sim.** Lançamento com pacote fictício revisado; pacote real depois, quando passar no critério. |
| 15 | "Justo" entre nível 1 e nível 2 quer dizer mesmas distribuições de resultado e de estatística (protocolo de `TEST_STRATEGY.md` §2.1), sem exigir o mesmo tamanho de efeito por instrução? | aceite de MC-046b | **DECIDIDO pelo dono (2026-11-13): sim.** Mesmas distribuições, sem exigir o mesmo tamanho de efeito por instrução. |
| 16 | Tempo aceitável para avançar um dia do calendário: quais limites no percentil 95 e 99? | MC-201, MC-084 | **DECIDIDO pelo dono (2026-11-13): sim.** P95 até 1,5 s e P99 até 4 s em dia com rodada cheia; dia sem jogos até 300 ms. |
| 17 | Depois de 15 temporadas, o jogo deve permitir dinastia (um clube bem gerido domina) ou forçar competitividade? | `TEST_STRATEGY.md` §5.1 | **DECIDIDO pelo dono (2026-11-13): sim.** Domínio permitido até 40% dos títulos, sem mecanismo artificial de equilíbrio. |
| 18 | Cortes da revisão 4: imprensa como sistema e memória tática como sistema autônomo saem do projeto. Confirma? | MC-211, MC-242 | **DECIDIDO pelo dono (2026-11-13): sim, num primeiro momento.** Os dois sistemas ficam fora por ora e podem voltar depois; o desenho fica registrado. |
| 19 | Fazer o corte 0,5 (partida avulsa) como primeira entrega pública ou só interna? | MC-250 | **DECIDIDO pelo dono (2026-11-13): sim.** O corte 0,5 é a primeira entrega; aberta a convidados por link, pública se passar no portão. |

## 5. Próxima tarefa técnica recomendada

Depois da aprovação: **MC-145** (contrato de entrada e saída da engine), porque destrava em paralelo a engine nível 1, a engine nível 2 e o esquema do pacote. Em seguida, **MC-146 e MC-147** (tradução), que são pequenas e passam a valer para tudo o que vier, e **MC-246** (prova de coordenação), que decide se a arquitetura de decisão da engine se sustenta antes de qualquer instrução tática.

## 6. Pesquisa com jogadores

Até aqui o desenho se apoia em literatura, em outros jogos e em opinião. Nenhuma hipótese sobre o público foi testada.

**Questionário** (MC-243), três públicos: quem joga Brasfoot e Elifoot; quem joga Football Manager; quem já joga o De Cabeça. Perguntas: clube pequeno ou qualquer clube; quanto controle tático; mexer durante o jogo; desenhar bola parada; importância de formar jogadores; acompanhar competições de base; jovens ou experientes; controlar tudo ou delegar; negociar patrocínio; cuidar de estádio e torcida; tempo por sessão; o que faria abandonar uma carreira; o que dá mais satisfação (título, revelar jogador, construir, saúde financeira).

**Protótipos** (MC-244), depois do corte 1: mercado (a pessoa monta um elenco sem se sentir sem controle?), base (descobrir e acompanhar um garoto traz a pessoa de volta?), tática (a pessoa entende o problema do time e o corrige sem conhecimento profissional?).

**Medidas**: tempo até a primeira decisão relevante; fração que termina o primeiro dia de jogo; decisões tomadas à mão contra delegadas; fração que muda a tática; fração que assiste à partida; retorno depois da primeira temporada e depois da quinta; motivo de abandono; sensação de controle; percepção de justiça do resultado; compreensão do relatório.

A pergunta que mais importa: a pessoa volta porque ganhou ou porque quer saber o que acontece com o clube? O jogo é desenhado para a segunda.

## 7. Quem manda em cada decisão

Quando dois documentos parecerem divergir, vale o documento dono. Toda decisão tem tarefa e teste; decisão sem teste é opinião.

| Decisão | Documento dono | Tarefa | Teste |
| --- | --- | --- | --- |
| Dois níveis de engine e determinismo | ADR-013 | MC-031, MC-046 | determinismo byte a byte; `TEST_STRATEGY.md` §2.1 |
| Relógios, modelo de chegada, coordenação | `02` §2, §4.1, §5.11 | MC-246 a MC-248 | T1 a T13; prova de coordenação |
| O que cada instrução move e custa | `02` §8.3 (`instructions.ts`) | MC-050 a MC-060 | `TEST_STRATEGY.md` §3 |
| Explicação e contrato de evidência | `02` §11 | MC-045, MC-249 | recálculo de 500 relatórios |
| Zebras e ausência de ajuste escondido | ADR-013 item 7; `TEST_STRATEGY.md` §4 | MC-047, MC-251 | Z1 a Z22; invariância por identificador |
| Equivalência entre níveis | `TEST_STRATEGY.md` §2.1 | MC-046b, MC-252 | protocolo único |
| Esquema do pacote, importador, procedência | `03` §1; ADR-014 itens 1 e 2 | MC-011 a MC-020 | validação e relatório de qualidade |
| Pacote de desenvolvimento, de lançamento e real | `03` §1.6 | MC-154 a MC-157 | critério de publicação |
| Personalidade de jogador real | `03` §1.8 | MC-240 | origem e confiança por campo |
| Atributos, evolução, potencial | `03` §2 e §3 | MC-072 a MC-079 | curva de idade em 30 temporadas |
| Geração do mundo da base, olheiros, vínculo | `03` §7 | MC-101 a MC-114 | identidade determinística |
| Raridade, geografia, permanência, bem-estar | `08` §7 | MC-225 a MC-227 | distribuição igual de potencial por cidade |
| Carga, lesão, retorno | `08` §2 a §5 (`03` §4 só fatos de base) | MC-221 a MC-224 | rodízio reduz lesão |
| Dinheiro: livro-caixa como fonte única | ADR-014 item 6b; `04` §4 | MC-081, MC-087 | caixa = soma dos lançamentos |
| Regras financeiras por competição e ano | `04` §4.5, com `docs/pesquisa/modo-clube/09-regulamentos-conferidos.md` | MC-198 | regra aplicada na temporada certa |
| Parâmetros da economia | manifesto (`TEST_STRATEGY.md` §5.2) | MC-253, MC-254 | sensibilidade e Monte Carlo |
| Valor de jogador, contrato, agentes, empréstimo | `07` | MC-212 a MC-220 | `07` §10 |
| Comissão: modelo, efeitos e tetos | `06` §2 e §4 | MC-184 a MC-188 | teto por departamento e combinado |
| Governança, alçada, confianças | `06` §5 | MC-192 a MC-194 | pedido acima da alçada devolve 409 |
| Formato de competição e calendário | ADR-016; `05` | MC-160, MC-169 a MC-173 | temporada completa em dois pacotes |
| Forma de guardar o mundo | ADR-014 item 7; `01` §5.2 | MC-201 | medição das três opções |
| Autoridade do servidor e partida em trechos | ADR-015 | MC-061 | semente não aparece antes do fim |
| Texto, idioma, aparelho, venda | ADR-017 | MC-146 a MC-153 | chave ausente falha no build |
| O que está ativo em cada corte | `00` §6.0 e este roteiro §2 | | revisão a cada corte |
| Estratégia dominante | `TEST_STRATEGY.md` §5.1 | MC-255 | cinco políticas, 50 temporadas |
