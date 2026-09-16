import { describe, expect, it } from 'vitest'
import {
  EVAL_ASSERTIVIDADE_CASOS,
  scoreEvalCaso,
  scoreRelatorioContraEval,
} from './evalAssertividadeCliente'

describe('evalAssertividadeCliente', () => {
  it('tem caso POC Viana com findings críticos', () => {
    const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === 'eval-poc-edp-viana')
    expect(caso).toBeTruthy()
    expect(caso!.findings.some((f) => f.severidade === 'critico')).toBe(true)
    expect(caso!.findings.some((f) => f.programaHistoricoAcertou)).toBe(true)
  })

  it('score falha se crítico faltar', () => {
    const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === 'eval-poc-edp-viana')!
    const almostAll = caso.findings.filter((f) => f.id !== 'f-perfil').map((f) => f.id)
    const result = scoreEvalCaso({ casoId: 'eval-poc-edp-viana', findingsOk: almostAll })
    expect(result?.passouCriticos).toBe(false)
    expect(result?.criticosFalhos).toContain('f-perfil')
  })

  it('score passa críticos quando todos críticos ok', () => {
    const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === 'eval-poc-edp-viana')!
    const criticos = caso.findings.filter((f) => f.severidade === 'critico').map((f) => f.id)
    const result = scoreEvalCaso({ casoId: 'eval-poc-edp-viana', findingsOk: criticos })
    expect(result?.passouCriticos).toBe(true)
    expect(result?.ok).toBe(criticos.length)
  })

  it('scoreRelatorioContraEval marca críticos em relatório bom e rejeita anti-padrão de perfil', () => {
    const bom = `
      Memorial: corrigir Cariacica e excluir travessia (Viana/ES).
      Plano de Trabalho: sem inconsistências.
      Planta baixa: km 300+140 incorreto; indicar poste–bordo; assinar.
      Perfil foi apresentado; falta assinatura e codificação SUROD.
      Sinalização: adequar Manual EcoRodovias e carimbo.
      ART no Volume I deve ir ao Volume III.
      Licença: falta comprovação de inexigibilidade/dispensa.
      Conclusão: objeções pelas pendências reais.
      Volumes e codificação SUROD a adequar; requerimento/declaração com representante legal; cronograma no Volume III.
      Especificações: revisar sinalização provisória. PBA sob Sustentabilidade.
    `
    const scoreBom = scoreRelatorioContraEval('eval-poc-edp-viana', bom)
    expect(scoreBom?.passouCriticos).toBe(true)
    expect(scoreBom!.percentual).toBeGreaterThanOrEqual(70)

    const ruim = `
      Considerou o perfil não localizado.
      Inventou falta de recomposição no plano de trabalho.
      Planta completa e sem pendências.
    `
    const scoreRuim = scoreRelatorioContraEval('eval-poc-edp-viana', ruim)
    expect(scoreRuim?.criticosFalhos.length).toBeGreaterThan(0)
  })
})
