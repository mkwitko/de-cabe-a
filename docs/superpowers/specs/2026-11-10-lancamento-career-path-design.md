# Lançamento: De Cabeça F.C., só Career Path, perfeito

Data: 2026-11-10. Decisão do dono: lançar logo, com pouca coisa e tudo lapidado. Começa com o Career Path, e ele tem que ser "altamente premium, mágico e imersivo em todos os aspectos".

## O que lança

| Aberto | Em breve (aparece, não abre) |
|---|---|
| Career Path (trilha, fases, fim de fase, figurinha) | Football Grid, Impostor, Linha do tempo, Mais ou menos, Craque misterioso, Draft, Conexões, Escalação |
| Álbum de figurinhas e vitrine no perfil | Modo Carreira, Copa dos Sonhos, Oficina |
| Perfil, conta, login | Desafio do Dia, Ranking, Ligas, Fantasy |
| Como jogar, Privacidade, Termos, Cookies | |

- "Em breve" = um flag único `LAUNCHED` no web (lista de modos/páginas abertos). Rotas fechadas mostram uma tela "Em breve" com o objeto do modo, não 404. Nada é apagado: reabrir é mudar a lista.
- O código dos modos fechados continua e os testes deles também.

## Marca

- Nome: **De Cabeça F.C.**; chamada: **Minijogos de futebol**. Título da página, manifest, og, JSON-LD, cabeçalho e e-mails.
- Escudo simples (CSS/SVG próprio, sem cópia de clube real) usado no cabeçalho e no ícone.

## Home (menos poluída)

- Topo: marca + botão **Entrar** (ou avatar) sempre visível.
- Palco: um card grande do Career Path (a capa de passaporte) com progresso, título atual e botão "Jogar fase N" (a próxima fase de verdade).
- Abaixo: faixa compacta "Em breve" com as capas dos outros modos (pequenas, dessaturadas, selo "Em breve"), rolável.
- Nada mais na primeira tela. Navegação inferior: **Jogar · Álbum · Perfil**.

## Card de apresentação do jogo

O card do Career Path (home e topo da trilha) vira a capa de um passaporte de couro com: nome, regra em uma linha, título atual na escada, barra de progresso, estrelas, e a figurinha mais rara ganha. Toque abre a trilha; botão principal abre a próxima fase.

## Escada de títulos (ampliada)

Hoje são 4 títulos (Reserva 0, Titular 15, Craque 60, Lenda 150). Passa a 10, cobrindo os 1.200 estrelas do Career Path, cada um com cor, ícone de distintivo e uma recompensa visual (moldura do perfil):

Peneira 0 · Base 10 · Reserva 25 · Titular 50 · Capitão 100 · Craque 175 · Ídolo 275 · Lenda 400 · Imortal 600 · Rei da Bola 900.

- A conta fica no engine (`titleFor`) e o web espelha (`TITLE_LADDER`); conquistas que citam títulos são ajustadas. Quem já tem estrelas cai no título certo automaticamente.
- Tela própria da escada (no perfil): trilho vertical com os 10 degraus, o atual destacado, "faltam N estrelas para X", e o que cada degrau desbloqueia. Subir de título no fim de fase tem cerimônia própria (transmissão com faixa "PROMOVIDO A …").

## Fluxo do Career Path (revisão completa)

Trilha → fase → transmissão → figurinha → fim de fase → próxima fase. Revisar cada tela para ser imersiva e sem ruído:

- Trilha: caminho de carimbos no passaporte; a fase atual em destaque e centralizada ao abrir; fases bloqueadas discretas.
- Fase: passaporte em tela cheia (já existe); área de palpite ancorada; dicas e erros com som e vibração.
- Fim de fase: uma tela só e limpa: estrelas, figurinha, progresso no título, "Próxima fase" como ação principal; compartilhar e ranking secundários.
- Primeira vez: tutorial de 3 passos sobre a própria fase 1 (sobreposto, pulável), não um texto.
- Erros de rede e estados vazios com o mesmo acabamento.

## Como jogar

Só o Career Path: 3 passos ilustrados (o passaporte, o palpite, as estrelas), uma linha cada, e um botão que leva à **próxima fase do jogador** (não sempre à fase 1). FAQ curto dobrado abaixo.

## Som e música

- Música de fundo: 2–3 faixas royalty-free (CC0 ou licença Pixabay), em `apps/web/public/audio/`, ~1–3 MB cada, com crédito na página de créditos/privacidade. Uma para menus, uma para dentro da fase; troca com fade.
- Efeitos: os sintetizados atuais, revisados e completos (toque, acerto, erro, carimbo, estrelas, figurinha, promoção).
- Controles separados: **Música** e **Efeitos**, no cabeçalho (ícone) e na conta. Padrão: desligados até o primeiro toque; na primeira fase, oferta única "Ligar som?". Respeitar `prefers-reduced-motion` não desliga som; respeitar aba oculta (pausa).

## Tema claro e escuro

- Tokens claros e escuros para tudo (hoje só há um ajuste parcial em `prefers-color-scheme`). Escolha em Conta e no cabeçalho: Sistema / Claro / Escuro, salva no aparelho.
- O tema claro é um campo de dia (verde claro, papel creme), não um fundo branco genérico. Os objetos (passaporte, figurinha) mantêm seus materiais nos dois temas.

## Perfil e login

- Botão **Entrar** sempre visível no cabeçalho (desktop) e no topo da home/perfil (celular).
- Após a primeira fase vencida como visitante: convite "Salve seu progresso" (criar conta), uma vez, dispensável.
- Perfil: carteirinha de sócio com título, escada, vitrine do álbum e estatísticas do Career Path; login/conta em destaque se visitante.

## LGPD e cookies

- Páginas: **Privacidade** (revisada: dados coletados, finalidade, base legal, retenção, direitos do titular, encarregado/contato), **Termos de uso**, **Cookies** (lista do que é usado: sessão necessária, análise, anúncios).
- Banner de cookies na primeira visita: "Aceitar", "Recusar não essenciais", "Configurar". Análise e anúncios só carregam após consentimento; a escolha fica salva e pode ser mudada no rodapé/Conta.
- Conta: exportar meus dados e excluir conta (se já existirem, só expor bem; se não, entram neste projeto).
- Rodapé discreto com links legais na home e na conta.

## Restrições

As de `2026-11-09-jogos-imersivos-design.md` continuam (sem dependência nova, celular primeiro, 60 fps, só transform/opacity, reduced motion, alvos ≥ 44px, texto ≥ 12px, AA, materiais reais, sem visual de IA). E2E existentes ajustados aos modos fechados.

## Decisões do Claude (revisáveis)

- Navegação inferior Jogar · Álbum · Perfil; Desafio e Ranking saem da barra até reabrirem.
- Nomes e cortes da escada de 10 títulos acima.
- Música só depois de um toque (regra dos navegadores) e desligada por padrão.
- "Em breve" por flag no web; a API continua servindo tudo.
