import { describe, expect, it } from 'vitest'
import {
  EVAL_ASSERTIVIDADE_CASOS,
  scoreEvalCaso,
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
})
