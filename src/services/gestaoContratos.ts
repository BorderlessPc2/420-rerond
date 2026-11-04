import { addDoc, collection, deleteField, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from '../lib/firebase'
import { validarInputPonto, validarInputProtocolo, validarInputContrato, type ContratoInput, type PontoInput, type ProtocoloInput } from './gestaoValidacao'
import { validarTransicao } from './gestaoTransicoes'

export type SituacaoContrato = 'ativo' | 'suspenso' | 'encerrado'
export type Contrato = {
  id: string
  nome: string
  clienteId?: string
  numero?: string
  objeto?: string
  vigenciaInicio?: string
  vigenciaFim?: string
  situacao?: SituacaoContrato
  observacoes?: string
  createdAt?: unknown
}
export type Etapa = 'planejamento' | 'elaboracao' | 'fase_1' | 'fase_2' | 'homologacao' | 'concluido'
export type Situacao = 'nao_iniciado' | 'em_andamento' | 'em_analise' | 'em_correcao' | 'aguardando_terceiros' | 'paralisado' | 'aprovado_concessionaria' | 'concluido'
export type Protocolo = {
  id: string; contratoId: string; titulo: string; concessionaria: string; rodovia: string
  numero?: string; etapa: Etapa; status: Situacao; previsao?: string; realizadoEm?: string
  processoAnaliseId?: string; createdAt?: unknown
}
export type Ponto = {
  id: string; contratoId: string; protocoloId: string | null; codigo: string; estado: string
  concessionaria: string; rodovia: string; km: string; tipo: 'regularizacao' | 'nova_implantacao'
  resultado?: 'regularizado' | 'aprovado_implantacao'; latitude?: number; longitude?: number
  precisao?: 'confirmada' | 'aproximada'; previsao?: string; realizadoEm?: string
}
export type Movimento = {
  id: string; tipo: string; em: string; autor: string; observacao: string
  etapa: Etapa; status: Situacao; anexos: { nome: string; url: string }[]
}
export type { ContratoInput, PontoInput, ProtocoloInput } from './gestaoValidacao'

export const validarProtocoloInput = (input: ProtocoloInput): string | null => validarInputProtocolo(input)[0] ?? null
export const validarCoordenadas = (latitude?: number, longitude?: number): string | null => validarInputPonto({ codigo: 'x', estado: 'x', km: 'x', tipo: 'nova_implantacao', concessionaria: '', rodovia: '', latitude, longitude }, { concessionaria: '', rodovia: '' }).find((error) => error === 'Coordenadas inválidas.') ?? null
export const validarPontoInput = (input: PontoInput, protocolo?: Pick<Protocolo, 'concessionaria' | 'rodovia'>): string | null => validarInputPonto(input, protocolo)[0] ?? null
export const validarEdicaoPonto = (input: PontoInput, protocolo: Pick<Protocolo, 'concessionaria' | 'rodovia'>) => validarInputPonto(input, protocolo)

export {
  aplicarIntencaoTransicao,
  descreverTransicao,
  listarEtapasPermitidas,
  listarSituacoesAlcancaveis,
  motivoTransicaoIndisponivel,
  validarCombinacaoEtapaStatus,
  validarConclusaoProtocolo,
  validarTransicao,
} from './gestaoTransicoes'
export type { DescricaoTransicao, IntencaoTransicao, SituacaoAlcancavel } from './gestaoTransicoes'

const ETAPAS_ORDEM: Etapa[] = ['planejamento', 'elaboracao', 'fase_1', 'fase_2', 'homologacao', 'concluido']
export const progressoEtapa = (etapa: Etapa) => {
  const indice = Math.max(0, ETAPAS_ORDEM.indexOf(etapa))
  return { indice, total: ETAPAS_ORDEM.length, percentual: Math.round((indice / (ETAPAS_ORDEM.length - 1)) * 100) }
}
const gestaoAutorAtual = () => {
  const user = auth.currentUser
  if (!user) return ''
  return user.email?.trim() || user.uid
}

const rows = async <T>(name: string): Promise<T[]> =>
  (await getDocs(collection(db, name))).docs.map((item) => ({ id: item.id, ...item.data() }) as T)
const scoped = async <T extends { id: string; contratoId: string }>(name: string, contratoId: string): Promise<T[]> =>
  (await getDocs(query(collection(db, name), where('contratoId', '==', contratoId)))).docs.map((item) => ({ ...item.data(), id: item.id }) as T)

export const getContratoCascadeCollections = () => ['gestaoContratos', 'gestaoProtocolos', 'gestaoPontos', 'gestaoMovimentos'] as const

export const listContratos = () => rows<Contrato>('gestaoContratos')
export const getContrato = async (id: string) => {
  const snap = await getDoc(doc(db, 'gestaoContratos', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Contrato) : null
}
export const validarContratoInput = (input: ContratoInput): string | null => validarInputContrato(input)[0] ?? null

const normalizeContratoPayload = (input: ContratoInput) => ({
  nome: input.nome.trim(),
  clienteId: input.clienteId?.trim() || null,
  numero: input.numero?.trim() || '',
  objeto: input.objeto?.trim() || '',
  vigenciaInicio: input.vigenciaInicio || '',
  vigenciaFim: input.vigenciaFim || '',
  situacao: input.situacao || 'ativo',
  observacoes: input.observacoes?.trim() || '',
})

export const criarContrato = async (input: ContratoInput) => {
  const error = validarInputContrato(input)[0]
  if (error) throw new Error(error)
  return (await addDoc(collection(db, 'gestaoContratos'), { ...normalizeContratoPayload(input), createdAt: serverTimestamp() })).id
}
export const atualizarContrato = async (id: string, input: ContratoInput) => {
  const error = validarInputContrato(input)[0]
  if (error) throw new Error(error)
  if (!(await getContrato(id))) throw new Error('Contrato não encontrado.')
  await updateDoc(doc(db, 'gestaoContratos', id), normalizeContratoPayload(input))
}

export const excluirContrato = async (id: string) => {
  if (!(await getContrato(id))) throw new Error('Contrato não encontrado.')
  const [protocolos, pontos, movimentos] = await Promise.all([
    getDocs(query(collection(db, 'gestaoProtocolos'), where('contratoId', '==', id))),
    getDocs(query(collection(db, 'gestaoPontos'), where('contratoId', '==', id))),
    getDocs(query(collection(db, 'gestaoMovimentos'), where('contratoId', '==', id))),
  ])
  const refs = [...protocolos.docs.map((item) => item.ref), ...pontos.docs.map((item) => item.ref), ...movimentos.docs.map((item) => item.ref), doc(db, 'gestaoContratos', id)]
  for (let index = 0; index < refs.length; index += 450) {
    const batch = writeBatch(db)
    refs.slice(index, index + 450).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}
export const listProtocolos = (contratoId: string) => scoped<Protocolo>('gestaoProtocolos', contratoId)
export const listPontos = (contratoId: string) => scoped<Ponto>('gestaoPontos', contratoId)
export const getProtocolo = async (contratoId: string, id: string) => {
  const snap = await getDoc(doc(db, 'gestaoProtocolos', id))
  return snap.exists() && snap.data().contratoId === contratoId ? ({ id: snap.id, ...snap.data() } as Protocolo) : null
}
export const criarProtocolo = async (contratoId: string, input: ProtocoloInput) => {
  const error = validarInputProtocolo(input)[0]
  if (error) throw new Error(error)
  if (!(await getContrato(contratoId))) throw new Error('Contrato não encontrado.')
  return (await addDoc(collection(db, 'gestaoProtocolos'), { ...input, contratoId, etapa: 'planejamento', status: 'nao_iniciado', createdAt: serverTimestamp() })).id
}
export const criarPonto = async (contratoId: string, protocoloId: string | null, input: PontoInput) => {
  const protocolo = protocoloId ? await getProtocolo(contratoId, protocoloId) : undefined
  if (protocoloId && !protocolo) throw new Error('Protocolo não encontrado neste contrato.')
  const error = validarInputPonto(input, protocolo ?? undefined)[0]
  if (error) throw new Error(error)
  return (await addDoc(collection(db, 'gestaoPontos'), { ...input, contratoId, protocoloId })).id
}
export const validarPatchProtocoloComPontos = (
  atual: Pick<Protocolo, 'concessionaria' | 'rodovia'>,
  patch: Pick<ProtocoloInput, 'concessionaria' | 'rodovia'>,
  pontosVinculados: number,
) => {
  if (
    pontosVinculados > 0
    && (patch.concessionaria.trim() !== atual.concessionaria.trim() || patch.rodovia.trim() !== atual.rodovia.trim())
  ) {
    return 'Não é possível alterar concessionária ou rodovia com pontos vinculados.'
  }
  return null
}

export const atualizarProtocolo = async (contratoId: string, id: string, patch: Pick<ProtocoloInput, 'titulo' | 'concessionaria' | 'rodovia' | 'numero' | 'previsao' | 'realizadoEm'>) => {
  const protocolo = await getProtocolo(contratoId, id)
  if (!protocolo) throw new Error('Protocolo não encontrado neste contrato.')
  const next = { ...protocolo, ...patch }
  const error = validarInputProtocolo(next)[0]
  if (error) throw new Error(error)
  const linked = await getDocs(query(collection(db, 'gestaoPontos'), where('contratoId', '==', contratoId), where('protocoloId', '==', id)))
  const patchError = validarPatchProtocoloComPontos(protocolo, patch, linked.size)
  if (patchError) throw new Error(patchError)
  await updateDoc(doc(db, 'gestaoProtocolos', id), { titulo: next.titulo.trim(), concessionaria: next.concessionaria.trim(), rodovia: next.rodovia.trim(), numero: next.numero?.trim() || '', previsao: next.previsao || '', realizadoEm: next.realizadoEm || '' })
}
export const atualizarPontoCompleto = async (contratoId: string, id: string, input: PontoInput) => {
  const snap = await getDoc(doc(db, 'gestaoPontos', id))
  if (!snap.exists() || snap.data().contratoId !== contratoId) throw new Error('Ponto não encontrado neste contrato.')
  const point = snap.data() as Ponto
  const protocolo = point.protocoloId ? await getProtocolo(contratoId, point.protocoloId) : undefined
  if (point.protocoloId && !protocolo) throw new Error('Protocolo não encontrado neste contrato.')
  const errors = validarInputPonto(input, protocolo ?? undefined)
  if (errors.length) throw new Error(errors[0])
  await updateDoc(doc(db, 'gestaoPontos', id), { ...input, contratoId, protocoloId: point.protocoloId, ...(input.resultado ? { realizadoEm: input.realizadoEm || point.realizadoEm || new Date().toISOString().slice(0, 10) } : {}) })
}
export const vincularPontoProtocolo = async (contratoId: string, pontoId: string, protocoloId: string) => {
  const [pointSnap, protocolo] = await Promise.all([getDoc(doc(db, 'gestaoPontos', pontoId)), getProtocolo(contratoId, protocoloId)])
  if (!pointSnap.exists() || pointSnap.data().contratoId !== contratoId) throw new Error('Ponto não encontrado neste contrato.')
  if (!protocolo) throw new Error('Protocolo não encontrado neste contrato.')
  const point = pointSnap.data() as Ponto
  const errors = validarInputPonto({ ...point, protocoloId: undefined } as PontoInput, protocolo)
  if (errors.length) throw new Error(errors[0])
  await updateDoc(doc(db, 'gestaoPontos', pontoId), { protocoloId })
}

export const criarProtocoloComPontos = async (contratoId: string, input: ProtocoloInput, pontos: PontoInput[]) => {
  const protocoloError = validarInputProtocolo(input)[0]
  if (protocoloError) throw new Error(protocoloError)
  if (pontos.length > 499) throw new Error('Limite de 499 pontos por protocolo para gravação atômica.')
  if (!(await getContrato(contratoId))) throw new Error('Contrato não encontrado.')
  const pontoError = pontos.flatMap((ponto) => validarInputPonto(ponto, input))[0]
  if (pontoError) throw new Error(pontoError)
  const protocoloData = {
    titulo: input.titulo.trim(),
    concessionaria: input.concessionaria.trim(),
    rodovia: input.rodovia.trim(),
    numero: input.numero?.trim() || '',
    ...(input.processoAnaliseId?.trim() ? { processoAnaliseId: input.processoAnaliseId.trim() } : {}),
    ...(input.previsao ? { previsao: input.previsao } : {}),
    ...(input.realizadoEm ? { realizadoEm: input.realizadoEm } : {}),
    contratoId,
    etapa: 'planejamento' as const,
    status: 'nao_iniciado' as const,
    createdAt: serverTimestamp(),
  }
  const protocoloRef = doc(collection(db, 'gestaoProtocolos'))
  await setDoc(protocoloRef, protocoloData)
  if (pontos.length) {
    const batch = writeBatch(db)
    pontos.forEach((ponto) => {
      const data: Record<string, unknown> = {
        codigo: ponto.codigo.trim(),
        estado: ponto.estado.trim(),
        km: ponto.km.trim(),
        tipo: ponto.tipo,
        concessionaria: ponto.concessionaria.trim(),
        rodovia: ponto.rodovia.trim(),
        contratoId,
        protocoloId: protocoloRef.id,
      }
      if (ponto.resultado) data.resultado = ponto.resultado
      if (ponto.latitude !== undefined && ponto.longitude !== undefined) {
        data.latitude = ponto.latitude
        data.longitude = ponto.longitude
        if (ponto.precisao) data.precisao = ponto.precisao
      }
      if (ponto.previsao) data.previsao = ponto.previsao
      if (ponto.realizadoEm) data.realizadoEm = ponto.realizadoEm
      batch.set(doc(collection(db, 'gestaoPontos')), data)
    })
    await batch.commit()
  }
  return protocoloRef.id
}
export const atualizarPonto = async (contratoId: string, id: string, patch: Partial<Pick<Ponto, 'latitude' | 'longitude' | 'precisao' | 'previsao' | 'realizadoEm' | 'resultado'>>) => {
  const snap = await getDoc(doc(db, 'gestaoPontos', id))
  if (!snap.exists() || snap.data().contratoId !== contratoId) throw new Error('Ponto não encontrado neste contrato.')
  const point = snap.data() as Ponto
  const latitude = patch.latitude ?? point.latitude
  const longitude = patch.longitude ?? point.longitude
  if ((latitude === undefined) !== (longitude === undefined) || (latitude !== undefined && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude! < -180 || longitude! > 180))) throw new Error('Coordenadas inválidas.')
  if (patch.resultado && ((point.tipo === 'regularizacao') !== (patch.resultado === 'regularizado'))) throw new Error('Resultado incompatível com classificação do ponto.')
  await updateDoc(doc(db, 'gestaoPontos', id), { ...patch, ...(patch.resultado ? { realizadoEm: patch.realizadoEm || point.realizadoEm || new Date().toISOString().slice(0, 10) } : {}), ...(patch.resultado === undefined && 'resultado' in patch ? { resultado: deleteField(), realizadoEm: deleteField() } : {}) })
}
export const listMovimentos = async (contratoId: string, protocoloId: string) => {
  if (!(await getProtocolo(contratoId, protocoloId))) throw new Error('Protocolo não encontrado neste contrato.')
  return (await scoped<Movimento & { contratoId: string; protocoloId: string }>('gestaoMovimentos', contratoId))
    .filter((item) => item.protocoloId === protocoloId).sort((a, b) => a.em.localeCompare(b.em))
}
export const registrarMovimento = async (contratoId: string, protocoloId: string, input: Pick<Movimento, 'tipo' | 'observacao' | 'etapa' | 'status'> & { em: string; files?: File[]; numero?: string; previsao?: string; realizadoEm?: string }) => {
  if (!input.tipo.trim() || !input.em || !Number.isFinite(Date.parse(input.em))) throw new Error('Informe tipo e data válida.')
  const protocolo = await getProtocolo(contratoId, protocoloId)
  if (!protocolo) throw new Error('Protocolo não encontrado neste contrato.')
  const pontosVinculados = (await getDocs(query(collection(db, 'gestaoPontos'), where('contratoId', '==', contratoId), where('protocoloId', '==', protocoloId)))).docs.map((item) => item.data() as Ponto)
  const transitionError = validarTransicao(protocolo.etapa, protocolo.status, input.etapa, input.status, input.observacao, pontosVinculados)
  if (transitionError) throw new Error(transitionError)
  const files = input.files ?? []
  if (files.some((file) => file.size > 20 * 1024 * 1024)) throw new Error('Cada anexo deve ter até 20 MB.')
  const anexoPermitido = (file: File) => {
    const tipos = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    return tipos.includes(file.type) || ((!file.type || file.type === 'application/octet-stream') && /\.(pdf|png|jpe?g|docx?|txt)$/i.test(file.name))
  }
  if (files.some((file) => !anexoPermitido(file))) throw new Error('Anexe apenas PDF, Word, TXT, PNG ou JPEG.')
  const movementRef = doc(collection(db, 'gestaoMovimentos'))
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(doc(db, 'gestaoProtocolos', protocoloId))
    if (!current.exists() || current.data().contratoId !== contratoId) throw new Error('Protocolo não encontrado neste contrato.')
    transaction.set(movementRef, {
      contratoId,
      protocoloId,
      tipo: input.tipo.trim(),
      observacao: input.observacao.trim(),
      em: input.em,
      etapa: input.etapa,
      status: input.status,
      autor: gestaoAutorAtual(),
      anexos: [],
    })
    transaction.update(current.ref, {
      etapa: input.etapa,
      status: input.status,
      ...(input.numero !== undefined ? { numero: input.numero.trim() } : {}),
      ...(input.previsao !== undefined ? { previsao: input.previsao } : {}),
      ...(input.realizadoEm !== undefined ? { realizadoEm: input.realizadoEm } : {}),
    })
  })
  if (!files.length) return
  const anexos: Movimento['anexos'] = []
  try {
    for (const file of files) {
      const path = `gestaoContratos/${contratoId}/${protocoloId}/${movementRef.id}/${crypto.randomUUID()}/${file.name}`
      const uploaded = await uploadBytes(ref(storage, path), file)
      anexos.push({ nome: file.name, url: await getDownloadURL(uploaded.ref) })
    }
    await updateDoc(movementRef, { anexos })
  } catch {
    throw new Error('Movimentação registrada, mas falha ao anexar arquivos. Registre os documentos em nova movimentação.')
  }
}
export const atualizarPlanejamento = async (contratoId: string, protocoloId: string, previsao: string, realizadoEm: string) => {
  if (!(await getProtocolo(contratoId, protocoloId))) throw new Error('Protocolo não encontrado neste contrato.')
  await updateDoc(doc(db, 'gestaoProtocolos', protocoloId), { previsao, realizadoEm })
}
export const atualizarPlanejamentoPonto = async (contratoId: string, id: string, previsao: string, realizadoEm: string) =>
  atualizarPonto(contratoId, id, { previsao, realizadoEm })
export const filtrarGestao = (protocolos: Protocolo[], pontos: Ponto[], filtro: { estado?: string; concessionaria?: string; rodovia?: string; protocoloId?: string; pontoCodigo?: string; busca?: string; status?: string; tipo?: string; etapa?: string; inicio?: string; fim?: string }) => {
  const termoBusca = (filtro.busca ?? '').trim().toLocaleLowerCase('pt-BR')
  const termoPonto = (filtro.pontoCodigo ?? '').trim().toLocaleLowerCase('pt-BR')
  const pontoMatchesBusca = (p: Ponto) => {
    const term = termoBusca || termoPonto
    return !term || [p.codigo, p.estado, p.concessionaria, p.rodovia, p.km].some((value) => value.toLocaleLowerCase('pt-BR').includes(term))
  }
  const protocoloMatchesBusca = (p: Protocolo) =>
    !termoBusca
    || [p.titulo, p.concessionaria, p.rodovia, p.numero ?? ''].some((value) => value.toLocaleLowerCase('pt-BR').includes(termoBusca))
  const selecionados = pontos.filter((p) => {
    const protocolo = p.protocoloId ? protocolos.find((item) => item.id === p.protocoloId) : undefined
    const periodo = p.previsao || protocolo?.previsao || ''
    return (!filtro.estado || p.estado === filtro.estado) && (!filtro.concessionaria || p.concessionaria === filtro.concessionaria) && (!filtro.rodovia || p.rodovia === filtro.rodovia) && (!filtro.protocoloId || p.protocoloId === filtro.protocoloId) && pontoMatchesBusca(p) && (!filtro.tipo || p.tipo === filtro.tipo) && (!filtro.status || (p.resultado ?? protocolo?.status) === filtro.status) && (!filtro.etapa || protocolo?.etapa === filtro.etapa) && (!filtro.inicio || periodo >= filtro.inicio) && (!filtro.fim || periodo <= filtro.fim)
  })
  const ids = new Set(selecionados.map((p) => p.protocoloId))
  const hasPointFilters = Boolean(filtro.estado || filtro.tipo || termoBusca || termoPonto)
  const protocolMatches = (p: Protocolo) => (!filtro.protocoloId || p.id === filtro.protocoloId) && (!filtro.concessionaria || p.concessionaria === filtro.concessionaria) && (!filtro.rodovia || p.rodovia === filtro.rodovia) && (!filtro.status || p.status === filtro.status) && (!filtro.etapa || p.etapa === filtro.etapa) && (!filtro.inicio || (p.previsao || '') >= filtro.inicio) && (!filtro.fim || (p.previsao || '') <= filtro.fim) && protocoloMatchesBusca(p)
  const visibleProtocols = protocolos.filter((p) => protocolMatches(p) && (ids.has(p.id) || (!pontos.some((item) => item.protocoloId === p.id) && !hasPointFilters)))
  return { protocolos: visibleProtocols, pontos: selecionados }
}
export const indicadoresGestao = (protocolos: Protocolo[], pontos: Ponto[]) => {
  const hoje = new Date().toISOString().slice(0, 10)
  return {
    protocolos: protocolos.length, pontos: pontos.length,
    regularizados: pontos.filter((p) => p.resultado === 'regularizado').length,
    aprovadosImplantacao: pontos.filter((p) => p.resultado === 'aprovado_implantacao').length,
    previstos: pontos.filter((p) => !!p.previsao).length,
    realizados: pontos.filter((p) => !!p.realizadoEm).length,
    paralisados: protocolos.filter((p) => p.status === 'paralisado').length,
    atrasados: protocolos.filter((p) => !!p.previsao && p.previsao < hoje && !p.realizadoEm && p.status !== 'concluido').length,
  }
}
export { calcularDashboardGestao } from './gestaoDashboard'
export const pontoStatus = (ponto: Ponto, protocolo?: Protocolo) => ponto.resultado ? { valor: ponto.resultado, herdado: false } : { valor: protocolo?.status ?? 'nao_iniciado', herdado: true }
