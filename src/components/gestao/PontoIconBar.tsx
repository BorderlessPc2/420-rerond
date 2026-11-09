import { Calendar, CircleCheck, FileText, Link2, MapPin, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Ponto, Protocolo } from '../../services/gestaoContratos'
import type { PontoPainelTab } from './pontoPainelTypes'

type PontoIconBarProps = {
  contratoId: string
  ponto: Ponto
  protocolo?: Protocolo
  onOpenPainel: (tab: PontoPainelTab) => void
  /** No mapa, abre o painel de dados em vez de navegar */
  mapaAtual?: boolean
  /** No detalhe do protocolo, abre vínculo em vez de recarregar a página */
  protocoloAtual?: boolean
}

const IconAction = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" className="gestao-point-icon-btn" title={label} aria-label={label} onClick={onClick}>
    {children}
  </button>
)

export default function PontoIconBar({ contratoId, ponto, protocolo, onOpenPainel, mapaAtual, protocoloAtual }: PontoIconBarProps) {
  const navigate = useNavigate()
  const stroke = { width: 18, height: 18, strokeWidth: 2, 'aria-hidden': true as const }

  const openMapa = () => {
    if (mapaAtual) {
      onOpenPainel('dados')
      return
    }
    navigate(`/gestao-contratos/${contratoId}/mapa?ponto=${encodeURIComponent(ponto.id)}`)
  }

  const openProtocolo = () => {
    if (!ponto.protocoloId) {
      onOpenPainel('vinculo')
      return
    }
    if (protocoloAtual) {
      onOpenPainel('vinculo')
      return
    }
    navigate(`/gestao-contratos/${contratoId}/protocolos/${ponto.protocoloId}?ponto=${encodeURIComponent(ponto.id)}`)
  }

  return (
    <div className="gestao-point-icon-bar" role="toolbar" aria-label={`Ações do ponto ${ponto.codigo}`}>
      <IconAction label="Editar dados do ponto" onClick={() => onOpenPainel('dados')}>
        <Pencil {...stroke} />
      </IconAction>
      <IconAction label="Situação operacional" onClick={() => onOpenPainel('situacao')}>
        <CircleCheck {...stroke} />
      </IconAction>
      <IconAction label="Planejamento e prazos" onClick={() => onOpenPainel('planejamento')}>
        <Calendar {...stroke} />
      </IconAction>
      <IconAction label={mapaAtual ? 'Ajustar localização' : 'Ver no mapa'} onClick={openMapa}>
        <MapPin {...stroke} />
      </IconAction>
      <IconAction
        label={ponto.protocoloId ? `Protocolo ${protocolo?.titulo ?? 'vinculado'}` : 'Vincular protocolo'}
        onClick={openProtocolo}
      >
        {ponto.protocoloId ? <FileText {...stroke} /> : <Link2 {...stroke} />}
      </IconAction>
    </div>
  )
}
