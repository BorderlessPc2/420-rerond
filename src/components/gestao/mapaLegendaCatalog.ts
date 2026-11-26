/** Cores da legenda do mapa — manter alinhado com `getPontoColor` em mapaUtils. */
export const LEGENDA_MAPA_GESTAO = [
  { id: 'concluido_regularizado', label: 'Concluído / regularizado', color: '#1f8f5f' },
  { id: 'aprovado_implantacao', label: 'Aprovado implantação', color: '#147d8a' },
  { id: 'paralisado', label: 'Paralisado', color: '#8f2635' },
  { id: 'em_correcao', label: 'Em correção', color: '#c43d4b' },
  { id: 'aguardando_terceiros', label: 'Aguardando terceiros', color: '#b97912' },
  { id: 'em_analise', label: 'Em análise', color: '#7656a8' },
  { id: 'em_andamento', label: 'Em andamento', color: '#236da8' },
  { id: 'nao_iniciado', label: 'Não iniciado', color: '#6b7280' },
] as const