import { describe, expect, it } from 'vitest'
import { agruparLinhasImportacao, normalizarCabecalho, type RawImportRow } from './gestaoImportacao'

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
})
