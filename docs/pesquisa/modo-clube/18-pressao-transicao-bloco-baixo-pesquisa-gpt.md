# Pesquisa 18 — Pressão, transição e bloco baixo (resposta do GPT trazida pelo dono)

Data: 2026-11-16. Resumo da resposta a um pedido de diagnóstico sobre o desequilíbrio de estilos (HANDOFF §6.0, 2026-11-16). Os números marcados como estimativa são do autor da resposta, não de fonte.

## 1. Referências numéricas

- Opta, Premier League 2024–25, *high turnovers* (posse que começa a até 40 m do gol adversário): Manchester City 300 (13,7% terminam em chute), Bournemouth 298 (20,8%), Arsenal 285 (12,6%), Liverpool 21,1%, Forest 21,3%. Cerca de 9 por jogo para quem mais pressiona.
- Bauer e Anzer (2021), seis temporadas da Bundesliga, mais de 20 mil transições: contrapressão bem-sucedida = recupera em até 5 s; 20 a 30 situações de contrapressão por time por jogo; com superioridade numérica num raio de 10 m da bola recupera em 36,2%, sem ela em 30,2%; velocidade de quem pressiona nos 2 s iniciais e tempo de controle do adversário nos 3 s iniciais estão entre os fatores mais importantes. Recuo (*fallback*) dura em média 18,3 s, contrapressão 9,89 s.
- Peters et al. (2025), 380 jogos da Premier League 2020–21: jogadores na faixa central atrás do local da perda (largura da pequena área, 30 m): 1,22 quando houve chute concedido, 1,31 quando não houve. Contrapressão concede chute em 6,4% (sem: 5,5%, diferença não significativa) e entrada no terço final em 27,2% (sem: 24,5%, significativa).
- Spearman (2018, MIT Sloan): tempo de chegada com posição, velocidade, aceleração até a velocidade máxima e tempo de voo; probabilidade de controle inclui o tempo de um toque controlado.
- Forcher et al. (2024), 153 jogos da Bundesliga: compactação do time inteiro e distância entre linhas pouco distinguem defesa bem e mal-sucedida; a compactação dos cinco defensores mais próximos da bola distingue (efeito pequeno e consistente).
- Forest, nove jogos iniciais de 2024–25: 13,8 chutes sofridos por jogo, 1,07 de `xG` sofrido, cerca de 0,077 por chute.
- Opta 2024–25: 1,84 chutes de contra-ataque rápido por time por jogo (10,2% dos chutes, `xG` médio 0,17).
- Escapar da contrapressão (2025): passe inicial um pouco mais longo nas sequências que escapam (18 jardas contra 16,5).

## 2. Hipóteses propostas, por prioridade

1. **H1 — segurança do passe superestimada**: o estimador não prevê o deslocamento do defensor durante o voo nem o tempo de controle do recebedor; a interceptação na simulação usa a posição real durante o voo. Medir conclusão por faixa de `p`, comprimento, zona e velocidade do defensor mais perigoso.
2. **H2 — pressão sem gatilho**: pressionar quando há superioridade local, recebedor de costas, passe previsível ou bola perto da lateral; os outros fecham linhas.
3. **H3 — roubada vira chute fácil demais**: modelar contrapressão e defesa de emergência do time que perdeu.
4. **H4 — defesa de descanso insuficiente**: testar 2, 3 e 4 jogadores atrás da bola (estimativa).
5. **H5 — bloco baixo protege pouco o espaço local**: compactar os cinco mais próximos da bola e o corredor central. Alvo (estimativa): 12 a 15 chutes sofridos, 0,07 a 0,10 de `xG` por chute.
6. **H6 — contra-ataque sem saída**: pivô, segunda bola, terceiro homem, passe de primeira. Alvo: 1 a 2 chutes de contra-ataque por time por jogo.

Falta tática: sem estatística pública comparável; decidir pela situação (progressão, defensores atrás da bola, superioridade, centro), sem percentual fixo.

## 3. Protocolo

Instrumentar antes de mudar; uma mudança por vez; mesmas sementes entre versões (comparação pareada); partida como unidade; intervalo de Wilson para proporções.
