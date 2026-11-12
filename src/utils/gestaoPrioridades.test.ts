import { describe, expect, it } from 'vitest'
import { classificarPrazo, resumirPrioridades, situacaoOperacional } from './gestaoPrioridades'
import type { Protocolo } from '../services/gestaoContratos'

const protocolo = (id: string, status: Protocolo['status'], previsao?: string): Protocolo => ({
  id, contratoId: 'contrato-1', titulo: id, concessionaria: 'Eco', rodovia: 'BR-101', etapa: 'fase_1', status, previsao,
})

describe('prioridades operacionais', () => {
  it('distingue prazo vencido, entrega próxima e prazo ausente sem inventar data', () => {
    expect(classificarPrazo('2026-10-25', '2026-10-26')).toEqual({ rotulo: '1 dia em atraso', prioridade: 'atrasado' })
    expect(classificarPrazo('2026-10-26', '2026-10-26')).toEqual({ rotulo: 'Entrega hoje', prioridade: 'proximo' })
    expect(classificarPrazo('2026-11-02', '2026-10-26')).toEqual({ rotulo: 'Em 7 dias', prioridade: 'proximo' })
    expect(classificarPrazo('2026-11-03', '2026-10-26')).toEqual({ rotulo: '03/11/2026', prioridade: 'normal' })
    expect(classificarPrazo(undefined, '2026-10-26')).toEqual({ rotulo: 'Sem previsão', prioridade: 'sem_prazo' })
  })

  it('não trata protocolo concluído como pendência nem mistura estados de terceiros com correção interna', () => {
    const result = resumirPrioridades([
      protocolo('correcao', 'em_correcao', '2026-10-27'),
      protocolo('terceiro', 'aguardando_terceiros', '2026-10-25'),
      protocolo('concluido', 'concluido', '2026-10-20'),
      protocolo('futuro', 'em_andamento', '2026-11-20'),
    ], '2026-10-26')
    expect(result).toEqual({ emCorrecao: 1, aguardandoTerceiros: 1, vencidos: 1, proximos: 1 })
  })

  it('não declara controle quando há protocolos paralisados sem atrasos', () => {
    expect(situacaoOperacional({ protocolos: 3, atrasados: 0, paralisados: 1 })).toEqual({ titulo: 'Há protocolos paralisados', descricao: '1 protocolo paralisado pede acompanhamento.' })
  })

  it('distingue ausência de protocolos, prazos vencidos e ausência de pendências', () => {
    expect(situacaoOperacional({ protocolos: 0, atrasados: 0, paralisados: 0 }).titulo).toBe('Pronto para começar')
    expect(situacaoOperacional({ protocolos: 3, atrasados: 2, paralisados: 1 })).toEqual({ titulo: 'Há prazos vencidos', descricao: '2 protocolos com prazo vencido pedem ação.' })
    expect(situacaoOperacional({ protocolos: 3, atrasados: 0, paralisados: 0 })).toEqual({ titulo: 'Nenhum prazo vencido', descricao: 'Confira as pendências e entregas próximas deste recorte.' })
  })
})
