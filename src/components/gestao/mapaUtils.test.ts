import { describe, expect, it } from 'vitest'
import { getMapBounds, getMapPoints, getPontoColor, getSelectedPointId } from './mapaUtils'
import type { Ponto, Protocolo } from '../../services/gestaoContratos'

const protocolo: Protocolo = { id: 'protocolo', contratoId: 'contrato', titulo: 'Protocolo', concessionaria: 'Eco', rodovia: 'BR-101', etapa: 'fase_1', status: 'em_andamento' }
const ponto: Ponto = { id: 'ponto', contratoId: 'contrato', protocoloId: 'protocolo', codigo: 'P-01', estado: 'ES', concessionaria: 'Eco', rodovia: 'BR-101', km: '10', tipo: 'regularizacao', resultado: 'regularizado', latitude: 10, longitude: -40 }

describe('utilitários do mapa de gestão', () => {
  it('filtra pontos sem coordenadas e calcula bounds', () => {
    expect(getMapPoints([ponto, { ...ponto, id: 'pendente', latitude: undefined, longitude: undefined }])).toHaveLength(1)
    expect(getMapBounds([ponto])).toEqual([[10, -40], [10, -40]])
    expect(getMapBounds([])).toBeNull()
  })
  it('classifica ponto concluído com cor operacional', () => {
    expect(getPontoColor(ponto, protocolo)).toBe('#1f8f5f')
  })
  it('aceita seleção por URL somente dentro do escopo informado', () => {
    expect(getSelectedPointId('?ponto=ponto', [ponto])).toBe('ponto')
    expect(getSelectedPointId('?ponto=outro', [ponto])).toBeNull()
    expect(getSelectedPointId('', [ponto])).toBeNull()
  })
})
