import type { Organizacao, OrganizacaoCategoria } from '../../models/Organizacao'
import { perfilToOrganizacao } from '../../models/Organizacao'
import type { ModeloRelatorioConfig } from '../../models/ConcessionariaPerfil'
import {
  getConcessionariaPerfilById,
  listConcessionariasPerfil,
  updateConcessionariaPerfilFields,
} from '../concessionaria/concessionariaService'

/** Lista organizações (alias soft sobre concessionárias). */
export async function listOrganizacoes(): Promise<Organizacao[]> {
  const perfis = await listConcessionariasPerfil()
  return perfis.map(perfilToOrganizacao)
}

export async function getOrganizacaoById(id: string): Promise<Organizacao | null> {
  const perfil = await getConcessionariaPerfilById(id)
  return perfil ? perfilToOrganizacao(perfil) : null
}

export async function updateOrganizacaoMeta(
  id: string,
  patch: { categoria?: OrganizacaoCategoria; area?: string; nome?: string },
): Promise<Organizacao> {
  const updated = await updateConcessionariaPerfilFields(id, {
    ...(patch.categoria !== undefined ? { categoria: patch.categoria } : {}),
    ...(patch.area !== undefined ? { area: patch.area } : {}),
    ...(patch.nome !== undefined ? { nome: patch.nome } : {}),
  })
  return perfilToOrganizacao(updated)
}

export async function updateOrganizacaoModeloRelatorio(
  id: string,
  modeloRelatorio: ModeloRelatorioConfig,
): Promise<Organizacao> {
  const updated = await updateConcessionariaPerfilFields(id, { modeloRelatorio })
  return perfilToOrganizacao(updated)
}
