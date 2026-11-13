# Modo Clube — competições, calendário e operações

Data: 2026-11-13, revisão 4. Base: ADR-016. Formatos reais e fontes: `docs/pesquisa/modo-clube/05-competicoes-e-calendario.md`. Legenda: FATO, HIPÓTESE, DECISÃO, PARÂMETRO, NÃO PESQUISADO.

## 1. Princípio

Competição é dado do pacote, versionado por temporada. Um interpretador único gera jogos, tabelas, chaves e destinos. Nenhum código conhece "Série A" ou "38 rodadas".

## 2. Modelo

```ts
interface Competition {
  id: string; name: string; season: number;
  scope: 'nacional' | 'estadual' | 'regional' | 'continental'; tier?: number;
  category: 'profissional' | 'sub-20' | 'sub-17' | 'sub-15' | 'futsal';
  priority: number;                       // quem cede a data em conflito
  phases: Phase[];
  registration: { maxSquad: number; maxForeign?: number; ageLimit?: number; windows: DateRange[]; reRegistrationAfterPhase?: string };
  matchRules: { subs: number; subWindows: number; extraTime: boolean; penalties: boolean; videoReferee: boolean; suspensionAfterYellows: number };
  money: { tv?: TvFormula; prizes: Prize[]; travelAid?: number };
  financialRules?: FinancialRules;        // `04` §4.5
  licence?: LicenceRules;                 // `06` §2.4
}
interface Phase {
  id: string; kind: 'liga' | 'grupos' | 'mata-mata' | 'final';
  entrants: EntrantRule[];                // lista fixa | posição em fase | posição em outra competição | ranking | campeão de
  format: LeagueFormat | GroupFormat | KnockoutFormat;
  tieBreakers: TieBreaker[];              // em ordem
  dates: DateWindow;                      // datas-base no calendário
  outcomes: Outcome[];                    // próxima fase | título | acesso | descenso | vaga em competição da temporada seguinte | prêmio
}
```

- `LeagueFormat`: turno único ou turno e returno; pontos por vitória; mando por sorteio balanceado.
- `GroupFormat`: número e tamanho dos grupos, critério de montagem (sorteio, regional, potes), turnos, **contra quem se joga** (dentro do grupo ou contra o outro grupo, como na Copa Sul-Sudeste), quantos avançam, melhores colocados entre grupos, se a pontuação zera na fase seguinte.
- `KnockoutFormat`: chaveamento (sorteio, por campanha, fixo), jogo único ou ida e volta, quem decide em casa (FATO: nas séries nacionais, pela campanha na competição inteira), desempate (saldo, prorrogação, pênaltis, vantagem do melhor classificado; gol fora só se o regulamento disser).
- Desempates suportados: vitórias, saldo, gols pró, confronto direto, cartões, sorteio.
- Um clube pode **entrar em fase adiantada** (FATO: na Copa do Brasil, clubes da Série A entram na quinta fase; campeões regionais e das Séries C e D, na terceira).
- **Redistribuição de vaga**: `Outcome` de vaga tem regra de herança em cascata (FATO: se o campeão da Copa do Brasil já está classificado à Libertadores, a vaga passa ao vice e a do vice volta ao campeonato; quem acumula vagas fica com a mais benéfica; rebaixado perde a vaga).
- `EntrantRule` cobre os casos reais: "quatro primeiros da fase anterior", "campeão estadual", "N melhores do ranking nacional", "rebaixados da divisão acima na temporada anterior".

## 3. Virada de temporada

1. Aplicar `outcomes` de todas as competições: títulos, acesso, descenso, vagas.
2. Carregar o regulamento da temporada seguinte do pacote. Se não existir, repetir o último conhecido.
3. Resolver participantes. Se o tamanho de uma divisão mudou, aplicar a **regra de transição** declarada no pacote (quantos sobem e caem naquele ano).
4. Clubes que entram no mundo (subiram de fora das competições ativas) ganham elenco e comissão completos a partir do registro leve; clubes que saem viram registro leve.
5. Montar o calendário.

## 4. Calendário global

- Unidade: dia. Eventos: partida (de qualquer competição e categoria), treino, abertura e fechamento de janela, sorteio, data FIFA, vencimento financeiro, fim de obra, eleição, prazo de carta.
- Montagem: cada fase ocupa datas-base da sua janela; conflitos de um mesmo clube são resolvidos por `priority`, e quem perde a data é adiado para a próxima data livre da janela de adiamento. Descanso mínimo entre partidas do mesmo clube é parâmetro do pacote.
- Datas FIFA: partidas da primeira divisão param ou não, conforme o pacote; convocados ficam indisponíveis.
- A pessoa vê o calendário do clube (todas as competições em que está) e pode abrir o de qualquer competição.

## 5. Avanço

`POST /v1/manager/calendar/advance` (`01-ARQUITETURA.md` §4). Para em: partida do usuário, proposta com prazo, carta, último dia de janela com negociação aberta, lesão de titular antes de jogo, virada de temporada.

## 6. Operações e logística

- **Viagem**: cada deslocamento tem distância, duração, meio (ônibus, voo comercial, fretado), custo, conforto, hospedagem, e chegada com antecedência de N dias. Efeitos: custo no livro-caixa, frescor dos jogadores (`08` §2), tempo de treino perdido, adaptação a altitude e clima (`04` §10). FATO (Draper, Chesterton e Wright, 2024; `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md` item 8): na liga norte-americana, associação pequena (|r| = 0,14) só para viagem acumulada; viagem do jogo em si não mostrou associação clara. Por isso o efeito no jogo é moderado e passa por frescor e treino, não por penalidade direta no resultado.
- **Decisão de roteiro**: em sequência de jogos fora, voltar para casa entre eles ou ficar na região (custa hospedagem, poupa deslocamento e mantém treino). Delegável ao responsável de operações; sem ele, o clube usa sempre a opção mais barata.
- **Ajuda de custo** quando o regulamento da competição prevê.
- **Base**: as viagens das categorias de base têm o mesmo modelo e pesam mais no orçamento de clube pequeno (`08` §7.6).
- **Mando**: estádio próprio, alugado ou campo neutro por punição ou obra; mando fora de casa reduz bilheteria e o efeito da torcida.
- **Pré-temporada**: bloco do calendário antes da primeira competição; define a base física do ano e a familiaridade inicial; amistosos como partidas sem competição.
- **Prioridade entre competições**: por competição, a pessoa marca "força máxima", "rodízio" ou "garotos". O auxiliar escala conforme a marca quando a escalação é delegada. Os rivais fazem o mesmo pela ambição e pela situação em cada torneio.
- **Inscrição**: lista por competição dentro do limite; jogador não inscrito não joga.
- **Suspensão e pendurados**: por competição, conforme `matchRules`.

## 7. Conteúdo por etapa

| Etapa | Competições | Categoria |
| --- | --- | --- |
| Corte 1 | divisões nacionais do pacote | profissional |
| Corte 2 | as mesmas; competições de base em versão resumida (resultado e destaques) | sub-20, sub-17 |
| Corte 3 | copa nacional, supercopa; Copa São Paulo e nacionais de base jogáveis pelo usuário | profissional e base |
| Corte 4 | estaduais e copas regionais | profissional |
| Corte 5 | continentais | profissional |

Competições de base usam o mesmo modelo. Para clubes que não são o do usuário, os jogos de base são resolvidos de forma agregada (classificação e destaques por semente), não partida a partida.

## 8. Formatos reais (FATOS da pesquisa 05; temporada 2026 salvo indicação)

Fonte principal: regulamentos específicos da CBF lidos em PDF; itens marcados com (s) vêm de fonte secundária.

| Competição | Clubes | Fases | Sobe e desce | Desempate |
| --- | --- | --- | --- | --- |
| Série A | 20 | liga, turno e returno, 38 rodadas | caem 4 | vitórias, saldo, gols pró, confronto direto (só entre dois), vermelhos, amarelos, sorteio |
| Série B | 20 | liga de 38 rodadas; depois playoff de acesso (3º × 6º, 4º × 5º, ida e volta) | sobem 2 diretos e 2 pelo playoff; caem 4 | como a A; playoff por saldo e posição |
| Série C | 20 | liga em turno único; 8 em 2 grupos de 4, turno e returno; final em ida e volta | sobem 4; caem 2 | sem confronto direto |
| Série C 2027 | 24 | NÃO ENCONTRADO | sobem 4, caem 2; entram 6 da D; 28 clubes em 2028 | NÃO ENCONTRADO |
| Série D | 96 | 16 grupos de 6, turno e returno; depois mata-mata de 64, 32, 16, 8, 4 e final, em ida e volta | sobem 6 | mata-mata por saldo e pênaltis |
| Série D 2027 | NÃO PUBLICADO | | | |
| Copa do Brasil | 126 (128 em 2027) | 9 fases; jogo único da 1ª à 4ª e na final; ida e volta da 5ª à 8ª | campeão na fase de grupos da Libertadores, vice na preliminar | pênaltis; no agregado, saldo e pênaltis; sem gol fora |
| Supercopa | 2 | jogo único | | pênaltis (s) |
| Copa do Nordeste | 20 | 4 grupos de 5 em turno único; quartas em jogo único; semi e final em ida e volta | campeão na 3ª fase da Copa do Brasil | sem confronto direto |
| Copa Verde | 24 | 4 grupos de 6; quartas, semi, final | campeões na 3ª fase da Copa do Brasil | |
| Copa Sul-Sudeste | 12 | 2 grupos de 6 que jogam um contra o outro; semi e final em ida e volta | campeão na 3ª fase da Copa do Brasil | |
| Libertadores | 32 nos grupos, mais 3 fases preliminares | grupos, oitavas, quartas, semi em ida e volta; final única | Brasil: 4 vagas diretas e 1 preliminar pela Série A, mais Copa do Brasil | ordem completa NÃO ENCONTRADA |
| Sul-Americana | 32 nos grupos, mais primeira fase | primeira fase em jogo único; playoff, oitavas a semi em ida e volta; final única | Brasil: 6 vagas pela Série A | NÃO ENCONTRADO |
| Recopa | 2 | ida e volta | | prorrogação |
| Brasileiro Sub-20 | 20 | turno único; quartas, semi e final em ida e volta | caem 3 | |
| Copa São Paulo de Futebol Júnior | 128 (pesquisa 02) | 32 grupos de 4; mata-mata em jogo único | | |

Regras de partida e inscrição (Séries A, B e C): 50 inscritos com 8 trocas; jogador com mais de 12 jogos por um clube não se transfere dentro da mesma competição; até 5 substituições e 1 extra por concussão; descanso mínimo de 66 horas. Copa do Brasil sem limite de inscritos.

Calendário de 2027 (FATO, CBF): Copa do Brasil de 6 de janeiro a 5 de dezembro; Série A de 27 de janeiro a 1º de dezembro; pausa de 24 de junho a 25 de julho; janelas de registro de 4 de janeiro a 2 de março e de 19 de julho a 10 de setembro; estaduais de 10 de janeiro a 7 de março (s).

### Quem paga a viagem (FATO, regulamentos específicos de 2026; `docs/pesquisa/modo-clube/09-regulamentos-conferidos.md` item 7)

| Série | Logística do visitante |
| --- | --- |
| A | por conta do clube |
| B | paga pela CBF (transporte, hospedagem, alimentação, arbitragem), **condicionada** ao cumprimento do programa de reestruturação financeira; salário atrasado por mais de 60 dias tira o benefício |
| C | paga pela CBF: ônibus entre 200 e 500 km, avião acima de 500 km, hospedagem e alimentação para 32 pessoas |
| D | paga pela CBF: ônibus entre 200 e 700 km, avião acima de 700 km, até 2 diárias para 32 pessoas |

Consequência de jogo: nas Séries C e D a viagem não é linha de despesa do clube, mas o meio de transporte e o limite de diárias definem o desgaste (§6); na Série B o apoio vira alavanca da regra financeira (`04` §4.5); na Série A a viagem é decisão e custo do clube. O Regulamento Geral das Competições foi substituído em 2026 pelo Manual de Competições; as citações de regra geral nas specs referem-se a ele.

### Consequências para o projeto

- **O mundo real de 2026 tem 156 clubes nas quatro divisões nacionais** (20 + 20 + 20 + 96), não 80. Só a Série D são 96 clubes: cerca de 2.500 jogadores e 96 comissões com identidade real, na divisão com menos fonte pública. Este é o maior risco de dados do projeto (`ROADMAP.md` §4, questões 6 e 7).
- **Volume de partidas por temporada** (contagem a partir dos formatos acima): Série A 380; Série B 384; Série C 216; Série D cerca de 610 (480 de grupos e 126 de mata-mata, mais playoffs); Copa do Brasil cerca de 190. Só as quatro divisões somam perto de 1.600 partidas; com a copa, perto de 1.800. A meta de 2 ms por partida do nível 2 mantém a temporada inteira abaixo de 5 segundos de simulação de partidas.
- O modo `job_offers` começa na Série D real: grupos regionais e mata-mata, não uma liga de 38 rodadas. A primeira temporada do usuário pode durar 10 jogos (eliminado nos grupos) ou 24. Isso muda o ritmo do começo e precisa de teste com jogadores.
- O modelo precisa de: fase com pontuação zerada, grupos cruzados, entrada em fase adiantada, herança de vaga em cascata, mando decidido por campanha, limites de inscrição com trocas. Todos estão no §2.
- Faltam formatos de 2027 da Série C e da Série D. Um pacote de 2027 não pode ser fechado hoje.
