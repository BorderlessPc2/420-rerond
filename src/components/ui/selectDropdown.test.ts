import { describe, expect, it } from 'vitest'
import { nextSelectDropdownIndex } from './selectDropdownUtils'

describe('SelectDropdown', () => {
  it('navega para próxima opção e retorna ao início', () => {
    expect(nextSelectDropdownIndex(0, 3, 'ArrowDown')).toBe(1)
    expect(nextSelectDropdownIndex(2, 3, 'ArrowDown')).toBe(0)
  })

  it('navega para opção anterior e retorna ao fim', () => {
    expect(nextSelectDropdownIndex(0, 3, 'ArrowUp')).toBe(2)
    expect(nextSelectDropdownIndex(2, 3, 'ArrowUp')).toBe(1)
  })
})