import { describe, expect, it } from 'vitest'
import {
  gerarIdStatusPersonalizado,
  isStatusPersonalizado,
  rotuloStatusProtocolo,
  sanitizarStatusPersonalizados,
} from './gestaoStatusCatalogo'

describe('gestaoStatusCatalogo', () => {
  it('gera id custom_ único a partir do rótulo', () => {
    expect(gerarIdStatusPersonalizado('Aguardando DNIT', [])).toBe('custom_aguardando_dnit')
    expect(gerarIdStatusPersonalizado('Aguardando DNIT', ['custom_aguardando_dnit'])).toBe('custom_aguardando_dnit_2')
  })

  it('resolve rótulo de status personalizado do contrato', () => {
    const personalizados = [{ id: 'custom_em_vistoria', label: 'Em vistoria' }]
    expect(isStatusPersonalizado('custom_em_vistoria', personalizados)).toBe(true)
    expect(rotuloStatusProtocolo('custom_em_vistoria', personalizados)).toBe('Em vistoria')
    expect(rotuloStatusProtocolo('em_andamento', personalizados)).toMatch(/andamento/i)
  })

  it('sanitiza catálogo personalizado', () => {
    const lista = sanitizarStatusPersonalizados([
      { id: 'x', label: '  Foo  ', color: '  #abc  ' },
      { id: 'custom_dup', label: 'Dup' },
      { id: 'custom_dup', label: 'Outro' },
    ])
    expect(lista).toHaveLength(2)
    expect(lista[0].id.startsWith('custom_')).toBe(true)
    expect(lista[0].label).toBe('Foo')
  })
})