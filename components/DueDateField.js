'use client'

// Champ « échéance » d'un élément (fiche et liste des tâches).
//
// - Calendrier en français, semaine du lundi, raccourcis (aujourd'hui,
//   demain, dans une semaine) et effacement.
// - Ouvert dans un calque au-dessus de la page : il n'est plus coupé par le
//   tiroir ni par le tableau.
// - Une échéance est un jour : elle est enregistrée à midi UTC
//   (« AAAA-MM-JJT12:00:00Z », comme le planning) et lue comme jour local,
//   pour tomber le même jour quel que soit le fuseau.
// - « En retard » à partir du lendemain de l'échéance, pas dès l'heure passée.
import { forwardRef, useState } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { fr } from 'date-fns/locale/fr'
import { CalendarIcon, XIcon } from 'lucide-react'
import clsx from 'clsx'
import { dayToDue, dueToDay } from '@/lib/data/planning'

registerLocale('fr', fr)

const pad = (n) => String(n).padStart(2, '0')
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayToDate = (iso) => (iso ? new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) : null)
const addDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d }

/** Jour d'échéance (« AAAA-MM-JJ ») passé : l'élément est en retard. */
export const isDueOverdue = (due) => {
  const day = dueToDay(due)
  return Boolean(day && day < isoDay(new Date()))
}

const SIZES = {
  md: { box: 'px-3 py-2 pl-10 pr-9 text-[14px]', icon: 'left-2', iconSize: 13, circle: true, clear: 'right-2' },
  sm: { box: 'px-2.5 py-1.5 pl-7 pr-7 text-[13px]', icon: 'left-2.5', iconSize: 12, circle: false, clear: 'right-1.5' },
}

const Trigger = forwardRef(function Trigger({ onClick, label, overdue, empty, disabled, size, open }, ref) {
  const s = SIZES[size]
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
      className={clsx(
        'w-full border rounded-[8px] text-left relative transition-colors font-medium tabular-nums truncate',
        s.box,
        disabled
          ? 'bg-survol cursor-not-allowed opacity-70 border-filet text-mine-clair'
          : overdue
            ? 'border-alerte-clair text-alerte bg-alerte-pale hover:bg-[#fbdbdb]'
            : clsx(size === 'md' ? 'bg-survol hover:bg-voile' : 'bg-white hover:bg-survol', open ? 'border-encre' : 'border-filet', empty ? 'text-mine-clair' : 'text-encre')
      )}
    >
      {label}
      <span className={clsx('absolute top-1/2 -translate-y-1/2', s.icon)}>
        {s.circle ? (
          <span className="w-6 h-6 rounded-full bg-white border border-filet flex items-center justify-center">
            <CalendarIcon size={s.iconSize} className={overdue ? 'text-alerte' : 'text-mine'} />
          </span>
        ) : (
          <CalendarIcon size={s.iconSize} className={overdue ? 'text-alerte' : empty ? 'text-trait' : 'text-mine'} />
        )}
      </span>
    </button>
  )
})

/**
 * @param value     échéance enregistrée (horodatage) ou null
 * @param onChange  (dueIso | null) => Promise|void, appelé avec « AAAA-MM-JJT12:00:00Z »
 */
export default function DueDateField({ value, onChange, disabled = false, size = 'md', className }) {
  const [open, setOpen] = useState(false)
  const day = dueToDay(value)
  const selected = dayToDate(day)
  const overdue = isDueOverdue(value)

  const commit = (date) => {
    setOpen(false)
    const next = date ? dayToDue(isoDay(date)) : null
    if (dueToDay(next) === day) return
    onChange?.(next)
  }

  const shortcuts = [
    ['Aujourd’hui', addDays(0)],
    ['Demain', addDays(1)],
    ['Dans 1 semaine', addDays(7)],
  ]

  return (
    <div className={clsx('relative', className)}>
      <DatePicker
        selected={selected}
        onChange={commit}
        open={open}
        onInputClick={() => !disabled && setOpen(true)}
        onClickOutside={() => setOpen(false)}
        onCalendarClose={() => setOpen(false)}
        disabled={disabled}
        locale="fr"
        calendarStartDay={1}
        dateFormat="dd/MM/yyyy"
        portalId="zs-datepicker-portal"
        popperPlacement="bottom-start"
        // Calque fixe : la page ne défile pas à l'ouverture.
        popperProps={{ strategy: 'fixed' }}
        popperClassName="zs-datepicker-popper"
        calendarClassName="zs-datepicker"
        wrapperClassName="w-full"
        showPopperArrow={false}
        customInput={
          <Trigger
            size={size}
            open={open}
            overdue={overdue}
            empty={!selected}
            label={selected ? selected.toLocaleDateString('fr-FR') : 'Ajouter échéance'}
          />
        }
      >
        <div className="zs-datepicker-shortcuts">
          {shortcuts.map(([label, date]) => (
            <button key={label} type="button" onClick={() => commit(date)}>{label}</button>
          ))}
          {selected && (
            <button type="button" className="zs-datepicker-clear" onClick={() => commit(null)}>Effacer</button>
          )}
        </div>
      </DatePicker>

      {selected && !disabled && (
        <button
          type="button"
          aria-label="Retirer l’échéance"
          title="Retirer l’échéance"
          onClick={(e) => { e.stopPropagation(); commit(null) }}
          className={clsx('absolute top-1/2 -translate-y-1/2 text-mine-clair hover:text-alerte transition-colors', SIZES[size].clear)}
        >
          {SIZES[size].circle ? (
            <span className="w-6 h-6 rounded-full bg-white border border-filet flex items-center justify-center">
              <XIcon size={13} />
            </span>
          ) : (
            <XIcon size={13} />
          )}
        </button>
      )}
    </div>
  )
}
