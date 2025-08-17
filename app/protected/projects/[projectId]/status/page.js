'use client'

import { useEffect, useState, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Palette } from 'lucide-react'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedProjectAtom } from '@/store/atoms'
import { useParams, useRouter } from 'next/navigation'
import { Lexend } from 'next/font/google'
import clsx from 'clsx'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

function ColorPickerPopup({ color, onChange }) {
  const inputRef = useRef(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="w-8 h-8 rounded-full border"
        style={{ backgroundColor: color }}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="hidden"
      />
    </div>
  )
}

export default function ProjectStatuses() {
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProject] = useAtom(selectedProjectAtom)
  const { projectId } = useParams()
  const router = useRouter()

  useEffect(() => {
    const fetchStatuses = async () => {
      const { data, error } = await supabase
        .from('Status')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true })

      if (data) setStatuses(data)
      if (error) console.error('Error fetching statuses:', error)
      setLoading(false)
    }

    fetchStatuses()
  }, [projectId])

  const handleDragEnd = async (result) => {
    if (!result.destination) return
    const reordered = [...statuses]
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)

    const updated = reordered.map((status, index) => ({
      ...status,
      order: index,
    }))
    setStatuses(updated)

    await Promise.all(
      updated.map((s) =>
        supabase.from('Status').update({ order: s.order }).eq('id', s.id)
      )
    )
  }

  const handleNameChange = (index, name) => {
    const updated = [...statuses]
    updated[index].name = name
    setStatuses(updated)
  }

  const handleColorChange = (index, color) => {
    const updated = [...statuses]
    updated[index].color = color
    setStatuses(updated)
  }

  const handleSaveStatus = async (status) => {
    await supabase
      .from('Status')
      .update({ name: status.name, color: status.color })
      .eq('id', status.id)
  }

  const handleAddStatus = async () => {
    const { data, error } = await supabase
      .from('Status')
      .insert([
        {
          project_id: projectId,
          name: 'Nouveau statut',
          color: '#3b82f6', // default blue
          order: statuses.length,
        },
      ])
      .select()
      .single()

    if (data) {
      setStatuses((prev) => [...prev, data])
    }
    if (error) console.error('Error adding status:', error)
  }

  const handleDeleteStatus = async (id) => {
    await supabase.from('Status').delete().eq('id', id)
    setStatuses((prev) => prev.filter((s) => s.id !== id))
  }

  if (loading) return <p>Chargement...</p>

  return (
    <div className={clsx("space-y-4 w-1/2 mx-auto relative", lexend.className)}>
      <div className="flex flex-col">
        <button
          onClick={() => router.back()}
          className="mt-6 flex bg-blue-500 border-blue-500 items-center text-white w-24 gap-2 p-2 rounded hover:bg-blue-600 justify-center"
        >
          Fermer
        </button>
        <h1 className="mt-6 text-2xl font-bold">Statuts du projet</h1>
        <p className="mt-6 text-sm text-stone-500">
          Les statuts permettent de classer les tâches par leur état de
          progression. Vous pouvez les utiliser pour vous aider à organiser
          votre travail et vous aider à vous concentrer sur les tâches les plus
          importantes.
        </p>
      </div>

      {statuses.length === 0 ? (
        <p>Aucun statut trouvé.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="statuses">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3 border p-4 rounded bg-white border-gray-200 min-h-[50px] overflow-hidden"
              >
                {statuses.map((status, index) => (
                  <Draggable
                    key={status.id}
                    draggableId={String(status.id)}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-neutral-50 p-3 border border-blue-100 rounded flex flex-col gap-3 mb-3 last:mb-0"
                      >
                        <div className="flex items-center gap-3">
                          <Input
                            value={status.name}
                            onChange={(e) =>
                              handleNameChange(index, e.target.value)
                            }
                            onBlur={() => handleSaveStatus(status)}
                            className="flex-1"
                          />
                          <ColorPickerPopup
                            color={status.color}
                            onChange={(color) => {
                              handleColorChange(index, color)
                              handleSaveStatus({ ...status, color })
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStatus(status.id)}
                          >
                            <Trash2 size={18} className="text-red-500" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <button
                  onClick={handleAddStatus}
                  className="flex bg-neutral-50 border-blue-100 items-center text-stone-600 w-full gap-2 p-2 rounded hover:bg-neutral-100 justify-center"
                >
                  <Plus size={16} /> Ajouter
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  )
}
