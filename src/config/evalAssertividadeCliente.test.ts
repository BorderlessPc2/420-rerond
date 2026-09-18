import { describe, expect, it } from 'vitest'
import {
  EVAL_ASSERTIVIDADE_CASOS,
  EVAL_CASO_POR_TIPO,
  resolveEvalCasoIdPorTipo,
  scoreEvalCaso,
  scoreRelatorioContraEval,
} from './evalAssertividadeCliente'

const CASOS_MULTI = [
  'eval-ppu-checklist',
  'eval-pacv-capixaba',
  'eval-pace-capixaba',
  'eval-pan-checklist',
  'eval-acesso-ipr',
] as const

describe('evalAssertividadeCliente', () => {
  it('tem caso POC Viana com findings críticos', () => {
    const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === 'eval-poc-edp-viana')
    expect(caso).toBeTruthy()
    expect(caso!.findings.some((f) => f.severidade === 'critico')).toBe(true)
    expect(caso!.findings.some((f) => f.programaHistoricoAcertou)).toBe(true)
  })

  it('score falha se crítico faltar', () => {
    const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === 'eval-poc-edp-viana')!
    const almostAll = caso.findings.filter((f) => f.id !== 'f-perfil').map((f) => f.id)
    const result = scoreEvalCaso({ casoId: 'eval-poc-edp-viana', findingsOk: almostAll })
    expect(result?.passouCriticos).toBe(false)
    expect(result?.criticosFalhos).toContain('f-perfil')
  })

  it('score passa críticos quando todos críticos ok', () => {
    const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === 'eval-poc-edp-viana')!
    const criticos = caso.findings.filter((f) => f.severidade === 'critico').map((f) => f.id)
    const result = scoreEvalCaso({ casoId: 'eval-poc-edp-viana', findingsOk: criticos })
    expect(result?.passouCriticos).toBe(true)
    expect(result?.ok).toBe(criticos.length)
  })

  it('scoreRelatorioContraEval marca críticos em relatório bom e rejeita anti-padrão de perfil', () => {
    const bom = `
      Memorial: corrigir Cariacica e excluir travessia (Viana/ES).
      Plano de Trabalho: sem inconsistências.
      Planta baixa: km 300+140 incorreto; indicar poste–bordo; assinar.
      Perfil foi apresentado; falta assinatura e codificação SUROD.
      Sinalização: adequar Manual EcoRodovias e carimbo.
      ART no Volume I deve ir ao Volume III.
      Licença: falta comprovação de inexigibilidade/dispensa.
      Conclusão: objeções pelas pendências reais.
      Volumes e codificação SUROD a adequar; requerimento/declaração com representante legal; cronograma no Volume III.
      Especificações: revisar sinalização provisória. PBA sob Sustentabilidade.
    `
    const scoreBom = scoreRelatorioContraEval('eval-poc-edp-viana', bom)
    expect(scoreBom?.passouCriticos).toBe(true)
    expect(scoreBom!.percentual).toBeGreaterThanOrEqual(70)

    const ruim = `
      Considerou o perfil não localizado.
      Inventou falta de recomposição no plano de trabalho.
      Planta completa e sem pendências.
    `
    const scoreRuim = scoreRelatorioContraEval('eval-poc-edp-viana', ruim)
    expect(scoreRuim?.criticosFalhos.length).toBeGreaterThan(0)
  })

  it.each(CASOS_MULTI)('%s tem ≥1 finding crítico e score falha se crítico ausente', (casoId) => {
    const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === casoId)
    expect(caso, casoId).toBeTruthy()
    const criticos = caso!.findings.filter((f) => f.severidade === 'critico')
    expect(criticos.length).toBeGreaterThanOrEqual(1)
    const semPrimeiro = caso!.findings.filter((f) => f.id !== criticos[0].id).map((f) => f.id)
    const result = scoreEvalCaso({ casoId, findingsOk: semPrimeiro })
    expect(result?.passouCriticos).toBe(false)
    expect(result?.criticosFalhos).toContain(criticos[0].id)
  })

  it('mapeia tipos críticos para casos de eval', () => {
    expect(resolveEvalCasoIdPorTipo('poc')).toBe('eval-poc-edp-viana')
    expect(resolveEvalCasoIdPorTipo('ppu')).toBe('eval-ppu-checklist')
    expect(resolveEvalCasoIdPorTipo('pac-viabilidade')).toBe('eval-pacv-capixaba')
    expect(resolveEvalCasoIdPorTipo('pac-executivo')).toBe('eval-pace-capixaba')
    expect(resolveEvalCasoIdPorTipo('pan')).toBe('eval-pan-checklist')
    expect(resolveEvalCasoIdPorTipo('acesso')).toBe('eval-acesso-ipr')
    expect(resolveEvalCasoIdPorTipo('ocupacao-faixa')).toBeNull()
    expect(Object.keys(EVAL_CASO_POR_TIPO).length).toBeGreaterThanOrEqual(6)
  })

  it('scoreRelatorioContraEval cobre needles dos casos multi-tipo', () => {
    const ppu = scoreRelatorioContraEval(
      'eval-ppu-checklist',
      'Análise PPU de publicidade: natureza PPU, estrutura de sustentação e interferências, requerimento/ART/declaração, plantas com área e FD/FNE.',
    )
    expect(ppu?.passouCriticos).toBe(true)

    const pan = scoreRelatorioContraEval(
      'eval-pan-checklist',
      'Processo de anuência PAN: poligonal com coordenadas, sobreposição com faixa de domínio, ART do imóvel.',
    )
    expect(pan?.passouCriticos).toBe(true)
  })

  it('scoreRelatorioContraEval reprova anti-padroes de mistura entre tipos/fases', () => {
    const ppuComPoc = scoreRelatorioContraEval(
      'eval-ppu-checklist',
      'A publicidade foi tratada com checklist de ocupação e POC_*; não há item próprio de sustentação.',
    )
    expect(ppuComPoc?.passouCriticos).toBe(false)
    expect(ppuComPoc?.criticosFalhos).toContain('PPU_NATUREZA_INTERVENCAO')

    const pacvComExecutivo = scoreRelatorioContraEval(
      'eval-pacv-capixaba',
      'Na fase de viabilidade, exigir terraplenagem na viabilidade e disciplinas de executivo na viabilidade.',
    )
    expect(pacvComExecutivo?.passouCriticos).toBe(false)
    expect(pacvComExecutivo?.criticosFalhos).toContain('PACV_ESCOPO_VIABILIDADE')

    const panComoPac = scoreRelatorioContraEval(
      'eval-pan-checklist',
      'Processo de anuência PAN avaliado com checklist PAC e checklist POC, tratar como ocupação.',
    )
    expect(panComoPac?.passouCriticos).toBe(false)
    expect(panComoPac?.criticosFalhos).toContain('PAN_FINALIDADE_ANUENCIA')

    const acessoComPoc = scoreRelatorioContraEval(
      'eval-acesso-ipr',
      'Acesso com faixa de domínio avaliado por checklist POC e ocupação longitudinal; geometria ok sem cotas.',
    )
    expect(acessoComPoc?.passouCriticos).toBe(false)
    expect(acessoComPoc?.criticosFalhos).toEqual(
      expect.arrayContaining(['ACESSO_FD_DOCS', 'ACESSO_GEOMETRIA_VISIBILIDADE']),
    )
  })
})
