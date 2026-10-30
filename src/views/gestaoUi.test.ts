import { describe, expect, it } from 'vitest'
import { formatarDataGestao, nomeGestao } from './gestaoUi'

describe('helpers de UI da gestão', () => {
  it('traduz status técnico para texto legível', () => {
    expect(nomeGestao('em_correcao')).toBe('Em correcao')
  })
  it('representa texto vazio sem quebrar layout', () => {
    expect(nomeGestao('')).toBe('—')
  })
  it('formata data brasileira', () => {
    expect(formatarDataGestao('2026-10-30')).toBe('30/10/2026')
  })
  it('preserva data inválida sem lançar exceção', () => {
    expect(formatarDataGestao('data-invalida')).toBe('data-invalida')
  })
})
