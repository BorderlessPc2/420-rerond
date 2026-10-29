import { useEffect, useRef } from 'react'
import './ModalGestao.css'

type ModalGestaoProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  labelledBy?: string
}

export default function ModalGestao({ open, title, description, onClose, children, labelledBy }: ModalGestaoProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return <dialog ref={dialogRef} className="gestao-modal" aria-labelledby={labelledBy} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="gestao-modal-shell">
      <header className="gestao-modal-header">
        <div><span className="gestao-eyebrow">Gestão de contratos</span><h2 id={labelledBy}>{title}</h2>{description && <p>{description}</p>}</div>
        <button ref={closeButtonRef} type="button" className="gestao-modal-close" onClick={onClose} aria-label="Fechar janela">×</button>
      </header>
      <div className="gestao-modal-body">{children}</div>
    </div>
  </dialog>
}
