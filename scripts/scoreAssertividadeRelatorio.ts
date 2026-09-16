/**
 * Pontua relatório/parecer contra o eval de assertividade.
 *
 * Uso:
 *   npx tsx scripts/scoreAssertividadeRelatorio.ts --relatorio path.txt
 *   npx tsx scripts/scoreAssertividadeRelatorio.ts --relatorio path.txt --caso eval-poc-edp-viana
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  EVAL_ASSERTIVIDADE_CASOS,
  scoreRelatorioContraEval,
} from '../src/config/evalAssertividadeCliente'

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx < 0) return undefined
  return process.argv[idx + 1]
}

function main() {
  const relatorioPath = argValue('--relatorio')
  const casoId = argValue('--caso') || 'eval-poc-edp-viana'

  if (!relatorioPath) {
    console.error(
      'Uso: npx tsx scripts/scoreAssertividadeRelatorio.ts --relatorio <arquivo> [--caso eval-poc-edp-viana]',
    )
    process.exit(1)
  }

  const abs = resolve(process.cwd(), relatorioPath)
  if (!existsSync(abs)) {
    console.error(`Arquivo não encontrado: ${abs}`)
    process.exit(1)
  }

  const texto = readFileSync(abs, 'utf8')
  const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === casoId)
  if (!caso) {
    console.error(`Caso de eval desconhecido: ${casoId}`)
    process.exit(1)
  }

  const result = scoreRelatorioContraEval(casoId, texto)
  if (!result) {
    console.error('Falha ao pontuar.')
    process.exit(1)
  }

  console.log(`caso: ${result.casoId}`)
  console.log(`score: ${result.ok}/${result.total} (${result.percentual}%)`)
  console.log(`passouCriticos: ${result.passouCriticos}`)
  if (result.findingsOk?.length) {
    console.log(`ok: ${result.findingsOk.join(', ')}`)
  }
  if (result.findingsFalhos?.length) {
    console.log(`falhos: ${result.findingsFalhos.join(', ')}`)
  }
  if (result.criticosFalhos.length) {
    console.log(`criticosFalhos: ${result.criticosFalhos.join(', ')}`)
  }

  const aceite = result.passouCriticos && result.percentual >= 70
  console.log(`aceiteSugerido(>=70% + criticos): ${aceite}`)
  process.exit(aceite ? 0 : 2)
}

main()
