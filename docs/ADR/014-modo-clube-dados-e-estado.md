# ADR-014 — Modo Clube: pacote de dados imutável e estado da carreira em diferenças

Status: aceito pelo dono em 2026-11-13 (specs aprovadas, MC-010). **Em aberto**: a forma de guardar o estado do mundo (item 3, parte `ClubCareerWorld`) não está decidida; depende da medição MC-201 (item 7). Estão decididos e não dependem dessa medição: itens 1, 2, 4, 5, 6 e as linhas próprias de partida, livro-caixa, eventos e história.

## Contexto
Uma carreira tem mais de cem clubes e alguns milhares de jogadores profissionais (o número vem do pacote) e um mundo de base que cresce a cada temporada. Copiar tudo em linhas de banco para cada carreira multiplica o banco por carreira; guardar tudo num único documento obriga a ler e gravar centenas de quilobytes a cada toque.

## Decisão
1. **Pacote de dados** (`apps/api/club-packs/<id>.json`, validado por zod): clubes, elencos, atributos, cidades, parâmetros de competição. Imutável depois de publicado; tem `id`, `versão`, `checksum` e manifesto de origem por campo (`importado`, `gerado`, `ajustado à mão`). Carregado em memória na subida da API.
2. **Importador genérico**: lê CSV ou JSON no formato do pacote, normaliza, deduplica e emite relatório de qualidade. O importador não conhece fornecedor; a origem dos arquivos que entram é decisão e responsabilidade do dono. O assistente não extrai nem converte bases de terceiros.
3. **Estado da carreira = diferenças sobre o pacote.** Três partes:
   - `ClubCareer` (linha): dono (sessão), pacote, versão da engine, semente, modo de início, temporada, dia, clube. Sem saldo de caixa (item 6b).
   - `ClubCareerWorld` (um documento JSON comprimido por carreira): só o que mudou em relação ao pacote (atributos evoluídos, transferências, tabelas, jogadores gerados, estado dos outros clubes). Lido e gravado só ao avançar o calendário.
   - Linhas próprias para o que o usuário consulta e altera a todo momento e para o que precisa de auditoria: partidas do usuário (`ClubMatch`: semente, comandos, placar, estatísticas), lançamentos financeiros (`ClubLedgerEntry`), eventos e escolhas (`ClubEvent`).
4. **Mundo da base latente**: cidades e escolinhas são parâmetros do pacote. Um garoto só vira registro quando um olheiro o observa; o identificador sai de `hash(semente da carreira, cidade, safra, índice)`, então o mesmo garoto reaparece igual.
5. Toda escrita que mexe em caixa ou em resultado roda em transação, com chave de idempotência por ação.
6. **Revisão 2 (2026-11-13).** (a) O pacote público tem jogadores reais nas quatro divisões nacionais; elenco real incompleto não é completado com jogador gerado, e o pacote só publica acima do critério de cobertura (`03-JOGADORES-E-BASE.md` §1.6). Pacote real e pacote fictício de desenvolvimento são arquivos separados, com `kind: 'real' | 'dev'`. (b) O saldo de caixa não é guardado em lugar nenhum: é a soma dos lançamentos liquidados (`01-ARQUITETURA.md` §5). (c) Comissão, vínculos, departamentos e governança fazem parte do pacote e do estado da carreira. (d) Competições e regulamentos são uma parte do pacote versionada por temporada (ADR-016). (e) O número de clubes é o que o pacote trouxer.

7. **Revisão 3 (2026-11-13).** A forma de guardar o mundo (documento único, híbrido relacional ou documento partido por domínio) fica condicionada à medição da tarefa MC-201 (`01-ARQUITETURA.md` §5.2). Os itens 3 e 6b continuam valendo para dinheiro, partidas, eventos e história. Procedência detalhada por campo fica no processo de importação, fora do pacote publicado (`03-JOGADORES-E-BASE.md` §1.7). Personalidade, ocultos e traços de jogador real são campos de avaliação do pacote, com origem e confiança, por decisão do dono (`03` §1.8); a regra anterior de sorteá-los em faixas neutras foi revogada no mesmo dia.

## Consequências
- Atualizar elencos = publicar pacote novo; carreira antiga não muda.
- O documento do mundo tem teto: medir tamanho após 30 temporadas simuladas; acima de 2 MB comprimido, partir por divisão.
- Consultas entre carreiras (ranking de quem subiu mais rápido) usam só `ClubCareer`, nunca o documento.

## Alternativas
- Linhas por jogador e por carreira: consultável, mas milhares de linhas por carreira e escrita em massa a cada dia de jogo.
- Documento único com tudo: simples, mas leitura e gravação pesadas em cada toque e sem auditoria financeira.
