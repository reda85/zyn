'use client'

import { memo, useState } from 'react'
import DueDateField from '@/components/DueDateField'
import clsx from 'clsx'
import { PIN_TYPES } from '@/lib/data/pinTypes'
import Pin from '@/components/Pin'
import StatusPill from '@/components/StatusPill'
import CategoryComboBox from '@/components/CategoryComboBox'
import { supabase } from '@/utils/supabase/client'

function DueDatePicker({ pin, onUpdate }) {
  const [due, setDue] = useState(pin?.due_date ?? null)

  const handleChange = async (next) => {
    const previous = due
    setDue(next)
    const { error } = await supabase
      .from('pdf_pins')
      .update({ due_date: next, updated_at: new Date().toISOString() })
      .eq('id', pin.id)
    if (error) {
      console.error('update due_date failed', error)
      setDue(previous)
      return
    }
    onUpdate?.(pin.id, next)
  }

  return <DueDateField size="sm" className="w-40" value={due} onChange={handleChange} />
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
        'border-b border-voile hover:bg-survol transition-colors cursor-pointer',
        isSelected && 'bg-survol'
      )}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(pin.id)}
          className="w-3.5 h-3.5 rounded-[4px] border-filet-fort accent-encre"
        />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Pin pin={pin} />
          <span className="text-[14px] font-medium text-encre">{pin.name || 'Pin sans nom'}</span>
          <span className={clsx('px-1.5 py-0.5 rounded-[4px] text-[11px] font-medium flex-shrink-0', PIN_TYPES[pin.type ?? 'reserve'].className)}>
            {PIN_TYPES[pin.type ?? 'reserve'].label}
          </span>
        </div>
      </td>

      <td className="px-4 py-3">
        <StatusPill pin={pin} />
      </td>

      <td className="px-4 py-3">
        <span className={clsx('text-[12px] text-mine-clair', 'tabular-nums')}>
          {pin.projects?.project_number}-{pin.pin_number}
        </span>
      </td>

      <td className="px-4 py-3">
        {pin.assigned_to?.name ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-voile border border-filet flex items-center justify-center text-[9px] font-medium text-mine flex-shrink-0">
              {pin.assigned_to.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[14px] text-mine">{pin.assigned_to.name}</span>
          </div>
        ) : (
          <span className="text-[14px] text-trait">—</span>
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
          <span className="text-[14px] text-mine truncate max-w-[180px] block">{pin.pdf_name}</span>
        ) : (
          <span className="text-[14px] text-trait">—</span>
        )}
      </td>

      <td className="px-4 py-3">
        {pin.pin_tags?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pin.pin_tags.map((pt) =>
              pt.tags ? (
                <span
                  key={pt.tag_id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-voile text-mine"
                >
                  {pt.tags.name}
                </span>
              ) : null
            )}
          </div>
        ) : (
          <span className="text-[14px] text-trait">—</span>
        )}
      </td>
    </tr>
  )
}

export default memo(TaskRow)

export function TaskRowSkeleton() {
  return (
    <tr className="border-b border-survol animate-pulse">
      <td className="px-4 py-3"><div className="w-3.5 h-3.5 bg-voile rounded-[4px]" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-voile rounded-[6px] w-40" /></td>
      <td className="px-4 py-3"><div className="h-5 bg-voile rounded-full w-16" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-voile rounded-[6px] w-20" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-voile rounded-[6px] w-24" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-voile rounded-[6px] w-16" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-voile rounded-[6px] w-28" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-voile rounded-[6px] w-12" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-voile rounded-[6px] w-12" /></td>
    </tr>
  )
}
