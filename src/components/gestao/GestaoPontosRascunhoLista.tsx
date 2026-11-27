import type { Ponto } from '../../services/gestaoContratos'
import type { PontoInput } from '../../services/gestaoValidacao'

const vazioBase = (): PontoInput => ({
  codigo: '',
  estado: '',
  km: '',
  tipo: 'nova_implantacao',
  concessionaria: '',
  rodovia: '',
})

type GestaoPontosRascunhoListaProps = {
  points: PontoInput[]
  onChange: (points: PontoInput[]) => void
  concessionaria: string
  rodovia: string
}

export default function GestaoPontosRascunhoLista({
  points,
  onChange,
  concessionaria,
  rodovia,
}: GestaoPontosRascunhoListaProps) {
  const updatePoint = (index: number, patch: Partial<PontoInput>) => {
    onChange(points.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch, concessionaria, rodovia } : item)))
  }

  return (
    <div className="gestao-pontos-draft">
      <div className="gestao-draft-heading">
        <div>
          <strong>Pontos do protocolo</strong>
          <small>Revise os pontos antes de salvar.</small>
        </div>
        <span>
          {points.length} {points.length === 1 ? 'ponto' : 'pontos'}
        </span>
      </div>
      {points.map((point, index) => (
        <div className="gestao-point-draft" key={index}>
          <span className="gestao-point-index">{String(index + 1).padStart(2, '0')}</span>
          <input
            aria-label={`Código do ponto ${index + 1}`}
            placeholder="Código"
            required
            value={point.codigo}
            onChange={(e) => updatePoint(index, { codigo: e.target.value })}
          />
          <input
            aria-label={`Estado do ponto ${index + 1}`}
            placeholder="Estado"
            required
            value={point.estado}
            onChange={(e) => updatePoint(index, { estado: e.target.value })}
          />
          <input
            aria-label={`Km do ponto ${index + 1}`}
            placeholder="Km"
            required
            value={point.km}
            onChange={(e) => updatePoint(index, { km: e.target.value })}
          />
          <input
            aria-label={`Latitude do ponto ${index + 1}`}
            placeholder="Latitude (opcional)"
            type="number"
            step="any"
            value={point.latitude ?? ''}
            onChange={(e) => updatePoint(index, { latitude: e.target.value ? Number(e.target.value) : undefined })}
          />
          <input
            aria-label={`Longitude do ponto ${index + 1}`}
            placeholder="Longitude (opcional)"
            type="number"
            step="any"
            value={point.longitude ?? ''}
            onChange={(e) => updatePoint(index, { longitude: e.target.value ? Number(e.target.value) : undefined })}
          />
          <select
            aria-label={`Classificação do ponto ${index + 1}`}
            value={point.tipo}
            onChange={(e) => updatePoint(index, { tipo: e.target.value as Ponto['tipo'] })}
          >
            <option value="nova_implantacao">Nova implantação</option>
            <option value="regularizacao">Regularização</option>
          </select>
          <button
            type="button"
            className="gestao-button-secondary"
            onClick={() => onChange(points.filter((_, itemIndex) => itemIndex !== index))}
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        className="gestao-button-secondary"
        onClick={() => onChange([...points, { ...vazioBase(), concessionaria, rodovia }])}
      >
        Adicionar ponto
      </button>
    </div>
  )
}