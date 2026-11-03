import type { Ponto, Protocolo, SituacaoContrato } from './gestaoContratos'

export type ProtocoloInput = Pick<Protocolo, 'titulo' | 'concessionaria' | 'rodovia'> & Partial<Pick<Protocolo, 'numero' | 'previsao' | 'realizadoEm' | 'processoAnaliseId'>>
export type PontoInput = Omit<Ponto, 'id' | 'contratoId' | 'protocoloId'>
export type ContratoInput = {
  nome: string
  clienteId?: string
  numero?: string
  objeto?: string
  vigenciaInicio?: string
  vigenciaFim?: string
  situacao?: SituacaoContrato
  observacoes?: string
}

const dateOk = (value?: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value)

export const validarInputContrato = (input: ContratoInput) => {
  const errors: string[] = []
  if (!input.nome.trim()) errors.push('Informe nome do contrato.')
  if (!dateOk(input.vigenciaInicio) || !dateOk(input.vigenciaFim)) errors.push('Informe vigência em formato AAAA-MM-DD.')
  if (input.vigenciaInicio && input.vigenciaFim && input.vigenciaInicio > input.vigenciaFim) errors.push('Vigência inicial não pode ser posterior à final.')
  if (input.situacao && !['ativo', 'suspenso', 'encerrado'].includes(input.situacao)) errors.push('Situação contratual inválida.')
  return errors
}

export const validarInputProtocolo = (input: ProtocoloInput) =>
  !input.titulo.trim() || !input.concessionaria.trim() || !input.rodovia.trim() ? ['Informe título, concessionária e rodovia.'] : []

export const validarInputPonto = (input: PontoInput, protocolo?: Pick<Protocolo, 'concessionaria' | 'rodovia'>) => {
  const errors: string[] = []
  if (!input.codigo.trim() || !input.estado.trim() || !input.km.trim()) errors.push('Informe código, estado e quilômetro.')
  if (protocolo && (input.concessionaria.trim() !== protocolo.concessionaria.trim() || input.rodovia.trim() !== protocolo.rodovia.trim())) errors.push('Ponto deve pertencer à mesma concessionária e rodovia do protocolo.')
  if ((input.latitude === undefined) !== (input.longitude === undefined) || (input.latitude !== undefined && (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude) || input.latitude < -90 || input.latitude > 90 || input.longitude! < -180 || input.longitude! > 180))) errors.push('Coordenadas inválidas.')
  if (input.resultado && ((input.tipo === 'regularizacao') !== (input.resultado === 'regularizado'))) errors.push('Resultado incompatível com classificação do ponto.')
  return errors
}
