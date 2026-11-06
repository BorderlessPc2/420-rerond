/**
 * Seed de demonstração — Gestão de Contratos (matriz completa de fases).
 *
 * Cria UM contrato de teste ("CONTRATO TESTE — Matriz de Fases (DEMO)") com
 * protocolos cobrindo todas as combinações relevantes de etapa × situação,
 * pontos geolocalizados/pendentes, com/sem resultado, e movimentações
 * encadeadas para popular timeline e stepper.
 *
 * Tudo fica dentro do contrato demo (id fixo `demo-matriz-fases`); nenhuma
 * outra coleção ou contrato real é tocado. Reexecutar limpa e recria o demo.
 *
 * Uso:
 *   npm run seed:gestao-demo
 *
 * Requer firebase-service-account.json (ou GOOGLE_APPLICATION_CREDENTIALS).
 * Para remover o demo: excluir o contrato pela UI (cascade) ou rodar com --cleanup.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true })

const CONTRATO_ID = 'demo-matriz-fases'
const CONTRATO_NOME = 'CONTRATO TESTE — Matriz de Fases (DEMO)'
const CLEAN_ONLY = process.argv.includes('--cleanup')

const log = {
  info: (msg: string, extra?: Record<string, unknown>) =>
    console.log(`[seed:gestao-demo] ${msg}${extra ? ` ${JSON.stringify(extra)}` : ''}`),
  ok: (msg: string, extra?: Record<string, unknown>) =>
    console.log(`[seed:gestao-demo] ✓ ${msg}${extra ? ` ${JSON.stringify(extra)}` : ''}`),
}

const initAdmin = () => {
  if (getApps().length > 0) return
  const configured = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  const serviceAccountPath = configured
    ? path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured)
    : path.resolve(process.cwd(), 'firebase-service-account.json')
  if (!existsSync(serviceAccountPath)) {
    throw new Error(
      `Service account não encontrado em ${serviceAccountPath}. ` +
      'Defina GOOGLE_APPLICATION_CREDENTIALS ou coloque firebase-service-account.json na raiz.',
    )
  }
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8')) as {
    project_id: string; client_email: string; private_key: string
  }
  initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID ?? serviceAccount.project_id,
  })
  log.ok('Firebase Admin inicializado', { projectId: process.env.FIREBASE_PROJECT_ID ?? serviceAccount.project_id })
}

type Etapa = 'planejamento' | 'elaboracao' | 'fase_1' | 'fase_2' | 'homologacao' | 'concluido'
type Situacao = 'nao_iniciado' | 'em_andamento' | 'em_analise' | 'em_correcao' | 'aguardando_terceiros' | 'paralisado' | 'aprovado_concessionaria' | 'concluido'
type TipoPonto = 'regularizacao' | 'nova_implantacao'

const ECOVIAS = { concessionaria: 'Ecovias / ECO101', rodovia: 'Rodovia Anchieta-Imigrantes (SP-150/160)' }
const MOTIVA = { concessionaria: 'Motiva', rodovia: 'Rodovia Régis Bittencourt (BR-116)' }
const ARTERIS = { concessionaria: 'Arteris', rodovia: 'Rodovia Castello Branco (SP-280)' }

type ProtoSeed = {
  titulo: string; etapa: Etapa; status: Situacao
  via: typeof ECOVIAS; numero: string; previsao: string; realizadoEm?: string
}

const PROTOCOLOS: ProtoSeed[] = [
  { titulo: 'Regularização de pontos — Lote SP Sul', etapa: 'planejamento', status: 'nao_iniciado', via: ECOVIAS, numero: 'DEMO-P01', previsao: '2027-02-15' },
  { titulo: 'Nova implantação — km 32 Anchieta', etapa: 'planejamento', status: 'em_andamento', via: ECOVIAS, numero: 'DEMO-P02', previsao: '2026-12-20' },
  { titulo: 'Regularização BR-116 trecho urbano', etapa: 'planejamento', status: 'paralisado', via: MOTIVA, numero: 'DEMO-P03', previsao: '2026-10-30' },
  { titulo: 'Projeto executivo — Castello Branco km 60', etapa: 'elaboracao', status: 'em_analise', via: ARTERIS, numero: 'DEMO-P04', previsao: '2026-12-10' },
  { titulo: 'Adequação de sinalização — Imigrantes', etapa: 'elaboracao', status: 'em_correcao', via: ECOVIAS, numero: 'DEMO-P05', previsao: '2026-11-25' },
  { titulo: 'Fase 1 — Implantação Régis Bittencourt norte', etapa: 'fase_1', status: 'em_andamento', via: MOTIVA, numero: 'DEMO-P06', previsao: '2026-11-30' },
  { titulo: 'Fase 1 — Regularização acessos SP-280', etapa: 'fase_1', status: 'aguardando_terceiros', via: ARTERIS, numero: 'DEMO-P07', previsao: '2026-10-20' },
  { titulo: 'Fase 2 — Dispositivos de retorno Anchieta', etapa: 'fase_2', status: 'aprovado_concessionaria', via: ECOVIAS, numero: 'DEMO-P08', previsao: '2026-11-15' },
  { titulo: 'Fase 2 — Requalificação km 280 BR-116', etapa: 'fase_2', status: 'em_analise', via: MOTIVA, numero: 'DEMO-P09', previsao: '2026-12-05' },
  { titulo: 'Homologação — Lote histórico Imigrantes', etapa: 'homologacao', status: 'em_andamento', via: ECOVIAS, numero: 'DEMO-P10', previsao: '2026-11-10' },
  { titulo: 'Homologação — Castello Branco leste', etapa: 'homologacao', status: 'aprovado_concessionaria', via: ARTERIS, numero: 'DEMO-P11', previsao: '2026-10-05' },
  { titulo: 'Concluído — Regularização piloto 2025', etapa: 'concluido', status: 'concluido', via: ECOVIAS, numero: 'DEMO-P12', previsao: '2026-09-30', realizadoEm: '2026-09-28' },
]

type PontoSeed = {
  slug: string; protoSlug: string | null; codigo: string; estado: string; km: string
  tipo: TipoPonto; lat?: [number, number]; precisao?: 'confirmada' | 'aproximada'
  resultado?: 'regularizado' | 'aprovado_implantacao'; previsao?: string; realizadoEm?: string
}

const PONTOS: PontoSeed[] = [
  // Protocolo planejamento/em_andamento (ECOVIAS) — misto com/sem coordenadas
  { slug: 'pto-01', protoSlug: 'nova-implantacao-km-32-anchieta', codigo: 'DEMO-ECO-001', estado: 'SP', km: '32,5', tipo: 'nova_implantacao', lat: [-23.9865, -46.3089], precisao: 'confirmada', previsao: '2026-12-20' },
  { slug: 'pto-02', protoSlug: 'nova-implantacao-km-32-anchieta', codigo: 'DEMO-ECO-002', estado: 'SP', km: '34,1', tipo: 'nova_implantacao', previsao: '2026-12-20' },
  // Paralisado (MOTIVA)
  { slug: 'pto-03', protoSlug: 'regularizacao-br-116-trecho-urbano', codigo: 'DEMO-MOT-001', estado: 'SP', km: '275,0', tipo: 'regularizacao', lat: [-23.6821, -46.8755], precisao: 'aproximada' },
  // Elaboração em_analise (ARTERIS)
  { slug: 'pto-04', protoSlug: 'projeto-executivo-castello-branco-km-60', codigo: 'DEMO-ART-001', estado: 'SP', km: '60,2', tipo: 'regularizacao', lat: [-23.5281, -47.4384], precisao: 'confirmada' },
  { slug: 'pto-05', protoSlug: 'projeto-executivo-castello-branco-km-60', codigo: 'DEMO-ART-002', estado: 'SP', km: '62,8', tipo: 'regularizacao' },
  // Em correção (ECOVIAS)
  { slug: 'pto-06', protoSlug: 'adequacao-de-sinalizacao-imigrantes', codigo: 'DEMO-ECO-003', estado: 'SP', km: '41,7', tipo: 'regularizacao', lat: [-23.9348, -46.3325], precisao: 'confirmada' },
  // Fase 1 em andamento (MOTIVA) — um com resultado, um sem (bloqueia conclusão)
  { slug: 'pto-07', protoSlug: 'fase-1-implantacao-regis-bittencourt-norte', codigo: 'DEMO-MOT-002', estado: 'SP', km: '290,3', tipo: 'nova_implantacao', lat: [-23.7792, -46.7908], precisao: 'confirmada', resultado: 'aprovado_implantacao', realizadoEm: '2026-10-28' },
  { slug: 'pto-08', protoSlug: 'fase-1-implantacao-regis-bittencourt-norte', codigo: 'DEMO-MOT-003', estado: 'SP', km: '292,0', tipo: 'nova_implantacao', lat: [-23.8014, -46.7712], precisao: 'aproximada', previsao: '2026-11-30' },
  // Fase 1 aguardando terceiros (ARTERIS)
  { slug: 'pto-09', protoSlug: 'fase-1-regularizacao-acessos-sp-280', codigo: 'DEMO-ART-003', estado: 'SP', km: '44,9', tipo: 'regularizacao', lat: [-23.6012, -47.0123], precisao: 'confirmada', previsao: '2026-10-20' },
  // Fase 2 aprovado concessionária (ECOVIAS) — todos com resultado (permite concluir)
  { slug: 'pto-10', protoSlug: 'fase-2-dispositivos-de-retorno-anchieta', codigo: 'DEMO-ECO-004', estado: 'SP', km: '28,4', tipo: 'regularizacao', lat: [-24.0012, -46.2901], precisao: 'confirmada', resultado: 'regularizado', realizadoEm: '2026-11-01' },
  { slug: 'pto-11', protoSlug: 'fase-2-dispositivos-de-retorno-anchieta', codigo: 'DEMO-ECO-005', estado: 'SP', km: '29,9', tipo: 'regularizacao', lat: [-23.9945, -46.2987], precisao: 'confirmada', resultado: 'regularizado', realizadoEm: '2026-11-02' },
  // Homologação em andamento (ECOVIAS) — todos com resultado
  { slug: 'pto-12', protoSlug: 'homologacao-lote-historico-imigrantes', codigo: 'DEMO-ECO-006', estado: 'SP', km: '55,3', tipo: 'regularizacao', lat: [-23.8712, -46.4101], precisao: 'confirmada', resultado: 'regularizado', realizadoEm: '2026-10-15' },
  // Concluído (ECOVIAS) — todos com resultado e realizadoEm
  { slug: 'pto-13', protoSlug: 'concluido-regularizacao-piloto-2025', codigo: 'DEMO-ECO-007', estado: 'SP', km: '22,0', tipo: 'regularizacao', lat: [-24.0203, -46.2610], precisao: 'confirmada', resultado: 'regularizado', realizadoEm: '2026-09-20' },
  { slug: 'pto-14', protoSlug: 'concluido-regularizacao-piloto-2025', codigo: 'DEMO-ECO-008', estado: 'SP', km: '23,6', tipo: 'nova_implantacao', lat: [-24.0156, -46.2703], precisao: 'confirmada', resultado: 'aprovado_implantacao', realizadoEm: '2026-09-25' },
  // Avulsos (sem protocolo) — para testar vínculo posterior e mapa "pendente"
  { slug: 'pto-15', protoSlug: null, codigo: 'DEMO-AVULSO-001', estado: 'SP', km: '70,5', tipo: 'regularizacao', lat: [-23.4721, -47.5012], precisao: 'aproximada' },
  { slug: 'pto-16', protoSlug: null, codigo: 'DEMO-AVULSO-002', estado: 'SP', km: '310,0', tipo: 'nova_implantacao' },
]

const slugify = (titulo: string) =>
  titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)

const MOVIMENTOS_BASE: Record<string, Array<{ tipo: string; em: string; etapa: Etapa; status: Situacao; observacao: string }>> = {
  'regularizacao-br-116-trecho-urbano': [
    { tipo: 'Avanço de etapa', em: '2026-10-05', etapa: 'planejamento', status: 'em_andamento', observacao: 'Início do levantamento em campo.' },
    { tipo: 'Paralisação', em: '2026-10-18', etapa: 'planejamento', status: 'paralisado', observacao: 'Paralisado por restrição ambiental no trecho urbano.' },
  ],
  'adequacao-de-sinalizacao-imigrantes': [
    { tipo: 'Avanço de etapa', em: '2026-10-10', etapa: 'planejamento', status: 'em_andamento', observacao: 'Kickoff com a concessionária.' },
    { tipo: 'Avanço de etapa', em: '2026-10-22', etapa: 'elaboracao', status: 'em_andamento', observacao: 'Início da elaboração do projeto.' },
    { tipo: 'Correção', em: '2026-11-02', etapa: 'elaboracao', status: 'em_correcao', observacao: 'Ajustes solicitados na planta de sinalização vertical.' },
  ],
  'fase-1-regularizacao-acessos-sp-280': [
    { tipo: 'Avanço de etapa', em: '2026-10-08', etapa: 'planejamento', status: 'em_andamento', observacao: 'Planejamento aprovado.' },
    { tipo: 'Avanço de etapa', em: '2026-10-25', etapa: 'fase_1', status: 'em_andamento', observacao: 'Entrada em fase 1.' },
    { tipo: 'Avanço de etapa', em: '2026-11-01', etapa: 'fase_1', status: 'aguardando_terceiros', observacao: 'Aguardando parecer da prefeitura sobre os acessos.' },
  ],
  'fase-2-dispositivos-de-retorno-anchieta': [
    { tipo: 'Avanço de etapa', em: '2026-09-15', etapa: 'planejamento', status: 'em_andamento', observacao: 'Início do planejamento.' },
    { tipo: 'Avanço de etapa', em: '2026-09-30', etapa: 'elaboracao', status: 'em_andamento', observacao: 'Elaboração iniciada.' },
    { tipo: 'Avanço de etapa', em: '2026-10-12', etapa: 'fase_1', status: 'em_andamento', observacao: 'Fase 1 em execução.' },
    { tipo: 'Avanço de etapa', em: '2026-10-28', etapa: 'fase_2', status: 'aprovado_concessionaria', observacao: 'Fase 2 aprovada pela concessionária.' },
  ],
  'homologacao-lote-historico-imigrantes': [
    { tipo: 'Avanço de etapa', em: '2026-08-20', etapa: 'planejamento', status: 'em_andamento', observacao: 'Lote histórico priorizado.' },
    { tipo: 'Avanço de etapa', em: '2026-09-05', etapa: 'elaboracao', status: 'aprovado_concessionaria', observacao: 'Projeto aprovado.' },
    { tipo: 'Avanço de etapa', em: '2026-09-20', etapa: 'fase_1', status: 'aprovado_concessionaria', observacao: 'Fase 1 concluída e aprovada.' },
    { tipo: 'Avanço de etapa', em: '2026-10-02', etapa: 'fase_2', status: 'aprovado_concessionaria', observacao: 'Fase 2 aprovada.' },
    { tipo: 'Avanço de etapa', em: '2026-10-16', etapa: 'homologacao', status: 'em_andamento', observacao: 'Em homologação junto ao órgão competente.' },
  ],
  'concluido-regularizacao-piloto-2025': [
    { tipo: 'Avanço de etapa', em: '2026-08-10', etapa: 'planejamento', status: 'em_andamento', observacao: 'Piloto iniciado.' },
    { tipo: 'Avanço de etapa', em: '2026-08-25', etapa: 'elaboracao', status: 'aprovado_concessionaria', observacao: 'Elaboração aprovada.' },
    { tipo: 'Avanço de etapa', em: '2026-09-05', etapa: 'fase_1', status: 'aprovado_concessionaria', observacao: 'Fase 1 aprovada.' },
    { tipo: 'Avanço de etapa', em: '2026-09-12', etapa: 'fase_2', status: 'aprovado_concessionaria', observacao: 'Fase 2 aprovada.' },
    { tipo: 'Avanço de etapa', em: '2026-09-26', etapa: 'homologacao', status: 'aprovado_concessionaria', observacao: 'Homologação aprovada.' },
    { tipo: 'Conclusão', em: '2026-09-28', etapa: 'concluido', status: 'concluido', observacao: 'Protocolo concluído — piloto 2025.' },
  ],
}

const removerDemo = async (db: FirebaseFirestore.Firestore) => {
  const refs: FirebaseFirestore.DocumentReference[] = []
  for (const name of ['gestaoProtocolos', 'gestaoPontos', 'gestaoMovimentos']) {
    const snap = await db.collection(name).where('contratoId', '==', CONTRATO_ID).get()
    refs.push(...snap.docs.map((d) => d.ref))
  }
  const contratoRef = db.collection('gestaoContratos').doc(CONTRATO_ID)
  if ((await contratoRef.get()).exists) refs.push(contratoRef)
  for (let i = 0; i < refs.length; i += 450) {
    const batch = db.batch()
    refs.slice(i, i + 450).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
  return refs.length
}

async function main() {
  initAdmin()
  const db = getFirestore()

  const removidos = await removerDemo(db)
  log.info('Demo anterior removido', { documentos: removidos })
  if (CLEAN_ONLY) {
    log.ok('Cleanup concluído (--cleanup)')
    return
  }

  await db.collection('gestaoContratos').doc(CONTRATO_ID).set({
    nome: CONTRATO_NOME,
    numero: 'DEMO-001',
    objeto: 'Massa de demonstração da matriz completa de etapas e situações do módulo Gestão de Contratos.',
    vigenciaInicio: '2026-01-01',
    vigenciaFim: '2027-12-31',
    situacao: 'ativo',
    observacoes: 'Contrato gerado por scripts/seedGestaoContratos.ts. Pode ser excluído pela UI (cascade) sem impacto nos dados reais.',
    createdAt: FieldValue.serverTimestamp(),
  })
  log.ok('Contrato demo criado', { id: CONTRATO_ID })

  const protoIds = new Map<string, string>()
  for (const proto of PROTOCOLOS) {
    const slug = slugify(proto.titulo)
    const ref = db.collection('gestaoProtocolos').doc(`demo-${slug}`)
    await ref.set({
      contratoId: CONTRATO_ID,
      titulo: `[DEMO] ${proto.titulo}`,
      concessionaria: proto.via.concessionaria,
      rodovia: proto.via.rodovia,
      numero: proto.numero,
      etapa: proto.etapa,
      status: proto.status,
      previsao: proto.previsao,
      ...(proto.realizadoEm ? { realizadoEm: proto.realizadoEm } : {}),
      createdAt: FieldValue.serverTimestamp(),
    })
    protoIds.set(slug, ref.id)
  }
  log.ok('Protocolos criados', { total: PROTOCOLOS.length })

  let pontosCriados = 0
  for (const ponto of PONTOS) {
    const protocoloId = ponto.protoSlug ? protoIds.get(ponto.protoSlug) ?? null : null
    const proto = ponto.protoSlug ? PROTOCOLOS.find((p) => slugify(p.titulo) === ponto.protoSlug)! : null
    const via = proto?.via ?? (ponto.codigo.includes('MOT') ? MOTIVA : ARTERIS)
    await db.collection('gestaoPontos').doc(`demo-${ponto.slug}`).set({
      contratoId: CONTRATO_ID,
      protocoloId,
      codigo: ponto.codigo,
      estado: ponto.estado,
      concessionaria: via.concessionaria,
      rodovia: via.rodovia,
      km: ponto.km,
      tipo: ponto.tipo,
      ...(ponto.lat ? { latitude: ponto.lat[0], longitude: ponto.lat[1], precisao: ponto.precisao ?? 'aproximada' } : {}),
      ...(ponto.resultado ? { resultado: ponto.resultado } : {}),
      ...(ponto.previsao ? { previsao: ponto.previsao } : {}),
      ...(ponto.realizadoEm ? { realizadoEm: ponto.realizadoEm } : {}),
    })
    pontosCriados += 1
  }
  log.ok('Pontos criados', { total: pontosCriados })

  let movimentosCriados = 0
  for (const [protoSlug, movimentos] of Object.entries(MOVIMENTOS_BASE)) {
    const protocoloId = protoIds.get(protoSlug)
    if (!protocoloId) continue
    for (const [index, mov] of movimentos.entries()) {
      await db.collection('gestaoMovimentos').doc(`demo-${protoSlug}-${mov.em}-${index}`).set({
        contratoId: CONTRATO_ID,
        protocoloId,
        tipo: mov.tipo,
        observacao: mov.observacao,
        em: mov.em,
        etapa: mov.etapa,
        status: mov.status,
        autor: 'seed-demo',
        anexos: [],
      })
      movimentosCriados += 1
    }
  }
  log.ok('Movimentações criadas', { total: movimentosCriados })

  log.info('——— Resumo ———')
  log.ok(`Contrato: ${CONTRATO_NOME} (${CONTRATO_ID})`)
  log.ok(`Protocolos: ${PROTOCOLOS.length} | Pontos: ${pontosCriados} | Movimentações: ${movimentosCriados}`)
  log.info('Abra /gestao-contratos no app e filtre por "DEMO". Para remover: npm run seed:gestao-demo -- --cleanup')
}

main().catch((error) => {
  console.error('[seed:gestao-demo] ERROR', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
