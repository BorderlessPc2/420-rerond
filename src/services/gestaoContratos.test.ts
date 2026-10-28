import { describe, expect, it } from 'vitest'
import { criarProtocoloComPontos, filtrarGestao, indicadoresGestao, pontoStatus, progressoEtapa, validarEdicaoPonto, validarTransicao, type Ponto, type Protocolo } from './gestaoContratos'
import { getMapBounds, getMapPoints, getPontoColor } from '../components/gestao/mapaUtils'
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
  it('combina concessionária, protocolo e código sem trazer pontos fora do recorte', () => {
    const recorte = filtrarGestao(protocolos, pontos, { concessionaria: 'Eco', protocoloId: 'a', pontoCodigo: '2' })
    expect(recorte.pontos.map((p) => p.id)).toEqual(['p2'])
    expect(recorte.protocolos.map((p) => p.id)).toEqual(['a'])
    expect(filtrarGestao(protocolos, pontos, { protocoloId: 'b' }).protocolos.map((p) => p.id)).toEqual(['b'])
    expect(filtrarGestao(protocolos, pontos, { protocoloId: 'a', concessionaria: 'Outra' }).protocolos).toEqual([])
  })
  it('prepara pontos geolocalizados e cores operacionais para o mapa', () => {
    expect(getMapPoints([{ ...pontos[0], latitude: 10, longitude: -40 }, { ...pontos[1], latitude: undefined, longitude: undefined }])).toHaveLength(1)
    expect(getMapBounds([{ ...pontos[0], latitude: 10, longitude: -40 }])).toEqual([[10, -40], [10, -40]])
    expect(getPontoColor(pontos[0], protocolos[0])).toBe('#1f8f5f')
  })
  it('conta protocolos paralisados e prazos vencidos', () => {
    const data = new Date().toISOString().slice(0, 10)
    expect(indicadoresGestao([{ ...protocolos[0], status: 'paralisado', previsao: '2020-01-01' }], [])).toMatchObject({ paralisados: 1, atrasados: 1 })
    expect(indicadoresGestao([{ ...protocolos[0], previsao: data }], [])).toMatchObject({ atrasados: 0 })
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
  it('rejeita edição de ponto que quebra vínculo com protocolo', () => {
    expect(validarEdicaoPonto({ ...ponto, rodovia: 'BR-116' }, protocolo)).toContain('Ponto deve pertencer à mesma concessionária e rodovia do protocolo.')
  })
  it('rejeita transição para correção sem observação', () => {
    expect(validarTransicao('fase_1', 'em_andamento', 'fase_1', 'em_correcao', '')).toBe('Informe observação para correção ou paralisação.')
  })
})
