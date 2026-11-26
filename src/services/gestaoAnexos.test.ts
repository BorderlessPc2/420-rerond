import { describe, expect, it } from 'vitest'
import { anexoGestaoPermitido, mimeAnexoGestao } from './gestaoAnexos'

describe('gestaoAnexos', () => {
  it('infere PDF quando o navegador não envia content-type', () => {
    const file = new File(['x'], 'Email Gotech DNIT GO 25-11-26.pdf', { type: '' })
    expect(anexoGestaoPermitido(file)).toBe(true)
    expect(mimeAnexoGestao(file)).toBe('application/pdf')
  })
})