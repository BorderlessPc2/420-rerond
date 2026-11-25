import { describe, expect, it } from 'vitest'
import { calcularDashboardGestao, filtrarGestao, pontoStatus, situacaoAposExcluirMovimento, type Protocolo } from './gestaoContratos'
import { mesclarDashboardConfig } from './gestaoDashboardConfig'
import { listarStatusContrato } from './gestaoStatusCatalogo'
import {
  COMBINACOES_ETAPA_STATUS,
  ETAPAS_ORDEM,
  aplicarIntencaoTransicao,
  listarSituacoesAlcancaveis,
  validarCombinacaoEtapaStatus,
  validarTransicao,
} from './gestaoTransicoes'

const personalizados = [{ id: 'custom_em_vistoria', label: 'Em vistoria', color: '#336699' }]

describe('fluxo de status (padrão + personalizado)', () => {
  it('mantém combinações etapa × status padrão inalteradas', () => {
    for (const etapa of ETAPAS_ORDEM) {
      for (const status of COMBINACOES_ETAPA_STATUS[etapa]) {
        expect(validarCombinacaoEtapaStatus(etapa, status)).toBeNull()
      }
    }
  })

  it('rejeita status desconhecido', () => {
    expect(validarCombinacaoEtapaStatus('fase_1', 'status_inventado')).toMatch(/inválida/)
    expect(validarCombinacaoEtapaStatus('fase_1', 'custom-foo')).toMatch(/inválida/)
  })

  it('permite transição de custom órfão (fora do catálogo) para padrão', () => {
    expect(
      validarTransicao('fase_1', 'custom_em_vistoria', 'fase_1', 'em_andamento', 'Retomar fluxo', [], []),
    ).toBeNull()
  })

  it('mantém custom órfão na lista de situações quando é o status atual', () => {
    const opcoes = listarSituacoesAlcancaveis('fase_1', 'custom_em_vistoria', 'fase_1', '', [], [])
    const atual = opcoes.find((item) => item.situacao === 'custom_em_vistoria')
    expect(atual?.disponivel).toBe(true)
  })

  it('intenções rápidas continuam retornando apenas status padrão', () => {
    expect(aplicarIntencaoTransicao('correcao', 'fase_1', 'custom_em_vistoria')).toEqual({
      etapa: 'fase_1',
      status: 'em_correcao',
    })
    expect(aplicarIntencaoTransicao('concluir', 'homologacao', 'custom_em_vistoria')).toEqual({
      etapa: 'concluido',
      status: 'concluido',
    })
  })

  it('filtra e agrega dashboard com status personalizado', () => {
    const protocolos: Protocolo[] = [
      {
        id: 'x',
        contratoId: 'c',
        titulo: 'X',
        concessionaria: 'Eco',
        rodovia: 'BR-101',
        etapa: 'fase_1',
        status: 'custom_em_vistoria',
      },
    ]
    expect(filtrarGestao(protocolos, [], { status: 'custom_em_vistoria' }).protocolos).toHaveLength(1)
    const config = mesclarDashboardConfig(
      { statusVisiveis: ['custom_em_vistoria', 'em_andamento'], previstoStatus: ['custom_em_vistoria'], realizadoStatus: [] },
      personalizados,
    )
    const data = calcularDashboardGestao(protocolos, [], '', config, personalizados)
    expect(data.status).toEqual([
      expect.objectContaining({ status: 'custom_em_vistoria', label: 'Em vistoria', total: 1 }),
    ])
  })

  it('herda status personalizado nos pontos e restaura histórico', () => {
    const protocolo: Protocolo = {
      id: 'x',
      contratoId: 'c',
      titulo: 'X',
      concessionaria: 'Eco',
      rodovia: 'BR-101',
      etapa: 'fase_1',
      status: 'custom_em_vistoria',
    }
    expect(pontoStatus({ id: 'p', contratoId: 'c', codigo: '1', estado: 'ES', concessionaria: 'Eco', rodovia: 'BR-101', km: '1', tipo: 'nova_implantacao' }, protocolo)).toEqual({
      valor: 'custom_em_vistoria',
      herdado: true,
    })
    expect(situacaoAposExcluirMovimento([{ etapa: 'fase_1', status: 'custom_em_vistoria' }])).toEqual({
      etapa: 'fase_1',
      status: 'custom_em_vistoria',
    })
  })

  it('lista status do contrato com personalizados após mesclagem', () => {
    expect(listarStatusContrato(personalizados)).toContain('custom_em_vistoria')
    expect(listarStatusContrato(personalizados)).toContain('em_andamento')
  })
})