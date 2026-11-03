import { describe, expect, it } from 'vitest'
import {
  aplicarIntencaoTransicao,
  descreverTransicao,
  listarEtapasPermitidas,
  listarSituacoesAlcancaveis,
  validarCombinacaoEtapaStatus,
  validarConclusaoProtocolo,
  validarTransicao,
} from './gestaoTransicoes'

describe('gestaoTransicoes', () => {
  it('exige etapa e situação concluídas juntas', () => {
    expect(validarCombinacaoEtapaStatus('concluido', 'em_andamento')).toMatch(/Etapa concluída/)
    expect(validarCombinacaoEtapaStatus('fase_1', 'concluido')).toMatch(/Situação concluída/)
    expect(validarCombinacaoEtapaStatus('concluido', 'concluido')).toBeNull()
  })

  it('restringe não iniciado à etapa planejamento', () => {
    expect(validarCombinacaoEtapaStatus('elaboracao', 'nao_iniciado')).toMatch(/não iniciada/)
  })

  it('bloqueia conclusão com pontos sem resultado', () => {
    expect(validarConclusaoProtocolo([{ resultado: 'regularizado' }, {}])).toMatch(/Conclusão bloqueada/)
    expect(validarConclusaoProtocolo([{ resultado: 'regularizado' }])).toBeNull()
    expect(validarConclusaoProtocolo([])).toBeNull()
  })

  it('rejeita transição para correção sem observação', () => {
    expect(validarTransicao('fase_1', 'em_andamento', 'fase_1', 'em_correcao', '')).toBe('Informe observação para correção ou paralisação.')
  })

  it('rejeita conclusão operacional com pendências nos pontos', () => {
    expect(validarTransicao('homologacao', 'aprovado_concessionaria', 'concluido', 'concluido', 'Encerramento', [{}, { resultado: 'aprovado_implantacao' }])).toMatch(/Conclusão bloqueada/)
  })

  it('impede retrocesso de protocolo concluído', () => {
    expect(validarTransicao('concluido', 'concluido', 'homologacao', 'em_andamento', 'Reabrir', [])).toMatch(/concluído não pode retroceder/)
  })

  it('lista etapas permitidas a partir da etapa atual', () => {
    expect(listarEtapasPermitidas('fase_1')).toEqual(['fase_1', 'fase_2', 'homologacao', 'concluido'])
    expect(listarEtapasPermitidas('concluido')).toEqual(['concluido'])
  })

  it('marca situações indisponíveis com motivo', () => {
    const opcoes = listarSituacoesAlcancaveis('fase_1', 'em_andamento', 'fase_1', '', [])
    const correcao = opcoes.find((item) => item.situacao === 'em_correcao')
    expect(correcao?.disponivel).toBe(false)
    expect(correcao?.motivo).toMatch(/observação/)
  })

  it('descreve transição válida e pendências de conclusão', () => {
    const ok = descreverTransicao('fase_1', 'em_andamento', 'fase_1', 'em_analise', '', [])
    expect(ok.valido).toBe(true)
    const bloqueada = descreverTransicao('homologacao', 'aprovado_concessionaria', 'concluido', 'concluido', 'Fim', [{}, {}])
    expect(bloqueada.valido).toBe(false)
    expect(bloqueada.pontosSemResultado).toBe(2)
  })

  it('aplica intenções de correção e avanço de etapa', () => {
    expect(aplicarIntencaoTransicao('correcao', 'fase_1', 'em_andamento')).toEqual({ etapa: 'fase_1', status: 'em_correcao' })
    expect(aplicarIntencaoTransicao('avancar_etapa', 'fase_1', 'em_andamento')).toEqual({ etapa: 'fase_2', status: 'em_andamento' })
  })
})
