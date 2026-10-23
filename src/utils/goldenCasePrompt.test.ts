import { describe, expect, it } from 'vitest'
import { filterGoldenCasesAprovadosParaPreview } from './goldenCasePrompt'

describe('filterGoldenCasesAprovadosParaPreview', () => {
  it('não mostra caso sem organização quando preview exige escopo organizacional', () => {
    const result = filterGoldenCasesAprovadosParaPreview(
      [
        {
          id: 'global-legado',
          codigo: 'GC-1',
          titulo: 'Legado',
          tipoAnaliseId: 'poc',
          status: 'aprovado',
          ativo: true,
          organizacaoId: null,
          pares: [],
          analiseCorreta: 'correto',
        },
      ],
      'poc',
      3,
      'org-1',
    )

    expect(result).toEqual([])
  })
})
