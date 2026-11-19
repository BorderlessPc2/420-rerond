import { describe, expect, it } from 'vitest'
import { getMapBounds, getMapPoints, getPontoColor, getSelectedPointId, marcadoresDeProtocolo, separarPontosSobrepostos } from './mapaUtils'
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
  it('separa pontos sobrepostos sem alterar o ponto original', () => {
    const vizinho = { ...ponto, id: 'ponto-2', codigo: 'P-02' }
    const separados = separarPontosSobrepostos([ponto, vizinho])
    expect(separados).toHaveLength(2)
    expect(separados[0].ponto).toBe(ponto)
    expect(separados[0].latitude).not.toBe(separados[1].latitude)
  })
  it('mostra um marcador por protocolo a partir dos pontos geolocalizados', () => {
    const outro: Protocolo = { ...protocolo, id: 'outro', titulo: 'Outro' }
    const segundo = { ...ponto, id: 'p2', latitude: 12, longitude: -42 }
    const semCoordenada = { ...ponto, id: 'sem', protocoloId: 'outro', latitude: undefined, longitude: undefined }
    const marcadores = marcadoresDeProtocolo([protocolo, outro], [ponto, segundo, semCoordenada])
    expect(marcadores).toEqual([{ protocolo, latitude: 11, longitude: -41, total: 2 }])
  })
  it('aceita seleção por URL somente dentro do escopo informado', () => {
    expect(getSelectedPointId('?ponto=ponto', [ponto])).toBe('ponto')
    expect(getSelectedPointId('?ponto=outro', [ponto])).toBeNull()
    expect(getSelectedPointId('', [ponto])).toBeNull()
  })
})
