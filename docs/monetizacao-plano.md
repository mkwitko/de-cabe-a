# Plano de monetização e crescimento do De Cabeça F.C.

Data: 2026-11-11. Junta três fontes: a pesquisa de 10/11 (`monetizacao-pesquisa.md`), um plano gerado pelo ChatGPT e uma checagem na web feita em 11/11. Os relatórios completos da checagem, com links, estão em `docs/pesquisa/`:

- `2026-11-11-juridico-fiscal.md`
- `2026-11-11-concorrentes-receita.md`
- `2026-11-11-crescimento.md`

Grau de confiança: a parte jurídica foi conferida em parte no texto oficial e em parte em fontes secundárias. Os números de mercado são, na maioria, estimativas de terceiros. Nada aqui substitui contador e advogado.

---

## 1. Conclusão em uma página

1. **O problema agora é retenção e distribuição, não preço.** O site tem 2 dias, 12 jogadores e nenhum dado de retorno. Nenhuma fonte de receita funciona antes de milhares de jogadores ativos por mês.
2. **O mercado existe.** futbol-11.com teve cerca de 10 milhões de visitas em 05/2025 e playfootball.games entre 5,5 e 6,8 milhões por mês, com público brasileiro relevante (estimativas Semrush).
3. **Anúncio vai render pouco.** O RPM do AdSense na América do Sul fica entre US$ 2 e 6. As redes que pagam mais exigem 40 a 50% do tráfego em países de língua inglesa. Anúncio paga a infra, não vira negócio.
4. **O dinheiro de verdade vem de três lugares, nesta ordem:** Coleções avulsas, Clube e, com audiência, patrocínio do Desafio do Dia e licenciamento para rádios, portais e clubes.
5. **Três riscos jurídicos pedem ação antes de cobrar qualquer coisa:** anúncio personalizado para menores (ECA Digital), direito de imagem de jogadores no álbum e abertura de empresa no enquadramento certo.

---

## 2. O que fazer nas próximas 4 semanas

Em ordem. Os três primeiros itens aproveitam jogos decisivos já marcados.

| # | Ação | Por quê |
|---|---|---|
| 1 | Compartilhamento em texto, sem spoiler, com quadradinhos coloridos e link direto da fase | Foi o que fez Wordle ir de ~90 para ~300 mil jogadores por dia e Termo passar de 100 mil em 10 dias |
| 2 | Tags OG no HTML bruto de cada fase, com imagem 1200x630 por HTTPS | Sem isso o link não gera prévia no WhatsApp |
| 3 | Abrir o Desafio do Dia | É o único motivo diário para voltar; todos os jogos diários que cresceram têm um |
| 4 | Fases temáticas grátis nos três jogos decisivos: final da Libertadores (28/11), última rodada do Brasileirão (01 ou 02/12), final da Copa do Brasil (06/12) | Assunto pronto nos grupos de WhatsApp |
| 5 | Anúncio não personalizado para todos, até existir checagem de idade | Art. 22 do ECA Digital; aceitar cookies não resolve |
| 6 | Medir D1, D7 e compartilhamentos por fase terminada no PostHog | Sem isso não há como decidir o resto |
| 7 | Estudar o "Bola na História" | Concorrente direto brasileiro: quiz diário, cartão de resultado e ligas por link |
| 8 | Divulgar em Discord e TabNews, não no Reddit | O Reddit remove link de domínio novo automaticamente |
| 9 | Consulta com advogado sobre nome e imagem de jogadores | Ver seção 5 |
| 10 | Consulta com contador sobre SLU no Simples | Ver seção 6 |

Decisão em aberto: o PRODUCT.md diz que o Desafio do Dia não tem sequência de dias ("No streak"). No Duolingo, quem chega a 7 dias seguidos tem 2,4 vezes mais chance de voltar no dia seguinte. Vale rever.

---

## 3. Fases e gatilhos

Avançar exige o número de jogadores e a retenção juntos. As metas de retenção são ponto de partida: não foi encontrado benchmark público de jogos diários na web.

| Marco | Ativar | Gatilho para o próximo |
|---|---|---|
| Agora | Itens da seção 2 | 200 jogadores únicos, D1 medido, compartilhamento funcionando |
| 1 mil MAU | Primeira Coleção paga (R$ 7,90), Ligas por link, lista de espera do Clube | D1 ≥ 20%, D7 ≥ 10%, 10% das fases terminadas geram compartilhamento, primeiras vendas |
| 10 mil MAU | Clube mensal e anual, arquivo do Desafio do Dia, sem anúncios | Conversão ≥ 0,8%, cancelamento mensal < 10% |
| 50 mil MAU | Patrocínio do Desafio do Dia, licenciamento para rádio, portal e clube, cosméticos de preço fixo | Três meses de audiência estável, dois canais de aquisição |
| 100 mil+ MAU | Contratos anuais, mais gente na produção de fases | — |

Ordem para abrir os jogos fechados: Desafio do Dia, Grid 3x3, Ligas por link, Impostor, Rodada semanal, Linha do tempo e Conexões, Escalação e Draft, Oficina por último (exige moderação).

---

## 4. Receita: o que a checagem mudou

**Projeção.** A pesquisa de 10/11 tem um cenário só, equivalente a cerca de R$ 0,28 por jogador ativo por mês. Usar três:

| Cenário | Receita por MAU | 5 mil MAU | 50 mil MAU | 300 mil MAU |
|---|---|---|---|---|
| Conservador | R$ 0,08 | R$ 395 | R$ 3,9 mil | R$ 23,7 mil |
| Base | R$ 0,24 | R$ 1,2 mil | R$ 12,1 mil | R$ 72,5 mil |
| Favorável | R$ 0,40 | R$ 2 mil | R$ 20,1 mil | R$ 120,8 mil |

Valores mensais depois da taxa de pagamento e antes de imposto. Planejar pelo conservador.

**Preço do Clube.** R$ 9,90 por mês fica acima dos pares: Cartola PRO a R$ 4,99, Sporcle e Puzzmo a US$ 3,99. Testar R$ 4,90 a 6,90 contra R$ 9,90 quando o Clube abrir. Anual entre R$ 79,90 e 89,90, decidir no mesmo teste.

**Meio de pagamento.** Stripe cobra 3,99% + R$ 0,39 no cartão, mais 0,7% do Billing. Numa Coleção de R$ 7,90 isso leva cerca de 9%. Pix no Stripe é só por convite, e Pix recorrente em conta brasileira tem informação conflitante na própria Stripe. Para venda avulsa, Pix por outro provedor sai mais barato: Pagar.me 0,99%, AbacatePay R$ 0,80 fixo, Asaas de R$ 0,79 a 1,99.

**Anúncios.** Não foi encontrado número oficial da perda de RPM com anúncio não personalizado. Medir no próprio AdSense. Anúncio com recompensa do Google para jogos na web está em beta fechado, só por candidatura.

**Patrocínio e licenciamento.** Há precedente de desafio diário patrocinado (NYT com DoorDash no Wordle) e de empresas que vendem jogos com a marca do cliente, mas sem preço público. Não foi encontrado caso brasileiro com clube ou rádio. As faixas de preço do plano do ChatGPT (R$ 1.500 a 12.000) não têm base de mercado.

**Liga paga pela organização.** Ideia da segunda rodada com o ChatGPT, e a melhor forma de começar o licenciamento: uma torcida, um podcast ou uma rádio paga por uma liga própria, com link exclusivo, ranking da comunidade, fases temáticas e identidade visual. Os jogadores não pagam nada. Reaproveita as Ligas por link que já existem no código e serve também como canal de aquisição. Primeiro teste: oferecer de graça a 2 ou 3 comunidades pequenas, medir quantos jogadores chegam e só então cobrar. As faixas sugeridas (R$ 300 a 800 por torneio, R$ 750 a 2.000 por mês com marca do cliente) são hipótese, sem base de mercado.

**Anúncio com recompensa.** Vídeo opcional em troca de moldura ou tema de perfil, nunca de estrela, tentativa ou ranking. Depende de aprovação no beta fechado do Google e de parecer sobre o ECA Digital. Adiar até 10 mil MAU.

**Google Ad Manager.** Só faz sentido quando houver patrocínio direto para administrar. Adiar até 50 mil MAU.

**Nunca fazer.** Pop-under, redirecionamento, anúncio entre fases, vídeo obrigatório para jogar, venda de tentativa extra, pacote aleatório pago, venda de dados, outra rede de anúncios agora.

**Venda do negócio.** Wordle foi vendido por mais de US$ 1 milhão com 2,7 milhões de jogadores. Immaculate Grid foi comprado com cerca de 200 mil jogadores por dia útil, valor não divulgado.

**Fora do plano.** Casas de apostas: a MP 1.394/2026 proíbe a aposta de quota fixa e sua publicidade, e o art. 16 §1 alcança conteúdo que "facilite o acesso", o que muito provavelmente inclui link de afiliado. Vigência prorrogada até 04/03/2027.

---

## 5. Riscos jurídicos

| Risco | Situação | Ação |
|---|---|---|
| Anúncio personalizado para menores | ECA Digital (Lei 15.211/2025) em vigor desde 17/03/2026; vale para serviço de "acesso provável" por menores; art. 22 veda perfilamento para publicidade | Não personalizado para todos. Hoje o site personaliza para quem clica "Aceitar" |
| Checagem de idade | Dever exato de um site de quiz de público geral não foi verificado (documentos da ANPD não abriram) | Perguntar ao advogado |
| Figurinha aleatória | O art. 2º, IV define caixa de recompensa como adquirida "mediante pagamento". Figurinha ganha de graça jogando provavelmente fica fora, mas nenhuma fonte oficial trata do caso | Nunca vender pacote aleatório. Vender só item definido, com preço conhecido |
| Nome e imagem de jogadores | Milhares de ações no STJ sobre nome e imagem em jogos (1.055 só contra o Football Manager) e em álbuns de figurinhas, com decisões divergentes. A Súmula 403 presume dano no uso comercial de imagem. Nada encontrado que libere nome e estatística em texto | Consulta com advogado antes de cobrar por qualquer coisa ligada ao álbum. O maior risco está em foto e rosto |
| SEO em escala | A política de spam do Google pune muitas páginas quase iguais | Dado único em cada página de jogador; `noindex` nas combinações ralas |
| WhatsApp | Envio em massa ou automatizado gera banimento | Só compartilhamento iniciado pelo jogador |
| Direito de arrependimento | Art. 49 do CDC: 7 dias em compra pela internet | Fluxo de reembolso pronto antes da primeira venda |

---

## 6. Empresa e imposto: o que levar ao contador

- **MEI provavelmente não serve.** Fontes secundárias dizem que desenvolvimento de jogos não é ocupação permitida. O caminho indicado é SLU no Simples, com CNAE 5821-2/00. A lista oficial de ocupações não foi conferida.
- **Limite do MEI**, se servir: R$ 81 mil em 2026, R$ 110 mil em 2027 e R$ 140 mil em 2028 (LC 238/2026; o valor de 2028 depende das leis orçamentárias).
- **Fator R**: com folha e pró-labore a partir de 28% da receita, a tributação vai para o Anexo III (alíquota inicial de 6%); abaixo disso, Anexo V. Pedir simulação dos dois.
- **AdSense não é exportação de serviço** quando o anúncio é visto no Brasil (Solução de Consulta Cosit 185/2025, lida só em resumo). Não contar com isenção.
- **Nota fiscal**: desde 01/11/2026, ME e EPP do Simples emitem NFS-e pelo Emissor Nacional. A Stripe não emite nota.
- **Reforma tributária**: em 2027 a empresa do Simples pode ficar com CBS e IBS dentro do DAS ou optar pelo regime regular. O prazo da opção não foi confirmado.
- **Página "Apoie"**: o que entra é receita da empresa, tributada como venda.

---

## 7. O que a pesquisa não encontrou

Estas lacunas só fecham com dados próprios ou conversa direta:

- Conversão e cancelamento de assinatura em jogos casuais na web.
- Retenção D1, D7 e D30 de jogos diários na web.
- Preço de licenciamento e de patrocínio no Brasil.
- Contas de quiz de futebol em vídeo curto e quanto elas convertem em visita.
- Regras de autopromoção do r/futebol e como abordar ge, UOL e Trivela.
- Situação da MP das apostas no STF.
