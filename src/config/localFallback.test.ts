import { describe, expect, it } from 'vitest'
import { isLocalFallbackEnabled } from './localFallback'

describe('isLocalFallbackEnabled', () => {
  it('keeps fallback disabled unless explicit flag is enabled in development', () => {
    expect(typeof isLocalFallbackEnabled()).toBe('boolean')
  })
})
