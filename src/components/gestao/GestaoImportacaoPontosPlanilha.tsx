import { useState } from 'react'
import {
  baixarModeloPlanilhaPontos,
  extrairPontosRascunho,
  labelCampoPlanilha,
  mesclarPontosRascunho,
  parsePlanilhaParaRascunhoProtocolo,
  type ResultadoPlanilhaRascunho,
} from '../../services/gestaoImportacao'
import type { ProtocoloInput } from '../../services/gestaoValidacao'
import type { PontoInput } from '../../services/gestaoValidacao'

export type ContextoProtocoloPlanilha = Pick<ProtocoloInput, 'titulo' | 'concessionaria' | 'rodovia' | 'numero'>

type GestaoImportacaoPontosPlanilhaProps = {
  idPrefix: string
  contexto: ContextoProtocoloPlanilha
  points: PontoInput[]
  onPointsChange: (points: PontoInput[]) => void
  onSugestaoProtocolo?: (patch: Partial<ProtocoloInput>) => void
  onError: (message: string) => void
  onClearError?: () => void
}

export default function GestaoImportacaoPontosPlanilha({
  idPrefix,
  contexto,
  points,
  onPointsChange,
  onSugestaoProtocolo,
  onError,
  onClearError,
}: GestaoImportacaoPontosPlanilhaProps) {
  const [draftPlanilha, setDraftPlanilha] = useState<ResultadoPlanilhaRascunho | null>(null)
  const [draftParsing, setDraftParsing] = useState(false)
  const [draftMessage, setDraftMessage] = useState('')

  const readDraftSheet = async (file: File) => {
    setDraftParsing(true)
    setDraftMessage('')
    try {
      setDraftPlanilha(await parsePlanilhaParaRascunhoProtocolo(file, contexto))
      onClearError?.()
    } catch (err) {
      setDraftPlanilha(null)
      onError(err instanceof Error ? err.message : 'Erro ao ler planilha de pontos.')
    } finally {
      setDraftParsing(false)
    }
  }

  const applyDraftSheet = () => {
    if (!draftPlanilha) return
    const sugestao = draftPlanilha.sugestaoProtocolo
    const nextConcessionaria = contexto.concessionaria.trim() || sugestao?.concessionaria || ''
    const nextRodovia = contexto.rodovia.trim() || sugestao?.rodovia || ''
    if (draftPlanilha.analise.perfil === 'somente_pontos' && (!nextConcessionaria || !nextRodovia)) {
      onError('Informe concessionária e rodovia do protocolo antes de aplicar a planilha de pontos.')
      return
    }
    let pontosImportados = draftPlanilha.pontos
    let linhasInvalidas = draftPlanilha.linhasInvalidas
    if (draftPlanilha.analise.perfil === 'somente_pontos' && !pontosImportados.length) {
      const extraido = extrairPontosRascunho(draftPlanilha.linhas, nextConcessionaria, nextRodovia)
      pontosImportados = extraido.pontos
      linhasInvalidas = extraido.linhasInvalidas
    }
    if (!pontosImportados.length) {
      onError('Nenhum ponto válido para aplicar. Revise a planilha e os campos do protocolo.')
      return
    }
    if (sugestao && onSugestaoProtocolo) {
      onSugestaoProtocolo({
        titulo: contexto.titulo.trim() || sugestao.titulo,
        concessionaria: nextConcessionaria,
        rodovia: nextRodovia,
        numero: (contexto.numero ?? '').trim() || sugestao.numero || '',
      })
    }
    const merged = mesclarPontosRascunho(
      points,
      pontosImportados.map((point) => ({ ...point, concessionaria: nextConcessionaria, rodovia: nextRodovia })),
    )
    onPointsChange(merged.pontos)
    setDraftMessage(
      `${pontosImportados.length} linha(s) importada(s) · ${merged.pontos.length} ponto(s) no rascunho${
        merged.duplicadosIgnorados ? ` · ${merged.duplicadosIgnorados} código(s) atualizado(s)` : ''
      }${linhasInvalidas.length ? ` · ${linhasInvalidas.length} linha(s) ignorada(s) por erro` : ''}.`,
    )
    setDraftPlanilha(null)
    onClearError?.()
  }

  const inputId = `${idPrefix}-draft-planilha`

  return (
    <div className="gestao-sheet-import gestao-pontos-draft">
      <div className="gestao-draft-heading">
        <div>
          <strong>Importar pontos da planilha</strong>
          <small>
            Cadastre o protocolo acima e use planilha só de pontos ou planilha completa; os pontos entram no rascunho
            antes de gravar.
          </small>
        </div>
      </div>
      <div className="gestao-sheet-actions">
        <button type="button" className="gestao-button-secondary" onClick={baixarModeloPlanilhaPontos}>
          Modelo só pontos
        </button>
        <button
          type="button"
          className="gestao-button-secondary"
          onClick={() => document.getElementById(inputId)?.click()}
          disabled={draftParsing}
        >
          {draftParsing ? 'Analisando…' : 'Escolher planilha'}
        </button>
        <input
          id={inputId}
          hidden
          type="file"
          accept=".xlsx,.csv"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void readDraftSheet(file)
            event.target.value = ''
          }}
        />
      </div>
      {draftPlanilha && (
        <div className="gestao-sheet-detect" role="status">
          <p>
            <strong>{draftPlanilha.analise.descricaoPerfil}</strong>
          </p>
          <p>
            {draftPlanilha.nomeArquivo} · {draftPlanilha.analise.totalLinhas} linha(s) · {draftPlanilha.pontos.length}{' '}
            ponto(s) válido(s)
            {draftPlanilha.linhasInvalidas.length ? ` · ${draftPlanilha.linhasInvalidas.length} linha(s) com erro` : ''}
          </p>
          <ul className="gestao-sheet-fields">
            {draftPlanilha.analise.camposDetectados.map((item) => (
              <li key={item.campo}>
                <span>{labelCampoPlanilha(item.campo)}</span>
                <small>{item.coluna}</small>
              </li>
            ))}
          </ul>
          {draftPlanilha.analise.colunasNaoMapeadas.length > 0 && (
            <p className="gestao-import-limit-hint">
              Colunas ignoradas: {draftPlanilha.analise.colunasNaoMapeadas.join(', ')}
            </p>
          )}
          {draftPlanilha.analise.perfil === 'somente_pontos'
            && (!contexto.concessionaria.trim() || !contexto.rodovia.trim()) && (
              <p className="gestao-error" role="alert">
                Preencha concessionária e rodovia do protocolo antes de aplicar pontos.
              </p>
            )}
          {draftPlanilha.avisos.map((item) => (
            <p className="gestao-import-limit-hint" key={item}>
              {item}
            </p>
          ))}
          {draftPlanilha.linhasInvalidas.slice(0, 5).map((item) => (
            <p className="gestao-error" key={item.linha}>
              Linha {item.linha}: {item.erros.join(' ')}
            </p>
          ))}
          {draftPlanilha.linhasInvalidas.length > 5 && (
            <p className="gestao-import-limit-hint">
              … e mais {draftPlanilha.linhasInvalidas.length - 5} linha(s) com erro.
            </p>
          )}
          <div className="gestao-form-footer">
            <button type="button" className="gestao-button-secondary" onClick={() => setDraftPlanilha(null)}>
              Descartar análise
            </button>
            <button
              type="button"
              onClick={applyDraftSheet}
              disabled={
                !draftPlanilha.pontos.length
                && !(draftPlanilha.analise.perfil === 'somente_pontos' && draftPlanilha.linhas.length > 0)
              }
            >
              Aplicar ao rascunho
            </button>
          </div>
        </div>
      )}
      {draftMessage && (
        <p className="gestao-success" role="status">
          {draftMessage}
        </p>
      )}
    </div>
  )
}