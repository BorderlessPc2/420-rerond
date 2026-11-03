import type { Ponto, Protocolo } from './gestaoContratos'

export type GestaoOrdemProtocolo = 'prazo' | 'titulo'
export type GestaoOrdemPonto = 'codigo' | 'km'

export function ordenarProtocolos(protocolos: Protocolo[], ordem: GestaoOrdemProtocolo) {
  const items = [...protocolos]
  if (ordem === 'titulo') return items.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  return items.sort((a, b) => (a.previsao || '9999-12-31').localeCompare(b.previsao || '9999-12-31'))
}

export function ordenarPontos(pontos: Ponto[], ordem: GestaoOrdemPonto) {
  const items = [...pontos]
  if (ordem === 'km') return items.sort((a, b) => a.km.localeCompare(b.km, 'pt-BR', { numeric: true }))
  return items.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'))
}
