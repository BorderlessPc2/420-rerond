import { describe, expect, it } from 'vitest'
import {
  buildAnaliseQueryText,
  buildGoldenEmbeddingText,
  cosineSimilarity,
  rankBySimilarity,
} from '../../functions/src/services/embeddingService'

describe('embeddingService (RAG)', () => {
  it('cosineSimilarity ranks identical vectors highest', () => {
    const a = [1, 0, 0]
    const b = [1, 0, 0]
    const c = [0, 1, 0]
    expect(cosineSimilarity(a, b)).toBeCloseTo(1)
    expect(cosineSimilarity(a, c)).toBeCloseTo(0)
  })

  it('rankBySimilarity prefers closer embedding and keeps tipo isolation to caller', () => {
    const items = [
      { id: 'far', embedding: [0, 1, 0] as number[] },
      { id: 'near', embedding: [0.9, 0.1, 0] as number[] },
      { id: 'mid', embedding: [0.5, 0.5, 0] as number[] },
    ]
    const query = [1, 0, 0]
    const ranked = rankBySimilarity(items, query, (i) => i.embedding, 2)
    expect(ranked.map((r) => r.id)).toEqual(['near', 'mid'])
  })

  it('build texts include teaching pairs without inventing content', () => {
    const goldenText = buildGoldenEmbeddingText({
      codigo: 'poc/cliente-edp-viana-001',
      titulo: 'POC Viana',
      analiseCorreta: 'Objetar pendências reais',
      erroIa: 'Marcou perfil ausente',
      pares: [
        {
          regraOuItem: 'Perfil',
          original: 'Não localizado',
          correto: 'Apresentado sem assinatura',
          justificativa: 'Falha de leitura ≠ ausência',
        },
      ],
    })
    expect(goldenText).toMatch(/Perfil/)
    expect(goldenText).toMatch(/Não localizado/)
    expect(buildAnaliseQueryText({ tipoAnaliseId: 'poc', rodovia: 'BR-101' })).toMatch(
      /poc/,
    )
  })
})
