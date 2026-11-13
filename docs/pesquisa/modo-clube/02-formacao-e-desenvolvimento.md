# Formação e desenvolvimento de jogadores: pesquisa para o Modo Clube

Data da pesquisa: 2026-11-13. Convenção de tags: **EVIDÊNCIA** (fonte e número), **COMUNIDADE** (opinião, imprensa, blog, sem revisão por pares), **HIPÓTESE DE DESIGN** (decisão nossa, não é fato). Onde não achei o número, está escrito em "Lacunas". Nenhum número foi inventado; quando um valor veio só de resumo secundário, isso está dito.

Aviso de método: parte das páginas primárias (Frontiers, PMC, planalto.gov.br) foi lida por extração automática de resumo. Os números abaixo são os que a extração devolveu. Antes de usar algum número em texto público do jogo, vale conferir na fonte.

---

## 1. Curvas de idade

**EVIDÊNCIA.** Dendir (2016), "When do soccer players peak? A note", Journal of Sports Analytics. Usou notas do WhoScored das quatro maiores ligas europeias, temporadas 2010/11 a 2014/15, goleiros excluídos. Pico típico entre 25 e 27 anos; atacantes em torno de 25, zagueiros em torno de 27; a curva dos defensores é mais plana (pouca curvatura). O pico varia com a habilidade. Fonte: https://journals.sagepub.com/doi/full/10.3233/JSA-160021 (página bloqueada para leitura direta; números vêm de resumo de busca, ver Lacunas).

**EVIDÊNCIA.** Kalén, Rey, Sal de Rellán-Guerra, Lago-Peñas (2019), "Are Soccer Players Older Now Than Before?", Frontiers in Psychology 10:76, https://pmc.ncbi.nlm.nih.gov/articles/PMC6360147. Amostra: 16.062 participações jogador-temporada na Champions League, 1992/93 a 2017/18. Idade média subiu de 24,9 para 26,5 anos. Idade média por posição: goleiros 28,19; zagueiros 26,31; meias centrais 25,44; atacantes 25,32; pontas 24,70. Goleiros e zagueiros parecem durar até cerca de 31 anos. Valor de mercado tem pico entre 26 e 30 anos, em U invertido; maiores de 35 têm o menor valor. O artigo não mede desempenho físico ou técnico; as afirmações sobre pico são inferência.

**Observação sobre a citação "Kalén 2021":** não encontrei esse artigo. O de 2021 sobre pico é de Oterhals, Lorås e Pedersen (Frontiers in Psychology, https://www.frontiersin.org/articles/10.3389/fpsyg.2021.661523/pdf), que usa indicações a prêmios como proxy e acha pico geral em 27 a 28 anos, variando de 26 a 31 conforme a posição (resumo de busca). O estudo com variáveis físicas e técnicas é Sal de Rellán-Guerra, Rey, Kalén, Lago-Peñas (2019), Scandinavian Journal of Medicine & Science in Sports, https://zendy.io/title/10.1111/sms.13463.

**EVIDÊNCIA (secundária).** Sobre esse artigo de 2019, um segundo paper (Retos, 2023, https://recyt.fecyt.es/index.php/retos/article/download/99719/73793/381475) cita: distância total -3,4%, corridas rápidas -12%, sprints -21% com a idade, enquanto o percentual de passes certos sobe 2,28%. Não confirmei no original.

**EVIDÊNCIA.** Atributos que envelhecem diferente. Estudo de Bob Hayes (MIT Sloan, não publicado em periódico), top 5 ligas europeias 2006/07 a 2021/22, usando notas do FIFA (videogame) e minutos de FBRef/Opta: jogadores muito habilidosos mantêm mais minutos depois do pico que os muito atléticos, em todas as posições, exceto lateral. Correlação com minutos pós-pico: 0,60 para habilidade e 0,22 para atletismo. Fonte: https://fromthebyline.substack.com/p/original-study-highly-skilled-elite. Isto é **COMUNIDADE** pela falta de revisão por pares, e a medida de atributo é um videogame.

**EVIDÊNCIA.** Goleiro. Frontiers/Kalén 2019: pico tardio, até cerca de 31. Estudo sueco (Säfvenberg e Lambrix, ISACE 2024, https://www.ida.liu.se/~nikca89/papers/isace24.pdf): pico geral por volta de 27 para goleiros, com declínio longo e lento. Análise da ESPN ordena goleiro como a posição menos sensível à idade (https://global.espn.com/football/story/_/id/37467220). Os estudos não concordam num número único. Um blog de análise (Goalimpact) diz pico aos 33; isso é **COMUNIDADE**.

**HIPÓTESE DE DESIGN.** Modelar três famílias de atributo: físicos (velocidade, aceleração, explosão) com pico cedo e queda mais forte; técnicos (passe, controle) que ainda sobem até o fim dos vinte; mentais/leitura de jogo que sobem até cerca de 30. Goleiro e zagueiro com janela de pico mais longa. As curvas exatas são nossas, calibradas para caber nas faixas acima.

---

## 2. Efeito da idade relativa (RAE)

**EVIDÊNCIA.** Meta-análise de 2023 sobre futebol (PMID 37903410): 563 amostras independentes em 90 artigos; a faixa de idade e o nível de desempenho determinam o tamanho do efeito, e o período adolescente mostra os maiores efeitos (https://dev.nlk.cz/mdv/doc/pmid37903410; autores e razões de chance não extraídos).

**EVIDÊNCIA.** Lovell, Portas, Cobley et al. (2015), PLoS ONE: nos programas de desenvolvimento juvenil ingleses, jogadores do primeiro trimestre de nascimento tinham 5,3 vezes (IC95% 4,08 a 6,83) mais chance de seleção que os do quarto (https://doaj.org/article/a9824bcddd0c4296ab9d38824941c95b).

**EVIDÊNCIA.** Referência entre esportes: Cobley et al. (2009), 38 estudos, 253 amostras, 14 esportes; efeito consistente e pequeno. Razão de chance Q1 contra Q4 de 1,65 (IC95% 1,54 a 1,77) citada em trabalho posterior para 1984 a 2008. Esportes femininos: 1,25 (Smith, Cobley et al., 2018, https://dx.doi.org/10.1007/s40279-018-0890-8), maior em pré-adolescentes e em níveis mais altos.

**EVIDÊNCIA.** Reversão na idade adulta ("underdog"). Romann et al. (2021), 11.738 jogadores masculinos U18 a U23 do Transfermarkt (https://pmc.ncbi.nlm.nih.gov/articles/PMC8309691): o RAE em número de jogadores existe em todas as faixas, mas o valor de mercado inverte. U19: Q1 vale mais (razão de chance 1,2). U22: Q4 vale cerca de 2,1 vezes Q1 (média 2,42 milhões de euros contra 1,14 milhão). U23: Q4 2,65 milhões contra Q1 1,79 milhão. Razão de chance geral de valor 0,7, favorecendo Q4. Os autores estimam, por conta teórica, Q1 sobrevalorizado em cerca de 1,24 bilhão de euros e Q4 subvalorizado em cerca de 1,41 bilhão. Não são transferências reais.

**EVIDÊNCIA (mista).** Em adultos o resultado é equívoco. Pérez-González et al. (2020), 2.577 jogadores adultos: efeito pequeno a médio em frequência, sem efeito sobre valor. Doyle e Bottomley (2018, PLoS ONE): efeito em frequência, não em valor. Estudo de 2024 com ingleses adultos: Q4 com o maior valor estimado, mas sem significância. Loffing (2016) argumenta que os dados não sustentam relação com o valor dos melhores. Fontes agregadas em https://mdpi.com/2075-4663/9/7/99 e https://pmc.ncbi.nlm.nih.gov/articles/PMC8309691.

**EVIDÊNCIA (Brasil).** Série A 2019: mais de 62% dos jogadores nasceram no primeiro semestre; nascidos no Q1 são maioria; o efeito não foi decisivo para o tempo de jogo (https://rbf.ufv.br/index.php/RBFutebol/article/download/162/166, resumo de busca). Estudo com 2.660 atletas de elite das Séries A e B: Q1 sobrerepresentado e Q4 sub-representado, em todas as categorias e níveis. Brasileiro Sub-17/Copa do Brasil Sub-17 (2014): 578 jogadores, diferenças significativas entre todos os quartis. Jogadores brasileiros de 10 a 15 anos: Q1 entre 35 e 50% e Q4 entre 10 e 17% (resumo de busca; estudos não abertos por mim). Estudo da FIFA sobre 5.359 jogadores da Série A (2003 a 2019): mais de 60% nasceram de janeiro a junho (http://www.fifatrainingcentre.com/en/environment/research-brief/high-performance/find/costa-brazil-talent-map.php).

**HIPÓTESE DE DESIGN.** Peneiras e seleções de base devem favorecer Q1 (peso grande entre 11 e 15 anos), com atenuação a partir de U21; jogadores de Q3/Q4 aprovados na base ganham um bônus de "subestimado" no valor de mercado depois dos 20.

---

## 3. Maturação biológica e bio-banding

**EVIDÊNCIA.** Revisão sistemática de 2026 em futebol juvenil (Han et al., https://www.jssm.org/jssm-25-446.xml-abst): grande inconsistência nos métodos de avaliar maturação, limites de faixa, regras de jogo e relato de resultados; direção e tamanho do efeito variam conforme a maturação do jogador. Outra revisão (preprint, https://sportrxiv.org/index.php/server/preprint/view/413): dez artigos sobre bio-banding relatam efeitos sobre desempenho, mas não há evidência direta de que reduzam o viés de seleção. Towlson e Cumming (Annals of Human Biology): os efeitos mais fortes aparecem nos atributos ligados à maturação (tamanho, força, potência, velocidade).

**EVIDÊNCIA.** Maturação e lesão. Academia holandesa (Bult et al., https://pmc.ncbi.nlm.nih.gov/articles/PMC6293374): incidência média de 8,34 lesões por 1000 horas nos escalões U12 a U19, maior nos períodos ao redor do pico de velocidade de crescimento. Johnson et al. (2020): 76 jogadores, 24,5 lesões por 1000 h em torno do pico de crescimento contra 11,5 antes dele. Crescimento de até 7,5 a 9,7 cm por ano entre 10,7 e 15,2 anos de idade (resumo de busca).

**HIPÓTESE DE DESIGN.** Cada jovem tem um "tempo de maturação" independente da idade: avanço de até cerca de dois anos para os que amadurecem cedo. Maturador precoce parece melhor na seleção e é supervalorizado; maturador tardio tem teto alto e sofre com lesão na fase de crescimento. Bio-banding como investimento opcional do clube com efeito pequeno e incerto.

---

## 4. Identificação de talento: quantos chegam

**EVIDÊNCIA (Espanha).** Moran et al. (Universidade de Essex), International Journal of Sports Science & Coaching, 2024: 198 jogadores masculinos de 13,5 a 17,9 anos de dois clubes profissionais de Madri, seguidos por cerca de dez anos. 12 se profissionalizaram e 7 chegaram à primeira divisão em até dez anos do teste final. Aproximadamente 4% no topo e 6% profissionais. Fonte: https://essex.ac.uk/news/2024/06/27/just-four-per-cent-of-teenage-academy-players-make-it-to-top-tier-football e https://repository.essex.ac.uk/39414/. Limitação: avaliações técnicas por julgamento de treinadores, amostra de um país.

**EVIDÊNCIA (Inglaterra).** Platts e Jacobi (Sheffield Hallam, conferência BSA 2019): cerca de 5% dos jogadores contratados aos 18 por clubes da Premier League ainda estavam na Premier League aos 23. Dos 55 contratados por cinco clubes (2010 a 2013), só 3 estavam na Premier League cinco anos depois; 10 na Championship, 26 em divisões menores, 11 sem clube. Só 15 de 157 seguiam no clube de origem aos 23. Fonte: https://es.britsoc.co.uk/almost-all-players-signed-to-premier-league-clubs-from-academies-leave-top-flight-football-within-five-years/. Dados de imprensa (The i Paper, 2022, base de dados da Premier League): 97% dos ex-jogadores de academias de elite com 21 a 26 anos nunca jogaram na Premier League (https://www.irishtimes.com/sport/soccer/international/fields-of-broken-dreams-how-the-odds-are-stacked-against-youth-players-1.4228573 e https://es.britsoc.co.uk/...). Isso é jornalismo, não artigo revisado. A estatística "180 em 1,5 milhão" (Calvin) tem denominador questionável.

**EVIDÊNCIA (Irlanda).** 14 de 222 (6,3%) jogadores convocados em categorias de base nascidos de 1990 a 1995 fizeram partida pela seleção principal (artigo do Irish Times; fonte do número não nomeada). Tratar como **COMUNIDADE**.

**COMUNIDADE (Brasil).** Um TCC da UFPE (2025), citando levantamento do FutDados, dá chance de cerca de 1,5% de chegar ao profissional (https://repositorio.ufpe.br/bitstream/123456789/68087/4/TCC%20RODRIGO%20BARROS%20MAC%c3%aaDO.pdf). A origem e o período do dado não estão claros.

**EVIDÊNCIA (Brasil, ecossistema).** Relatório Convocados 2026 (citado em https://maquinadoesporte.com.br/?p=234425): 470 clubes dedicados só à base; 1.049 clubes disputaram competições de base em 2025 (alta de 8%); 92% do investimento vai ao elenco profissional e 3% à base. CIES Football Observatory (citado em https://www.itatiaia.com.br/esportes/futebol/mercado-da-bola/brasil-e-segundo-pais-que-mais-fatura-com-exportacao-de-jogadores-diz-estudo): 50,1% da receita de vendas de jogadores do Brasil vem de atletas negociados com 20 anos ou menos.

**EVIDÊNCIA.** Validade preditiva e confiabilidade de olheiros: ver seção 9.

**Alfa tardios.** Os dados de Platts mostram trajetórias descendentes para a maioria e dispersão alta; Romann (seção 2) mostra Q4 ganhando valor depois dos 20. Não achei, nesta rodada, estudo com taxa quantificada de "late bloomer" por posição. Ver Lacunas.

**HIPÓTESE DE DESIGN.** Taxa de aproveitamento de base: usar entre 4% e 6% de "profissionais" por geração de academia de elite, e uma fração menor ainda de jogadores que chegam ao topo. Em clubes pequenos, menos. Nota alta aos 16 anos deve prever mal o nível aos 25; manter grande incerteza (ruído) até os 19.

---

## 5. Futsal para futebol

**EVIDÊNCIA.** Participação: cerca de 10 milhões de praticantes no Brasil, e é o esporte mais praticado por crianças e adolescentes nas escolas (Santos et al. 2019, citado em https://frontiersin.org/articles/10.3389/fsoc.2025.1487326/full). A Liga Nacional de Futsal tinha 24 clubes em 2024 e cerca de 400 jogadores; entre 85% e 89% dos jogadores de cada temporada nasceram no Sul e Sudeste. Só 11% a 13% ficam três anos no mesmo clube. O artigo não dá dados sobre futsal para futebol.

**EVIDÊNCIA.** Transferência de habilidade. Um experimento com 36 universitários concluiu que habilidades de futsal podem transferir-se para o futebol (resumo de busca). Comparação transversal: jogadores de futsal com melhor agilidade reativa e decisão mais rápida (atribuído ao ritmo do jogo; direção causal incerta). Projeto Oppici para a UEFA (https://uefaacademy.com/wp-content/uploads/sites/2/2019/06/20160512_UEFA-RGP_Luca-Oppici_Final-report.pdf) é plano, sem resultados. Estudo de Machado et al. (2022) investiga o papel de prática deliberada, jogo e futsal na decisão de jogadoras de elite brasileiras. Um artigo brasileiro afirma que, como os jogadores praticavam as duas modalidades na infância, é difícil afirmar transferência direta (resumo de busca). Uma amostra de jogadoras: 97,5% tiveram contato com futsal na infância; outro levantamento: 62,97% começaram no futsal a partir dos 10 anos.

**COMUNIDADE.** Biografias: a literatura brasileira cita que "inúmeros" craques tiveram os primeiros contatos com a bola no futsal (Fonseca, 2007, citado em UFRGS). Não confirmei nesta pesquisa a biografia de jogadores específicos; não usar nomes no jogo sem checar.

**HIPÓTESE DE DESIGN.** Jovem com origem em futsal recebe bônus modesto em passe curto, controle e tomada de decisão aos 14 a 17 anos, e leve desvantagem em jogo aéreo e resistência no campo grande. É hipótese plausível, não efeito medido.

---

## 6. Ecossistema brasileiro de formação

### 6.1 Leis

**EVIDÊNCIA.** Lei Geral do Esporte (Lei 14.597/2023), art. 99 e seguintes, lida em https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14597.htm (extração parcial, paráfrase):
- O primeiro contrato especial de trabalho esportivo pode ser assinado a partir de 16 anos, com prazo máximo de 3 anos no futebol (5 em outros esportes).
- Atleta não profissional com mais de 14 e menos de 20 anos pode receber bolsa de aprendizagem, por contrato formal, sem vínculo empregatício. Contrato de formação escrito, com seguro de vida e acidentes e discriminação dos gastos de formação.
- A organização formadora certificada (certificado de clube formador, emitido pela entidade nacional de administração do esporte) cumpre requisitos cumulativos: inscrição do atleta há pelo menos um ano, participação em competições oficiais, formação gratuita, jornada de formação de até 4 horas diárias compatível com a escola, exames médicos, alojamento adequado. Alíneas "q", "r" e "s" acrescidas pela Lei 15.522/2026.
- Menor de 12 a 14 anos não pode ser alojado nas dependências do clube; menor de 14 anos pode desligar-se sem multa a qualquer tempo.
- Indenização de formação (art. 99, §5º): limite de 200 vezes os gastos comprovados com a formação, paga à formadora em até 15 dias.
- Direito de preferência na primeira renovação, por até 3 anos; proposta ao atleta até 45 dias antes do fim do contrato; resposta em 15 dias. Se a formadora igualar e o atleta recusar, ela pode exigir 200 vezes o salário mensal da proposta da nova contratante.
- Art. 102 (resumo de extração): em transferências nacionais, até 6% do valor é distribuído às formadoras, com 0,5% ou 1% por ano de formação conforme a idade. Confirmar o texto exato antes de implementar.
- Contrato de trabalho esportivo (art. 86): de 3 meses a 5 anos; cláusula indenizatória até 2.000 vezes o salário médio contratual no plano nacional; cláusula compensatória até 400 vezes o salário mensal.

### 6.2 FIFA

**EVIDÊNCIA.** Mecanismo de solidariedade (art. 21 e Anexo 5 do RSTP): total de 5% da compensação da transferência internacional, distribuído por temporada de formação. Segundo a Farleys (https://www.farleys.com/?p=52648): 0,25% por temporada dos 12 aos 15 anos e 0,5% por temporada dos 16 aos 23. A soma (4 x 0,25% + 8 x 0,5%) dá 5%, cálculo meu, conferido com a descrição de busca. Compensação de formação (Anexo 4) depende de custos de formação publicados por categoria de clube e dos anos de formação; não é devida ao ir para clube de categoria 4; os princípios não se aplicam ao futebol feminino. Transferência puramente doméstica não gera compensação nem solidariedade FIFA. Fontes: https://lawinsport.com/topics/item/a-legal-guide-to-solidarity-payments-in-football-under-the-fifa-regulations, https://www.fifa.com/subuniverse-clearing-house.

**FIFA Clearing House.** As fontes indicam que ele processa pagamentos de compensação de formação e solidariedade (Anexos 4 e 5). Não obtive data de início nem alíquotas específicas da Clearing House. Ver Lacunas.

### 6.3 Competições

**EVIDÊNCIA.** Copa São Paulo de Futebol Júnior 2026 (56ª edição): 128 equipes em 32 grupos de quatro; cada equipe joga as outras uma vez; os dois primeiros avançam; mata-mata em jogo único com pênaltis; 30 cidades-sede; 2 a 25 de janeiro; final no Pacaembu; campeão e vice sem premiação em dinheiro (https://en.wikipedia.org/wiki/2026_Copa_S%C3%A3o_Paulo_de_Futebol_J%C3%BAnior e https://www.band.com.br/esportes/futebol/noticias/guia-copa-sao-paulo-de-futebol-junior-2026-202601011550). O limite de idade (sub-20) não foi confirmado nas fontes lidas.

**EVIDÊNCIA (datada).** Brasileiro Sub-20 de 2019: 20 clubes; Brasileiro Sub-17 desde 2019: 20 clubes pelo ranking nacional de clubes; Copa do Brasil Sub-20: 32 clubes (regulamento de 2019); Supercopa entre campeões do Brasileiro e da Copa do Brasil de cada categoria, em duas partidas. Sub-20 Série B de 2025: 16 clubes em dois grupos de oito (https://www.netflu.com.br/cbf-altera-formato-do-brasileirao-sub-20-e-cria-torneios-na-categoria-sub-17/ e https://static.goiasec.com.br/upload/editor/2019/02/REC-Regulamento-Espec%C3%ADfico-da-Competi%C3%A7%C3%A3o-Copa-do-Brasil-Sub-20-2019.pdf). Os formatos atuais (2025 e 2026) podem ter mudado.

**EVIDÊNCIA.** Escolinhas, projetos sociais e peneiras: não achei dados quantitativos nesta rodada. Ver Lacunas. **HIPÓTESE DE DESIGN:** escolinha e projeto social como porta de entrada barata com baixa chance individual; peneira como gargalo.

---

## 7. Geografia do talento

**EVIDÊNCIA.** Estudo da FIFA sobre 5.359 jogadores da Série A (clubes e CBF, 2003 a 2019; "Brazil Talent Map", Costa): quase três quartos nasceram em seis dos 27 estados; cinco desses seis têm IDH acima da média nacional; cerca de 70% nasceram em Rio de Janeiro, São Paulo ou em cidades com menos de 400 mil habitantes; cidades pequenas tendem a produzir mais jogadores por habitante que as grandes, mas sem número no resumo (http://www.fifatrainingcentre.com/en/environment/research-brief/high-performance/find/costa-brazil-talent-map.php). Convocados em Copas do Mundo: Sudeste e Sul concentram 86,6% dos locais de nascimento e dois estados dominam (SportLogia, https://doaj.org/article/7d5c066835264aba84ef0420611ad087).

**EVIDÊNCIA.** Municípios (IBGE, Censo 2022): 5.570 municípios; cerca de 44,8% (2.495) têm até 10 mil habitantes e reúnem 12,8 milhões (6,3% da população); municípios com menos de 100 mil habitantes são 87,5% do total; cerca de 57% da população vive em 319 municípios (https://www.band.com.br/noticias/censo-2022-448-dos-municipios-do-brasil-tem-ate-10-mil-habitantes-16612900, https://jovempan.com.br/?p=60500, https://revistas.ufrj.br/index.php/emetropolis/article/download/62601/40703/191945). Faixas finas (estimativa 2024, não Censo 2022): 48 municípios acima de 500 mil, 339 entre 100 e 500 mil, 1.288 até 5 mil (https://www.extraclasse.org.br/?p=107796).

**Futsal.** 85 a 89% dos profissionais da LNF nascem no Sul e Sudeste (seção 5).

**Lacuna central.** Não achei jogadores profissionais por habitante por município ou por estado. Qualquer taxa per capita precisa ser calculada com dados de nascimento e população, fora desta pesquisa.

**HIPÓTESE DE DESIGN.** Pesos de origem por região proporcionais à concentração acima (seis estados com cerca de 75%), com bônus de talento por habitante em cidades de até 400 mil e acesso à estrutura como fator limitante.

---

## 8. Ciência do treino, carga e lesões

**EVIDÊNCIA.** Prática deliberada. Macnamara, Hambrick e Oswald (2014): meta-análise de 88 estudos selecionados de 9.331; no esporte a prática deliberada explicou cerca de 18% da variância do desempenho, deixando muito sem explicação (https://www.psychologicalscience.org/journals/perspectives/1745691616635614/). Ericsson contesta: diz que a meta-análise usou definição mais ampla que a dele e muitas medidas eram avaliações subjetivas de treinadores. O debate continua.

**EVIDÊNCIA.** Razão de carga aguda para crônica (ACWR). Impellizzeri e colegas criticam a razão: base teórica fraca (modelo de Banister simplificado, janelas arbitrárias), associação com lesão em boa parte artefato estatístico (Sports Medicine, 2021, ao trocar a carga crônica por valores artificiais a associação desaparece); o editorial de Zouhal et al. (2021) chama a literatura de controversa, com alguns estudos em futebol de elite favoráveis (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8138569/, https://simplifaster.com/articles/acwr-high-performance-tool/). Conclusão prática: tratar a carga como ferramenta de monitoramento, não como preditor determinista.

**EVIDÊNCIA.** Incidência de lesões, profissionais (estudo UEFA, Ekstrand, Hägglund, Waldén, BJSM 2009/2011, https://pmc.ncbi.nlm.nih.gov/articles/PMC1725291 e https://bjsm.bmj.com/content/45/7/553.long): 4.483 lesões em 566.000 horas, ou 8,0 por 1000 horas no total; 27,5 (desvio 10,8) por 1000 horas em jogo contra 4,1 (desvio 2,0) em treino; 23 times, sete temporadas, 2001 a 2008; taxas estáveis entre temporadas.

**EVIDÊNCIA.** Coorte UEFA de 2001/02 a 2021/22 (Ekstrand et al., BJSM, https://pmc.ncbi.nlm.nih.gov/articles/PMC9985757): 14.057 lesões em 2.131.561 horas (1.787.823 de treino e 343.738 de jogo). Lesões de isquiotibiais: 2.636 (19% de todas), crescendo de 12% para 24% do total; 14% dos dias de afastamento; 4,99 por 1000 horas em jogo e 0,52 em treino (razão 9,67); mediana de afastamento de 13 dias (intervalo interquartil 7 a 22); cerca de 20% dos jogadores perdem treino ou jogo por isquiotibial numa temporada; um elenco de 25 espera cerca de 8 lesões desse tipo por temporada.

**EVIDÊNCIA (Brasil).** Primeira divisão 2019: 20,5 lesões por 1000 horas de jogo (estudo prospectivo, em link de busca https://scielo.br/j/aob/a/SzFTKzhyZRMp6bcW56jMn7g/?lang=en). Campeonato Paulista 2016 (Arliani et al., https://pmc.ncbi.nlm.nih.gov/articles/PMC5774927): 24,16 por 1000 h na A1, 19,10 na A2, 21,32 juntas; distensão muscular é a lesão mais comum (36% na A1, 43,3% na A2); membros inferiores 73%; afastamento médio de 19 dias na A1, 26 na A2 e 23,2 no conjunto; lesões moderadas (8 a 28 dias) foram a categoria mais comum (36,8% e 32,1%). Um clube brasileiro de primeira divisão: 42,84 por 1000 h em jogo e 2,40 em treino. Faixa citada em revisões: 15 a 70 por 1000 h de jogo.

**EVIDÊNCIA (jovens).** Academia inglesa de elite, quatro temporadas: taxa geral de 2,4 por 1000 horas, de 0,7 (sub-11) a 4,8 (sub-21); pico de lesões em sub-13 e de lesões musculares de quadril e virilha em sub-15. Faixa citada para academias: 2,0 a 19,4 por 1000 h. Holandeses: 8,34 por 1000 h (U12 a U19). Em torno do pico de crescimento: 24,5 contra 11,5 antes dele. Um programa para quem tem três fatores de risco reduziu de 5,2 para 0,8 por 1000 h (razão de taxas 0,14, p = 0,05). Fontes: https://core.ac.uk/download/326444016.pdf, https://pmc.ncbi.nlm.nih.gov/articles/PMC6293374, https://researchportal.bath.ac.uk/en/publications/growing-pains-maturity-associated-variation-in-injury-risk-in-aca/.

**HIPÓTESE DE DESIGN.** Taxa-base de lesão por minuto de jogo vinte vezes maior que por minuto de treino; fatores de risco: pico de crescimento (jovem), idade, sobrecarga recente. Não usar ACWR como regra de gatilho rígida.

---

## 9. Olheiros: o que avaliam, vieses, acurácia

**EVIDÊNCIA.** Estudo exploratório de campo com olheiros avaliando jogadores em partidas 11 contra 11 com roteiro (SAGE, DOI 10.1177/17479541261428967; hospedado em espelho incomum, conferir no DOI): confiabilidade entre avaliadores moderada para desempenho atual (ICC 0,61 clínico, 0,61 atuarial) e fraca para potencial (ICC 0,37 clínico, 0,42 atuarial). A confiabilidade limita a validade preditiva.

**EVIDÊNCIA.** Dugdale et al. (2020, Journal of Sports Sciences), 80 jovens: concordância entre técnicos entre moderada e substancial (ω de 0,48 a 0,68); a relação entre nota subjetiva e teste físico só foi alta nos melhores e nos piores. Fonte: https://storre.stir.ac.uk/bitstream/1893/31276/1/Dugdale%20et%20al%20JSS.pdf.

**EVIDÊNCIA (indireta).** Vieses conhecidos nos dados: idade relativa e maturação (seções 2 e 3); avaliações do estudo de Essex dependiam do julgamento de treinadores (seção 4).

**Lacuna.** Não achei estudo longitudinal ligando nota de olheiro a resultado de carreira, nem medida direta de viés por nacionalidade ou clube.

**HIPÓTESE DE DESIGN.** Nota de olheiro = valor real + ruído; o ruído é maior para "potencial" (ICC perto de 0,4) que para "nível atual" (perto de 0,6), e decresce com a qualidade e a quantidade de olheiros. Viés de maturidade e de idade relativa embutido na nota até cerca de 16 anos.

---

## 10. Psicologia

**EVIDÊNCIA.** Garra (grit). Larkin et al. (2023), 388 jovens de elite: grit previu expertise direta e indiretamente, e explicou habilidade além da prática deliberada (https://researchportal.northumbria.ac.uk/en/publications/gritting-ones-way-to-success-grit-explains-skill-in-elite-youth-s/). Autorregulação: capítulo sobre 525 jovens em academias holandesas liga habilidades de autorregulação à chance de se tornar profissional (https://www.taylorfrancis.com/books/e/9781315268248/chapters/10.4324/9781315268248-23). Hamoud et al. (2024), 192 jovens: motivos de realização influenciam planejamento e reflexão, mas não houve correlação significativa entre variáveis de motivação e desempenho avaliado pelo treinador. Entrevistas com gestores de academias inglesas (Barraclough et al., 2024): defendem conjunto mais amplo de características que construto único.

**EVIDÊNCIA.** Coesão. Carron, Colman, Wheeler e Stevens (2002), Journal of Sport and Exercise Psychology 24:168-188: 46 estudos, 164 tamanhos de efeito, relação coesão-desempenho moderada a grande; coesão de tarefa 0,263 e social 0,214 (citados por meta-análise de 2024). Meta-análise de 2014 (estudos de 2000 a 2010, 118 efeitos): r = 0,34 geral, 0,45 de tarefa, 0,11 social (https://www.springermedicine.com/the-cohesion-performance-relationship-in-sport-a-10-year-retrosp/21773818). Equipes femininas e publicações revisadas mostram efeitos maiores.

**EVIDÊNCIA.** Troca de técnico ("new manager bounce"). Revisão sistemática (Honorato Sousa et al., Biology of Sport 2024, https://e-space.mmu.ac.uk/632675/): possível ganho de curto prazo em resultado e desempenho físico, que tende a desaparecer após cerca de 5 jogos. Analytics FC (pareamento por entropia): o técnico novo faz pouca diferença em média. Van Ours (Erasmus, cinco grandes ligas): times que vinham mal melhoraram depois, com ou sem troca (regressão à média). Estudo alemão: troca ajuda só em times homogêneos em qualidade. Estudo polonês (Radzimiński et al., 2022): jogadores correm mais após a demissão, voltando ao nível normal de esforço, sem ganho duradouro (via resumo secundário).

**HIPÓTESE DE DESIGN.** Troca de técnico dá um bônus de moral de curta duração (cerca de 5 jogos), sem efeito permanente. Maiores riscos de queda ao forçar troca sem motivo. Moral ligada a coesão com efeito moderado, mais forte na tarefa que no social. Traços "determinação" e "autocontrole" como atributos ocultos que elevam a velocidade de crescimento, com efeito moderado.

---

## Parâmetros sugeridos para o jogo

Números com fonte: marcados como EVIDÊNCIA. Os demais são hipótese de calibração.

**Picos de idade (EVIDÊNCIA)**
- Pico geral: 25 a 27 (Dendir 2016; Sal de Rellán/Hayes). Atacante cerca de 25; zagueiro cerca de 27; geral 27 a 28 em Oterhals 2021, com faixa de 26 a 31 por posição.
- Idade média na Champions (2017/18, Kalén): goleiro 28,2; zagueiro 26,3; meia 25,4; atacante 25,3; ponta 24,7.
- Goleiro e zagueiro: pico possível até cerca de 31.
- Valor de mercado: pico de 26 a 30; menor valor depois dos 35.
- Declínio físico (via fonte secundária): sprints -21%, corridas rápidas -12%, distância -3,4% com a idade; passe certo +2,28%.

**Crescimento por ano de idade (HIPÓTESE DE DESIGN; não há tabela publicada)**
- 14 a 17 anos: maior ganho físico por ano e maior variância (maturação). 18 a 22: ganho médio decrescente. 23 a 26: ganho pequeno até o pico. Depois: declínio físico por ano mais forte em velocidade que em passe. Crescimento corporal real citado: 7,5 a 9,7 cm por ano entre 10,7 e 15,2 anos.

**Quem chega lá (EVIDÊNCIA)**
- Espanha (Essex): 12 de 198 (6%) viraram profissionais; 7 de 198 (cerca de 4%) chegaram à primeira divisão em dez anos.
- Inglaterra (Platts): cerca de 5% dos contratados aos 18 estão na Premier League aos 23; 3 de 55 cinco anos depois.
- Brasil: cerca de 1,5% (COMUNIDADE, FutDados via TCC, origem não verificada).
- Receita de venda: 50,1% vem de atletas de até 20 anos (CIES).

**Efeito da idade relativa**
- Seleção em categorias inglesas: razão de chance 5,3 para Q1 contra Q4; adulto esportes gerais 1,65; efeito adulto de valor tende a inverter (Q4 cerca de 2,1 vezes Q1 em valor médio aos 22).
- Brasil: mais de 60% a 62% do Série A nasce no primeiro semestre.

**Lesão (EVIDÊNCIA)**
- Profissionais UEFA: 8,0 por 1000 h total; 27,5 em jogo; 4,1 em treino.
- Brasil: 20,5 (Série A 2019) a 24,2 (Paulista A1 2016) por 1000 h de jogo; afastamento médio de 19 a 26 dias; moderadas (8 a 28 dias) são cerca de um terço das lesões; distensão muscular 36% a 43%; membros inferiores 73%.
- Isquiotibial: 19% de todas as lesões; mediana de 13 dias (7 a 22).
- Jovens: 2,4 por 1000 h geral na academia inglesa (0,7 sub-11 a 4,8 sub-21); 8,34 em academias holandesas; 24,5 no pico de crescimento contra 11,5 antes.

**Formação e contratos (EVIDÊNCIA, lei)**
- Contrato de formação: 14 a 20 anos; primeiro contrato profissional a partir dos 16, até 3 anos no futebol.
- Indenização de formação: até 200 vezes os gastos de formação; direito de preferência de até 3 anos na primeira renovação; proposta 45 dias antes; resposta em 15.
- Cláusula indenizatória nacional até 2.000 vezes o salário médio; compensatória até 400 vezes o salário mensal.
- Solidariedade FIFA: 5% do valor, 0,25% por ano dos 12 aos 15 e 0,5% por ano dos 16 aos 23.
- Solidariedade doméstica na Lei Geral: até 6% (checar texto).

**Competições (EVIDÊNCIA)**
- Copinha: 128 equipes, 32 grupos de 4, dois avançam, jogo único depois. Brasileiro Sub-20 e Sub-17: 20 clubes (2019). Copa do Brasil Sub-20: 32 clubes.

**Olheiro e psicologia (EVIDÊNCIA)**
- Confiabilidade de olheiros: ICC cerca de 0,6 para nível atual e cerca de 0,4 para potencial.
- Coesão e desempenho: r de 0,34 geral, 0,45 tarefa, 0,11 social (2014); técnico novo: bônus que some em cerca de 5 jogos.
- Prática deliberada: cerca de 18% da variância no esporte.

**Geografia (EVIDÊNCIA)**
- Seis dos 27 estados dão cerca de 75% dos jogadores da Série A; cerca de 70% nasceram em Rio, São Paulo ou cidades abaixo de 400 mil; 5.570 municípios, 44,8% com até 10 mil habitantes.

---

## Lacunas

1. Dendir (2016): números de pico por posição vieram de resumo de busca (atacante 25, defensor 27, geral 25 a 27); a página do periódico estava bloqueada. Conferir antes de citar.
2. Não existe, pelo que achei, "Kalén 2021" sobre envelhecimento; trabalhos efetivamente encontrados estão na seção 1.
3. Sal de Rellán-Guerra et al. (2019): números de declínio vieram de fonte secundária. Sem curvas de decisão ou leitura de jogo medidas por idade.
4. Meta-análise de RAE em futebol (2023): sem razão de chance agrupada por faixa de idade extraída. Sem número brasileiro por categoria (Sub-15, Sub-17) confirmado em fonte primária.
5. Brasil: taxa de aproveitamento da base só por trabalho acadêmico (1,5%); sem estudo próprio. Nada sobre escolinhas, projetos sociais e peneiras quantificados.
6. Alemanha: não obtive dados sobre taxa de aproveitamento de academias alemãs.
7. Jogadores tardios ("late bloomers"): sem taxa quantificada por posição.
8. Futsal: sem dados de migração de futsal para futebol e sem confirmação de biografias de nomes específicos.
9. Geografia: sem jogadores profissionais por habitante por município ou estado; faixas finas do Censo 2022 só em estimativa de 2024.
10. FIFA Clearing House: sem data de início e alíquotas confirmadas; tabelas exatas de compensação de formação por categoria e valor não extraídas. Percentuais 0,25% e 0,5% vêm de resumo da Farleys.
11. Lei Geral do Esporte: texto lido por extração parcial; art. 102 (até 6%) precisa de conferência. Requisitos para certificado de clube formador da CBF (por estrelas) não encontrados; o regulamento da CBF deve ser lido.
12. Competições: formatos atuais (2025 e 2026) do Sub-20, Sub-17 e Copa do Brasil Sub-17/Sub-20 não confirmados; ligas estaduais de base sem dados.
13. Lesão: sem número de dias médios por lesão em jovens; sem incidência por 1000 horas em jovens brasileiros.
14. Olheiros: sem estudo de validade preditiva longitudinal nem de viés por origem.
15. Psicologia: sem meta-análise de grit ou autorregulação com a progressão a profissional como desfecho; efeito de troca de técnico varia entre estudos (de "bounce" curto a efeito nulo).
