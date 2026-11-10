# Jogos imersivos: design

Data: 2026-11-09. Status: proposta para aprovação.

## Intenção

O dono acha os jogos planos e parecidos entre si. Quer que cada modo seja único, imersivo e emocionante: movimento, profundidade, som, "magia". Não gosta de colunas laterais; cada tela deve usar o máximo do espaço. O visual premium vem antes dos pagamentos (Clube, cosméticos, Liga Pro, presente), porque é ele que vai criar vontade de comprar colecionáveis.

Validação: o protótipo jogável do modo Trajetória (artifact "Passaporte do Craque", cópia em `.superpowers/brainstorm/*/content/prototipo-trajetoria.html`) foi aprovado pelo dono ("ficou muito legal"). Ele é a referência de qualidade e de ritmo para os outros modos.

## A regra dos três momentos

Toda fase passa por três momentos, cada um com seu mundo visual:

1. **Durante (C, o objeto):** a tela inteira vira um objeto do futebol próprio do modo. Sem coluna lateral; o objeto ocupa o palco e a área de palpite fica embaixo, ancorada (celular) ou sobreposta ao pé do objeto (telas largas).
2. **Resultado (B, a transmissão):** corte para uma "transmissão de estádio": refletores acendem um a um, placar de TV, pontos rolando, torcida, tremida proporcional ao resultado. Intensidade escalonada: grande em 3 estrelas e em marcos; discreta em derrota.
3. **Recompensa (A, o álbum):** a figurinha do jogador revelado gira e cola no álbum. Raridade aparece antes do nome (cor e som), depois o nome. Brilho holográfico segue o dedo/mouse/giroscópio.

Sempre há "Pular" na transmissão e na recompensa. Segunda vez no mesmo dia: versão curta (sem a sequência inteira dos refletores).

## O objeto de cada modo

| Modo | Objeto | Interação central | Momento-assinatura |
|---|---|---|---|
| Trajetória | Passaporte de couro | Cada clube é um carimbo | Carimbo batendo com som e tremida (protótipo) |
| Grid 3×3 | Prancheta tática de giz | Acerto = ímã de jogador gruda na casa | Linha completa riscada a giz |
| Linha do tempo | Recortes de jornal antigo num varal | Arrastar recortes para a ordem | Erro amassa o recorte |
| Draft | Pacotes de figurinhas | Cada rodada abre um pacote, cartas viram uma a uma | XI montado aparece no campo em perspectiva |
| Mais ou menos | Telão eletrônico do estádio | Dois jogadores frente a frente | Número revela dígito a dígito; sequência acende refletores |
| Craque misterioso | Dossiê de olheiro | Cada dica arranca uma tarja ou cola um post-it | Carimbo "CONTRATADO" |
| Escalação | Foto posada do time | Silhuetas vazias viram rostos ao acertar | Foto "revelando" |
| Impostor | Fila de reconhecimento | Apontar o intruso | Intruso puxado para fora, som de porta |
| Conexões | Vestiário com armários | Agrupar 4 camisas fecha o armário com o tema | Porta batendo; erro pisca luz vermelha |

Copa, Fantasy, Desafio do Dia e Oficina herdam o objeto do modo que usam; Copa e Fantasy usam a transmissão (B) como palco principal.

## Raridade e álbum (decisão do dono, 2026-11-09)

**Raridade** da figurinha ganha combina três coisas, todas já no banco:

- desempenho na fase (estrelas 1–3);
- fama do jogador (`Player.notabilityTier`);
- dificuldade da fase (`Challenge.difficultyTier`), que cresce ao avançar na trilha.

Oito níveis, inspirados na escada de cartas do FIFA (nomes e arte próprios, nada da EA). Os quatro primeiros saem da fórmula; os quatro de cima também dependem de feitos e eventos que o jogo já tem:

| # | Nível | Acabamento | Como sai |
|---|---|---|---|
| 1 | Bronze | Fosco, cobre | Fórmula: fase fácil, poucas estrelas |
| 2 | Prata | Metálico frio | Fórmula |
| 3 | Ouro | Dourado liso | Fórmula: 3 estrelas, ou jogador famoso em fase média |
| 4 | Ouro brilhante | Dourado com brilho em movimento | Fórmula: 3 estrelas em fase difícil com jogador famoso |
| 5 | Destaque da Rodada | Fundo preto, detalhes dourados | Terminar no top 10 da Rodada (2.7) com aquele jogador na fase |
| 6 | Seleção da Temporada | Azul profundo, borda prateada | Fechar uma Temporada (2.6) no top 3 da sua divisão: escolhe 1 jogador já colado para promover |
| 7 | Ídolo | Creme e dourado envelhecido | Jogador aposentado de fama máxima, 3 estrelas em fase difícil |
| 8 | Lenda | Holográfica arco-íris, segue o dedo | Raríssima: Ídolo + sequência de 7 dias + fase difícil sem erro |

A conta é feita no servidor ao terminar a fase ou ao fechar a Rodada/Temporada, nunca no aparelho. Os pesos e cortes da fórmula ficam com o builder, desde que mantenham esta progressão: fases fáceis rendem sobretudo Bronze e Prata, e cada nível acima é visivelmente mais raro que o anterior. Testes unitários fixam a fórmula. Na revelação, a cor e o som do nível aparecem antes do nome, e quanto maior o nível, mais longa a revelação. Do 5 para cima, a revelação ganha a abertura completa com refletores.

**Álbum** (entra neste projeto):

- Cada fase vencida dá a figurinha do jogador revelado (nos modos com um jogador central; nos modos com vários, o "craque da fase" que o builder escolher pela fama).
- Uma figurinha por jogador; repetir com raridade maior faz **upgrade** (guarda a melhor). Sem troca entre jogadores e sem duplicatas à venda.
- Página `/album` (Perfil): páginas por categoria (posição ou época, decisão do builder), espaços vazios numerados como no Panini, contador "x de y" e por raridade.
- **Vitrine pública** no perfil `/perfil/:apelido`: as melhores figurinhas do jogador, para mostrar aos outros. Respeita o opt-in de perfil público que já existe.
- Isso exige uma tabela nova, uma migration e rotas novas (`GET /v1/me/album`, álbum no perfil público), com contratos em `packages/contracts`. Conquistas atuais continuam separadas.

## Restrições

- **Sem dependência nova.** CSS (3D transforms, keyframes) + Web Audio sintetizado, como o protótipo e o `src/lib/sound.ts` atual. Sem three.js, sem lib de animação.
- **Celular primeiro (360px), 60 fps em aparelho médio.** Animar só `transform` e `opacity`; nada de `filter` pesado em loop.
- **`prefers-reduced-motion`:** sem tremida, sem giro; transições viram cortes curtos.
- **Som:** continua desligado por padrão com o toggle atual em Perfil › Conta. Proposta (decisão do builder, ver abaixo): no primeiro acerto, oferecer "Ligar som?" uma vez.
- **Vibração:** reusar `src/lib/haptics.ts` e a preferência existente.
- **Acessibilidade:** objetos são decoração; o estado do jogo (tentativas, acerto, erro) continua anunciado em texto para leitor de tela; foco visível; alvos ≥ 44px.
- **Regras de jogo não mudam.** A API e os contratos só ganham o necessário para raridade e álbum (seção acima); o resto é apresentação sobre as páginas em `apps/web/src/games/*`.
- **Fim de fase compartilhável em texto** (estilo Wordle) mantido e ajustado ao objeto de cada modo.
- **Anti-"visual de IA":** sem brilho colorido difuso, sem gradiente roxo-azul, sem emojis como ícone; materiais reais (couro, papel, giz, metal do telão). Paleta e tipografia do `apps/web/DESIGN.md` continuam: Archivo, verde do gramado, amarelo da capa do álbum como único acento.

## Fora do escopo (agora)

- Loja, pagamentos, cosméticos à venda (próximo projeto). Mas o desenho já prevê onde entram: acabamentos da figurinha (holo, ouro, prata), temas do objeto (passaporte de couro vs. clássico), sons de torcida.
- Pacote pago sorteado: proibido (ECA Digital, Lei 15.211/2025, art. 20, a confirmar no DOU). "Abrir pacote" só para o que foi ganho jogando.
- Nova arte desenhada à mão ou fotos de jogadores reais além das já usadas.

## Ordem de entrega

Um PR por modo, cada um verificável sozinho:

1. Base compartilhada: palco em tela cheia, componente de transmissão (B), revelação da figurinha (A), sons novos em `sound.ts`, modo curto e "Pular". Mais a raridade no servidor, a tabela do álbum, as rotas e a página `/album` com a vitrine no perfil.
2. Trajetória (passaporte), a partir do protótipo.
3. Grid, Mais ou menos, Craque misterioso (mais jogados primeiro, a confirmar pelas métricas).
4. Os demais modos.

## Decisões tomadas pelo Claude (revisáveis)

- **Protótipo:** cópia versionada em `docs/superpowers/specs/assets/2026-11-09-prototipo-trajetoria.html` (tempos, sons e estrutura de referência).
- **"Pular" e versão curta:** por aparelho (localStorage, chave data + modo). Sem mudança de API. Desafio do Dia conta como um modo próprio.
- **Telas existentes:** B e A entram antes do `LevelEnd` atual; Top 10, próxima fase e compartilhar continuam lá. O formato do texto compartilhado não muda neste projeto.
- **Linha do tempo:** mantém a interação atual (tocar para trocar) como caminho principal e acessível; arrastar é extra.
- **Navegadores:** Safari iOS 16+ e Chrome Android dos últimos 2 anos. Holo segue dedo/mouse; giroscópio é opcional e nunca pede permissão.
- **Copa, Fantasy, Oficina:** ficam para depois dos 9 modos.
- **Ordem do item 3:** Grid, Mais ou menos, Craque misterioso, nessa ordem.

## Decisões deixadas ao builder

- Estrutura dos componentes compartilhados e onde ficam.
- Duração exata de cada animação (referência: protótipo).
- Desenho fino de cada objeto, desde que respeite a tabela acima e as restrições.
