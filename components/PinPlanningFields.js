'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarRange } from 'lucide-react'
import { supabase } from '@/utils/supabase/client'
import { usePinsCache } from '@/hooks/usePins'
import { qk } from '@/lib/data/keys'
import { dueToDay } from '@/lib/data/planning'

const STEPS = [0, 25, 50, 75, 100]

/**
 * Place d'une tâche dans le planning : une date de début la fait apparaître
 * dans le Gantt (son échéance en est la fin), avec son avancement.
 */
export default function PinPlanningFields({ pin, disabled, profileId }) {
  const { organizationId } = useParams()
  const { patchPin } = usePinsCache()
  const queryClient = useQueryClient()
  const due = dueToDay(pin.due_date)

  const save = async (fields) => {
    patchPin(pin.id, fields)
    const { error } = await supabase
      .from('pdf_pins')
      .update({ ...fields, updated_by: profileId || null, updated_at: new Date().toISOString() })
      .eq('id', pin.id)
    if (error) {
      console.error('planning de la tâche', error)
      patchPin(pin.id, { date_debut: pin.date_debut ?? null, avancement: pin.avancement ?? null })
      return
    }
    queryClient.invalidateQueries({ queryKey: qk.planning(pin.project_id) })
  }

  const inPlanning = Boolean(pin.date_debut)

  return (
    <div className="rounded-[8px] border border-filet bg-survol px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <CalendarRange className="w-4 h-4 text-mine-clair" />
        <span className="text-[13px] font-medium text-encre">Planning</span>
        {inPlanning ? (
          <Link
            href={`/${organizationId}/projects/${pin.project_id}/planning`}
            className="ml-auto text-[12px] font-medium text-tirage hover:text-tirage-fonce"
          >
            Voir dans le planning
          </Link>
        ) : (
          <span className="ml-auto text-[12px] text-mine-clair">Hors planning</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <label className="flex items-center gap-1.5 text-mine">
          Début
          <input
            type="date"
            value={pin.date_debut ?? ''}
            max={due ?? undefined}
            disabled={disabled}
            onChange={(e) => save({ date_debut: e.target.value || null })}
            className="border border-filet bg-white rounded-[6px] px-2 py-1 text-[13px] text-encre tabular-nums disabled:opacity-60"
          />
        </label>
        <span className="text-mine-clair">→ fin = échéance{due ? '' : ' (à renseigner)'}</span>
        {inPlanning && (
          <label className="flex items-center gap-1.5 text-mine ml-auto">
            Avancement
            <select
              value={pin.avancement ?? 0}
              disabled={disabled}
              onChange={(e) => save({ avancement: Number(e.target.value) })}
              className="border border-filet bg-white rounded-[6px] px-2 py-1 text-[13px] text-encre tabular-nums disabled:opacity-60"
            >
              {STEPS.map((v) => <option key={v} value={v}>{v} %</option>)}
            </select>
          </label>
        )}
      </div>
    </div>
  )
}
