import * as XLSX from 'xlsx'
import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { validarInputPonto, validarInputProtocolo, type PontoInput, type ProtocoloInput } from './gestaoValidacao'
import type { Protocolo } from './gestaoContratos'

export type RawImportRow = Record<string, unknown> & { linha: number }
export type ImportPreview = {
  protocolos: { key: string; input: ProtocoloInput; pontos: PontoInput[] }[]
  linhasInvalidas: { linha: number; erros: string[] }[]
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
const normalizeKey = (value: string) => value.trim().toLocaleLowerCase('pt-BR')

export const agruparLinhasImportacao = (rows: RawImportRow[]): ImportPreview => {
  const protocols = new Map<string, { key: string; input: ProtocoloInput; pontos: PontoInput[] }>()
  const invalid: ImportPreview['linhasInvalidas'] = []
  const seen = new Set<string>()
  rows.forEach((raw) => {
    const row = Object.fromEntries(Object.entries(raw).map(([key, value]) => [normalizarCabecalho(key), value]))
    const input: ProtocoloInput = { titulo: text(row.titulo_protocolo), concessionaria: text(row.concessionaria), rodovia: text(row.rodovia), ...(text(row.numero_protocolo) ? { numero: text(row.numero_protocolo) } : {}) }
    const errors = validarInputProtocolo(input)
    const codigo = text(row.codigo_ponto)
    const hasPoint = Boolean(codigo || text(row.estado) || text(row.km) || text(row.latitude) || text(row.longitude))
    const ponto: PontoInput = { codigo, estado: text(row.estado), km: text(row.km), tipo: text(row.classificacao) === 'regularizacao' ? 'regularizacao' : 'nova_implantacao', concessionaria: input.concessionaria, rodovia: input.rodovia, ...(text(row.latitude) || text(row.longitude) ? { latitude: number(row.latitude), longitude: number(row.longitude), precisao: text(row.precisao) === 'aproximada' ? 'aproximada' : 'confirmada' } : {}) }
    if (hasPoint) errors.push(...validarInputPonto(ponto, input))
    const key = [input.titulo, input.concessionaria, input.rodovia].map(normalizeKey).join('|')
    if (hasPoint && seen.has(`${key}|${normalizeKey(codigo)}`)) errors.push('Código de ponto duplicado neste protocolo.')
    if (errors.length) { invalid.push({ linha: raw.linha, erros: [...new Set(errors)] }); return }
    if (hasPoint) seen.add(`${key}|${normalizeKey(codigo)}`)
    const group = protocols.get(key) ?? { key, input, pontos: [] }
    if (hasPoint) group.pontos.push(ponto)
    protocols.set(key, group)
  })
  return { protocolos: [...protocols.values()], linhasInvalidas: invalid }
}

export const parsePlanilha = async (file: File): Promise<ImportPreview> => {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array', cellDates: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return agruparLinhasImportacao(rows.map((row, index) => ({ ...row, linha: index + 2 })))
}

export type ImportResult = { importados: number; erros: { protocolo: string; erro: string }[] }
export const importarProtocolosEPontos = async (contratoId: string, preview: ImportPreview): Promise<ImportResult> => {
  const existing = (await getDocs(query(collection(db, 'gestaoProtocolos'), where('contratoId', '==', contratoId)))).docs.map((item) => ({ id: item.id, ...item.data() }) as Protocolo)
  const result: ImportResult = { importados: 0, erros: [] }
  for (const group of preview.protocolos) {
    try {
      const protocol = existing.find((item) => [item.titulo, item.concessionaria, item.rodovia].map(normalizeKey).join('|') === group.key)
      if (group.pontos.length > (protocol ? 500 : 499)) throw new Error(`Limite de ${protocol ? 500 : 499} pontos por protocolo para gravação atômica.`)
      const protocolRef = protocol ? doc(db, 'gestaoProtocolos', protocol.id) : doc(collection(db, 'gestaoProtocolos'))
      const currentPoints = protocol ? (await getDocs(query(collection(db, 'gestaoPontos'), where('contratoId', '==', contratoId), where('protocoloId', '==', protocol.id)))).docs.map((item) => normalizeKey(String(item.data().codigo))) : []
      const writes: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = protocol ? [] : [{ ref: protocolRef, data: { ...group.input, contratoId, etapa: 'planejamento', status: 'nao_iniciado', createdAt: serverTimestamp() } }]
      group.pontos.forEach((point) => { if (currentPoints.includes(normalizeKey(point.codigo))) throw new Error(`Código de ponto duplicado: ${point.codigo}`); writes.push({ ref: doc(collection(db, 'gestaoPontos')), data: { ...point, contratoId, protocoloId: protocolRef.id } }) })
      const batch = writeBatch(db)
      writes.forEach(({ ref, data }) => batch.set(ref, data))
      await batch.commit()
      result.importados += 1
    } catch (error) { result.erros.push({ protocolo: group.input.titulo, erro: error instanceof Error ? error.message : 'Erro ao importar grupo.' }) }
  }
  return result
}

export const baixarModeloPlanilha = () => {
  const sheet = XLSX.utils.json_to_sheet([{ titulo_protocolo: 'Exemplo', concessionaria: 'Eco', rodovia: 'BR-101', numero_protocolo: '', codigo_ponto: 'P-001', estado: 'ES', km: '10', classificacao: 'nova_implantacao', latitude: '', longitude: '', precisao: '' }])
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Importação'); XLSX.writeFile(workbook, 'modelo-importacao-contratos.xlsx')
}
