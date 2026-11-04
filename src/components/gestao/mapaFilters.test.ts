import { describe, expect, it } from 'vitest'
import { filtrarPontosMapa } from './mapaUtils'
import type { Ponto, Protocolo } from '../../services/gestaoContratos'

const protocolo: Protocolo = { id: 'pr-1', contratoId: 'c-1', titulo: 'Obra ES', concessionaria: 'Eco', rodovia: 'BR-101', etapa: 'fase_1', status: 'em_andamento' }
const pontos: Ponto[] = [
  { id: 'p-1', contratoId: 'c-1', protocoloId: 'pr-1', codigo: 'ES-01', estado: 'ES', concessionaria: 'Eco', rodovia: 'BR-101', km: '10', tipo: 'regularizacao', resultado: 'regularizado', latitude: -20, longitude: -40 },
  { id: 'p-2', contratoId: 'c-1', protocoloId: 'pr-1', codigo: 'RJ-02', estado: 'RJ', concessionaria: 'Eco', rodovia: 'BR-116', tipo: 'nova_implantacao', latitude: -22, longitude: -43 },
]

describe('filtros visuais do mapa', () => {
  it('filtra por estado, tipo e status operacional', () => {
    expect(filtrarPontosMapa(pontos, [protocolo], { estado: 'ES', tipo: 'regularizacao', status: 'regularizado' }).map((ponto) => ponto.id)).toEqual(['p-1'])
  })

  it('busca código, rodovia e quilômetro sem diferenciar maiúsculas', () => {
    expect(filtrarPontosMapa(pontos, [protocolo], { busca: 'br-116' }).map((ponto) => ponto.id)).toEqual(['p-2'])
  })
})
