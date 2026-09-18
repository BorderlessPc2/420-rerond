/**
 * Pontua relatorio/parecer contra o eval de assertividade sem depender de tsx.
 *
 * Uso:
 *   node --experimental-strip-types scripts/scoreAssertividadeRelatorio.mjs --relatorio path.txt
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  EVAL_ASSERTIVIDADE_CASOS,
  scoreRelatorioContraEval,
} from '../src/config/evalAssertividadeCliente.ts'

function argValue(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx < 0) return undefined
  return process.argv[idx + 1]
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

const relatorioPath = argValue('--relatorio')
const casoId = argValue('--caso') || 'eval-poc-edp-viana'
const meta = Number(argValue('--meta') || '90')
const asJson = hasFlag('--json')

if (!relatorioPath) {
  console.error(
    'Uso: node --experimental-strip-types scripts/scoreAssertividadeRelatorio.mjs --relatorio <arquivo> [--caso eval-poc-edp-viana] [--meta 90] [--json]',
  )
  process.exit(1)
}

const abs = resolve(process.cwd(), relatorioPath)
if (!existsSync(abs)) {
  console.error(`Arquivo nao encontrado: ${abs}`)
  process.exit(1)
}

const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === casoId)
if (!caso) {
  console.error(`Caso de eval desconhecido: ${casoId}`)
  console.error(`Disponiveis: ${EVAL_ASSERTIVIDADE_CASOS.map((c) => c.id).join(', ')}`)
  process.exit(1)
}

const texto = readFileSync(abs, 'utf8')
const result = scoreRelatorioContraEval(casoId, texto)
if (!result) {
  console.error('Falha ao pontuar.')
  process.exit(1)
}

const aceiteMeta = result.passouCriticos && result.percentual >= meta
const aceiteSugerido70 = result.passouCriticos && result.percentual >= 70

if (asJson) {
  console.log(
    JSON.stringify(
      {
        ...result,
        meta,
        aceiteMeta,
        aceiteSugerido70,
        relatorio: abs,
        casoTitulo: caso.titulo,
      },
      null,
      2,
    ),
  )
} else {
  console.log(`caso: ${result.casoId} - ${caso.titulo}`)
  console.log(`score: ${result.ok}/${result.total} (${result.percentual}%)`)
  console.log(`passouCriticos: ${result.passouCriticos}`)
  if (result.findingsOk?.length) console.log(`ok: ${result.findingsOk.join(', ')}`)
  if (result.findingsFalhos?.length) console.log(`falhos: ${result.findingsFalhos.join(', ')}`)
  if (result.criticosFalhos.length) {
    console.log(`criticosFalhos: ${result.criticosFalhos.join(', ')}`)
  }
  console.log(`aceiteSugerido(>=70% + criticos): ${aceiteSugerido70}`)
  console.log(`aceiteMeta(>=${meta}% + criticos): ${aceiteMeta}`)
}

process.exit(aceiteMeta ? 0 : 2)
