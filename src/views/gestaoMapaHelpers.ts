import type { Ponto, Protocolo } from '../services/gestaoContratos'

export const getPontoDetailSummary = (ponto: Ponto, protocolo?: Protocolo) => ({
  local: `${ponto.estado} · ${ponto.rodovia} · km ${ponto.km}`,
  classificacao: ponto.tipo === 'regularizacao' ? 'Regularização' : 'Nova implantação',
  protocolo: protocolo?.titulo ?? 'Sem protocolo vinculado',
  status: ponto.resultado ?? protocolo?.status ?? 'nao_iniciado',
})

export const getPontoStatusOptions = (ponto: Ponto) => [
  { value: '', label: 'Ainda não concluído' },
  ponto.tipo === 'regularizacao'
    ? { value: 'regularizado', label: 'Regularizado' }
    : { value: 'aprovado_implantacao', label: 'Aprovado para implantação' },
]
