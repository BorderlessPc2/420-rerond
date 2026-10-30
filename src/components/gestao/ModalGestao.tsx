import { useEffect, useRef } from 'react'
import './ModalGestao.css'

type ModalGestaoProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  labelledBy?: string
  describedBy?: string
  initialFocus?: 'close' | 'content'
}

export default function ModalGestao({ open, title, description, onClose, children, labelledBy, describedBy, initialFocus = 'content' }: ModalGestaoProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    if (initialFocus === 'close') closeButtonRef.current?.focus()
    else (contentRef.current?.querySelector<HTMLElement>('input, select, textarea, button, a') ?? closeButtonRef.current)?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return <dialog ref={dialogRef} className="gestao-modal" aria-labelledby={labelledBy} aria-describedby={describedBy} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="gestao-modal-shell">
      <header className="gestao-modal-header">
        <div><span className="gestao-eyebrow">Gestão de contratos</span><h2 id={labelledBy}>{title}</h2>{description && <p id={describedBy}>{description}</p>}</div>
        <button ref={closeButtonRef} type="button" className="gestao-modal-close" onClick={onClose} aria-label="Fechar janela">×</button>
      </header>
      <div className="gestao-modal-body">{children}</div>
    </div>
  </dialog>
}
