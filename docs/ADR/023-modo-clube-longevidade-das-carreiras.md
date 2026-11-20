# ADR-023 — Modo Clube: longevidade das carreiras

Status: proposto. Motivo: depois do lançamento, cada atualização de dados trocaria o pack e deixaria sem abrir toda carreira já iniciada.

## Decisão

1. **Uma carreira fica no pack e nas regras em que nasceu.** O servidor guarda `packId` e `packVersion` (checksum) da carreira; o navegador baixa exatamente esse pack.
2. **Carreiras novas usam o pack mais recente.** Só o pack corrente aparece nas opções de início.
3. **Todo pack publicado continua disponível por id e checksum.** A API arquiva o pack corrente ao subir (`apps/api/club-packs/archive/<id>.<checksum>.json.gz`, pasta persistente na VM, levada de um release ao outro) e serve `/packs/<id>.<checksum>.json` (enxuto, cache imutável) para qualquer pack arquivado. O edge roteia `/packs/*` para a API. Nunca apagar arquivos da pasta enquanto houver carreira apontando para eles.
4. **Mudança de regras que alteraria resultados incrementa `CAREER_RULES_VERSION`.** Fotografias antigas continuam carregando; nunca são reexecutadas.
5. **Migração explícita só quando for inevitável** (um campo do save que a versão nova exige): função pura de `v` para `v+1`, com teste que carrega uma fotografia real da versão anterior.
6. **Cópia de segurança do jogador.** A diretoria baixa a carreira em um arquivo (`.json.gz` com `packId`, `packVersion`, versão das regras, semente e fotografia) e restaura de um arquivo. O servidor valida tamanho, esquema, a existência do pack e que a versão das regras não seja mais nova que a dele; restaurar substitui a carreira em andamento.

## Consequências

- O custo é disco: alguns MB por pack publicado.
- Um pack só some se alguém apagar o arquivo do arquivo morto; nesse caso a carreira não abre e a restauração responde que os dados não estão mais disponíveis.
