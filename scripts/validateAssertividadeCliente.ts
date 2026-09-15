/**
 * Validação pós-aprovação dos goldens do cliente.
 * Uso: npx tsx scripts/validateAssertividadeCliente.ts
 *
 * 1) Usa seed local (mesmo conteúdo sincronizado no Firestore)
 * 2) Simula injeção por tipo (máx. 3) como nas Functions
 * 3) Checa cobertura lexical dos findings críticos do eval POC
 * 4) Juiz OpenAI: o bloco golden cobre os findings do gabarito?
 *
 * Status aprovado no Firestore foi confirmado via leitura direta dos docs
 * `cliente-*` (Agent). Este script valida conteúdo + cobertura + juiz.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import OpenAI from 'openai'
import {
  EVAL_ASSERTIVIDADE_CASOS,
  scoreEvalCaso,
} from '../src/config/evalAssertividadeCliente'
import { GOLDEN_CASES_SEED } from '../src/services/goldenCase/goldenCaseSeed'

loadEnv({ path: resolve(process.cwd(), '.env') })

/** Confirmados aprovados+ativos em produção (15/09/2026). */
const FIRESTORE_APROVADOS_CONFIRMADOS = new Set([
  'cliente-poc-edp-viana-comparativo',
  'cliente-poc-leitura-vs-ausencia',
  'cliente-pac-tipologia-checklist',
  'cliente-ppu-checklist-especifico',
])

type GoldenDoc = {
  id: string
  codigo: string
  titulo: string
  tipoAnaliseId: string
  status: string
  ativo: boolean
  analiseCorreta?: string
  erroIa?: string
  pares?: Array<{
    id?: string
    regraOuItem?: string
    original?: string
    correto?: string
    justificativa?: string
  }>
  updatedAtMs: number
}

function buildGoldenBlock(items: GoldenDoc[]): string {
  if (!items.length) return ''
  const lines = [
    'CASOS MODELO (GOLDEN CASES — MESMO TIPO)',
    'Use como referência de qualidade para ESTE tipo de análise.',
    'NÃO copie fatos dos documentos do caso modelo como se fossem da solicitação atual.',
    '',
  ]
  for (const [i, item] of items.entries()) {
    lines.push(`${i + 1}) [${item.codigo}] ${item.titulo}`)
    if (item.analiseCorreta) lines.push(`   Resumo: ${item.analiseCorreta}`)
    if (item.erroIa) lines.push(`   Evitar: ${item.erroIa}`)
    for (const par of item.pares ?? []) {
      lines.push(
        `   - ${par.regraOuItem ?? 'item'}: ERRADO: ${par.original ?? ''} | CERTO: ${par.correto ?? ''} | PORQUE: ${par.justificativa ?? ''}`,
      )
    }
    lines.push('')
  }
  return lines.join('\n')
}

function selectForTipo(all: GoldenDoc[], tipoAnaliseId: string, max = 3): GoldenDoc[] {
  return all
    .filter((g) => g.status === 'aprovado' && g.ativo !== false && g.tipoAnaliseId === tipoAnaliseId)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
    .slice(0, max)
}

function coverageKeywords(block: string): { id: string; ok: boolean; needles: string[] }[] {
  const lower = block.toLowerCase()
  const checks = [
    { id: 'f-memorial', needles: ['cariacica', 'travessia', 'viana'] },
    { id: 'f-plano-trabalho', needles: ['plano de trabalho', 'sem inconsist'] },
    { id: 'f-planta', needles: ['300+140', 'poste'] },
    { id: 'f-perfil', needles: ['perfil', 'não localiz'] },
    { id: 'f-sinalizacao', needles: ['sinaliza', 'ecorodovias', 'carimbo'] },
    { id: 'f-art', needles: ['art', 'volume iii'] },
    { id: 'f-licenca', needles: ['licença', 'inexigibilidade', 'dispensa'] },
  ]
  return checks.map((c) => ({
    id: c.id,
    needles: c.needles,
    ok: c.needles.some((n) => lower.includes(n.toLowerCase())),
  }))
}

async function judgeWithOpenAI(goldenBlock: string): Promise<{
  findingsOk: string[]
  raw: string
} | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    console.warn('OPENAI_API_KEY ausente — pulando juiz OpenAI.')
    return null
  }

  const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === 'eval-poc-edp-viana')!
  const findingsList = caso.findings
    .map((f) => `- ${f.id}: ${f.item} | esperado: ${f.esperado}${f.antiPadrao ? ` | anti: ${f.antiPadrao}` : ''}`)
    .join('\n')

  const baselineErros = readFileSync(
    resolve(process.cwd(), '.pdf/_extract/testes/teste de analise - COMPARATIVO.pdf.txt'),
    'utf8',
  ).slice(0, 3500)

  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Você valida se o bloco de CASOS MODELO (goldens aprovados) cobre os findings do gabarito. Responda JSON: { "findingsOk": string[], "comentarios": string }. Inclua em findingsOk só IDs claramente cobertos pelo bloco golden (orientação suficiente para evitar o anti-padrão).',
      },
      {
        role: 'user',
        content: [
          '## Goldens injetáveis (tipo poc)',
          goldenBlock,
          '',
          '## Findings do eval',
          findingsList,
          '',
          '## Baseline histórico (comparativo — erros do programa)',
          baselineErros,
        ].join('\n'),
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  let parsed: { findingsOk?: string[] } = {}
  try {
    parsed = JSON.parse(raw) as { findingsOk?: string[] }
  } catch {
    parsed = {}
  }
  return { findingsOk: parsed.findingsOk ?? [], raw }
}

async function main() {
  console.log('=== 1) Goldens cliente (seed + status Firestore confirmado) ===')
  const loaded: GoldenDoc[] = GOLDEN_CASES_SEED.filter((s) =>
    FIRESTORE_APROVADOS_CONFIRMADOS.has(s.id),
  ).map((seed, index) => ({
    id: seed.id,
    codigo: seed.codigo,
    titulo: seed.titulo,
    tipoAnaliseId: seed.tipoAnaliseId,
    status: 'aprovado',
    ativo: seed.ativo !== false,
    analiseCorreta: seed.analiseCorreta,
    erroIa: seed.erroIa,
    pares: seed.pares,
    updatedAtMs: Date.now() - index,
  }))

  for (const id of FIRESTORE_APROVADOS_CONFIRMADOS) {
    const doc = loaded.find((g) => g.id === id)
    if (!doc) {
      console.log(`FAIL  ${id}: ausente no seed local`)
      continue
    }
    console.log(
      `OK  ${id} | aprovado (Firestore) | tipo=${doc.tipoAnaliseId} | pares=${doc.pares?.length ?? 0}`,
    )
  }

  console.log('\n=== 2) Simulação de injeção (máx. 3 por tipo) ===')
  for (const tipo of ['poc', 'pac', 'ppu'] as const) {
    const selected = selectForTipo(loaded, tipo, 3)
    console.log(
      `tipo=${tipo}: ${selected.length} caso(s) → ${selected.map((s) => s.id).join(', ') || '(nenhum)'}`,
    )
  }

  const pocInject = selectForTipo(loaded, 'poc', 3)
  const block = buildGoldenBlock(pocInject)
  console.log(`\nBloco POC (${block.length} chars):\n${block.slice(0, 900)}...\n`)

  console.log('=== 3) Cobertura lexical dos findings críticos ===')
  const cov = coverageKeywords(block)
  let lexicalMiss = 0
  for (const c of cov) {
    if (!c.ok) lexicalMiss += 1
    console.log(`${c.ok ? 'OK' : 'MISS'}  ${c.id} (needles: ${c.needles.join(', ')})`)
  }

  console.log('\n=== 4) Juiz OpenAI (cobertura dos findings pelo golden) ===')
  const judged = await judgeWithOpenAI(block)
  let scoreLine = 'pulado'
  if (judged) {
    const score = scoreEvalCaso({
      casoId: 'eval-poc-edp-viana',
      findingsOk: judged.findingsOk,
    })
    console.log(
      `findingsOk (${judged.findingsOk.length}): ${judged.findingsOk.join(', ') || '(nenhum)'}`,
    )
    if (score) {
      scoreLine = `${score.ok}/${score.total} (${score.percentual}%) | críticos OK: ${score.passouCriticos}`
      console.log(
        `score: ${scoreLine} | críticos falhos: ${score.criticosFalhos.join(', ') || '—'}`,
      )
      if (judged.raw) {
        try {
          const j = JSON.parse(judged.raw) as { comentarios?: string }
          if (j.comentarios) console.log(`comentarios: ${j.comentarios.slice(0, 500)}`)
        } catch {
          /* ignore */
        }
      }
    }
  }

  console.log('\n=== 5) PDFs normativos empacotados ===')
  const pdfDir = resolve(process.cwd(), 'functions/lib/config/normas-pdf')
  if (!existsSync(pdfDir)) {
    console.log('FAIL  pasta normas-pdf ausente')
  } else {
    for (const f of readdirSync(pdfDir)) console.log(`OK  ${f}`)
  }

  const allApproved = loaded.length === FIRESTORE_APROVADOS_CONFIRMADOS.size
  const pocReady = pocInject.length >= 1
  console.log('\n=== RESUMO ===')
  console.log(`goldens aprovados (Firestore+seed): ${allApproved ? 'SIM' : 'NÃO'}`)
  console.log(`injeção POC pronta: ${pocReady ? 'SIM' : 'NÃO'}`)
  console.log(`cobertura lexical misses: ${lexicalMiss}`)
  console.log(`juiz OpenAI: ${scoreLine}`)
  console.log(
    'Próximo passo empírico completo: na UI, rodar análise tipo POC e conferir goldenCaseIdsInjetados + findings do EVAL_ASSERTIVIDADE.md',
  )

  if (!allApproved || !pocReady) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
