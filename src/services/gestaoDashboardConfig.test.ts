import { describe, expect, it } from 'vitest'
import {
  calcularPrevistoRealizado,
  dashboardConfigPadrao,
  rotuloEtapaDashboard,
  rotuloLegendaMapaDashboard,
  sanitizarDashboardConfig,
} from './gestaoDashboardConfig'
import type { Ponto, Protocolo } from './gestaoContratos'

const protocolos: Protocolo[] = [
  { id: 'a', contratoId: 'c', titulo: 'A', concessionaria: 'Eco', rodovia: 'BR-101', etapa: 'fase_1', status: 'em_correcao', previsao: '2025-01-01', realizadoEm: '2025-02-01' },
  { id: 'b', contratoId: 'c', titulo: 'B', concessionaria: 'Eco', rodovia: 'BR-153', etapa: 'planejamento', status: 'concluido', previsao: '2025-03-01' },
]
const pontos: Ponto[] = [
  { id: 'p1', contratoId: 'c', protocoloId: 'a', codigo: '1', estado: 'GO', concessionaria: 'Eco', rodovia: 'BR-101', km: '10', tipo: 'regularizacao', previsao: '2025-04-01' },
  { id: 'p2', contratoId: 'c', protocoloId: 'b', codigo: '2', estado: 'GO', concessionaria: 'Eco', rodovia: 'BR-153', km: '20', tipo: 'nova_implantacao', realizadoEm: '2025-05-01' },
]

describe('gestaoDashboardConfig', () => {
  it('conta previsto x realizado por protocolo com filtro de status', () => {
    const config = {
      ...dashboardConfigPadrao(),
      previstoRealizadoBase: 'protocolo' as const,
      previstoStatus: ['em_correcao' as const],
      realizadoStatus: ['em_correcao' as const],
    }
    expect(calcularPrevistoRealizado(protocolos, pontos, config)).toEqual({ previsto: 1, realizado: 1 })
  })

  it('usa rótulos personalizados de etapa e mapa', () => {
    const config = sanitizarDashboardConfig({
      ...dashboardConfigPadrao(),
      rotulosEtapa: { fase_1: 'Fase contratual' },
      rotulosMapa: { em_analise: 'Análise ANTT' },
    })
    expect(rotuloEtapaDashboard('fase_1', config)).toBe('Fase contratual')
    expect(rotuloLegendaMapaDashboard('em_analise', config)).toBe('Análise ANTT')
  })
})