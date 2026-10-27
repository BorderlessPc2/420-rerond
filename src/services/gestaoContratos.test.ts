import { describe, expect, it } from 'vitest'
import { criarProtocoloComPontos, filtrarGestao, indicadoresGestao, pontoStatus, progressoEtapa, type Ponto, type Protocolo } from './gestaoContratos'
import { validarInputPonto, validarInputProtocolo, type PontoInput, type ProtocoloInput } from './gestaoValidacao'

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

describe('validação de gestão', () => {
  const protocolo: ProtocoloInput = { titulo: 'P', concessionaria: 'Eco', rodovia: 'BR-101' }
  const ponto: PontoInput = { codigo: '1', estado: 'ES', km: '10', tipo: 'nova_implantacao', concessionaria: 'Eco', rodovia: 'BR-101' }
  it('aceita protocolo e ponto válidos', () => {
    expect(validarInputProtocolo(protocolo)).toEqual([])
    expect(validarInputPonto(ponto, protocolo)).toEqual([])
  })
  it('rejeita campos obrigatórios, coordenadas incompletas e limites inválidos', () => {
    expect(validarInputProtocolo({ ...protocolo, titulo: ' ' })).toContain('Informe título, concessionária e rodovia.')
    expect(validarInputPonto({ ...ponto, latitude: 10 }, protocolo)).toContain('Coordenadas inválidas.')
    expect(validarInputPonto({ ...ponto, latitude: 91, longitude: 0 }, protocolo)).toContain('Coordenadas inválidas.')
  })
  it('rejeita ponto de rodovia diferente e resultado incompatível', () => {
    expect(validarInputPonto({ ...ponto, rodovia: 'BR-116' }, protocolo)).toContain('Ponto deve pertencer à mesma concessionária e rodovia do protocolo.')
    expect(validarInputPonto({ ...ponto, resultado: 'regularizado' }, protocolo)).toContain('Resultado incompatível com classificação do ponto.')
  })
  it('calcula progresso da etapa', () => {
    expect(progressoEtapa('fase_2')).toEqual({ indice: 3, total: 6, percentual: 60 })
  })
  it('expõe criação conjunta como operação assíncrona', () => {
    expect(criarProtocoloComPontos).toBeTypeOf('function')
  })
  it('recusa protocolo com pontos acima do limite atômico do Firestore', async () => {
    const pontos = Array.from({ length: 500 }, (_, index) => ({ ...ponto, codigo: String(index) }))
    await expect(criarProtocoloComPontos('contrato', protocolo, pontos)).rejects.toThrow('Limite de 499 pontos por protocolo')
  })
})
