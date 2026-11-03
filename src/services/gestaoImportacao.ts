import * as XLSX from 'xlsx'
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { validarInputPonto, validarInputProtocolo, type PontoInput, type ProtocoloInput } from './gestaoValidacao'
import type { Protocolo } from './gestaoContratos'

export const LIMITE_PONTOS_PROTOCOLO_NOVO = 499
export const LIMITE_PONTOS_PROTOCOLO_EXISTENTE = 500

export type RawImportRow = Record<string, unknown> & { linha: number }
export type ImportPreview = {
  protocolos: { key: string; input: ProtocoloInput; pontos: PontoInput[] }[]
  linhasInvalidas: { linha: number; erros: string[] }[]
}
export type ImportGroupEnriquecido = ImportPreview['protocolos'][number] & {
  protocoloExistente: boolean
  pontosNovos: number
  codigosIgnorados: string[]
  limitePontos: number
  excedeLimite: boolean
}
export type ImportPreviewEnriquecido = ImportPreview & {
  grupos: ImportGroupEnriquecido[]
  totais: {
    protocolos: number
    pontos: number
    linhasInvalidas: number
    pontosIgnorados: number
    protocolosExistentes: number
    protocolosNovos: number
  }
}

export type CampoPlanilhaGestao =
  | 'titulo_protocolo'
  | 'concessionaria'
  | 'rodovia'
  | 'numero_protocolo'
  | 'codigo_ponto'
  | 'estado'
  | 'km'
  | 'classificacao'
  | 'latitude'
  | 'longitude'
  | 'precisao'

export type PerfilPlanilhaGestao = 'protocolos_e_pontos' | 'somente_pontos' | 'sem_dados_ponto' | 'nao_reconhecida'

export type AnalisePlanilha = {
  perfil: PerfilPlanilhaGestao
  descricaoPerfil: string
  cabecalhosOriginais: string[]
  camposDetectados: { campo: CampoPlanilhaGestao; coluna: string }[]
  colunasNaoMapeadas: string[]
  totalLinhas: number
}

export type ContextoRascunhoProtocolo = Pick<ProtocoloInput, 'titulo' | 'concessionaria' | 'rodovia' | 'numero'>

export type ResultadoPlanilhaRascunho = {
  analise: AnalisePlanilha
  pontos: PontoInput[]
  linhasInvalidas: ImportPreview['linhasInvalidas']
  sugestaoProtocolo?: Partial<ProtocoloInput>
  avisos: string[]
  nomeArquivo: string
  linhas: RawImportRow[]
}

const CAMPOS_CANONICOS = new Set<CampoPlanilhaGestao>([
  'titulo_protocolo',
  'concessionaria',
  'rodovia',
  'numero_protocolo',
  'codigo_ponto',
  'estado',
  'km',
  'classificacao',
  'latitude',
  'longitude',
  'precisao',
])

export const labelCampoPlanilha = (campo: CampoPlanilhaGestao) =>
  ({
    titulo_protocolo: 'Título do protocolo',
    concessionaria: 'Concessionária',
    rodovia: 'Rodovia',
    numero_protocolo: 'Número do protocolo',
    codigo_ponto: 'Código do ponto',
    estado: 'Estado (UF)',
    km: 'Quilômetro',
    classificacao: 'Classificação / tipo',
    latitude: 'Latitude',
    longitude: 'Longitude',
    precisao: 'Precisão da coordenada',
  })[campo]

const descricaoPerfilPlanilha: Record<PerfilPlanilhaGestao, string> = {
  protocolos_e_pontos: 'Planilha completa — traz dados do protocolo e dos pontos (importação em lote).',
  somente_pontos: 'Planilha de pontos — usa concessionária e rodovia informadas no formulário do protocolo.',
  sem_dados_ponto: 'Há colunas de protocolo, mas nenhuma coluna de ponto reconhecida.',
  nao_reconhecida: 'Cabeçalhos não correspondem ao modelo esperado de pontos ou importação completa.',
}

const aliases: Record<string, string> = {
  titulo: 'titulo_protocolo', titulo_protocolo: 'titulo_protocolo', protocolo: 'titulo_protocolo',
  concessionaria: 'concessionaria', rodovia: 'rodovia', numero: 'numero_protocolo', numero_protocolo: 'numero_protocolo',
  codigo: 'codigo_ponto', codigo_ponto: 'codigo_ponto', ponto: 'codigo_ponto', estado: 'estado', km: 'km', quilometro: 'km',
  classificacao: 'classificacao', tipo: 'classificacao', latitude: 'latitude', longitude: 'longitude', precisao: 'precisao',
}
const text = (value: unknown) => String(value ?? '').trim()
const number = (value: unknown) => {
  const parsed = Number(text(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}
export const normalizarCabecalho = (value: string) => aliases[value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '_')] ?? value.toLowerCase().trim().replace(/\s+/g, '_')
export const normalizeKey = (value: string) => value.trim().toLocaleLowerCase('pt-BR')

export const protocoloImportKey = (input: Pick<ProtocoloInput, 'titulo' | 'concessionaria' | 'rodovia'>) =>
  [input.titulo, input.concessionaria, input.rodovia].map(normalizeKey).join('|')

const rowNormalizada = (raw: RawImportRow) =>
  Object.fromEntries(Object.entries(raw).filter(([key]) => key !== 'linha').map(([key, value]) => [normalizarCabecalho(key), value]))

const pontoFromRow = (row: Record<string, unknown>, concessionaria: string, rodovia: string): { ponto: PontoInput; hasPoint: boolean } => {
  const codigo = text(row.codigo_ponto)
  const hasPoint = Boolean(codigo || text(row.estado) || text(row.km) || text(row.latitude) || text(row.longitude))
  const ponto: PontoInput = {
    codigo,
    estado: text(row.estado),
    km: text(row.km),
    tipo: text(row.classificacao) === 'regularizacao' ? 'regularizacao' : 'nova_implantacao',
    concessionaria,
    rodovia,
    ...(text(row.latitude) || text(row.longitude)
      ? {
          latitude: number(row.latitude),
          longitude: number(row.longitude),
          precisao: text(row.precisao) === 'aproximada' ? 'aproximada' : 'confirmada',
        }
      : {}),
  }
  return { ponto, hasPoint }
}

export function detectarPerfilPlanilha(cabecalhosOriginais: string[], totalLinhas: number): AnalisePlanilha {
  const camposDetectados: AnalisePlanilha['camposDetectados'] = []
  const vistos = new Set<CampoPlanilhaGestao>()
  cabecalhosOriginais.forEach((coluna) => {
    const campo = normalizarCabecalho(coluna)
    if (!CAMPOS_CANONICOS.has(campo as CampoPlanilhaGestao) || vistos.has(campo as CampoPlanilhaGestao)) return
    vistos.add(campo as CampoPlanilhaGestao)
    camposDetectados.push({ campo: campo as CampoPlanilhaGestao, coluna })
  })
  const campos = new Set(camposDetectados.map((item) => item.campo))
  const temProtocolo = ['titulo_protocolo', 'concessionaria', 'rodovia'].every((item) => campos.has(item as CampoPlanilhaGestao))
  const temPonto = campos.has('codigo_ponto') && (campos.has('estado') || campos.has('km'))
  let perfil: PerfilPlanilhaGestao = 'nao_reconhecida'
  if (temProtocolo && temPonto) perfil = 'protocolos_e_pontos'
  else if (temPonto) perfil = 'somente_pontos'
  else if (temProtocolo) perfil = 'sem_dados_ponto'
  const colunasNaoMapeadas = cabecalhosOriginais.filter((coluna) => !CAMPOS_CANONICOS.has(normalizarCabecalho(coluna) as CampoPlanilhaGestao))
  return {
    perfil,
    descricaoPerfil: descricaoPerfilPlanilha[perfil],
    cabecalhosOriginais,
    camposDetectados,
    colunasNaoMapeadas,
    totalLinhas,
  }
}

export async function lerPlanilhaBruta(file: File) {
  if (!file.size) throw new Error('Arquivo de planilha vazio.')
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Planilha sem abas.')
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  if (!rows.length) throw new Error('Planilha sem linhas de dados.')
  const cabecalhosOriginais = Object.keys(rows[0])
  const linhas = rows.map((row, index) => ({ ...row, linha: index + 2 }) as RawImportRow)
  return { cabecalhosOriginais, linhas }
}

export function extrairPontosRascunho(
  rows: RawImportRow[],
  concessionaria: string,
  rodovia: string,
): { pontos: PontoInput[]; linhasInvalidas: ImportPreview['linhasInvalidas'] } {
  const pontos: PontoInput[] = []
  const linhasInvalidas: ImportPreview['linhasInvalidas'] = []
  const seen = new Set<string>()
  const protocoloCtx: ProtocoloInput = { titulo: 'Rascunho', concessionaria, rodovia }
  rows.forEach((raw) => {
    const row = rowNormalizada(raw)
    const { ponto, hasPoint } = pontoFromRow(row, concessionaria, rodovia)
    if (!hasPoint) return
    const errors = validarInputPonto(ponto, protocoloCtx)
    if (seen.has(normalizeKey(ponto.codigo))) errors.push('Código de ponto duplicado na planilha.')
    if (errors.length) {
      linhasInvalidas.push({ linha: raw.linha, erros: [...new Set(errors)] })
      return
    }
    seen.add(normalizeKey(ponto.codigo))
    pontos.push(ponto)
  })
  return { pontos, linhasInvalidas }
}

export function mesclarPontosRascunho(existentes: PontoInput[], novos: PontoInput[]) {
  const map = new Map(existentes.map((item) => [normalizeKey(item.codigo), item]))
  let duplicadosIgnorados = 0
  novos.forEach((item) => {
    if (map.has(normalizeKey(item.codigo))) duplicadosIgnorados += 1
    map.set(normalizeKey(item.codigo), item)
  })
  return { pontos: [...map.values()], duplicadosIgnorados }
}

export async function parsePlanilhaParaRascunhoProtocolo(file: File, contexto: ContextoRascunhoProtocolo): Promise<ResultadoPlanilhaRascunho> {
  const { cabecalhosOriginais, linhas } = await lerPlanilhaBruta(file)
  const analise = detectarPerfilPlanilha(cabecalhosOriginais, linhas.length)
  const avisos: string[] = []

  if (analise.perfil === 'nao_reconhecida') {
    throw new Error('Não foi possível identificar colunas de pontos. Use código + estado/km, ou o modelo completo de importação.')
  }
  if (analise.perfil === 'sem_dados_ponto') {
    throw new Error('A planilha parece listar protocolos, mas faltam colunas de ponto (código, estado ou km).')
  }

  if (analise.perfil === 'somente_pontos') {
    const concessionaria = contexto.concessionaria.trim()
    const rodovia = contexto.rodovia.trim()
    if (!concessionaria || !rodovia) {
      return {
        analise,
        pontos: [],
        linhasInvalidas: [],
        avisos: ['Preencha concessionária e rodovia no formulário para validar e aplicar os pontos.'],
        nomeArquivo: file.name,
        linhas,
      }
    }
    const { pontos, linhasInvalidas } = extrairPontosRascunho(linhas, concessionaria, rodovia)
    if (!pontos.length && !linhasInvalidas.length) {
      throw new Error('Nenhuma linha de ponto encontrada na planilha.')
    }
    return { analise, pontos, linhasInvalidas, avisos, nomeArquivo: file.name, linhas }
  }

  const preview = agruparLinhasImportacao(linhas)
  if (preview.protocolos.length > 1) {
    avisos.push(`A planilha contém ${preview.protocolos.length} protocolos. Será usado o grupo que combinar com o formulário, ou o primeiro grupo se os campos estiverem vazios.`)
  }
  const alvo =
    preview.protocolos.find((group) => protocoloImportKey(group.input) === protocoloImportKey(contexto)) ??
    preview.protocolos[0]
  const sugestaoProtocolo: Partial<ProtocoloInput> = {
    titulo: alvo.input.titulo,
    concessionaria: alvo.input.concessionaria,
    rodovia: alvo.input.rodovia,
    ...(alvo.input.numero ? { numero: alvo.input.numero } : {}),
  }
  if (preview.protocolos.length > 1 && protocoloImportKey(alvo.input) !== protocoloImportKey(contexto)) {
    avisos.push(`Pontos carregados do protocolo “${alvo.input.titulo}” (${alvo.input.concessionaria} · ${alvo.input.rodovia}).`)
  }
  return {
    analise,
    pontos: alvo.pontos,
    linhasInvalidas: preview.linhasInvalidas,
    sugestaoProtocolo,
    avisos,
    nomeArquivo: file.name,
    linhas,
  }
}

export const agruparLinhasImportacao = (rows: RawImportRow[]): ImportPreview => {
  const protocols = new Map<string, { key: string; input: ProtocoloInput; pontos: PontoInput[] }>()
  const invalid: ImportPreview['linhasInvalidas'] = []
  const seen = new Set<string>()
  rows.forEach((raw) => {
    const row = rowNormalizada(raw)
    const input: ProtocoloInput = { titulo: text(row.titulo_protocolo), concessionaria: text(row.concessionaria), rodovia: text(row.rodovia), ...(text(row.numero_protocolo) ? { numero: text(row.numero_protocolo) } : {}) }
    const errors = validarInputProtocolo(input)
    const { ponto, hasPoint } = pontoFromRow(row, input.concessionaria, input.rodovia)
    if (hasPoint) errors.push(...validarInputPonto(ponto, input))
    const key = protocoloImportKey(input)
    if (hasPoint && seen.has(`${key}|${normalizeKey(ponto.codigo)}`)) errors.push('Código de ponto duplicado neste protocolo.')
    if (errors.length) { invalid.push({ linha: raw.linha, erros: [...new Set(errors)] }); return }
    if (hasPoint) seen.add(`${key}|${normalizeKey(ponto.codigo)}`)
    const group = protocols.get(key) ?? { key, input, pontos: [] }
    if (hasPoint) group.pontos.push(ponto)
    protocols.set(key, group)
  })
  return { protocolos: [...protocols.values()], linhasInvalidas: invalid }
}

export const parsePlanilha = async (file: File): Promise<ImportPreview> => {
  const { cabecalhosOriginais, linhas } = await lerPlanilhaBruta(file)
  const analise = detectarPerfilPlanilha(cabecalhosOriginais, linhas.length)
  if (analise.perfil !== 'protocolos_e_pontos') {
    if (analise.perfil === 'somente_pontos') throw new Error('Planilha só de pontos. Use “Novo protocolo” e importe dentro do modal, ou baixe o modelo completo.')
    throw new Error('Planilha deve conter título, concessionária, rodovia e colunas de ponto (código, estado ou km).')
  }
  return agruparLinhasImportacao(linhas)
}

export function planejarGrupoImportacao(
  group: ImportPreview['protocolos'][number],
  protocoloExistente: Pick<Protocolo, 'id'> | undefined,
  codigosExistentes: string[],
) {
  const limitePontos = protocoloExistente ? LIMITE_PONTOS_PROTOCOLO_EXISTENTE : LIMITE_PONTOS_PROTOCOLO_NOVO
  const codigosIgnorados: string[] = []
  const pontosNovos: PontoInput[] = []
  group.pontos.forEach((point) => {
    if (codigosExistentes.includes(normalizeKey(point.codigo))) codigosIgnorados.push(point.codigo)
    else pontosNovos.push(point)
  })
  const excedeLimite = pontosNovos.length > limitePontos
  return { limitePontos, codigosIgnorados, pontosNovos, excedeLimite }
}

export function enriquecerPreviewImportacao(
  preview: ImportPreview,
  protocolosExistentes: Pick<Protocolo, 'id' | 'titulo' | 'concessionaria' | 'rodovia'>[],
  pontos: { protocoloId: string | null; codigo: string }[],
): ImportPreviewEnriquecido {
  const byKey = new Map(protocolosExistentes.map((item) => [protocoloImportKey(item), item]))
  const codigosPorProtocolo = new Map<string, string[]>()
  pontos.forEach((ponto) => {
    if (!ponto.protocoloId) return
    const list = codigosPorProtocolo.get(ponto.protocoloId) ?? []
    list.push(normalizeKey(ponto.codigo))
    codigosPorProtocolo.set(ponto.protocoloId, list)
  })
  const grupos = preview.protocolos.map((group) => {
    const existente = byKey.get(group.key)
    const planejamento = planejarGrupoImportacao(group, existente, existente ? codigosPorProtocolo.get(existente.id) ?? [] : [])
    return {
      ...group,
      protocoloExistente: Boolean(existente),
      pontosNovos: planejamento.pontosNovos.length,
      codigosIgnorados: planejamento.codigosIgnorados,
      limitePontos: planejamento.limitePontos,
      excedeLimite: planejamento.excedeLimite,
    }
  })
  const pontosIgnorados = grupos.reduce((total, item) => total + item.codigosIgnorados.length, 0)
  return {
    ...preview,
    grupos,
    totais: {
      protocolos: grupos.length,
      pontos: grupos.reduce((total, item) => total + item.pontos.length, 0),
      linhasInvalidas: preview.linhasInvalidas.length,
      pontosIgnorados,
      protocolosExistentes: grupos.filter((item) => item.protocoloExistente).length,
      protocolosNovos: grupos.filter((item) => !item.protocoloExistente).length,
    },
  }
}

export const exportarRelatorioErrosImportacao = (linhasInvalidas: ImportPreview['linhasInvalidas'], filename = 'erros-importacao-contratos.xlsx') => {
  if (!linhasInvalidas.length) return false
  const sheet = XLSX.utils.json_to_sheet(linhasInvalidas.map((item) => ({ linha: item.linha, erros: item.erros.join(' ') })))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Erros')
  XLSX.writeFile(workbook, filename)
  return true
}

export type ImportResult = { importados: number; pontosCriados: number; pontosIgnorados: number; erros: { protocolo: string; erro: string }[] }

export const importarProtocolosEPontos = async (contratoId: string, preview: ImportPreview): Promise<ImportResult> => {
  const existing = (await getDocs(query(collection(db, 'gestaoProtocolos'), where('contratoId', '==', contratoId)))).docs.map((item) => ({ id: item.id, ...item.data() }) as Protocolo)
  const result: ImportResult = { importados: 0, pontosCriados: 0, pontosIgnorados: 0, erros: [] }
  for (const group of preview.protocolos) {
    try {
      const protocol = existing.find((item) => protocoloImportKey(item) === group.key)
      const currentPoints = protocol
        ? (await getDocs(query(collection(db, 'gestaoPontos'), where('contratoId', '==', contratoId), where('protocoloId', '==', protocol.id)))).docs.map((item) => normalizeKey(String(item.data().codigo)))
        : []
      const planejamento = planejarGrupoImportacao(group, protocol, currentPoints)
      result.pontosIgnorados += planejamento.codigosIgnorados.length
      if (planejamento.excedeLimite) {
        throw new Error(`Limite de ${planejamento.limitePontos} pontos novos por gravação atômica${protocol ? ' em protocolo existente' : ' em protocolo novo'}. Divida a planilha.`)
      }
      if (protocol && !planejamento.pontosNovos.length && group.pontos.length) continue
      const protocolRef = protocol ? doc(db, 'gestaoProtocolos', protocol.id) : doc(collection(db, 'gestaoProtocolos'))
      if (!protocol) {
        await setDoc(protocolRef, {
          titulo: group.input.titulo.trim(),
          concessionaria: group.input.concessionaria.trim(),
          rodovia: group.input.rodovia.trim(),
          numero: group.input.numero?.trim() || '',
          ...(group.input.processoAnaliseId?.trim() ? { processoAnaliseId: group.input.processoAnaliseId.trim() } : {}),
          ...(group.input.previsao ? { previsao: group.input.previsao } : {}),
          ...(group.input.realizadoEm ? { realizadoEm: group.input.realizadoEm } : {}),
          contratoId,
          etapa: 'planejamento',
          status: 'nao_iniciado',
          createdAt: serverTimestamp(),
        })
      }
      if (!planejamento.pontosNovos.length) {
        if (!protocol) {
          existing.push({ id: protocolRef.id, contratoId, titulo: group.input.titulo, concessionaria: group.input.concessionaria, rodovia: group.input.rodovia, etapa: 'planejamento', status: 'nao_iniciado' })
          result.importados += 1
        }
        continue
      }
      const batch = writeBatch(db)
      planejamento.pontosNovos.forEach((point) => {
        batch.set(doc(collection(db, 'gestaoPontos')), { ...point, contratoId, protocoloId: protocolRef.id })
      })
      await batch.commit()
      if (!protocol) existing.push({ id: protocolRef.id, contratoId, titulo: group.input.titulo, concessionaria: group.input.concessionaria, rodovia: group.input.rodovia, etapa: 'planejamento', status: 'nao_iniciado' })
      result.importados += 1
      result.pontosCriados += planejamento.pontosNovos.length
    } catch (error) {
      result.erros.push({ protocolo: group.input.titulo, erro: error instanceof Error ? error.message : 'Erro ao importar grupo.' })
    }
  }
  return result
}

export const baixarModeloPlanilha = () => {
  const sheet = XLSX.utils.json_to_sheet([{ titulo_protocolo: 'Exemplo', concessionaria: 'Eco', rodovia: 'BR-101', numero_protocolo: '', codigo_ponto: 'P-001', estado: 'ES', km: '10', classificacao: 'nova_implantacao', latitude: '', longitude: '', precisao: '' }])
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Importação'); XLSX.writeFile(workbook, 'modelo-importacao-contratos.xlsx')
}

export const baixarModeloPlanilhaPontos = () => {
  const sheet = XLSX.utils.json_to_sheet([{ codigo_ponto: 'P-001', estado: 'ES', km: '10', classificacao: 'nova_implantacao', latitude: '', longitude: '', precisao: '' }])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Pontos')
  XLSX.writeFile(workbook, 'modelo-pontos-protocolo.xlsx')
}
