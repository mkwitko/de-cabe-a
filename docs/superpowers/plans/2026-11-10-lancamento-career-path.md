# Lançamento Career Path: plano

> Executar com superpowers:subagent-driven-development. Um implementador por tarefa, em sequência, na branch `feat/launch-career-path`.

**Spec:** `docs/superpowers/specs/2026-11-10-lancamento-career-path-design.md` (autoridade). Restrições globais: as da spec e de `2026-11-09-jogos-imersivos-design.md`.

## Restrições globais

- Sem dependência nova. Celular primeiro (360px). Animar só transform/opacity; `prefers-reduced-motion` respeitado. Alvos ≥ 44px, texto ≥ 12px, contraste AA nos dois temas. pt-BR. Sem gradiente roxo-azul, brilho difuso ou emoji como ícone.
- Verificação por tarefa: `pnpm typecheck`, `pnpm lint`, `pnpm --filter web test`, testes da API tocada (`pnpm --filter @decabeca/api exec vitest run` e int quando mexer na API), `npx prettier --check` nos arquivos tocados. Screenshot 360x640 e 1280x800 no dev server já rodando (web http://localhost:5173, API :3000) com Playwright de `apps/web` (script temporário dentro de `apps/web`, apagado depois). Não iniciar nem matar servidores. Não rodar e2e local (portas ocupadas); ajustar seletores de e2e por grep.
- Commits com trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem push, sem merge.

## Review focus

1. E2E dos modos fechados: devem continuar rodando no CI (flag liga tudo no e2e).
2. Tema claro: nenhum texto claro sobre fundo claro (tokens em todo lugar, inclusive objetos e páginas novas de ontem).
3. Consentimento: PostHog, Sentry replay e anúncios não carregam antes do "Aceitar".
4. Exclusão de conta: apaga ou anonimiza tudo do usuário (tentativas, figurinhas, ligas, sessões) numa transação; sessão encerrada.
5. Link "próxima fase": nunca aponta para fase bloqueada ou inexistente (trilha vazia, tudo concluído).

## Tarefas

### 1. Flag de lançamento, "Em breve" e navegação
- `apps/web/src/lib/launch.ts`: `LAUNCHED` (modos e páginas abertos: CAREER_PATH, álbum, perfil, conta, legais, como jogar). `import.meta.env.VITE_LAUNCH_ALL === '1'` abre tudo; definir isso no `webServer` do Playwright (`apps/web/playwright.config.ts`) para o e2e dos modos fechados continuar valendo.
- Rotas fechadas renderizam `ComingSoonPage` (capa do modo via `ModeCover`, selo "Em breve", botão "Jogar Career Path"). Sem 404.
- Navegação inferior e do topo: Jogar · Álbum · Perfil (com tudo aberto, a navegação atual).
- Teste unitário de `launch.ts` (fechado/aberto/flag).

### 2. Marca De Cabeça F.C.
- Nome "De Cabeça F.C." e chamada "Minijogos de futebol" em `index.html` (title, og, JSON-LD, apple title), `manifest.webmanifest`, cabeçalho, prerender/SEO e e-mails da API (grep "De Cabeça").
- Escudo próprio em SVG inline (componente `Crest`), usado no cabeçalho e na home. Ícones PNG ficam (sem ferramenta de imagem).

### 3. Home limpa e card do Career Path
- Home: topo com marca + **Entrar**/avatar; palco com `CareerPathCard` grande (capa de passaporte: nome, regra em 1 linha, título atual, barra de progresso, estrelas, figurinha mais rara se houver; botão "Jogar fase N" para a próxima fase real, "Continuar" se em andamento); faixa compacta rolável "Em breve" com capas pequenas dessaturadas; rodapé com links legais.
- `CareerPathCard` também no topo da trilha.
- Helper `nextLevel(track)` com teste (trilha vazia, tudo concluído, fase em andamento).

### 4. Escada de 10 títulos
- `packages/engine/src/stars.ts` `TITLES`: Peneira 0, Base 10, Reserva 25, Titular 50, Capitão 100, Craque 175, Ídolo 275, Lenda 400, Imortal 600, Rei da Bola 900. Atualizar `stars.test.ts`, `TITLE_LADDER` no web e usos na API (ranking, progression, account). Conquistas por estrelas ficam como estão.
- Cada título: cor e distintivo (CSS/SVG) e moldura do perfil.
- Tela da escada (componente `TitleLadder`, no perfil/estatísticas): trilho vertical com os 10 degraus, o atual destacado, "faltam N estrelas para X".
- Promoção no fim de fase: se o título subiu com a fase, a transmissão mostra a faixa "PROMOVIDO A <título>" (comparar título antes/depois no web com as estrelas; sem mudança de API se os dados já vierem; senão, campo mínimo no contrato).

### 5. Tema claro e escuro
- Tokens claros e escuros completos em `index.css` (campo de dia no claro). Escolha Sistema/Claro/Escuro (`lib/theme.ts`, localStorage, `data-theme` no `<html>`, script inline no `index.html` sem flash). Controle no cabeçalho e na Conta.
- Varrer páginas e objetos por cores fixas que quebram no claro.

### 6. Som e música
- 2–3 faixas royalty-free com licença verificável (CC0 de preferência; registrar URL de origem, autor e licença em `apps/web/public/audio/CREDITS.md` e na página de créditos/privacidade), `.mp3` ou `.ogg`, ≤ 3 MB cada, em `apps/web/public/audio/`: menu e fase.
- `lib/music.ts`: tocar/pausar com fade, troca menu↔fase por rota, pausa com aba oculta, só após interação. Preferências separadas Música e Efeitos (migrar a chave atual de som para Efeitos). Controles no cabeçalho e na Conta. Oferta única "Ligar som?" na primeira fase.
- Revisar efeitos do Career Path (toque, acerto, erro, carimbo, estrelas, figurinha, promoção).

### 7. Fluxo do Career Path
- Trilha: caminho de carimbos no passaporte, fase atual centralizada ao abrir, bloqueadas discretas.
- Fim de fase: uma tela limpa (estrelas, figurinha, progresso no título, "Próxima fase" principal; compartilhar secundário). Ranking/Top 10 só se aberto.
- Primeira vez: tutorial de 3 passos sobreposto à fase 1, pulável, salvo no aparelho.
- Como jogar: só Career Path, 3 passos ilustrados, botão para a próxima fase do jogador (`nextLevel`), FAQ dobrado.
- Estados de erro e vazio no mesmo acabamento.

### 8. Perfil e login visíveis
- Botão Entrar sempre visível (cabeçalho desktop; topo da home e do perfil no celular).
- Convite único "Salve seu progresso" após a primeira vitória como visitante.
- Perfil: carteirinha de sócio com título e moldura, `TitleLadder`, vitrine do álbum, estatísticas do Career Path; login/conta em destaque se visitante.

### 9. LGPD e cookies
- Páginas: Privacidade revisada (dados, finalidade, base legal, retenção, direitos, contato do encarregado, créditos de música e fotos), Termos de uso, Cookies (lista: sessão necessária, análise, anúncios).
- Banner de consentimento (Aceitar / Recusar não essenciais / Configurar), escolha salva e editável no rodapé e na Conta. PostHog, replay do Sentry e anúncios só iniciam com consentimento (erros do Sentry sem replay são interesse legítimo; documentar).
- API: `GET /v1/me/export` (JSON com conta, tentativas, figurinhas, ligas) e `DELETE /v1/me` (apaga ou anonimiza tudo numa transação e encerra a sessão), com testes de integração. Conta: botões "Baixar meus dados" e "Excluir conta" (confirmação digitando o apelido).

### 10. Revisão final
- Revisão da branch inteira (modelo mais capaz) contra a spec; uma rodada de correções; PR.
