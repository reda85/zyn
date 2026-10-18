'use client'

import { memo, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { fr } from 'date-fns/locale/fr'
import { Calendar1Icon } from 'lucide-react'
import clsx from 'clsx'
import Pin from '@/components/Pin'
import CategoryComboBox from '@/components/CategoryComboBox'
import { supabase } from '@/utils/supabase/client'

function DueDatePicker({ pin, onUpdate }) {
  const [selectedDate, setSelectedDate] = useState(pin?.due_date ? new Date(pin.due_date) : null)
  const [open, setOpen] = useState(false)
  const isOverDue = selectedDate instanceof Date && selectedDate < new Date()

  const handleChange = async (date) => {
    const previous = selectedDate
    setSelectedDate(date)
    setOpen(false)
    const { error } = await supabase
      .from('pdf_pins')
      .update({ due_date: date, updated_at: new Date().toISOString() })
      .eq('id', pin.id)
    if (error) {
      console.error('update due_date failed', error)
      setSelectedDate(previous)
      return
    }
    onUpdate?.(pin.id, date ? date.toISOString() : null)
  }

  return (
    <div className="relative w-36">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'w-full border rounded-[6px] h-8 px-2 pl-7 text-left relative transition-colors text-[12px]',
          'tabular-nums',
          isOverDue
            ? 'bg-alerte-pale border-alerte-clair text-alerte font-semibold hover:border-alerte'
            : selectedDate
              ? 'bg-white border-filet-fort text-encre hover:border-tirage hover:bg-tirage-pale'
              : 'bg-white border-dashed border-filet-fort text-mine-clair hover:border-tirage hover:text-tirage'
        )}
      >
        {selectedDate ? selectedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Ajouter une date'}
        <Calendar1Icon
          size={12}
          className={clsx(
            'absolute left-2 top-1/2 -translate-y-1/2',
            isOverDue ? 'text-alerte' : selectedDate ? 'text-mine' : 'text-trait'
          )}
        />
      </button>
      {open && (
        <div className="absolute z-50 mt-1">
          <DatePicker
            inline
            selected={selectedDate}
            onChange={handleChange}
            onClickOutside={() => setOpen(false)}
            dateFormat="dd/MM/yyyy"
            locale={fr}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Ligne du tableau des tâches. Mémoïsée : taper dans la recherche ou cocher
 * une autre ligne ne re-rend plus toutes les lignes.
 */
function TaskRow({ pin, isSelected, organizationId, onOpen, onToggleSelect, onDueDateUpdate }) {
  return (
    <tr
      onClick={() => onOpen(pin)}
      className={clsx(
        'border-b border-voile hover:bg-papier transition-colors cursor-pointer',
        isSelected && 'bg-tirage-pale'
      )}
    >
      <td className="px-4 py-2.5">
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(pin.id)}
          className="w-3.5 h-3.5 rounded-[2px] border-filet-fort accent-encre"
        />
      </td>

      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Pin pin={pin} />
          <span className="text-[13px] font-medium text-encre line-clamp-1">{pin.name || 'Réserve sans titre'}</span>
        </div>
      </td>

      <td className="px-4 py-2.5">
        <span className="font-mono text-[11px] text-mine">
          {pin.projects?.project_number}-{pin.pin_number}
        </span>
      </td>

      <td className="px-4 py-2.5">
        {pin.assigned_to?.name ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-tirage-pale flex items-center justify-center text-[10px] font-semibold text-tirage flex-shrink-0">
              {pin.assigned_to.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[13px] text-encre">{pin.assigned_to.name}</span>
          </div>
        ) : (
          <span className="text-[13px] text-trait">—</span>
        )}
      </td>

      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
        <CategoryComboBox pin={pin} organization_id={organizationId} />
      </td>

      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
        <DueDatePicker key={pin.due_date ?? 'null'} pin={pin} onUpdate={onDueDateUpdate} />
      </td>

      <td className="px-4 py-2.5">
        {pin.pdf_name ? (
          <span className="text-[13px] text-mine truncate max-w-[180px] block">{pin.pdf_name}</span>
        ) : (
          <span className="text-[13px] text-trait">—</span>
        )}
      </td>

      <td className="px-4 py-2.5">
        {pin.pin_tags?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pin.pin_tags.map((pt) =>
              pt.tags ? (
                <span
                  key={pt.tag_id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-ambre-pale text-[#9a6200]"
                >
                  {pt.tags.name}
                </span>
              ) : null
            )}
          </div>
        ) : (
          <span className="text-[13px] text-trait">—</span>
        )}
      </td>
    </tr>
  )
}

export default memo(TaskRow)

export function TaskRowSkeleton() {
  return (
    <tr className="border-b border-survol animate-pulse">
      <td className="px-4 py-2.5"><div className="w-3.5 h-3.5 bg-voile rounded-[2px]" /></td>
      <td className="px-4 py-2.5"><div className="h-3 bg-voile rounded-[3px] w-40" /></td>
      <td className="px-4 py-2.5"><div className="h-3 bg-voile rounded-[3px] w-20" /></td>
      <td className="px-4 py-2.5"><div className="h-3 bg-voile rounded-[3px] w-24" /></td>
      <td className="px-4 py-2.5"><div className="h-3 bg-voile rounded-[3px] w-16" /></td>
      <td className="px-4 py-2.5"><div className="h-3 bg-voile rounded-[3px] w-28" /></td>
      <td className="px-4 py-2.5"><div className="h-3 bg-voile rounded-[3px] w-12" /></td>
      <td className="px-4 py-2.5"><div className="h-3 bg-voile rounded-[3px] w-12" /></td>
    </tr>
  )
}
