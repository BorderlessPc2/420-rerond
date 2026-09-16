import { describe, expect, it } from 'vitest'
import {
  ORIENTACAO_PER_ARAGUAIA,
  PER_AMPLIACAO_CATEGORIAS,
  PER_ARAGUAIA_RESUMO,
  REQ_OBRA_PER_CLIENTE,
} from './perAmpliacoesCliente'

describe('perAmpliacoesCliente', () => {
  it('tem categorias principais do inventário', () => {
    expect(PER_AMPLIACAO_CATEGORIAS).toContain('Duplicação')
    expect(PER_AMPLIACAO_CATEGORIAS).toContain('Faixa Adicional')
    expect(PER_AMPLIACAO_CATEGORIAS).toContain('Acesso')
    expect(PER_ARAGUAIA_RESUMO.rodoviasPrincipais).toContain('BR-153')
  })

  it('orientação e requisitos PER_* para obra_per', () => {
    expect(ORIENTACAO_PER_ARAGUAIA).toMatch(/obra_per/)
    expect(ORIENTACAO_PER_ARAGUAIA).toMatch(/NÃO invente trecho/)
    expect(REQ_OBRA_PER_CLIENTE.every((r) => r.id.startsWith('PER_'))).toBe(true)
  })
})
