# Home: carrossel imersivo

Data: 2026-11-10. Pedido do dono: "cada card bem legal, não precisa mostrar tantos de uma vez; carrossel mostrando 1 ou 2 por vez, bem imersivo". Continua o design de `2026-11-09-jogos-imersivos-design.md` (objetos por modo, sem colunas laterais, tela cheia).

## O que muda

O `GameCarousel` em `apps/web/src/App.tsx` hoje mostra cards de ~82% da largura com uma arte pequena (`GameArt`, h-32). Passa a ser um palco:

- **1 card por vez no celular** (≈88% da largura, a borda do próximo aparece), **2 no desktop** (≥1024px), centralizados. Altura: o card ocupa a maior parte da tela visível abaixo do topo da home (mínimo ~420px no celular).
- **Cada card é a "capa" do objeto do modo** (tabela da spec de 09/11): Trajetória = capa de passaporte de couro; Grid = prancheta de giz; Linha do tempo = jornal antigo; Draft = pacote de figurinhas lacrado; Mais ou menos = telão do estádio; Craque misterioso = pasta de olheiro "confidencial"; Escalação = foto posada do time; Impostor = parede de reconhecimento; Conexões = porta de armário. Feito com CSS + `GameArt` ampliada como ilustração central, materiais reais (couro, papel, giz, metal). Nada de brilho colorido difuso.
- **Profundidade ao rolar:** perspectiva no trilho; o card central em escala 1 e plano; vizinhos giram levemente em Y (±12°) e encolhem (0.9) conforme a distância do centro, calculado no scroll (rAF, só `transform`/`opacity`). Arte com parallax leve dentro do card.
- **Conteúdo do card:** nome do modo grande (condensado), regra em 1 linha, progresso (`x/y fases`, estrelas), e um botão grande "Jogar fase N" (ou "Continuar"). Desafio do Dia continua com o seu bloco próprio acima.
- **Navegação:** swipe/scroll com snap; setas nas laterais no desktop; pontos (1 por modo) embaixo, clicáveis; teclado (←/→ quando o trilho tem foco). Som `tap` e vibração curta ao assentar num card novo (respeitando as preferências).
- **Reduced motion:** sem giro nem parallax; só snap.

## Restrições

Sem dependência nova. Telefone primeiro (360px), sem rolagem horizontal da página (só do trilho). Acessível: cada card é um link/botão com nome; pontos com `aria-label` "Ir para <modo>"; `aria-roledescription="carrossel"` na região. Textos em pt-BR. Os e2e da home continuam passando (ajustar seletores se necessário).
