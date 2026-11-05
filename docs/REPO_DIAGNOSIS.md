# Diagnóstico do Repositório (Fase 1)

Data: 2026-11-04. Diretório: `~/Documentos/Coding/futuro/de-cabeca`.

## 1. Estrutura atual

```text
de-cabeca/
└── .remember/        # estado do plugin "remember" do Claude Code (não é código do produto)
```

Nenhum arquivo de produto. Sem `.git`, sem `package.json`, sem lockfile, sem README, sem CI, sem Docker, sem `.env.example`.

## 2. Tecnologias encontradas

Nenhuma no repositório. Toolchain da máquina (observado):

| Ferramenta | Versão |
|---|---|
| Node.js | 24.12.0 |
| npm | 11.6.2 |
| pnpm | 10.26.1 |
| PostgreSQL (cliente/servidor local) | 16.15 |
| Docker | 29.1.3 |

## 3. Projetos relacionados (`futebol-app`, `futebol-back`, `futebol-web`)

Não existem no disco. Só restam caches de sessão do Claude Code apontando para `futuro/futebol/futebol-back` e `futuro/futebol/futebol-app`, mais memórias de projeto. Pelas memórias, esse projeto ("Camisa7") era **outro produto**: rede social de futebol amador (peladas, carta FIFA, quadras, pagamentos PIX). Stack: Fastify + Zod + Prisma + PostgreSQL 16 no backend, Expo no app, Vite no web, tipos via OpenAPI → Kubb.

Conclusão: nada reutilizável diretamente. Única herança útil: a convenção de stack (Fastify/Zod/Prisma/Vite) coincide com a stack preferencial deste prompt, então o autor já tem familiaridade.

## 4. Funcionalidades existentes / componentes reutilizáveis

Nenhum.

## 5. Problemas, débitos, lacunas de testes, riscos de compatibilidade

Não aplicável (greenfield). Riscos de compatibilidade a observar ao criar o projeto:

- Node 24 é recente; fixar `engines.node >= 22` e testar no CI com 22 e 24.
- Prisma 6.x com Node 24: verificar na implementação (sem evidência de problema, mas não testado aqui).
- Tailwind v4 muda configuração (CSS-first). Decidir versão no primeiro slice.

## 6. Recomendação de continuidade

Iniciar monorepo pnpm do zero conforme `ARCHITECTURE.md`. Primeiro slice = fundação (workspace, lint, tsconfig, Prisma vazio, CI, docker-compose Postgres). Sem migração de código legado.
