# UX Spec

Mobile-first (360px base), funciona até 1280px. PT-BR. Sem design visual final aqui.

## 1. Arquitetura de informação

```text
/                 Home: dois cards (Career Path, Grid) com estado do daily + atalho Practice
/career-path      Daily
/career-path/practice
/grid             Daily
/grid/practice
/history          Lista de partidas
/stats            Estatísticas por jogo
/admin/*          Painel editorial (token em sessionStorage; sem link na navegação pública)
```

Perfil e Configurações: **fora do MVP** (sem conta, nada a configurar; tema segue `prefers-color-scheme`).

Navegação: barra inferior fixa no mobile com Jogos / Histórico / Stats. No desktop, topo.

## 2. Primeiro acesso

Home carrega, cookie criado, nenhum modal. Card mostra "Desafio de hoje · #123 · Jogar". Toque → jogo em uma tela. Botão "Como jogar?" abre painel com 3 linhas; nunca automático.

## 3. Tela Career Path (wireframe textual)

```text
┌──────────────────────────────┐
│ ← Career Path #123   ⬛⬛⬜⬜⬜⬜ │  ← tentativas (ícones)
├──────────────────────────────┤
│ 1. 🇧🇷 Cruzeiro      1993–94  │
│ 2. 🇳🇱 PSV           1994–96  │
│ 3. ???                       │  ← linhas futuras ocultas (altura fixa, evita layout shift)
├──────────────────────────────┤
│ [ Quem é o jogador?       🔍 ]│  ← input com autocomplete (lista abaixo, máx. 10, teclado ↑↓ Enter)
│ [ Enviar ]        [ Pular ]  │
└──────────────────────────────┘
```

Estados: carregando (skeleton das linhas), erro de rede (toast + retry), sem daily (card "Sem desafio hoje. Jogue no modo treino."), concluído (vai para Resultado).

Feedback: errado → linha nova desliza para dentro + vibração curta (se suportado); certo → destaque verde no nome.

## 4. Tela Grid

```text
┌──────────────────────────────┐
│ ← Grid #45          9 tent.  │
├────────┬────────┬────────┬───┤
│        │ PAL    │ 🇦🇷     │ MF│
├────────┼────────┼────────┼───┤
│ FLA    │   +    │   +    │ + │
│ 🇧🇷 BR  │   +    │ Zico   │ + │
│ FW     │   +    │   +    │ + │
└────────┴────────┴────────┴───┘
```

Toque em célula → sheet inferior com critérios da célula ("Jogou no Flamengo · Argentino") e input de busca. Seleção → envia. Errado: sheet fecha, célula pisca vermelho, contador decrementa. Botão "Encerrar" com confirmação (dialog acessível).

Células: mín. 44×44px, texto truncado com `title`. Escudos: iniciais em círculo colorido (sem logos no MVP).

## 5. Resultado

```text
Você acertou em 3/6!            (ou "Não foi dessa vez.")
🅿 Ronaldo — 7 clubes
[trajetória completa, com (emp.)]
Pontuação: 40
[ Copiar resultado ]  [ Treinar ]  [ Ver histórico ]
Próximo desafio em 13h 42m
```

Copiar usa `navigator.clipboard`; fallback: textarea selecionável. Web Share API se disponível.

## 6. Histórico e Stats

Histórico: lista simples, filtro por jogo, paginação por cursor. Vazio: "Nenhuma partida ainda. Jogue o desafio de hoje."
Stats: números grandes + barra de distribuição (CSS puro, sem lib de gráfico).

## 7. Painel editorial (mínimo)

Páginas: Jogadores (tabela com filtro de status; detalhe com edição de spells/aliases e avisos DQ), Desafios (calendário semanal por jogo; criar; validar; publicar; retirar; preview jogável), Import (rodar import por IDs; lista de diffs), Relatórios. Tabelas HTML simples, sem lib de datagrid.

## 8. Componentes

| Componente | Notas |
|---|---|
| `PlayerSearchInput` | Combobox acessível (ARIA `combobox/listbox`), debounce 150 ms, cancela request anterior, mostra desambiguação |
| `AttemptDots` | Indicadores de tentativa, `aria-label="2 de 6 tentativas usadas"` |
| `CareerTimeline` | Linhas reveladas/ocultas, altura fixa |
| `GridBoard` | 3×3, botões, `aria-label` por célula com critérios |
| `CellSheet` | Bottom sheet; foco preso; Esc fecha |
| `ResultCard` | Reveal + share |
| `ShareButton` | clipboard/Web Share |
| `EmptyState`, `ErrorState`, `Skeleton` | |

## 9. Acessibilidade

Teclado completo; foco visível; contraste AA; `prefers-reduced-motion` desliga animações; anúncios `aria-live="polite"` para "errou/acertou"; nunca cor como único sinal (ícone + texto).

## 10. Loading e erros

TanStack Query com `retry: 1` em GET, `retry: 0` em POST de ações (idempotency key permite retry manual seguro). Offline: banner "Sem conexão"; ações bloqueadas.
