import { nomeGestao } from './gestaoUi'
import type { ContratoInput, SituacaoContrato } from '../services/gestaoContratos'

type ContratoFormFieldsProps = {
  value: ContratoInput
  onChange: (next: ContratoInput) => void
  idPrefix: string
}

const situacoes: SituacaoContrato[] = ['ativo', 'suspenso', 'encerrado']

export function ContratoFormFields({ value, onChange, idPrefix }: ContratoFormFieldsProps) {
  const set = <K extends keyof ContratoInput>(key: K, field: ContratoInput[K]) => onChange({ ...value, [key]: field })
  return <>
    <label htmlFor={`${idPrefix}-nome`}>Nome do contrato<input id={`${idPrefix}-nome`} name="nome" required value={value.nome} onChange={(event) => set('nome', event.target.value)} /></label>
    <label htmlFor={`${idPrefix}-numero`}>Número<input id={`${idPrefix}-numero`} name="numero" value={value.numero ?? ''} onChange={(event) => set('numero', event.target.value)} /></label>
    <label htmlFor={`${idPrefix}-objeto`}>Objeto<textarea id={`${idPrefix}-objeto`} name="objeto" rows={3} value={value.objeto ?? ''} onChange={(event) => set('objeto', event.target.value)} /></label>
    <label htmlFor={`${idPrefix}-vigencia-inicio`}>Vigência inicial<input id={`${idPrefix}-vigencia-inicio`} name="vigenciaInicio" type="date" value={value.vigenciaInicio ?? ''} onChange={(event) => set('vigenciaInicio', event.target.value)} /></label>
    <label htmlFor={`${idPrefix}-vigencia-fim`}>Vigência final<input id={`${idPrefix}-vigencia-fim`} name="vigenciaFim" type="date" value={value.vigenciaFim ?? ''} onChange={(event) => set('vigenciaFim', event.target.value)} /></label>
    <label htmlFor={`${idPrefix}-situacao`}>Situação<select id={`${idPrefix}-situacao`} name="situacao" value={value.situacao ?? 'ativo'} onChange={(event) => set('situacao', event.target.value as SituacaoContrato)}>{situacoes.map((item) => <option key={item} value={item}>{nomeGestao(item)}</option>)}</select></label>
    <label htmlFor={`${idPrefix}-observacoes`}>Observações<textarea id={`${idPrefix}-observacoes`} name="observacoes" rows={2} value={value.observacoes ?? ''} onChange={(event) => set('observacoes', event.target.value)} /></label>
  </>
}
