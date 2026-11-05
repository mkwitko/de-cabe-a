# ADR-004 — Guest sessions por cookie assinado, sem autenticação no MVP

Status: aceito; método de cadastro pendente.

## Contexto
Primeira partida deve começar sem cadastro. Progresso precisa persistir entre visitas no mesmo dispositivo. Sem dados pessoais.

## Decisão
No primeiro request, API cria `GuestSession` com token aleatório de 256 bits; grava só o hash; envia cookie `dc_session` HttpOnly, Secure, SameSite=Lax, expiração 400 dias. Todo recurso de jogo é escopado por sessão. Rate limit por IP na criação. Cadastro (RF-10) vincula `GuestSession.userId` quando existir; método não decidido.

## Alternativas
- localStorage + bearer: vulnerável a XSS e mais código no cliente; rejeitado.
- Fingerprint: dado pessoal, frágil; rejeitado.
- JWT desde o início: sem benefício sem contas.

## Consequências
Progresso perdido ao limpar cookies (aceito e informado na tela de Stats). Troca de dispositivo exige cadastro futuro.
