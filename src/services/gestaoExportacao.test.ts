import { describe, expect, it } from 'vitest'
import { filtrarGestaoComFiltro, montarDadosExportacao } from './gestaoExportacao'
import type { Ponto, Protocolo } from './gestaoContratos'

const protocolos: Protocolo[] = [
  { id: 'a', contratoId: 'c', titulo: 'Alpha', concessionaria: 'Eco', rodovia: 'BR-101', etapa: 'fase_1', status: 'em_andamento', previsao: '2026-12-01' },
  { id: 'b', contratoId: 'c', titulo: 'Beta', concessionaria: 'Eco', rodovia: 'BR-116', etapa: 'planejamento', status: 'nao_iniciado' },
]
const pontos: Ponto[] = [
  { id: 'p1', contratoId: 'c', protocoloId: 'a', codigo: 'P-1', estado: 'ES', concessionaria: 'Eco', rodovia: 'BR-101', km: '10', tipo: 'nova_implantacao' },
  { id: 'p2', contratoId: 'c', protocoloId: 'b', codigo: 'P-2', estado: 'RJ', concessionaria: 'Eco', rodovia: 'BR-116', km: '20', tipo: 'regularizacao', resultado: 'regularizado' },
]

describe('gestaoExportacao', () => {
  it('monta exportação com o mesmo recorte do filtro combinado', () => {
    const filtro = { estado: 'ES', busca: 'P-1' }
    const recorte = filtrarGestaoComFiltro(protocolos, pontos, filtro)
    const dados = montarDadosExportacao(protocolos, pontos, filtro)
    expect(dados.protocolosRows).toHaveLength(recorte.protocolos.length)
    expect(dados.pontosRows).toHaveLength(recorte.pontos.length)
    expect(dados.pontosRows[0]?.codigo).toBe('P-1')
  })

  it('respeita filtro de etapa e período na contagem exportada', () => {
    const dados = montarDadosExportacao(protocolos, pontos, { etapa: 'fase_1', inicio: '2026-11-01', fim: '2026-12-31' })
    expect(dados.protocolosRows.map((item) => item.titulo)).toEqual(['Alpha'])
    expect(dados.pontosRows).toHaveLength(1)
  })
})
