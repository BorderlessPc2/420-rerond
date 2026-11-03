import * as XLSX from 'xlsx'
import type { Ponto, Protocolo } from './gestaoContratos'
import { filtrarGestao } from './gestaoContratos'

/** Filtro operacional compartilhado entre dashboard, listas e exportação. Período: compara `previsao` do ponto ou, se vazia, `previsao` do protocolo vinculado. */
export type GestaoFiltro = {
  estado?: string
  concessionaria?: string
  rodovia?: string
  status?: string
  tipo?: string
  etapa?: string
  inicio?: string
  fim?: string
  busca?: string
  protocoloId?: string
  pontoCodigo?: string
}

export const GESTAO_FILTRO_QUERY_KEYS = ['estado', 'concessionaria', 'rodovia', 'status', 'tipo', 'etapa', 'inicio', 'fim', 'q'] as const

export const gestaoFiltroFromSearchParams = (params: URLSearchParams): GestaoFiltro => ({
  estado: params.get('estado') ?? '',
  concessionaria: params.get('concessionaria') ?? '',
  rodovia: params.get('rodovia') ?? '',
  status: params.get('status') ?? '',
  tipo: params.get('tipo') ?? '',
  etapa: params.get('etapa') ?? '',
  inicio: params.get('inicio') ?? '',
  fim: params.get('fim') ?? '',
  busca: params.get('q') ?? '',
  protocoloId: '',
  pontoCodigo: '',
})

export const filtrarGestaoComFiltro = (protocolos: Protocolo[], pontos: Ponto[], filtro: GestaoFiltro) =>
  filtrarGestao(protocolos, pontos, { ...filtro, protocoloId: filtro.protocoloId ?? '', pontoCodigo: filtro.pontoCodigo ?? '' })

export type GestaoExportRowProtocolo = {
  titulo: string
  concessionaria: string
  rodovia: string
  numero: string
  etapa: string
  status: string
  previsao: string
  realizadoEm: string
  pontosVinculados: number
}

export type GestaoExportRowPonto = {
  codigo: string
  protocolo: string
  estado: string
  concessionaria: string
  rodovia: string
  km: string
  tipo: string
  resultado: string
  previsao: string
  realizadoEm: string
}

export function montarDadosExportacao(protocolos: Protocolo[], pontos: Ponto[], filtro: GestaoFiltro) {
  const recorte = filtrarGestaoComFiltro(protocolos, pontos, filtro)
  const protocolosRows: GestaoExportRowProtocolo[] = recorte.protocolos.map((item) => ({
    titulo: item.titulo,
    concessionaria: item.concessionaria,
    rodovia: item.rodovia,
    numero: item.numero ?? '',
    etapa: item.etapa,
    status: item.status,
    previsao: item.previsao ?? '',
    realizadoEm: item.realizadoEm ?? '',
    pontosVinculados: recorte.pontos.filter((ponto) => ponto.protocoloId === item.id).length,
  }))
  const pontosRows: GestaoExportRowPonto[] = recorte.pontos.map((item) => {
    const protocolo = item.protocoloId ? protocolos.find((entry) => entry.id === item.protocoloId) : undefined
    return {
      codigo: item.codigo,
      protocolo: protocolo?.titulo ?? '',
      estado: item.estado,
      concessionaria: item.concessionaria,
      rodovia: item.rodovia,
      km: item.km,
      tipo: item.tipo,
      resultado: item.resultado ?? '',
      previsao: item.previsao ?? '',
      realizadoEm: item.realizadoEm ?? '',
    }
  })
  return { recorte, protocolosRows, pontosRows }
}

export function exportarRecorteGestao(nomeContrato: string, protocolos: Protocolo[], pontos: Ponto[], filtro: GestaoFiltro) {
  const { recorte, protocolosRows, pontosRows } = montarDadosExportacao(protocolos, pontos, filtro)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(protocolosRows), 'Protocolos')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(pontosRows), 'Pontos')
  const slug = nomeContrato.trim().replace(/\s+/g, '-').slice(0, 40) || 'contrato'
  XLSX.writeFile(workbook, `gestao-${slug}-${recorte.protocolos.length}p-${recorte.pontos.length}pts.xlsx`)
  return { protocolos: recorte.protocolos.length, pontos: recorte.pontos.length }
}
