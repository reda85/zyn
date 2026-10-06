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
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

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
        className="w-8 h-8 rounded-[4px] border border-[#e5e5e2]"
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
      <div className={clsx('h-screen flex items-center justify-center bg-[#fafaf9] text-[13px] text-[#8a8a84]', GeistSans.className)}>
        Chargement…
      </div>
    )
  }

  return (
    <div className={clsx('min-h-screen bg-[#fafaf9]', GeistSans.className)}>
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Retour */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 px-3 py-1.5 bg-[#eeeeec] text-[#4a4a46] rounded-[4px] text-[13px] font-medium hover:bg-[#e5e5e2] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Titre */}
        <h1 className="text-[30px] font-medium tracking-[-0.02em] text-[#050505] mb-4">Gestionnaire de statuts</h1>

        {/* Description */}
        <p className="text-[13px] text-[#666660] leading-relaxed max-w-2xl mb-8">
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
                        className="p-3 rounded-[4px] border border-[#e5e5e2] bg-[#f5f5f4]"
                      >
                        <div className="flex items-center gap-3">

                          {/* Drag handle */}
                          <div
                            {...(!isFixed(index)
                              ? provided.dragHandleProps
                              : {})}
                            className={clsx(
                              'cursor-grab text-[#8a8a84]',
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
                            className="border-[#e5e5e2] bg-white focus:outline-none focus:border-[#0d0d0c] focus:ring-0 font-medium text-[13px] text-[#0d0d0c]"
                          />

                          {/* Badge “Fixe” */}
                          {isFixed(index) && (
                            <span className={clsx('text-[11px] px-2 py-0.5 rounded-[3px] bg-[#eeeeec] text-[#8a8a84] font-medium', GeistMono.className)}>
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
                              className="hover:bg-[#fde8e8] text-[#dc2626] hover:text-[#9c1b1b] rounded-[3px] transition-colors"
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
                  className="w-full p-3 rounded-[4px] bg-[#f5f5f4] border border-[#e5e5e2] text-[#0d0d0c] text-[13px] font-medium flex justify-center items-center gap-2 hover:bg-[#eeeeec] transition-colors disabled:opacity-40"
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