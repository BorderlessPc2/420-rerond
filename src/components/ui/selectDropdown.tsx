import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import './selectDropdown.css'
import { nextSelectDropdownIndex } from './selectDropdownUtils'

export type SelectDropdownOption = { value: string; label: string }

type SelectDropdownProps = {
  label: string
  value: string
  options: SelectDropdownOption[]
  onChange: (value: string) => void
  id?: string
}

export default function SelectDropdown({ label, value, options, onChange, id }: SelectDropdownProps) {
  const generatedId = useId()
  const triggerId = id ?? `select-dropdown-${generatedId}`
  const listboxId = `${triggerId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  useEffect(() => {
    setActiveIndex(selectedIndex)
  }, [selectedIndex])

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const choose = (option: SelectDropdownOption) => {
    onChange(option.value)
    close()
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const option = options[activeIndex]
      if (option) choose(option)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
      return
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(nextSelectDropdownIndex(activeIndex, options.length, event.key))
    }
  }

  return <div className="select-dropdown" ref={rootRef}>
    <span className="select-dropdown-label" id={`${triggerId}-label`}>{label}</span>
    <button
      ref={triggerRef}
      id={triggerId}
      type="button"
      className="select-dropdown-trigger"
      aria-labelledby={`${triggerId}-label ${triggerId}`}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listboxId}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={handleTriggerKeyDown}
    >
      <span>{selectedOption?.label ?? 'Selecione'}</span>
      <ChevronDown aria-hidden="true" size={17} className={open ? 'is-open' : undefined} />
    </button>
    {open && <div className="select-dropdown-popover">
      <div id={listboxId} role="listbox" aria-labelledby={`${triggerId}-label`}>
        {options.map((option, index) => <button
          key={option.value}
          ref={(element) => { optionRefs.current[index] = element }}
          type="button"
          role="option"
          aria-selected={option.value === value}
          className={`select-dropdown-option${index === activeIndex ? ' is-active' : ''}`}
          onClick={() => choose(option)}
          onKeyDown={handleOptionKeyDown}
          onMouseEnter={() => setActiveIndex(index)}
        >
          <span>{option.label}</span>
          {option.value === value && <Check aria-hidden="true" size={16} />}
        </button>)}
      </div>
    </div>}
  </div>
}
