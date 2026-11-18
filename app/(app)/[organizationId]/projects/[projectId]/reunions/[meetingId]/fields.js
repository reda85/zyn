'use client'

import { useEffect, useRef, useState } from 'react'
import { cn as clsx } from '@/lib/utils'

export const inputClass =
  'w-full border border-filet bg-white px-3 py-2 rounded-[8px] text-[14px] text-encre placeholder:text-trait focus:outline-none focus:border-encre transition-colors disabled:bg-survol disabled:text-mine disabled:border-voile'

/**
 * Champ enregistré à la sortie (blur) s'il a changé. `onSave(valeur)` peut être
 * asynchrone ; la valeur affichée suit `value` tant que le champ n'est pas en édition.
 */
export function AutoField({ value, onSave, multiline = false, className, rows = 2, ...props }) {
  const [local, setLocal] = useState(value ?? '')
  const editing = useRef(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!editing.current) setLocal(value ?? '')
  }, [value])

  // Zone de texte qui suit la hauteur de son contenu.
  useEffect(() => {
    if (!multiline || !ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${ref.current.scrollHeight + 2}px`
  }, [local, multiline])

  const common = {
    ref,
    value: local,
    onFocus: () => (editing.current = true),
    onChange: (e) => setLocal(e.target.value),
    onBlur: () => {
      editing.current = false
      if ((local ?? '') !== (value ?? '')) onSave(local)
    },
    className: clsx(inputClass, multiline && 'resize-none leading-relaxed', className),
    ...props,
  }
  return multiline ? <textarea rows={rows} {...common} /> : <input type="text" {...common} />
}

export function Section({ title, hint, action, children, className }) {
  return (
    <section className={clsx('bg-white border border-filet rounded-[12px] shadow-carte', className)}>
      <div className="px-5 py-4 border-b border-voile flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-medium text-encre">{title}</h2>
          {hint && <p className="text-[13px] text-mine-clair mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block text-[12px] font-medium text-mine-clair mb-1.5">
      {children}
    </label>
  )
}

/** Choix exclusif compact (présence, type de point…). */
export function Segmented({ value, options, onChange, disabled, size = 'md' }) {
  return (
    <div className={clsx('inline-flex rounded-[8px] bg-voile p-0.5', disabled && 'opacity-70')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => o.value !== value && onChange(o.value)}
          className={clsx(
            'rounded-[6px] font-medium transition-colors',
            size === 'sm' ? 'px-2 py-0.5 text-[12px]' : 'px-2.5 py-1 text-[13px]',
            o.value === value ? 'bg-white text-encre shadow-carte' : 'text-mine hover:text-encre',
            disabled && 'cursor-default'
          )}
          title={o.title}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
