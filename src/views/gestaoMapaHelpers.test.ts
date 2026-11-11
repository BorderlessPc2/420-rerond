import { describe, expect, it } from 'vitest'
import { getPontoStatusOptions, getPontoDetailSummary, removerPontoSelecionado } from './gestaoMapaHelpers'
import type { Ponto, Protocolo } from '../services/gestaoContratos'

const ponto: Ponto = { id: 'p-1', contratoId: 'c-1', protocoloId: 'pr-1', codigo: 'ES-01', estado: 'ES', concessionaria: 'Eco', rodovia: 'BR-101', km: '10', tipo: 'regularizacao', latitude: -20, longitude: -40 }
const protocolo: Protocolo = { id: 'pr-1', contratoId: 'c-1', titulo: 'Obra ES', concessionaria: 'Eco', rodovia: 'BR-101', etapa: 'fase_1', status: 'em_andamento' }

describe('detalhes do ponto no mapa', () => {
  it('monta resumo operacional do ponto selecionado', () => {
    expect(getPontoDetailSummary(ponto, protocolo)).toEqual({
      local: 'ES · BR-101 · km 10',
      classificacao: 'Regularização',
      protocolo: 'Obra ES',
      status: 'em_andamento',
    })
  })

  it('remove ponto selecionado sem descartar filtros do mapa', () => {
    expect(removerPontoSelecionado('estado=GO&ponto=p-1&tipo=regularizacao')).toBe('estado=GO&tipo=regularizacao')
  })

  it('oferece somente resultado compatível com classificação', () => {
    expect(getPontoStatusOptions(ponto)).toEqual([
      { value: '', label: 'Ainda não concluído' },
      { value: 'regularizado', label: 'Regularizado' },
    ])
  })
})
