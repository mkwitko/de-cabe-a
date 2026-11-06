# SEO e busca por IA

## O que existe
- **Páginas do site pré-geradas no build** (`apps/web/scripts/prerender.mjs`, textos em `apps/web/src/seo-pages.json`): home, Career Path, Grid, Impostor, ranking e `/como-jogar`, cada uma com título, descrição, canonical, Open Graph e texto legível sem JavaScript. Dados estruturados: `WebSite` e `VideoGame` na home, `FAQPage` em `/como-jogar`.
- **Páginas de jogador** (`/jogador/<nome>-<qid>`, renderizadas pela API): resposta direta no topo (o que buscadores e IAs citam), tabela de clubes/anos/jogos/gols, **conteúdo próprio** (desafio "em qual destes nunca jogou?" e, com 5+ partidas, quanto os jogadores do De Cabeça acertam aquele jogador), colegas de clube (links internos), `Person` + `BreadcrumbList`, fonte.
- `/jogadores` (índice A–Z), `/sitemap.xml`, `/llms.txt` (para assistentes de IA), `robots.txt`.

## Cuidado com páginas em massa
O Google rebaixa sites com muitas páginas geradas de pouco valor, e o AdSense recusa "conteúdo de baixo valor". Por isso:
- **Só entram no sitemap e no índice** jogadores famosos (T1/T2) e jogadores que estão em alguma fase publicada (hoje ~850). Os demais existem, com `noindex`.
- Ampliar aos poucos, olhando o Search Console (páginas indexadas, cliques): mudar `INDEXABLE_TIERS` em `apps/api/src/modules/seo/seo.routes.ts`.
- Anúncios ficam nas pausas dos jogos (ADR-012), não como foco das páginas de jogador.

## Depois do domínio no ar
1. **Google Search Console**: propriedade de domínio `decabecafc.com.br` (registro TXT no Cloudflare), enviar `https://decabecafc.com.br/sitemap.xml`.
2. **Bing Webmaster Tools**: importar do Search Console e enviar o sitemap. O Bing alimenta a busca do ChatGPT e do Copilot.
3. Acompanhar Core Web Vitals no Search Console (Lighthouse local: desempenho 92–95, SEO 100).
