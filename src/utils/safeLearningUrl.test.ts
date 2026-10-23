import { describe, expect, it } from 'vitest'
import { safeLearningUrl } from './safeLearningUrl'

describe('safeLearningUrl', () => {
  it('allows HTTP and HTTPS links', () => {
    expect(safeLearningUrl('https://example.com/doc.pdf')).toBe('https://example.com/doc.pdf')
    expect(safeLearningUrl('http://example.com')).toBe('http://example.com/')
  })

  it('rejects unsafe or malformed links', () => {
    expect(safeLearningUrl('javascript:alert(1)')).toBeNull()
    expect(safeLearningUrl('not a url')).toBeNull()
  })
})
