# Monetização do De Cabeça F.C.: o que mais dá para cobrar

Data: 2026-11-10. Pesquisa para decisão. Responde a duas perguntas do dono: "dá para ter fases pagas (ex.: 350 de 450 grátis)?" e "quanto dá para ganhar com assinatura, cosméticos e doações?". Os valores de mercado vêm de fontes públicas, citadas no texto. Vários números são estimativas de terceiros. Antes de decidir preço ou forma de empresa, confirme os itens fiscais e jurídicos com um contador e um advogado.

---

## Resumo executivo

1. **Não feche a trilha principal.** Tudo o que faz o jogo crescer depende dela: compartilhar um link que abre a mesma fase, o ranking, os títulos e o Desafio do Dia. Se as fases 351 a 450 forem pagas, quem paga ganha mais estrelas e sobe no ranking. Isso é pagar para ganhar, e o próprio PRODUCT.md proíbe. Além disso, o link que um amigo manda deixa de abrir a fase para quem não pagou.
2. **Venda conteúdo extra, separado da trilha.** Funciona como a Oficina: são **Coleções temáticas** ("Copa de 2002", "Brasileirão anos 90", "Libertadores"), cada uma com 30 a 50 fases e ranking próprio, sem valer para estrelas, títulos ou ranking geral. Cada Coleção custa **R$ 7,90** avulsa e vem **incluída no Clube**. É o modelo do NYT: o jogo do dia é grátis e o acervo é do assinante.
3. **O Clube é o que mais rende em escala.** R$ 9,90/mês e R$ 79,90/ano estão na faixa certa para o Brasil, entre o Cartola PRO (R$ 4,99/mês) e o Duolingo Super (cerca de R$ 15/mês no plano anual). Para dar motivo de assinar, o Clube passa a incluir: sem anúncios, todas as Coleções, o arquivo completo do Desafio do Dia e estatísticas. Conte com 1 a 2% dos usuários ativos pagando.
4. **Doações sim, mas como venda pela empresa.** Uma página "Apoie o De Cabeça" com Pix e "pague quanto quiser" no Stripe, recebida pelo CNPJ e tributada como receita. É mais simples e seguro que receber doação no CPF, onde entra ITCMD, IR e o risco de a Receita entender como renda. Vai render pouco: trate como reforço, não como pilar.
5. **Projeção líquida mensal** (detalhes na seção 4): **~R$ 1,2 mil** com 5 mil usuários ativos por mês, **~R$ 14 mil** com 50 mil e **~R$ 87 mil** com 300 mil. Com poucos usuários, a maior fonte é anúncio. Com muitos, é o Clube.

---

## 1. Como produtos parecidos ganham dinheiro

| Produto | Modelo | Preço | O que aprender |
|---|---|---|---|
| **NYT Games** (Wordle, Connections) | Jogo do dia grátis; acervo (mais de 10 mil jogos antigos) e alguns jogos só para assinante | ~US$ 6/mês ou US$ 50/ano (fonte de terceiros) | Wordle continua grátis e serve para atrair novos jogadores; o dinheiro vem do acervo e do pacote de jogos. Quando fecharam o Mini Crossword, houve reclamação. [Central de ajuda NYT](https://thenewyorktimeshelpcenter.helpjuice.com/360052272251-New-York-Times-Games-Subscription), [App Store](https://apps.apple.com/app/307569751), [AOL sobre o paywall do Mini](https://www.aol.com/york-times-angers-readers-mini-144836826.html) |
| **Sporcle Orange** (quiz) | Assinatura: sem anúncios, estatísticas, filtros e acesso antecipado a jogos novos | US$ 3,99/mês ou US$ 43,99/ano | Assinatura de jogo de conhecimento se vende com "sem anúncios + extras", não com bloqueio do jogo. [Sporcle](https://www.sporcle.com/memberships/), [blog Sporcle](https://www.sporcle.com/blog/2020/07/what-features-are-included-with-sporcle-orange) |
| **Cartola PRO** (Globo) | Assinatura com mais ligas, prêmios e análises | R$ 4,99/mês (2025); R$ 59,90/ano em 2024 | É a referência brasileira de futebol e mostra quanto o torcedor aceita pagar. [Goal](https://www.goal.com/br/listas/o-que-como-funciona-reserva-de-luxo-novo-recurso-cartola/blt4313cac2920ac4f0), [NSC Total](https://www.nsctotal.com.br/?p=7108316) |
| **Duolingo Super** | Assinatura sem anúncios, com vidas ilimitadas | ~R$ 179,90/ano (~R$ 15/mês) | 9% dos usuários ativos pagam, mas depois de anos de otimização. Não sirva de meta inicial. [Carta aos acionistas Q1/2025 (SEC)](https://www.sec.gov/Archives/edgar/data/1562088/000156208825000098/q1fy25duolingo3-31x25share.htm), [Olhar Digital](https://olhardigital.com.br/2025/05/14/dicas-e-tutoriais/super-duolingo-veja-o-que-e-quais-os-beneficios-e-como-funciona-a-assinatura/) |
| **Jogos de adivinhar jogador** (Futbol11, Footle, Who Are Ya) | Anúncios e pouco mais | — | Nenhum mostra receita relevante: o Footle aparece sem assinaturas ativas. É uma oportunidade de ser o primeiro com algo premium bem feito em PT-BR. [TrustMRR/Footle](https://trustmrr.com/startup/footle) |
| **FC Ultimate Team, Candy Crush, Wordscapes** | Pacotes aleatórios, vidas e dicas pagas | — | São justamente os modelos que vamos evitar: aleatório pago (proibido pelo ECA Digital), vidas (bloqueiam o jogo) e dicas (pagar para ganhar). |

**Quantos usuários costumam pagar.** Em jogos gratuitos, de 1 a 3% dos usuários pagam ([MWM](https://mwm.ai/glossary/freemium)). Em apps freemium, a mediana é 2,18% ([Adapty](https://adapty.io/blog/freemium-to-premium-conversion-techniques)). Para planejar no Brasil e na web, use **1%** como base e 2% como bom resultado.

**Anúncios no Brasil.** O tráfego brasileiro paga pouco. Um guia de 2026 dá RPM saudável de R$ 3 a 15 por mil páginas no AdSense ([guia AdSense](https://guiaferramentasdigitais.com.br/guias/google-adsense-como-funciona/)). Em apps, o banner rende US$ 0,10 a 0,50 por mil exibições e o vídeo com recompensa cerca de US$ 2 na América Latina ([MWM](https://mwm.ai/de/glossary/banner-ad), [Playwire](https://www.playwire.com/blog/admob-ecpm-benchmarks-what-publishers-should-expect)). Em 2025 o RPM também oscilou bastante ([WebmasterWorld](https://www.webmasterworld.com/google_adsense/5122952.htm)).

**Pix.** O Pix respondeu por 54,7% das transações de pagamento no 2º semestre de 2025 ([Banco Central, via Let's Money](https://www.letsmoney.com.br/noticias/pix-547-transacoes-brasil-segundo-semestre-2025-banco-central)). Sem Pix, o checkout perde metade do público. **Atenção:** no Stripe Brasil, o Pix custa 1,19% e **só funciona por convite** ([Stripe](https://stripe.com/br/pricing)). Confirme se a conta tem Pix liberado. Se não tiver, a alternativa é um gateway brasileiro (Mercado Pago, Asaas, Pagar.me) só para o Pix.

**Gasto do brasileiro com jogos.** 36% dos gamers compram itens ou expansões dentro do jogo ([Serasa/Gamers Club via Viva](https://viva.com.br/dinheiro/brasileiros-gastam-ate-r-250-por-mes-com-jogos-digitais-aponta-pesquisa.html)). O público paga quando o que está à venda parece valer o preço.

---

## 2. "Fases pagas": os modelos possíveis

Nota de 1 a 5: quanto maior, melhor para o De Cabeça.

| Modelo | Retenção | Conversão | Risco legal / de marca | Nota | Veredito |
|---|---|---|---|---|---|
| **A. Trilha com bloqueio** (350 grátis, 100 pagas) | Ruim: quem chega à 350 é o jogador mais fiel, e é justamente ele que bate no muro | Média | **Alto**: vira pagar para ganhar no ranking e nos títulos, e o link compartilhado deixa de abrir | 1 | Não fazer |
| **B. Coleções temáticas avulsas** (fora da trilha, ranking próprio) | Boa: conteúdo novo traz o jogador de volta | Média | Baixo | 5 | **Fazer** |
| **C. Coleções incluídas no Clube** | Boa | Aumenta a do Clube | Baixo | 5 | **Fazer junto com B** |
| **D. Temporada / passe** com trilha temática nova a cada 4 semanas | Muito boa | Boa | Médio: o passe não pode trazer prêmio aleatório nem gerar urgência artificial ("só hoje!") | 4 | Depois de 10 mil usuários |
| **E. Acesso antecipado** (assinante joga a Coleção nova 7 dias antes) | Neutra | Pequena | Baixo, se a Coleção não contar para o ranking geral | 3 | Bônus barato do Clube |
| **F. Modelo NYT** (Desafio do Dia grátis; arquivo antigo no Clube) | Neutra: hoje continua grátis | Boa: é o que mais converte no NYT | Baixo | 4 | **Fazer**: últimos 7 dias grátis, o resto no Clube |
| **G. Energia / vidas** | Ruim | Alta no curto prazo | Alto: bloqueia o jogo, e o ECA Digital limita padrões manipulativos | 1 | Não fazer |
| **H. Dicas / revelar resposta pagas** | Neutra | Alta | **Alto**: dica muda estrelas e ranking, ou seja, pagar para ganhar | 1 | Não fazer |
| **I. Anúncio com recompensa** para liberar fase | Boa | Nenhuma | Médio: hoje o PRODUCT.md proíbe | 2 | Manter proibido: cada vídeo rende uns R$ 0,01 no Brasil, não compensa o custo de marca |

### Leis e regras que afetam a escolha

- **ECA Digital (Lei 15.211/2025, em vigor desde 17/03/2026).** Um jogo de futebol tem "provável acesso" de menores, então vale para nós:
  - caixas de recompensa (loot boxes) são proibidas no art. 20;
  - publicidade dirigida a menores com base em perfil é proibida (arts. 20 e 22);
  - a multa vai até 10% do faturamento ou R$ 10 a R$ 1.000 por usuário cadastrado, com teto de R$ 50 milhões.

  Fontes: [Demarest](https://www.demarest.com.br/eca-digital-entrada-em-vigor-em-17-de-marco-de-2026/), [Nota Técnica MJSP](https://www.gov.br/mj/pt-br/assuntos/noticias-1/mjsp-pede-a-anpd-que-monitore-jogos-eletronicos-com-caixas-de-recompensa-que-nao-implementaram-verificacao-de-idade/NotaTcnican55.pdf), [Machado Meyer](https://www.machadomeyer.com.br/images/ebooks/Factsheet_ECA_Digital.pdf), [Conjur](https://www.conjur.com.br/2025-out-21/eca-digital-e-marco-da-protecao-online-de-criancas-e-adolescentes//?print=1).

  O que isso exige do produto:
  - venda só de itens determinísticos, em que a pessoa vê o que vai receber;
  - anúncio não personalizado quando não se sabe a idade;
  - no checkout, a pergunta "você é maior de 18 ou tem autorização do responsável?";
  - nada de cronômetro de oferta.

  Peça a um advogado a regra exata de verificação de idade.
- **CDC: direito de arrependimento (art. 49, 7 dias).** A aplicação a conteúdo digital é controversa: há decisões nos dois sentidos ([Conjur](https://www.conjur.com.br/?p=478461), [Idec](https://idec.org.br/consultas/dicas-e-direitos/os-direitos-dos-consumidores-que-realizam-compras-pela-internet?gad_source=1)). A saída simples e mais barata que brigar é uma política própria:
  - reembolso em até 7 dias se a Coleção não foi aberta;
  - assinatura cancelável a qualquer momento;
  - preço total à vista;
  - aviso antes da renovação anual.

  Pelo Decreto 7.962/2013 (comércio eletrônico), o site também precisa mostrar CNPJ, endereço e um canal de atendimento.
- **Lojas de apps, se um dia houver app nativo.** O Google Play cobra 15% em assinaturas ([Google](https://support.google.com/googleplay/android-developer/answer/112622?hl=en-GB)). Depois do acordo com o CADE (em vigor em 2026), a Apple no Brasil cobra 25% + 5% na App Store e cerca de 15% com link para pagamento externo; os números ainda divergem entre as fontes ([Tecnoblog](https://tecnoblog.net/noticias/apple-ainda-podera-cobrar-taxas-no-brasil-veja-aliquotas/), [TecMundo](https://www.tecmundo.com.br/mercado/413975-apple-oficializa-lojas-externas-no-brasil-e-outros-meios-de-pagamento-na-app-store.htm)). **O PWA com Pix e Stripe na web não paga nada disso.** Mais um motivo para continuar na web.
- **Compartilhamento.** O jogo cresce por links no WhatsApp. Um link que leva a um cadeado mata o crescimento. **Regra:** todo link compartilhado abre uma fase jogável. Se a fase for de uma Coleção paga, o link abre a fase gratuita de amostra da Coleção.

### Resposta direta: "350 de 450 grátis" é uma boa divisão?

**Não, pela forma, não pela quantidade.** O problema não é o número 350: é cobrar pela trilha que dá estrelas, títulos e ranking. Duas alternativas melhores:

1. **(Recomendada) A trilha inteira grátis para sempre, e o pago fica ao lado dela.** As 450 fases continuam grátis e a trilha cresce com o tempo (é ela que traz jogadores). Em paralelo, a cada 4 a 6 semanas sai uma **Coleção** de 30 a 50 fases temáticas: a primeira fase é grátis, a Coleção completa custa R$ 7,90 e está incluída no Clube. Em um ano são 8 a 10 Coleções, cerca de 400 fases pagas, sem tirar nada de ninguém.
2. **(Se o dono quiser mesmo bloquear algo) Bloquear só o que é novo e não vale ranking.** Novas fases de "épocas especiais" entram primeiro no Clube e ficam grátis para todos depois de 60 dias. Ninguém perde o que já tinha, e quem paga recebe antes, não recebe mais.

**Como apresentar sem parecer paywall:**
- Nunca escrever "bloqueado" nem mostrar cadeado no meio da trilha. As Coleções ficam numa vitrine própria ("Coleções do Clube"), como figurinhas especiais.
- Texto sugerido: "A trilha é sua, de graça, para sempre. As Coleções são edições especiais para quem quer ir além, e cada uma ajuda a manter o jogo vivo."
- A oferta só aparece nos marcos que já foram combinados: fim de página da trilha, novo título, fim do Desafio. Nunca no meio de uma fase.

---

## 3. Doações ("Apoie o projeto")

**Forma legal.**
- **Doação de verdade** (sem nada em troca) recebida no **CPF**: não paga IR, mas deve ser declarada como rendimento isento (código 14) e paga **ITCMD** estadual, de 2 a 8%. Vários estados isentam valores pequenos ([InfoMoney](https://www.infomoney.com.br/?p=2106417), [Seu Dinheiro](https://www.seudinheiro.com/2019/financas-pessoais/imposto-de-renda-como-declarar-doacoes-efetuadas-e-recebidas/)).
- **Pagamento disfarçado de doação**: se o apoiador ganha algo em troca (selo "Apoiador", figurinha, nome nos créditos), juridicamente é **venda ou serviço**. No CPF vira renda tributável (carnê-leão, até 27,5%). No CNPJ vira receita normal ([Catraca Livre](https://catracalivre.com.br/grana/imposto-de-renda-e-preciso-declarar-pix-recebidos-de-pessoas-fisicas/)).
- **Recomendação:** receber tudo pelo **CNPJ do jogo** e chamar de **"apoio"**, não "doação". O apoio pode dar um selo cosmético de agradecimento, e a contabilidade fica uma só. Não misture com o CPF.

**Ferramentas.**

| Ferramenta | Custo | Pix | Encaixe |
|---|---|---|---|
| **Stripe Payment Link "pague quanto quiser"** | 3,99% + R$ 0,39 no cartão; 1,19% no Pix (por convite) ([Stripe](https://stripe.com/br/pricing)) | Só com convite | **Melhor**: já está integrado e permite dar o selo automaticamente |
| **QR Pix do próprio CNPJ** | 0 em banco digital; bancos grandes cobram Pix de PJ ([Tecnoblog](https://tecnoblog.net/noticias/pix-custa-ate-r-10-para-clientes-pj-no-itau-bb-e-santander/)) | Sim | Bom complemento, mas é manual (não identifica quem apoiou) |
| Apoia.se / Catarse | 13% no apoio mensal ([Remessa Online](https://www.remessaonline.com.br/blog/apoia-se-conheca-a-plataforma-de-crowdfunding-para-o-seu-negocio/)) | Sim | Caro e redundante: o Clube já é a "assinatura de apoio" |
| Ko-fi / Buy Me a Coffee | 0% a 5% + PayPal/Stripe ([Canaltech](https://canaltech.com.br/redes-sociais/como-funciona-o-ko-fi-guia-pratico/), [WPForms](https://wpforms.com/pt-br/best-buy-me-a-coffee-alternatives/)) | Não | Feitos para dólar, não servem para o público brasileiro |

**Como apresentar.** Um link discreto no rodapé e no Perfil: "Apoie o De Cabeça". Uma página curta explica quem faz o jogo e para onde vai o dinheiro (servidor, dados, novas fases), com valores sugeridos de **R$ 5, 10 e 25** ou outro valor. O apoiador ganha o selo "Apoiador" no perfil e nenhuma vantagem de jogo. Nada de pop-up.

---

## 4. Projeção de receita (por mês)

**Premissas** (conservadoras, para ajustar com dados reais):

| Item | Premissa |
|---|---|
| Anúncios | ~20 páginas com anúncio por usuário ativo/mês × RPM R$ 5 ≈ **R$ 0,10 por usuário ativo**. Membros do Clube não veem anúncio |
| Clube | 1% / 1,5% / 2% dos usuários ativos. Metade no plano mensal (R$ 9,90), metade no anual (R$ 6,66/mês): média **R$ 8,30** |
| Cosméticos | 0,5% dos usuários ativos compram 1 item/mês, média R$ 5 |
| Coleções avulsas | 0,5% compram 1 Coleção/mês a R$ 7,90 (não assinantes) |
| Liga Pro | 0,05% dos usuários ativos a R$ 14,90 |
| Apoios | 0,1% dos usuários ativos, média R$ 15 |
| Taxas Stripe | ~7% sobre os pagamentos. Em tíquete pequeno, os R$ 0,39 fixos pesam, e o Billing cobra 0,7% ([Stripe](https://stripe.com/br/pricing)) |
| Impostos | Simples Nacional, Anexo III com fator R: ~6% até R$ 180 mil/ano, ~13% perto de R$ 1,3 milhão/ano. **Validar com contador** |

| Usuários ativos/mês | 5 mil | 50 mil | 300 mil |
|---|---:|---:|---:|
| Anúncios | R$ 500 | R$ 5.000 | R$ 30.000 |
| Clube | R$ 415 (50 assin.) | R$ 6.225 (750) | R$ 49.800 (6.000) |
| Cosméticos | R$ 125 | R$ 1.250 | R$ 7.500 |
| Coleções avulsas | R$ 200 | R$ 1.975 | R$ 11.850 |
| Liga Pro | R$ 30 | R$ 373 | R$ 2.235 |
| Apoios | R$ 75 | R$ 750 | R$ 4.500 |
| **Bruto** | **R$ 1.345** | **R$ 15.573** | **R$ 105.885** |
| (-) Taxas Stripe (~7% dos pagamentos) | -R$ 59 | -R$ 740 | -R$ 5.312 |
| (-) Impostos (6% / 6,2% / 13,2%) | -R$ 81 | -R$ 966 | -R$ 13.977 |
| **Líquido/mês** (antes de servidor e dados) | **~R$ 1.200** | **~R$ 13.900** | **~R$ 86.600** |
| Líquido/ano | ~R$ 14 mil | ~R$ 166 mil | ~R$ 1,04 milhão |

**Como ler a tabela:**
- Com 5 mil usuários, anúncio e Clube rendem quase o mesmo e o total paga o servidor. Com 300 mil, o Clube vale quase o dobro dos anúncios.
- O Clube é o fator que mais muda o resultado: cada 0,5 ponto percentual de conversão com 300 mil usuários vale cerca de R$ 12 mil por mês.
- As Coleções somam cerca de 11% do total e aumentam o valor do Clube.

**Empresa: MEI ou Simples?**
- O limite do MEI é **R$ 81 mil/ano** ([Agilize](https://agilize.com.br/artigos/melhor-cnae-para-programador-2026)). Passar do limite em mais de 20% faz o desenquadramento retroagir ao início do ano.
- A maioria das fontes diz que os CNAEs de software e de desenvolvimento de jogos **não são permitidos no MEI** ([Contabilidade.com](https://contabilidade.com/blog/desenvolvedor-pode-ser-mei-em-2026-veja-como-abrir-cnpj-escolher-o-cnae-ideal-e-pagar-menos-impostos/), [Meu Contador Online](https://www.meucontadoronline.com.br/blog/mei-ti-guia-completo/)). Usar um CNAE "parecido" para caber no MEI pode dar desenquadramento e multa.
- **Caminho provável:** uma **ME no Simples Nacional**, com pró-labore para cair no Anexo III (6% na faixa inicial).
- Pergunte ao contador sobre:
  - o CNAE certo (ex.: 6203-1/00 ou 6319-4/00 para portal ou conteúdo);
  - o fator R;
  - a tributação da receita do AdSense;
  - os efeitos da reforma tributária (CBS/IBS) a partir de 2026–2027.

---

## 5. Plano recomendado

### Agora (lançamento)
- AdSense só nas pausas, como já foi definido. Anúncio não personalizado quando não houver consentimento ou idade conhecida.
- O Clube ganha corpo. **Preço:** R$ 9,90/mês e R$ 79,90/ano, com o anual em destaque ("2 meses grátis"). **Benefícios:** sem anúncios, arquivo completo do Desafio do Dia (os últimos 7 dias continuam grátis), estatísticas, cosméticos exclusivos e selo.
- Cosméticos avulsos de R$ 2,90 a 9,90, sempre itens que a pessoa vê antes de comprar.
- Página "Apoie o De Cabeça" (Stripe "pague quanto quiser" + Pix), com selo de Apoiador.
- Checkout com preço total, cancelamento em 1 clique, reembolso em 7 dias para itens não usados, aviso de renovação, CNPJ no rodapé e a pergunta "maior de 18 ou com autorização do responsável".
- **Confirmar o Pix no Stripe.** Sem ele, metade do público fica sem um meio de pagamento que use.

### Com 1 mil usuários ativos
- Primeira **Coleção** ("Copa de 2002", ~40 fases): a primeira fase grátis, R$ 7,90 avulsa, incluída no Clube, com ranking próprio.
- Medir: conversão do Clube, venda de Coleções e uso do arquivo do Desafio.
- Abrir a empresa (ME/Simples) antes de faturar de verdade. Até lá, ficar em modo teste.

### Com 10 mil usuários ativos
- Uma Coleção a cada 4 a 6 semanas, e testar o **Passe de temporada** (R$ 14,90 por temporada, ou incluído no Clube). Tudo determinístico, sem prêmio aleatório.
- A Liga Pro (R$ 14,90/mês) já existe; divulgar entre quem cria liga com mais de 10 amigos.
- Assinatura de presente no Natal, Dia dos Pais e início do Brasileirão.

### Mais tarde (50 mil+)
- Plano Família ou Grupo do Clube (4 contas, ~R$ 14,90/mês), como o Sporcle e o Duolingo.
- Patrocínio de Coleções ("apresentado por", que já existe na Oficina). Com público grande, rende mais que AdSense.
- App nativo só se o PWA travar o crescimento. Lá a loja fica com 15 a 30%.

### O que NÃO fazer
- Fechar a trilha principal ou qualquer fase que dê estrelas para o ranking geral.
- Vender vidas, energia, dicas, revelar resposta ou pular fase.
- Qualquer coisa aleatória paga: pacote de figurinha surpresa, roleta, baú.
- Anúncio durante a fase, intersticial ou vídeo com recompensa (rende ~R$ 0,01 por vídeo no Brasil e não paga o custo de marca).
- Contagem regressiva falsa, "só hoje" ou oferta fora dos marcos combinados.
- Receber "doação" no CPF com contrapartida.
- Usar Apoia.se ou Catarse (13%) para o que o Clube já faz.
