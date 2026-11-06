import { formatarDataGestao, nomeGestao } from './gestaoUi'
import type { ContratoInput } from '../services/gestaoContratos'

export const contratoVazio = (): ContratoInput => ({ nome: '', situacao: 'ativo' })

export const contratoFromModel = (contrato: ContratoInput & { id?: string }): ContratoInput => ({
  nome: contrato.nome,
  clienteId: contrato.clienteId,
  numero: contrato.numero ?? '',
  objeto: contrato.objeto ?? '',
  vigenciaInicio: contrato.vigenciaInicio ?? '',
  vigenciaFim: contrato.vigenciaFim ?? '',
  situacao: contrato.situacao ?? 'ativo',
  observacoes: contrato.observacoes ?? '',
})

export const tituloContratoGestao = (nome: string, numero?: string) =>
  numero?.trim() ? `${numero.trim()} — ${nome}` : nome

export const resumoContratoGestao = (input: Pick<ContratoInput, 'objeto' | 'vigenciaInicio' | 'vigenciaFim' | 'situacao'>, opcoes?: { incluirObjeto?: boolean }) => {
  const partes = [
    opcoes?.incluirObjeto === false ? '' : input.objeto?.trim(),
    input.vigenciaInicio || input.vigenciaFim
      ? `Vigência ${formatarDataGestao(input.vigenciaInicio)} – ${formatarDataGestao(input.vigenciaFim)}`
      : '',
    input.situacao ? nomeGestao(input.situacao) : '',
  ].filter(Boolean)
  return partes.join(' · ')
}
