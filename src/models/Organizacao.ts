import type {
  ConcessionariaPerfil,
  DocumentoObrigatorioCustom,
  ModeloRelatorioConfig,
  NormaCustom,
  PromptProfileId,
  RequisitoChecklist,
} from './ConcessionariaPerfil'

/** Soft alias: mesma coleção/id da concessionária (migração suave). */
export type OrganizacaoCategoria =
  | 'rodovia'
  | 'agua'
  | 'esgoto'
  | 'prefeitura'
  | 'orgao'
  | 'outro'

export type Organizacao = {
  id: string
  /** Compat: sempre igual a `id` (concessionariaId legado). */
  concessionariaId: string
  nome: string
  categoria: OrganizacaoCategoria
  /** Ex.: rodovia, município, área de atuação. */
  area?: string
  aliases: string[]
  ativo: boolean
  promptProfile: PromptProfileId
  normasFontes: string[]
  normasCustom?: NormaCustom[]
  modeloRelatorio: ModeloRelatorioConfig
  documentosObrigatorios: string[]
  documentosCustom?: DocumentoObrigatorioCustom[]
  requisitos: RequisitoChecklist[]
  logoUrl?: string | null
  perfilCompleto: boolean
}

export const ORGANIZACAO_CATEGORIA_OPTIONS: Array<{
  value: OrganizacaoCategoria
  label: string
}> = [
  { value: 'rodovia', label: 'Rodovia / concessionária' },
  { value: 'agua', label: 'Água' },
  { value: 'esgoto', label: 'Esgoto / saneamento' },
  { value: 'prefeitura', label: 'Prefeitura' },
  { value: 'orgao', label: 'Órgão regulador' },
  { value: 'outro', label: 'Outro' },
]

export function perfilToOrganizacao(
  perfil: ConcessionariaPerfil & { categoria?: OrganizacaoCategoria; area?: string },
): Organizacao {
  return {
    id: perfil.id,
    concessionariaId: perfil.id,
    nome: perfil.nome,
    categoria: perfil.categoria ?? 'rodovia',
    area: perfil.area ?? perfil.rodovia,
    aliases: perfil.aliases ?? [],
    ativo: perfil.ativo,
    promptProfile: perfil.promptProfile,
    normasFontes: perfil.normasFontes ?? [],
    normasCustom: perfil.normasCustom,
    modeloRelatorio: perfil.modeloRelatorio,
    documentosObrigatorios: perfil.documentosObrigatorios ?? [],
    documentosCustom: perfil.documentosCustom,
    requisitos: perfil.requisitos ?? [],
    logoUrl: perfil.logoUrl,
    perfilCompleto: perfil.perfilCompleto,
  }
}
