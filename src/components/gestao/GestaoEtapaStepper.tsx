import { progressoEtapa, type Etapa, type Situacao } from '../../services/gestaoContratos'
import { rotuloEtapaDashboard } from '../../services/gestaoDashboardConfig'
import type { GestaoDashboardConfig } from '../../services/gestaoDashboardConfig'
import { ETAPAS_ORDEM } from '../../services/gestaoTransicoes'

type GestaoEtapaStepperProps = {
  etapa: Etapa
  status: Situacao | string
  pulse?: boolean
  dashboardConfig?: GestaoDashboardConfig | null
}

const situacaoRingClass = (status: Situacao | string) => {
  if (status === 'concluido' || status === 'aprovado_concessionaria') return 'gestao-stepper-ring-success'
  if (status === 'em_correcao' || status === 'paralisado') return 'gestao-stepper-ring-danger'
  if (status === 'em_analise' || status === 'aguardando_terceiros') return 'gestao-stepper-ring-warning'
  return 'gestao-stepper-ring-progress'
}

export default function GestaoEtapaStepper({ etapa, status, pulse, dashboardConfig }: GestaoEtapaStepperProps) {
  const progresso = progressoEtapa(etapa)
  const rotuloEtapa = (valor: Etapa) => rotuloEtapaDashboard(valor, dashboardConfig)
  return (
    <div className={`gestao-etapa-stepper ${pulse ? 'is-pulse' : ''}`} aria-label={`Etapa ${rotuloEtapa(etapa)} de ${ETAPAS_ORDEM.length}`}>
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
              <span className="gestao-stepper-label">{rotuloEtapa(item)}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
