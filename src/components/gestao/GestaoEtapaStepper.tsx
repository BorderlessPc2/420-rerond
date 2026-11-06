import { progressoEtapa, type Etapa, type Situacao } from '../../services/gestaoContratos'
import { ETAPAS_ORDEM } from '../../services/gestaoTransicoes'
import { nomeGestao } from '../../views/gestaoUi'

type GestaoEtapaStepperProps = {
  etapa: Etapa
  status: Situacao
  pulse?: boolean
}

const situacaoRingClass = (status: Situacao) => {
  if (status === 'concluido' || status === 'aprovado_concessionaria') return 'gestao-stepper-ring-success'
  if (status === 'em_correcao' || status === 'paralisado') return 'gestao-stepper-ring-danger'
  if (status === 'em_analise' || status === 'aguardando_terceiros') return 'gestao-stepper-ring-warning'
  return 'gestao-stepper-ring-progress'
}

export default function GestaoEtapaStepper({ etapa, status, pulse }: GestaoEtapaStepperProps) {
  const progresso = progressoEtapa(etapa)
  return (
    <div className={`gestao-etapa-stepper ${pulse ? 'is-pulse' : ''}`} aria-label={`Etapa ${nomeGestao(etapa)} de ${ETAPAS_ORDEM.length}`}>
      <div className="gestao-stage-track">
        <span style={{ inlineSize: `${((progresso.indice + 0.5) / progresso.total) * 100}%` }} />
      </div>
      <ol className="gestao-stepper-nodes">
        {ETAPAS_ORDEM.map((item, index) => {
          const done = index <= progresso.indice
          const current = item === etapa
          return (
            <li key={item} className={`gestao-stepper-node ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}>
              <span className={`gestao-stepper-dot ${current ? situacaoRingClass(status) : ''}`} aria-hidden="true" />
              <span className="gestao-stepper-label">{nomeGestao(item)}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
