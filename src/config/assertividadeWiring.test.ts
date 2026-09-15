import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TIPOS_ANALISE_SEED } from '../models/TipoAnalise'
import { ORIENTACAO_ASSERTIVIDADE } from './checklistsCliente'
import { EVAL_ASSERTIVIDADE_CASOS } from './evalAssertividadeCliente'
import { GOLDEN_CASES_SEED } from '../services/goldenCase/goldenCaseSeed'

const PREFIX_BY_TIPO: Record<string, string> = {
  'ocupacao-faixa': 'OCUP_',
  poc: 'POC_',
  acesso: 'ACESSO_',
  pac: 'PAC_',
  'pac-viabilidade': 'PACV_',
  'pac-executivo': 'PACE_',
  ppu: 'PPU_',
  pan: 'PAN_',
}

describe('wiring assertividade cliente', () => {
  it('orientação inclui anti-padrões de raciocínio', () => {
    expect(ORIENTACAO_ASSERTIVIDADE).toMatch(/RACIOCÍNIO E CLASSIFICAÇÃO/)
    expect(ORIENTACAO_ASSERTIVIDADE).toMatch(/PROIBIDO inventar pendências/)
    expect(ORIENTACAO_ASSERTIVIDADE).toMatch(/checklist desse tipo é ERRO/)
  })

  it('cada tipo built-in usa só o prefixo do próprio checklist', () => {
    for (const [tipoId, prefix] of Object.entries(PREFIX_BY_TIPO)) {
      const tipo = TIPOS_ANALISE_SEED.find((t) => t.id === tipoId)
      expect(tipo, `seed ${tipoId}`).toBeTruthy()
      expect(tipo!.requisitos.length).toBeGreaterThan(0)
      for (const req of tipo!.requisitos) {
        expect(req.id.startsWith(prefix), `${tipoId} req ${req.id}`).toBe(true)
      }
      expect(tipo!.promptOrientacao || '').toContain('ASSERTIVIDADE')
    }
  })

  it('goldens do cliente ficam pendentes até aprovação', () => {
    const cliente = GOLDEN_CASES_SEED.filter((g) => g.id.startsWith('cliente-'))
    expect(cliente.length).toBeGreaterThanOrEqual(4)
    for (const g of cliente) {
      expect(g.status).toBe('pendente')
      expect(g.pares.length).toBeGreaterThan(0)
    }
  })

  it('eval POC Viana cobre findings críticos do comparativo', () => {
    const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === 'eval-poc-edp-viana')
    expect(caso).toBeTruthy()
    const ids = new Set(caso!.findings.map((f) => f.id))
    for (const id of ['f-memorial', 'f-planta', 'f-perfil', 'f-sinalizacao', 'f-plano-trabalho']) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('PDFs normativos referenciados pelos tipos existem no bundle das Functions', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
    const normasPath = path.join(root, 'functions/src/config/normas.json')
    const pdfDir = path.join(root, 'functions/src/config/normas-pdf')
    const catalog = JSON.parse(fs.readFileSync(normasPath, 'utf8')) as {
      fontes: Array<{ id: string; pdf: string; requerPdf?: boolean }>
    }
    const fonteById = new Map(catalog.fontes.map((f) => [f.id, f]))

    const fonteIds = new Set<string>()
    for (const tipo of TIPOS_ANALISE_SEED) {
      for (const id of tipo.normasFontes || []) fonteIds.add(id)
    }

    expect(fonteIds.size).toBeGreaterThan(0)
    for (const id of fonteIds) {
      const fonte = fonteById.get(id)
      expect(fonte, `fonte ${id} no catálogo`).toBeTruthy()
      if (fonte!.requerPdf === false) continue
      const pdfPath = path.join(pdfDir, fonte!.pdf)
      expect(fs.existsSync(pdfPath), `PDF ausente: ${pdfPath}`).toBe(true)
    }
  })
})
