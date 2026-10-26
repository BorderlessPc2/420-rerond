import type { Protocolo } from '../services/gestaoContratos'

export function classificarPrazo(previsao?: string, hoje = new Date().toISOString().slice(0, 10)) {
  if (!previsao) return { rotulo: 'Sem previsão', prioridade: 'sem_prazo' as const }
  const diferenca = Math.round((Date.parse(`${previsao}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86_400_000)
  if (diferenca < 0) return { rotulo: `${-diferenca} ${diferenca === -1 ? 'dia' : 'dias'} em atraso`, prioridade: 'atrasado' as const }
  if (diferenca === 0) return { rotulo: 'Entrega hoje', prioridade: 'proximo' as const }
  if (diferenca <= 7) return { rotulo: `Em ${diferenca} ${diferenca === 1 ? 'dia' : 'dias'}`, prioridade: 'proximo' as const }
  return { rotulo: `${previsao.slice(8, 10)}/${previsao.slice(5, 7)}/${previsao.slice(0, 4)}`, prioridade: 'normal' as const }
}

export function resumirPrioridades(protocolos: Protocolo[], hoje = new Date().toISOString().slice(0, 10)) {
  const ativos = protocolos.filter((item) => item.status !== 'concluido' && item.etapa !== 'concluido')
  return {
    emCorrecao: ativos.filter((item) => item.status === 'em_correcao').length,
    aguardandoTerceiros: ativos.filter((item) => item.status === 'aguardando_terceiros').length,
    vencidos: ativos.filter((item) => classificarPrazo(item.previsao, hoje).prioridade === 'atrasado').length,
    proximos: ativos.filter((item) => classificarPrazo(item.previsao, hoje).prioridade === 'proximo').length,
  }
}
