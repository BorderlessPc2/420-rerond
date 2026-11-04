import { describe, expect, it } from 'vitest'
import { getPontoMapLabel, getPontoMapMeta } from './mapaUtils'
import type { Ponto, Protocolo } from '../../services/gestaoContratos'

const ponto: Ponto = {
  id: 'ponto-1', contratoId: 'contrato-1', protocoloId: 'protocolo-1', codigo: 'KM-042', estado: 'ES',
  concessionaria: 'Ecovias', rodovia: 'BR-101', km: '42,3', tipo: 'regularizacao', resultado: 'regularizado',
  latitude: -20.31, longitude: -40.29,
}
const protocolo: Protocolo = {
  id: 'protocolo-1', contratoId: 'contrato-1', titulo: 'Regularização ES', concessionaria: 'Ecovias', rodovia: 'BR-101',
  etapa: 'fase_1', status: 'em_andamento',
}

describe('apresentação dos pontos no mapa', () => {
  it('gera label acessível com código, rodovia e quilômetro', () => {
    expect(getPontoMapLabel(ponto)).toBe('Ponto KM-042, BR-101 km 42,3')
  })

  it('resume localização e situação para o popup do marcador', () => {
    expect(getPontoMapMeta(ponto, protocolo)).toEqual({
      location: 'ES · BR-101 · km 42,3',
      status: 'regularizado',
      statusSource: 'ponto',
    })
  })
})
