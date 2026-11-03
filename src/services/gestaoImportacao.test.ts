import { describe, expect, it } from 'vitest'
import { agruparLinhasImportacao, detectarPerfilPlanilha, enriquecerPreviewImportacao, exportarRelatorioErrosImportacao, extrairPontosRascunho, mesclarPontosRascunho, normalizarCabecalho, parsePlanilha, planejarGrupoImportacao, type RawImportRow } from './gestaoImportacao'

describe('importação de planilhas', () => {
  it('normaliza cabeçalhos e agrupa pontos pelo protocolo', () => {
    const rows: RawImportRow[] = [
      { linha: 2, titulo_protocolo: ' Protocolo A ', concessionaria: 'Eco', rodovia: 'BR-101', codigo_ponto: 'P1', estado: 'ES', km: '10' },
      { linha: 3, titulo_protocolo: 'protocolo a', concessionaria: 'Eco', rodovia: 'BR-101', codigo_ponto: 'P2', estado: 'RJ', km: '20' },
    ]
    const preview = agruparLinhasImportacao(rows)
    expect(preview.protocolos).toHaveLength(1)
    expect(preview.protocolos[0].pontos).toHaveLength(2)
    expect(preview.linhasInvalidas).toEqual([])
    expect(normalizarCabecalho('Código Ponto')).toBe('codigo_ponto')
  })
  it('retorna erro por linha para campo obrigatório e coordenadas inválidas', () => {
    const preview = agruparLinhasImportacao([{ linha: 2, titulo_protocolo: 'P', concessionaria: 'Eco', rodovia: 'BR-101', codigo_ponto: '', estado: '', km: '', latitude: '91', longitude: '0' }])
    expect(preview.linhasInvalidas[0]).toMatchObject({ linha: 2 })
    expect(preview.linhasInvalidas[0].erros).toEqual(expect.arrayContaining(['Informe código, estado e quilômetro.', 'Coordenadas inválidas.']))
  })
  it('marca ponto duplicado e aceita linha de protocolo sem ponto', () => {
    const preview = agruparLinhasImportacao([
      { linha: 2, titulo_protocolo: 'P', concessionaria: 'Eco', rodovia: 'BR-101', codigo_ponto: 'P1', estado: 'ES', km: '10' },
      { linha: 3, titulo_protocolo: 'P', concessionaria: 'Eco', rodovia: 'BR-101', codigo_ponto: 'P1', estado: 'ES', km: '10' },
      { linha: 4, titulo_protocolo: 'Q', concessionaria: 'Eco', rodovia: 'BR-116' },
    ])
    expect(preview.linhasInvalidas[0].erros).toContain('Código de ponto duplicado neste protocolo.')
    expect(preview.protocolos.find((item) => item.input.titulo === 'Q')?.pontos).toHaveLength(0)
  })
  it('rejeita arquivo vazio antes de interpretar a planilha', async () => {
    await expect(parsePlanilha(new File([], 'vazio.csv'))).rejects.toThrow('Arquivo de planilha vazio.')
  })
  it('enriquece prévia com protocolo existente e códigos ignorados', () => {
    const preview = agruparLinhasImportacao([
      { linha: 2, titulo_protocolo: 'P', concessionaria: 'Eco', rodovia: 'BR-101', codigo_ponto: 'P1', estado: 'ES', km: '10' },
      { linha: 3, titulo_protocolo: 'P', concessionaria: 'Eco', rodovia: 'BR-101', codigo_ponto: 'P2', estado: 'ES', km: '11' },
    ])
    const enriquecido = enriquecerPreviewImportacao(
      preview,
      [{ id: 'proto-1', titulo: 'P', concessionaria: 'Eco', rodovia: 'BR-101', etapa: 'planejamento', status: 'nao_iniciado', contratoId: 'c' }],
      [{ protocoloId: 'proto-1', codigo: 'P1' }],
    )
    expect(enriquecido.totais.protocolosExistentes).toBe(1)
    expect(enriquecido.grupos[0].codigosIgnorados).toEqual(['P1'])
    expect(enriquecido.grupos[0].pontosNovos).toBe(1)
  })
  it('reimportação equivalente não prevê pontos novos', () => {
    const preview = agruparLinhasImportacao([
      { linha: 2, titulo_protocolo: 'P', concessionaria: 'Eco', rodovia: 'BR-101', codigo_ponto: 'P1', estado: 'ES', km: '10' },
    ])
    const planejamento = planejarGrupoImportacao(preview.protocolos[0], { id: 'proto-1' }, ['p1'])
    expect(planejamento.pontosNovos).toHaveLength(0)
    expect(planejamento.codigosIgnorados).toEqual(['P1'])
  })
  it('exporta relatório de erros somente quando há linhas inválidas', () => {
    expect(exportarRelatorioErrosImportacao([])).toBe(false)
    expect(exportarRelatorioErrosImportacao([{ linha: 2, erros: ['Erro'] }])).toBe(true)
  })
  it('detecta planilha só de pontos vs importação completa', () => {
    const pontos = detectarPerfilPlanilha(['Código', 'Estado', 'Km'], 3)
    expect(pontos.perfil).toBe('somente_pontos')
    expect(pontos.camposDetectados.map((item) => item.campo)).toEqual(expect.arrayContaining(['codigo_ponto', 'estado', 'km']))
    const completa = detectarPerfilPlanilha(['titulo_protocolo', 'concessionaria', 'rodovia', 'codigo_ponto', 'estado', 'km'], 1)
    expect(completa.perfil).toBe('protocolos_e_pontos')
  })
  it('extrai pontos para rascunho usando concessionária e rodovia do formulário', () => {
    const { pontos, linhasInvalidas } = extrairPontosRascunho(
      [{ linha: 2, codigo_ponto: 'P1', estado: 'ES', km: '10' }, { linha: 3, codigo_ponto: 'P2', estado: 'RJ', km: '20' }],
      'Eco',
      'BR-101',
    )
    expect(linhasInvalidas).toEqual([])
    expect(pontos).toHaveLength(2)
    expect(pontos[0]).toMatchObject({ codigo: 'P1', concessionaria: 'Eco', rodovia: 'BR-101' })
  })
  it('mescla rascunho substituindo códigos repetidos', () => {
    const merged = mesclarPontosRascunho(
      [{ codigo: 'P1', estado: 'ES', km: '1', tipo: 'nova_implantacao', concessionaria: 'Eco', rodovia: 'BR-101' }],
      [{ codigo: 'P1', estado: 'RJ', km: '2', tipo: 'nova_implantacao', concessionaria: 'Eco', rodovia: 'BR-101' }, { codigo: 'P2', estado: 'ES', km: '3', tipo: 'nova_implantacao', concessionaria: 'Eco', rodovia: 'BR-101' }],
    )
    expect(merged.pontos).toHaveLength(2)
    expect(merged.pontos.find((item) => item.codigo === 'P1')?.estado).toBe('RJ')
    expect(merged.duplicadosIgnorados).toBe(1)
  })
})
