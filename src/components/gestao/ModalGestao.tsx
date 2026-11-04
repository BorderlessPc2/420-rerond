import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './ModalGestao.css'

const getFocusable = (content: HTMLDivElement | null, closeButton: HTMLButtonElement | null) => [
  ...(content?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]') ?? []),
  ...(closeButton ? [closeButton] : []),
]

const trapFocus = (event: KeyboardEvent, content: HTMLDivElement | null, closeButton: HTMLButtonElement | null) => {
  if (event.key !== 'Tab') return
  const focusable = getFocusable(content, closeButton)
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

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

const focusFirstField = (content: HTMLDivElement | null, closeButton: HTMLButtonElement | null, initialFocus: 'close' | 'content') => {
  if (initialFocus === 'close') {
    closeButton?.focus()
    return
  }
  const active = document.activeElement
  if (active && content?.contains(active) && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement)) return
  content?.querySelector<HTMLElement>('input, select, textarea, button:not(.gestao-modal-close), a[href]')?.focus()
}

export default function ModalGestao({ open, title, description, onClose, children, labelledBy, describedBy, initialFocus = 'content' }: ModalGestaoProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const focusSessionRef = useRef(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) {
      focusSessionRef.current = false
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
      return
    }
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (focusSessionRef.current) return
    focusSessionRef.current = true
    const frame = requestAnimationFrame(() => focusFirstField(contentRef.current, closeButtonRef.current, initialFocus))
    return () => cancelAnimationFrame(frame)
  }, [open, initialFocus])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      trapFocus(event, contentRef.current, closeButtonRef.current)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="gestao-modal-root">
      <button type="button" className="gestao-modal-backdrop" aria-label="Fechar janela" onClick={() => onCloseRef.current()} />
      <div
        className="gestao-modal gestao-modal-host"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="gestao-modal-shell">
          <header className="gestao-modal-header">
            <div><span className="gestao-eyebrow">Gestão de contratos</span><h2 id={labelledBy}>{title}</h2>{description && <p id={describedBy}>{description}</p>}</div>
          </header>
          <div ref={contentRef} className="gestao-modal-body">{children}</div>
          <button ref={closeButtonRef} type="button" className="gestao-modal-close" onClick={() => onCloseRef.current()} aria-label="Fechar janela">×</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
