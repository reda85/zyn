'use client'

import { memo, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { fr } from 'date-fns/locale/fr'
import { Calendar1Icon } from 'lucide-react'
import { GeistMono } from 'geist/font/mono'
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
    <div className="relative w-40">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'w-full border rounded-[4px] px-2.5 py-1.5 pl-7 text-left bg-white hover:bg-[#f5f5f4] relative transition-colors text-[12px] font-medium',
          GeistMono.className,
          isOverDue
            ? 'border-[#f5c6c6] text-[#9c1b1b]'
            : selectedDate
              ? 'border-[#e5e5e2] text-[#0d0d0c]'
              : 'border-[#e5e5e2] text-[#b8b8b3]'
        )}
      >
        {selectedDate ? selectedDate.toLocaleDateString('fr-FR') : 'Ajouter échéance'}
        <Calendar1Icon
          size={12}
          className={clsx(
            'absolute left-2.5 top-1/2 -translate-y-1/2',
            isOverDue ? 'text-[#dc2626]' : selectedDate ? 'text-[#666660]' : 'text-[#b8b8b3]'
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
        'border-b border-[#eeeeec] hover:bg-[#f5f5f4] transition-colors cursor-pointer',
        isSelected && 'bg-[#f5f5f4]'
      )}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(pin.id)}
          className="w-3.5 h-3.5 rounded-[2px] border-[#d6d6d2] accent-[#0d0d0c]"
        />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Pin pin={pin} />
          <span className="text-[13px] font-medium text-[#0d0d0c]">{pin.name || 'Pin sans nom'}</span>
        </div>
      </td>

      <td className="px-4 py-3">
        <span className={clsx('text-[11px] text-[#8a8a84]', GeistMono.className)}>
          {pin.projects?.project_number}-{pin.pin_number}
        </span>
      </td>

      <td className="px-4 py-3">
        {pin.assigned_to?.name ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-[9px] font-medium text-[#4a4a46] flex-shrink-0">
              {pin.assigned_to.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[13px] text-[#4a4a46]">{pin.assigned_to.name}</span>
          </div>
        ) : (
          <span className="text-[13px] text-[#b8b8b3]">—</span>
        )}
      </td>

      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <CategoryComboBox pin={pin} organization_id={organizationId} />
      </td>

      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <DueDatePicker key={pin.due_date ?? 'null'} pin={pin} onUpdate={onDueDateUpdate} />
      </td>

      <td className="px-4 py-3">
        {pin.pdf_name ? (
          <span className="text-[13px] text-[#666660] truncate max-w-[180px] block">{pin.pdf_name}</span>
        ) : (
          <span className="text-[13px] text-[#b8b8b3]">—</span>
        )}
      </td>

      <td className="px-4 py-3">
        {pin.pin_tags?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pin.pin_tags.map((pt) =>
              pt.tags ? (
                <span
                  key={pt.tag_id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#eeeeec] text-[#4a4a46]"
                >
                  {pt.tags.name}
                </span>
              ) : null
            )}
          </div>
        ) : (
          <span className="text-[13px] text-[#b8b8b3]">—</span>
        )}
      </td>
    </tr>
  )
}

export default memo(TaskRow)

export function TaskRowSkeleton() {
  return (
    <tr className="border-b border-[#f5f5f4] animate-pulse">
      <td className="px-4 py-3"><div className="w-3.5 h-3.5 bg-[#eeeeec] rounded-[2px]" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-[#eeeeec] rounded-[3px] w-40" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-[#eeeeec] rounded-[3px] w-20" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-[#eeeeec] rounded-[3px] w-24" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-[#eeeeec] rounded-[3px] w-16" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-[#eeeeec] rounded-[3px] w-28" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-[#eeeeec] rounded-[3px] w-12" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-[#eeeeec] rounded-[3px] w-12" /></td>
    </tr>
  )
}
