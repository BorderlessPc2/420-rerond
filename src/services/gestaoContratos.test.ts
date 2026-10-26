import { describe, expect, it } from 'vitest'
import { filtrarGestao, indicadoresGestao, pontoStatus, type Ponto, type Protocolo } from './gestaoContratos'

const protocolos: Protocolo[] = [
  { id: 'a', contratoId: 'c', titulo: 'A', concessionaria: 'Eco', rodovia: 'BR-101', etapa: 'fase_1', status: 'em_correcao' },
  { id: 'b', contratoId: 'c', titulo: 'B', concessionaria: 'Eco', rodovia: 'BR-101', etapa: 'planejamento', status: 'nao_iniciado' },
]
const pontos: Ponto[] = [
  { id: 'p1', contratoId: 'c', protocoloId: 'a', codigo: '1', estado: 'ES', concessionaria: 'Eco', rodovia: 'BR-101', km: '10', tipo: 'regularizacao', resultado: 'regularizado' },
  { id: 'p2', contratoId: 'c', protocoloId: 'a', codigo: '2', estado: 'RJ', concessionaria: 'Eco', rodovia: 'BR-101', km: '20', tipo: 'nova_implantacao' },
]
describe('recorte operacional', () => {
  it('distingue pontos de protocolos e conclusão por classificação', () => {
    expect(indicadoresGestao(protocolos, pontos)).toMatchObject({ protocolos: 2, pontos: 2, regularizados: 1, aprovadosImplantacao: 0 })
    expect(pontoStatus(pontos[1], protocolos[0])).toEqual({ valor: 'em_correcao', herdado: true })
    expect(pontoStatus(pontos[0], protocolos[0])).toEqual({ valor: 'regularizado', herdado: false })
  })
  it('aplica filtro à mesma população de pontos e protocolos', () => {
    const recorte = filtrarGestao(protocolos, pontos, { estado: 'RJ', tipo: 'nova_implantacao', status: 'em_correcao' })
    expect(recorte.pontos.map((p) => p.id)).toEqual(['p2'])
    expect(recorte.protocolos.map((p) => p.id)).toEqual(['a'])
    expect(filtrarGestao(protocolos, pontos, { status: 'nao_iniciado' }).protocolos.map((p) => p.id)).toEqual(['b'])
  })
})
