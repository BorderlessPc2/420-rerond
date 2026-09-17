import { describe, expect, it } from 'vitest'
import { GOLDEN_CASES_SEED } from '../services/goldenCase/goldenCaseSeed'
import { EVAL_ASSERTIVIDADE_CASOS } from './evalAssertividadeCliente'

describe('goldenCaseSeed cliente', () => {
  const MIN_POR_TIPO: Record<string, number> = {
    poc: 3,
    ppu: 3,
    'pac-viabilidade': 3,
    'pac-executivo': 3,
    pan: 3,
    acesso: 3,
  }

  it('tem ≥3 goldens pendentes por tipo crítico', () => {
    for (const [tipo, min] of Object.entries(MIN_POR_TIPO)) {
      const items = GOLDEN_CASES_SEED.filter((g) => g.tipoAnaliseId === tipo)
      expect(items.length, tipo).toBeGreaterThanOrEqual(min)
      for (const g of items) {
        expect(g.status).toBe('pendente')
        expect(g.pares.length).toBeGreaterThan(0)
      }
    }
  })

  it('todos os seeds cliente têm id cliente-* e pares', () => {
    expect(GOLDEN_CASES_SEED.length).toBeGreaterThanOrEqual(16)
    for (const g of GOLDEN_CASES_SEED) {
      expect(g.id.startsWith('cliente-')).toBe(true)
      expect(g.pares.length).toBeGreaterThan(0)
      expect(g.tipoAnaliseId).toBeTruthy()
    }
  })

  it('POC Viana cobre achados críticos do eval por palavra-chave', () => {
    const g = GOLDEN_CASES_SEED.find((x) => x.id === 'cliente-poc-edp-viana-comparativo')!
    const blob =
      `${g.analiseCorreta}\n${g.erroIa}\n${g.pares.map((p) => `${p.regraOuItem}\n${p.original}\n${p.correto}`).join('\n')}`.toLowerCase()
    const needlesByFinding: Record<string, string[]> = {
      'f-memorial': ['cariacica', 'travessia'],
      'f-plano-trabalho': ['plano de trabalho', 'sem inconsist'],
      'f-planta': ['300+140', 'poste'],
      'f-perfil': ['perfil', 'não localiz'],
      'f-sinalizacao': ['sinaliza', 'carimbo'],
      'f-art': ['art', 'volume iii'],
      'f-conclusao': ['obje', 'fundament'],
    }
    const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === 'eval-poc-edp-viana')!
    const criticos = caso.findings.filter((f) => f.severidade === 'critico')
    for (const f of criticos) {
      const needles = needlesByFinding[f.id] ?? [f.item.toLowerCase()]
      expect(needles.some((n) => blob.includes(n))).toBe(true)
    }
  })
})
