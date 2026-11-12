import { describe, expect, it } from 'vitest'
import { gestaoSaveFeedback } from './gestaoSaveFeedback'

describe('feedback de salvamento', () => {
  it('gera estado visual de sucesso com mensagem contextual', () => {
    expect(gestaoSaveFeedback('success', 'ponto')).toEqual({ label: 'Salvo', message: 'Ponto salvo.' })
  })

  it('gera estado visual de erro com ação clara', () => {
    expect(gestaoSaveFeedback('error', 'protocolo')).toEqual({ label: 'Não salvou', message: 'Não foi possível salvar protocolo. Tente novamente.' })
  })
})
