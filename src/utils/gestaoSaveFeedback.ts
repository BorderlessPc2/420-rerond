export type GestaoSaveEntity = 'ponto' | 'protocolo' | 'planejamento'
export type GestaoSaveState = 'success' | 'error'

export function gestaoSaveFeedback(state: GestaoSaveState, entity: GestaoSaveEntity) {
  const name = entity === 'ponto' ? 'Ponto' : entity === 'protocolo' ? 'Protocolo' : 'Planejamento'
  return state === 'success'
    ? { label: 'Salvo', message: `${name} salvo.` }
    : { label: 'Não salvou', message: `Não foi possível salvar ${name.toLowerCase()}. Tente novamente.` }
}
