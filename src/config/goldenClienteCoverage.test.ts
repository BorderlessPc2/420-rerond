import { describe, expect, it } from 'vitest'
import { GOLDEN_CASES_SEED } from '../services/goldenCase/goldenCaseSeed'
import { EVAL_ASSERTIVIDADE_CASOS } from './evalAssertividadeCliente'

describe('goldenCaseSeed cliente', () => {
  it('tem 4 casos cliente com pares', () => {
    expect(GOLDEN_CASES_SEED).toHaveLength(4)
    for (const g of GOLDEN_CASES_SEED) {
      expect(g.id.startsWith('cliente-')).toBe(true)
      expect(g.pares.length).toBeGreaterThan(0)
      expect(g.tipoAnaliseId).toBeTruthy()
    }
  })

  it('POC Viana cobre achados críticos do eval por palavra-chave', () => {
    const g = GOLDEN_CASES_SEED.find((x) => x.id === 'cliente-poc-edp-viana-comparativo')!
    const blob = `${g.analiseCorreta}\n${g.pares.map((p) => `${p.original}\n${p.correto}`).join('\n')}`.toLowerCase()
    const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === 'eval-poc-edp-viana')!
    const criticos = caso.findings.filter((f) => f.severidade === 'critico')
    for (const f of criticos) {
      const token = f.item.split(/\s+/)[0].toLowerCase()
      expect(blob.includes(token) || blob.includes(f.id.replace('f-', ''))).toBe(true)
    }
  })
})
