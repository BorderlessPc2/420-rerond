import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scoreRelatorioContraEval } from './evalAssertividadeCliente'

const readFixture = (name: string) =>
  readFileSync(resolve(process.cwd(), 'scripts/fixtures', name), 'utf8')

describe('fixtures de assertividade POC', () => {
  it('mantem baseline historico com score alto, mas reprovado por critico', () => {
    const result = scoreRelatorioContraEval(
      'eval-poc-edp-viana',
      readFixture('parecer-poc-baseline-historico.txt'),
    )

    expect(result?.ok).toBe(14)
    expect(result?.total).toBe(15)
    expect(result?.percentual).toBe(93.3)
    expect(result?.passouCriticos).toBe(false)
    expect(result?.criticosFalhos).toEqual(['f-plano-trabalho'])
  })

  it('aprova fixture bom com todos os findings cobertos', () => {
    const result = scoreRelatorioContraEval(
      'eval-poc-edp-viana',
      readFixture('parecer-poc-viana-bom.txt'),
    )

    expect(result?.ok).toBe(15)
    expect(result?.total).toBe(15)
    expect(result?.percentual).toBe(100)
    expect(result?.passouCriticos).toBe(true)
  })

  it('reprova fixture ruim por criticos ausentes', () => {
    const result = scoreRelatorioContraEval(
      'eval-poc-edp-viana',
      readFixture('parecer-poc-viana-ruim.txt'),
    )

    expect(result?.passouCriticos).toBe(false)
    expect(result?.criticosFalhos.length).toBeGreaterThan(0)
  })
})
