'use client'

import { useEffect, useState, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, GripVertical, ArrowLeft } from 'lucide-react'
import { supabase } from '@/utils/supabase/client'
import { useRefreshOnLeave } from '@/hooks/useRefreshOnLeave'
import { qk } from '@/lib/data/keys'
import { useParams, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { outfit } from '@/lib/fonts';

/* ---------- StrictMode-safe Droppable ---------- */
function StrictModeDroppable(props) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEnabled(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!enabled) return null
  return <Droppable {...props} />
}

/* ---------- Color Picker ---------- */
function ColorPickerPopup({ color, onChange }) {
  const inputRef = useRef(null)

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-8 h-8 rounded-[8px] border border-filet"
        style={{ backgroundColor: color }}
        title="Changer la couleur"
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="hidden"
      />
    </>
  )
}

export default function ProjectStatuses() {
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  const { projectId } = useParams()
  useRefreshOnLeave(qk.statuses(projectId))
  const router = useRouter()

  /* ---------- Helpers ---------- */
  const isFirst = (i) => i === 0
  const isLast = (i) => i === statuses.length - 1
  const isFixed = (i) => isFirst(i) || isLast(i)

  /* ---------- Fetch ---------- */
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('Status')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true })

      setStatuses(data || [])
      setLoading(false)
    }

    fetch()
  }, [projectId])

  /* ---------- Drag ---------- */
  const onDragEnd = async (result) => {
    setIsDragging(false)
    if (!result.destination) return

    const { source, destination } = result
    if (source.index === destination.index) return
    if (isFixed(source.index) || isFixed(destination.index)) return

    const next = Array.from(statuses)
    const [moved] = next.splice(source.index, 1)
    next.splice(destination.index, 0, moved)

    const withOrder = next.map((s, i) => ({ ...s, order: i }))
    setStatuses(withOrder)

    await Promise.all(
      withOrder.map((s) =>
        supabase.from('Status').update({ order: s.order }).eq('id', s.id)
      )
    )
  }

  /* ---------- Update ---------- */
  const saveStatus = async (s) => {
    await supabase
      .from('Status')
      .update({ name: s.name, color: s.color })
      .eq('id', s.id)
  }

  /* ---------- Add (before last) ---------- */
  const addStatus = async () => {
    if (isDragging || statuses.length < 2) return

    const insertIndex = statuses.length - 1

    const { data } = await supabase
      .from('Status')
      .insert({
        project_id: projectId,
        name: 'Nouveau statut',
        color: '#2f5ee0',
        order: insertIndex,
      })
      .select()
      .single()

    if (!data) return

    const next = [...statuses]
    next.splice(insertIndex, 0, data)

    const withOrder = next.map((s, i) => ({ ...s, order: i }))
    setStatuses(withOrder)

    await Promise.all(
      withOrder.map((s) =>
        supabase.from('Status').update({ order: s.order }).eq('id', s.id)
      )
    )
  }

  /* ---------- Delete ---------- */
  const removeStatus = async (status, index) => {
    if (isFixed(index) || isDragging) return

    await supabase.from('Status').delete().eq('id', status.id)
    setStatuses((prev) => prev.filter((s) => s.id !== status.id))
  }

  if (loading) {
    return (
      <div className={clsx('h-screen flex items-center justify-center bg-papier text-[14px] text-mine-clair', outfit.className)}>
        Chargement…
      </div>
    )
  }

  return (
    <div className={clsx('min-h-screen bg-papier', outfit.className)}>
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Retour */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 px-3 py-1.5 bg-voile text-mine rounded-[8px] text-[14px] font-medium hover:bg-filet transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Titre */}
        <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre mb-2">Gestionnaire de statuts</h1>

        {/* Description */}
        <p className="text-[14px] text-mine leading-relaxed max-w-2xl mb-8">
          Les statuts permettent de classer les tâches selon leur progression.
          Le premier et le dernier statut sont fixes et représentent le début et la fin du cycle.
        </p>

        {/* Drag & Drop */}
        <DragDropContext
          onDragStart={() => setIsDragging(true)}
          onDragEnd={onDragEnd}
        >
          <StrictModeDroppable droppableId="statuses">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {statuses.map((status, index) => (
                  <Draggable
                    key={status.id}
                    draggableId={String(status.id)}
                    index={index}
                    isDragDisabled={isFixed(index)}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={provided.draggableProps.style}
                        className="p-3 rounded-[8px] border border-filet bg-survol"
                      >
                        <div className="flex items-center gap-3">

                          {/* Drag handle */}
                          <div
                            {...(!isFixed(index)
                              ? provided.dragHandleProps
                              : {})}
                            className={clsx(
                              'cursor-grab text-mine-clair',
                              isFixed(index) && 'opacity-30 cursor-not-allowed'
                            )}
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Nom */}
                          <Input
                            value={status.name}
                            onChange={(e) => {
                              const copy = [...statuses]
                              copy[index] = { ...copy[index], name: e.target.value }
                              setStatuses(copy)
                            }}
                            onBlur={() => saveStatus(status)}
                            className="border-filet bg-white focus:outline-none focus:border-encre focus:ring-0 font-medium text-[14px] text-encre"
                          />

                          {/* Badge “Fixe” */}
                          {isFixed(index) && (
                            <span className={clsx('text-[12px] px-2 py-0.5 rounded-[6px] bg-voile text-mine-clair font-medium', 'tabular-nums')}>
                              Fixe
                            </span>
                          )}

                          {/* Color picker */}
                          <ColorPickerPopup
                            color={status.color}
                            onChange={(color) => {
                              const copy = [...statuses]
                              copy[index] = { ...copy[index], color }
                              setStatuses(copy)
                              saveStatus({ ...status, color })
                            }}
                          />

                          {/* Delete */}
                          {!isFixed(index) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeStatus(status, index)}
                              className="hover:bg-alerte-pale text-alerte hover:text-alerte rounded-[6px] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}

                {provided.placeholder}

                {/* Ajouter avant-dernier */}
                <button
                  disabled={isDragging}
                  onClick={addStatus}
                  className="w-full p-3 rounded-[8px] bg-survol border border-filet text-encre text-[14px] font-medium flex justify-center items-center gap-2 hover:bg-voile transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Ajouter un statut
                </button>
              </div>
            )}
          </StrictModeDroppable>
        </DragDropContext>
      </div>
    </div>
  )
}