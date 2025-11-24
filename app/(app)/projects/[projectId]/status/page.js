'use client'

import { useEffect, useState, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Palette, GripVertical, ArrowLeft } from 'lucide-react'
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
        className="w-10 h-10 rounded-lg border-2 border-border/50 hover:border-primary/50 transition-all shadow-sm"
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
    </div>
  )
}

export default function ProjectStatuses() {
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProject] = useAtom(selectedProjectAtom)
  const { projectId } = useParams()
  const router = useRouter()
  const [isBrowser, setIsBrowser] = useState(false)

  // Fix pour le drag & drop : s'assurer qu'on est côté client
  useEffect(() => {
    setIsBrowser(true)
  }, [])

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
          color: '#3b82f6',
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

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-background font-sans">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-pulse">
            <span className="text-primary-foreground font-bold text-3xl font-heading">z</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold font-heading text-foreground mb-3 opacity-0 animate-fadeInUp">
          Chargement...
        </h2>
        <p className="text-muted-foreground opacity-0 animate-fadeInUp" style={{ animationDelay: '150ms' }}>
          Veuillez patienter
        </p>
        <div className="mt-8 w-64 mx-auto">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-[loading_1.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(var(--primary),0.3)]"></div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 75%; margin-left: 0%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );

  return (
    <div className={clsx("min-h-screen bg-background font-sans", lexend.className)}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          
          <h1 className="text-4xl font-bold font-heading text-foreground mb-4">
            Gestionnaire de statuts
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            Les statuts permettent de classer les tâches par leur état de progression. 
            Organisez-les par glisser-déposer pour définir leur ordre d'apparition dans l'application.
          </p>
        </div>

        {/* Status List */}
        {statuses.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-xl p-12 text-center">
            <Palette className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Aucun statut trouvé pour ce projet.</p>
            <button
              onClick={handleAddStatus}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer le premier statut
            </button>
          </div>
        ) : (
          isBrowser && (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="statuses">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={clsx(
                      "space-y-3 border border-border/50 p-6 rounded-xl bg-card shadow-sm transition-colors",
                      snapshot.isDraggingOver && "bg-secondary/30"
                    )}
                  >
                    {statuses.map((status, index) => (
                      <Draggable
                        key={status.id}
                        draggableId={String(status.id)}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={clsx(
                              "bg-secondary/30 p-4 border border-border/50 rounded-xl transition-all",
                              snapshot.isDragging && "shadow-lg shadow-primary/20 rotate-2 scale-105"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {/* Drag Handle */}
                              <div 
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>

                              {/* Input */}
                              <Input
                                value={status.name}
                                onChange={(e) => handleNameChange(index, e.target.value)}
                                onBlur={() => handleSaveStatus(status)}
                                className="flex-1 border-border/50 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50 font-medium"
                                placeholder="Nom du statut"
                              />

                              {/* Color Picker */}
                              <ColorPickerPopup
                                color={status.color}
                                onChange={(color) => {
                                  handleColorChange(index, color)
                                  handleSaveStatus({ ...status, color })
                                }}
                              />

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteStatus(status.id)}
                                className="hover:bg-destructive/10 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {/* Add Button */}
                    <button
                      onClick={handleAddStatus}
                      className="flex bg-secondary/50 border border-border/50 items-center text-foreground w-full gap-2 p-4 rounded-xl hover:bg-secondary/80 hover:border-primary/20 transition-all font-medium justify-center"
                    >
                      <Plus className="w-5 h-5" /> 
                      Ajouter un statut
                    </button>
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )
        )}
      </div>
    </div>
  )
}