import { describe, expect, it } from 'vitest'
import { calcularDashboardGestao, toDonutSegments } from './gestaoDashboard'
import type { Ponto, Protocolo } from './gestaoContratos'

const protocolos: Protocolo[] = [
  { id: 'a', contratoId: 'c', titulo: 'A', concessionaria: 'Eco', rodovia: 'BR-101', etapa: 'fase_1', status: 'em_correcao', previsao: '2020-01-01' },
  { id: 'b', contratoId: 'c', titulo: 'B', concessionaria: 'Eco', rodovia: 'BR-153', etapa: 'planejamento', status: 'nao_iniciado' },
]
const pontos: Ponto[] = [
  { id: 'p1', contratoId: 'c', protocoloId: 'a', codigo: '1', estado: 'GO', concessionaria: 'Eco', rodovia: 'BR-101', km: '10', tipo: 'regularizacao', resultado: 'regularizado' },
  { id: 'p2', contratoId: 'c', protocoloId: null, codigo: '2', estado: 'GO', concessionaria: 'Eco', rodovia: 'BR-153', km: '20', tipo: 'nova_implantacao' },
  { id: 'p3', contratoId: 'c', protocoloId: 'b', codigo: '3', estado: 'ES', concessionaria: 'Eco', rodovia: 'BR-153', km: '30', tipo: 'nova_implantacao' },
]

describe('gestaoDashboard', () => {
  it('calcula indicadores por estado sem remover pontos sem protocolo', () => {
    const data = calcularDashboardGestao(protocolos, pontos, { estado: 'GO' })
    expect(data.totalPontos).toBe(2)
    expect(data.pontosSemProtocolo).toBe(1)
    expect(data.totalProtocolos).toBe(1)
  })

  it('calcula distribuição de status e percentual de pontos concluídos', () => {
    const data = calcularDashboardGestao(protocolos, pontos)
    expect(data.status).toEqual(expect.arrayContaining([expect.objectContaining({ status: 'em_correcao', total: 1 })]))
    expect(data.percentualPontosConcluidos).toBe(33)
    expect(data.previstoRealizado).toEqual({ previsto: 0, realizado: 0 })
  })

  it('inclui concessionária e rodovia existentes somente em protocolos nas opções de filtro', () => {
    const data = calcularDashboardGestao([...protocolos, {
      id: 'sem-ponto',
      contratoId: 'c',
      titulo: 'Protocolo sem ponto',
      concessionaria: 'Via Nova',
      rodovia: 'BR-999',
      etapa: 'planejamento',
      status: 'nao_iniciado',
    }], pontos)

    expect(data.concessionarias).toEqual(['Eco', 'Via Nova'])
    expect(data.rodovias).toEqual(['BR-101', 'BR-153', 'BR-999'])
  })

  it('monta segmentos de donut proporcionais', () => {
    const segments = toDonutSegments([
      { color: '#111', label: 'A', total: 1 },
      { color: '#222', label: 'B', total: 3 },
    ], 4)
    expect(segments).toHaveLength(2)
    expect(segments[0].dash).toBe(25)
    expect(segments[1].dash).toBe(75)
    expect(segments[1].offset).toBe(25)
  })

  it('filtra por rodovia mantendo pontos sem protocolo no recorte', () => {
    const data = calcularDashboardGestao(protocolos, pontos, { rodovia: 'BR-153' })
    expect(data.totalPontos).toBe(2)
    expect(data.totalProtocolos).toBe(1)
    expect(data.pontosSemProtocolo).toBe(1)
  })
})
