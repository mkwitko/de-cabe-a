# Modo Clube — saúde, desempenho físico e bem-estar na formação

Data: 2026-11-13, revisão 4. Amplia `03-JOGADORES-E-BASE.md` §4, §5 e §7. Legenda: FATO, HIPÓTESE, DECISÃO, PARÂMETRO, NÃO PESQUISADO. **FATO PARCIAL** marca fonte que existe mas foi lida só em parte; detalhes em `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md`.

## 1. Princípio

O jogador não está "saudável" ou "lesionado". Ele tem uma condição que muda com carga, recuperação, histórico, viagem e calendário. A pessoa não administra trinta indicadores: a comissão transforma os dados em poucas recomendações, com a qualidade de quem a compõe.

## 2. Carga

| Carga | De onde vem | Quem lê |
| --- | --- | --- |
| **Externa** | medida pela própria engine na partida (distância, corrida intensa, sprints, acelerações e desacelerações, minutos) e estimada no treino pelo bloco e pela intensidade | preparação física |
| **Interna** | estimada: esforço percebido, sono, estresse, viagem, moral | preparação, saúde, psicologia |

FATO PARCIAL (Soligard e outros, 2016, British Journal of Sports Medicine; `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md` item 4): o consenso do Comitê Olímpico Internacional sobre carga e risco de lesão existe, mas só o resumo foi lido; nenhuma recomendação numérica é atribuída a ele aqui. FATO da pesquisa 02: a razão entre carga aguda e crônica é debatida na literatura. Tratar carga externa e interna separadamente é DECISÃO de desenho.

DECISÃO: o risco de lesão é uma função de vários termos (`03` §4), não de um limiar. O estado guardado por jogador é pequeno: carga aguda (7 dias), carga crônica (28 dias), frescor (0..1), e uma lista de restrições. O que a pessoa vê é um semáforo por jogador com o motivo ("três jogos em oito dias", "voltou de lesão muscular"), e a precisão do semáforo depende do nível dos departamentos de preparação e saúde: comissão fraca erra o semáforo.

## 3. Calendário apertado

FATO (Julian, Page e Harper, 2021, Sports Medicine, 16 artigos; `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md` item 7): efeito físico do calendário apertado não é claro (distância total praticamente igual); desempenho técnico não muda; o achado tático vem de um único estudo.

DECISÃO: não existe penalidade fixa por "dois jogos na semana". O efeito sai do modelo: minutos acumulados, intervalo entre partidas (FATO: descanso mínimo de 66 horas no regulamento de 2026), carga das últimas semanas, idade, base física da pré-temporada, viagem, e qualidade da recuperação. Rodízio é a resposta do treinador; o auxiliar sugere quando a escalação é delegada.

## 4. Preparação física ligada ao modelo de jogo

O modelo de jogo do clube (`04` §2) define o **perfil de esforço** que a partida vai cobrar: pressão alta pede muitas acelerações e corridas intensas repetidas; bloco baixo e transição pede sprints longos de poucos jogadores; posse pede volume e pouca intensidade máxima. A preparação física da pré-temporada e da semana tem um alvo de perfil. Preparar para um perfil e jogar outro custa: fôlego cai mais cedo e o risco sobe. Mudar o modelo no meio do ano exige semanas de adaptação física, além da familiaridade tática (`02` §8.5).

Blocos do preparador: periodização da temporada (base, manutenção, pico para a reta final), força, velocidade, resistência específica, prevenção, recuperação.

## 5. Lesão

```ts
interface Injury {
  type: InjuryType; region: BodyRegion; severity: 1 | 2 | 3 | 4;
  mechanism: 'sem contato' | 'contato' | 'sobrecarga';
  occurredAt: Day; expectedReturn: DayRange;       // faixa, não data
  phase: 'tratamento' | 'reabilitação' | 'transição' | 'liberado com restrição' | 'liberado';
  recurrenceRisk: number;                          // cai com reabilitação completa
  restrictions: Array<'minutos limitados' | 'sem jogos seguidos' | 'sem gramado sintético'>;
}
```

- Tabela de tipos com frequência, região e dias fora no pacote da engine (FATOS de base em `03` §4: posterior da coxa como lesão mais comum; mediana de 13 dias na Europa; média de 23 dias na Série A).
- A previsão de retorno é uma faixa; a largura depende do departamento de saúde.
- **Decisão de retorno**: jogador "liberado com restrição" pode ser relacionado, usado por poucos minutos, mantido em recuperação ou reavaliado. Voltar antes aumenta o risco de recaída; a recaída costuma ser pior que a lesão original (PARÂMETRO).
- Histórico por jogador: lesões anteriores pesam no risco da mesma região e no valor de mercado.
- Jovens: risco multiplicado no pico de crescimento (FATO, `03` §4).

## 6. Central de desempenho (Performance Hub)

Uma tela, três blocos, alimentada por preparação, saúde e análise:

1. **Disponibilidade**: semáforo do elenco, lesionados com fase e faixa de retorno, pendurados e suspensos.
2. **Carga e forma**: quem está acima ou abaixo do alvo, quem precisa de descanso ou de minutos.
3. **Achados do analista**: fatos medidos nas últimas partidas, em frase com número ("o ponta direito perdeu 31% das disputas de velocidade depois dos 70 minutos nos últimos três jogos"), com a decisão que o achado sugere.

Os achados saem dos mesmos dados do relatório de partida (`02` §11), agregados por janela de jogos. Clube sem analista não tem o terceiro bloco; clube sem preparador tem semáforo grosseiro.

Delegação: "deixar com o preparador" aplica as recomendações de carga automaticamente; "deixar com o médico" decide retornos pelo critério conservador ou arriscado que a pessoa escolher.

## 7. Bem-estar e formação integral dos jovens

FATO (regulamento de licenciamento da UEFA, edição 2025): o programa de formação precisa ter filosofia, organização, profissionais, infraestrutura, recursos, apoio médico e continuidade escolar. FATO PARCIAL: o programa de proteção de crianças da FIFA é dirigido a federações e a competições da FIFA, não a clubes diretamente. FATO (Lei 14.597/2023, arts. 99 e 101, texto oficial; `docs/pesquisa/modo-clube/09-regulamentos-conferidos.md` itens 3 e 4): só clube formador certificado pode manter alojamento; exige-se instalação certificada, monitor responsável o dia todo, convivência familiar, matrícula, frequência e aproveitamento escolar, formação limitada a 4 horas por dia e laudos anuais; o descumprimento leva a advertência com prazo de 60 dias, perda da certificação e suspensão de competições. FATO (regulamento de registros da CBF, em vigor desde março de 2026): o Certificado de Clube Formador vale por temporada, vence em 31 de janeiro e é renovado com nova verificação; requisitos cumulativos: competição oficial em pelo menos duas categorias, programa de formação compatível com a escola, comissão habilitada, assistência médica, odontológica, psicológica, nutricional, social e educacional, seguro de vida e de acidentes, transporte seguro e prontuário individual; com alojamento, três refeições diárias planejadas e supervisão. O certificado dá direito à indenização de formação. Cerca de 93 clubes constavam da lista da CBF em outubro de 2026 (contagem do pesquisador). NÃO ENCONTRADO: taxa de abandono na base brasileira; os números que circulam medem seleção e aproveitamento, não abandono, então a probabilidade de saída do §7.2 é PARÂMETRO sem referência. FATO (pesquisa 06): no Brasil, o Certificado de Clube Formador é condição para receber indenização de formação; os requisitos vigentes estão no parágrafo acima.

DECISÃO: a formação é uma responsabilidade do clube, com custo e consequência, e não só uma fábrica de atributos.

### 7.1 Dimensões

| Dimensão | O que o clube decide | Efeito |
| --- | --- | --- |
| Escola | convênio, horário de treino compatível, acompanhamento | permanência; `decisões` e adaptação; exigência de certificação |
| Alojamento | vagas, qualidade, supervisão | permite trazer garotos de outras cidades; risco de abandono cai com qualidade |
| Alimentação e transporte | fornecer ou não | presença nos treinos, desenvolvimento físico |
| Saúde juvenil | médico e fisioterapia da base | lesão no pico de crescimento |
| Psicologia e família | acompanhamento, contato com responsáveis | adaptação, abandono, transição ao profissional |
| Proteção | política, responsável designado, supervisão | requisito de certificação; falha é evento grave para a reputação do clube |
| Plano alternativo | formação além do futebol | reputação comunitária; atratividade para famílias |

### 7.2 Permanência

Cada garoto na base tem uma probabilidade de sair por temporada, função de distância de casa, alojamento, escola, minutos, relação com o treinador e apoio. Sair não é castigo ao usuário: é o mundo funcionando. O clube que cuida disso retém mais e atrai famílias; o que não cuida perde garotos, inclusive os bons.

DECISÃO de tom: nenhum evento sensacionalista. As situações aparecem como fatos administrativos e decisões de estrutura ("três garotos de fora não se adaptaram; não há alojamento supervisionado"), nunca como drama explorado. Nada de conteúdo sobre abuso; a dimensão "proteção" existe como requisito de estrutura e de certificação.

### 7.3 Instalações próprias da base

Campo exclusivo, ginásio e quadra de futsal, alojamento, sala de estudo, refeitório, transporte, centro médico juvenil. Cada uma com custo, manutenção e o efeito da tabela acima (`04` §6 ganha essas linhas).

### 7.4 Metodologia de formação

O coordenador da base escolhe a ênfase: técnica, tática, física (respeitando maturação) ou integral. A ênfase desloca que atributos crescem mais na base e que perfil de jogador o clube produz ao longo dos anos. Ela alimenta a identidade do clube (`04` §2.1): base e profissional podem estar alinhados ou em conflito, e alinhar leva temporadas.

### 7.5 Raridade e geografia do talento (corrige `03` §7.2)

Este parágrafo é a fonte única para raridade e geografia; `03` §7 cuida de geração, identidade e olheiros (fronteira declarada lá).

- O número de talentos de elite por safra **não é fixo** em 8 a 12. É um parâmetro calibrado em simulação para que a distribuição de força do mundo fique estável em 30 temporadas (`TEST_STRATEGY.md` §5), partindo de: população jovem, participação, número de clubes formadores e a taxa real de quem chega ao topo (FATO: 4 a 5% dos jovens de academia na Europa).
- **Geografia muda acesso, não talento.** O potencial verdadeiro é sorteado com a mesma distribuição em qualquer cidade. O que varia por cidade é: quantos praticam, a qualidade do treino que o garoto recebe (logo, quanto do potencial vira atributo), quantas competições o expõem e a chance de um olheiro vê-lo. Um garoto de cidade pequena sem estrutura pode ter o mesmo teto e chegar aos 16 anos mais cru e invisível. É aí que está o valor de observar onde ninguém observa.

### 7.6 Viagens da base

Disputar uma competição de base custa viagem, hospedagem e dias de escola. O clube escolhe em quais se inscreve. Mais competição dá mais vitrine e desenvolvimento, e mais custo e desgaste. A Copa São Paulo é a maior vitrine e uma das viagens mais caras para clube de longe.

## 8. Futebol feminino

Fora do lançamento. DECISÃO de arquitetura para não fechar a porta: equipe é uma entidade do clube com `category` (profissional, sub-20, sub-17…) e `gender`; competição tem `gender`; elenco, comissão, calendário e orçamento são por equipe. No lançamento só existe `gender: 'M'`, e nenhum código assume isso (teste: pacote fictício com uma equipe feminina carrega sem erro).

## 9. Em cada corte

| Corte | O que existe |
| --- | --- |
| 1 | **camada única**: fôlego na partida; lesão com tipo, dias fora e data de retorno (sem fases e sem decisão de retorno); frescor entre jogos (um número por jogador, que cai com minutos e sobe com dias de descanso); semáforo de três cores derivado só do frescor e da lesão. Não existem no corte 1: carga aguda e crônica, carga interna, perfil de esforço, central de desempenho, recaída |
| 2 | carga aguda e crônica; decisão de retorno; preparação por perfil de esforço; central de desempenho; base com escola e alojamento como níveis |
| 3 | permanência por garoto, metodologia, instalações da base, viagens da base, certificação |
| Depois | futebol feminino |

## 10. Testes

- Carga externa medida pela engine é igual à soma dos eventos de movimento do log.
- Mesma sequência de jogos: elenco com rodízio tem menos lesões que sem rodízio, em 2.000 temporadas simuladas.
- Preparar para um perfil de esforço e jogar outro reduz o fôlego aos 70 minutos.
- Retorno antecipado aumenta a taxa de recaída no sentido do parâmetro.
- Semáforo de comissão fraca erra mais que o de comissão forte contra o risco verdadeiro.
- Potencial sorteado tem a mesma distribuição em cidades de portes diferentes; atributo aos 16 anos difere conforme a estrutura.
- Raridade: força média por divisão dentro de ±2 pontos depois de 30 temporadas.
- Garoto de fora sem alojamento tem taxa de saída maior que com alojamento.
