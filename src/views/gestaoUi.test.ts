import { describe, expect, it } from 'vitest'
import { formatarDataGestao, nomeGestao, resumoEtapaPlanejamento } from './gestaoUi'

describe('helpers de UI da gestão', () => {
  it('traduz status técnico para texto legível', () => {
    expect(nomeGestao('em_correcao')).toBe('Em correção')
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
  it('resume fases do planejamento com etapa atual destacada', () => {
    expect(resumoEtapaPlanejamento('fase_1')).toEqual({
      etapas: ['Planejamento', 'Elaboração', 'Fase 1', 'Fase 2', 'Homologação', 'Concluído'],
      indiceAtual: 2,
    })
  })
})
