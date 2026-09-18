import { describe, expect, it } from 'vitest'
import { repairCommonMojibake, sanitizeText } from './sanitizeText'

describe('repairCommonMojibake', () => {
  it('corrige acentos e travessao quando texto UTF-8 foi lido como Latin-1', () => {
    expect(repairCommonMojibake('NÃ£o conformidade â€” anÃ¡lise tÃ©cnica')).toBe(
      'Não conformidade — análise técnica',
    )
    expect(sanitizeText('DuplicaÃ§Ã£o BR-101')).toBe('Duplicação BR-101')
  })

  it('nao altera texto UTF-8 valido', () => {
    expect(sanitizeText('Não conformidade — análise técnica')).toBe(
      'Não conformidade — análise técnica',
    )
  })
})
