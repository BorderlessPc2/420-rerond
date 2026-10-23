import { describe, expect, it } from 'vitest'
import { isGlobalLearningContent, normalizeLearningScope } from './learningScope'

describe('learning scope', () => {
  it('preserves global company content without inventing an organization', () => {
    const scope = normalizeLearningScope({ tipoAnaliseId: 'poc' })

    expect(scope).toEqual({ organizacaoId: null, concessionariaId: null, tipoAnaliseId: 'poc' })
    expect(isGlobalLearningContent(scope)).toBe(true)
  })

  it('normalizes concessionaria-specific content', () => {
    const scope = normalizeLearningScope({
      organizacaoId: ' org-1 ',
      concessionariaId: ' conc-1 ',
      tipoAnaliseId: ' poc ',
    })

    expect(scope).toEqual({
      organizacaoId: 'org-1',
      concessionariaId: 'conc-1',
      tipoAnaliseId: 'poc',
    })
    expect(isGlobalLearningContent(scope)).toBe(false)
  })
})
