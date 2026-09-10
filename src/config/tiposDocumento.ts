import type { TipoDocumentoAnexo } from '../models/Solicitacao'

export const TIPOS_DOCUMENTO_OPTIONS: Array<{
  value: TipoDocumentoAnexo
  label: string
}> = [
  { value: 'requerimento', label: 'Requerimento' },
  { value: 'memorial_descritivo', label: 'Memorial Descritivo' },
  { value: 'plano_trabalho', label: 'Plano de Trabalho' },
  { value: 'planta_baixa', label: 'Planta Baixa' },
  { value: 'perfil_ocupacao', label: 'Perfil da Ocupação' },
  { value: 'projeto_sinalizacao', label: 'Projeto de Sinalização' },
  { value: 'projeto_terraplenagem', label: 'Terraplenagem' },
  { value: 'projeto_drenagem', label: 'Drenagem' },
  { value: 'projeto_pavimentacao', label: 'Pavimentação' },
  { value: 'projeto_topografico', label: 'Topográfico' },
  { value: 'projeto_geometrico', label: 'Geométrico' },
  { value: 'projeto_publicidade', label: 'Projeto de Publicidade (PPU)' },
  { value: 'estrutura_sustentacao', label: 'Estrutura de Sustentação' },
  { value: 'art', label: 'ART' },
  { value: 'cronograma', label: 'Cronograma' },
  { value: 'declaracao_veracidade', label: 'Declaração de Veracidade' },
  { value: 'licenca_ambiental', label: 'Licença Ambiental / Dispensa' },
  { value: 'parecer_concessionaria', label: 'Parecer da Concessionária' },
  { value: 'documento_complementar', label: 'Documento Complementar' },
  { value: 'outro', label: 'Outro...' },
  { value: 'desconhecido', label: 'Desconhecido' },
]

export type TipoDocumentoOption = {
  value: string
  label: string
  /** Documento cadastrado no perfil da concessionária. */
  fromPerfil?: boolean
}

/** Catálogo fixo + documentos custom do perfil (ids `custom_*`). */
export function buildTiposDocumentoOptions(
  documentosCustom?: Array<{ id: string; label: string }> | null,
): TipoDocumentoOption[] {
  const catalog = TIPOS_DOCUMENTO_OPTIONS.filter((o) => o.value !== 'desconhecido')
  const known = new Set<string>(catalog.map((o) => o.value))
  const customs: TipoDocumentoOption[] = []
  for (const doc of documentosCustom ?? []) {
    const id = (doc.id || '').trim()
    const label = (doc.label || '').trim()
    if (!id || !label || known.has(id)) continue
    known.add(id)
    customs.push({ value: id, label, fromPerfil: true })
  }
  const outro = catalog.find((o) => o.value === 'outro')
  const semOutro = catalog.filter((o) => o.value !== 'outro')
  return [
    ...semOutro,
    ...customs,
    ...(outro ? [outro] : []),
    { value: 'desconhecido', label: 'Desconhecido' },
  ]
}

/** Custom do perfil → `outro` + label; catálogo → valor tipado. */
export function resolveTipoDocumentoSelection(
  value: string,
  documentosCustom?: Array<{ id: string; label: string }> | null,
): { tipoDocumento: TipoDocumentoAnexo; tipoDocumentoLabel?: string } {
  const custom = (documentosCustom ?? []).find((d) => d.id === value)
  if (custom) {
    return { tipoDocumento: 'outro', tipoDocumentoLabel: custom.label }
  }
  return { tipoDocumento: value as TipoDocumentoAnexo }
}

export function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`
}
