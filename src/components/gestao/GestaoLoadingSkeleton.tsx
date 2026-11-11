type GestaoSkeletonVariant = 'contratos' | 'detalhe' | 'lista' | 'planejamento' | 'mapa'

export default function GestaoLoadingSkeleton({ variant, label = 'Carregando dados' }: { variant: GestaoSkeletonVariant; label?: string }) {
  if (variant === 'contratos') return <section className="gestao-loading" aria-busy="true" aria-live="polite"><span className="gestao-sr">{label}</span><div className="gestao-skeleton-row">{[1, 2, 3].map((item) => <span className="gestao-skeleton gestao-skeleton-card" key={item} />)}</div></section>
  if (variant === 'mapa') return <section className="gestao-loading" aria-busy="true" aria-live="polite"><span className="gestao-sr">{label}</span><span className="gestao-skeleton gestao-skeleton-filter" /><span className="gestao-skeleton gestao-skeleton-map" /></section>
  if (variant === 'planejamento') return <section className="gestao-loading" aria-busy="true" aria-live="polite"><span className="gestao-sr">{label}</span>{[1, 2, 3].map((item) => <span className="gestao-skeleton gestao-skeleton-planning" key={item} />)}</section>
  if (variant === 'lista') return <section className="gestao-loading" aria-busy="true" aria-live="polite"><span className="gestao-sr">{label}</span><span className="gestao-skeleton gestao-skeleton-filter" />{[1, 2, 3, 4].map((item) => <span className="gestao-skeleton gestao-skeleton-list" key={item} />)}</section>
  return <section className="gestao-loading" aria-busy="true" aria-live="polite"><span className="gestao-sr">{label}</span><span className="gestao-skeleton gestao-skeleton-title" /><span className="gestao-skeleton gestao-skeleton-line" /><span className="gestao-skeleton gestao-skeleton-filter" /><span className="gestao-skeleton gestao-skeleton-map" /></section>
}
