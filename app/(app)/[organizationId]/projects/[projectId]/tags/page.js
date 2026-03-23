'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Tag, GripVertical, ArrowLeft } from 'lucide-react'
import { supabase } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Lexend } from 'next/font/google'
import clsx from 'clsx'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

// StrictMode wrapper for Droppable
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(animation)
      setEnabled(false)
    }
  }, [])

  if (!enabled) return null
  return <Droppable {...props}>{children}</Droppable>
}

export default function ProjectTags() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const { projectId } = useParams()
  const router = useRouter()

  useEffect(() => {
    const fetchTags = async () => {
      if (!projectId) return
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true })
      if (data) setTags(data)
      if (error) console.error('Error fetching tags:', error)
      setLoading(false)
    }
    fetchTags()
  }, [projectId])

  const handleDragEnd = async (result) => {
    if (!result.destination) return
    if (result.destination.index === result.source.index) return

    const reordered = Array.from(tags)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)

    const updated = reordered.map((tag, index) => ({ ...tag, order: index }))
    setTags(updated)

    try {
      await Promise.all(
        updated.map((tag) =>
          supabase.from('tags').update({ order: tag.order }).eq('id', tag.id)
        )
      )
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const handleNameChange = (index, name) => {
    const updated = [...tags]
    updated[index].name = name
    setTags(updated)
  }

  const handleSaveTag = async (tag) => {
    try {
      await supabase
        .from('tags')
        .update({ name: tag.name })
        .eq('id', tag.id)
    } catch (error) {
      console.error('Error saving tag:', error)
    }
  }

  const handleAddTag = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{
          project_id: projectId,
          name: 'Nouveau tag',
          order: tags.length,
        }])
        .select()
        .single()
      if (data) setTags((prev) => [...prev, data])
      if (error) console.error('Error adding tag:', error)
    } catch (error) {
      console.error('Error adding tag:', error)
    }
  }

  const handleDeleteTag = async (id) => {
    try {
      await supabase.from('tags').delete().eq('id', id)
      setTags((prev) => prev.filter((t) => t.id !== id))
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background font-sans">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-pulse">
              <span className="text-primary-foreground font-bold text-3xl font-heading">z</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold font-heading text-foreground mb-3">Chargement...</h2>
          <p className="text-muted-foreground">Veuillez patienter</p>
          <div className="mt-8 w-64 mx-auto">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-0 animate-[loading_1.5s_ease-in-out_infinite]"></div>
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
    )
  }

  return (
    <div className={clsx('min-h-screen bg-background font-sans', lexend.className)}>
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
            Gestionnaire de tags
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            Les tags vous permettent de labelliser vos tâches librement. 
            Organisez-les par glisser-déposer pour définir leur ordre d'apparition dans l'application.
          </p>
        </div>

        {/* Tags list */}
        {tags.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-xl p-12 text-center">
            <Tag className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Aucun tag trouvé pour ce projet.</p>
            <button
              onClick={handleAddTag}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer le premier tag
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <StrictModeDroppable droppableId="tags">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={clsx(
                    'space-y-3 border border-border/50 p-6 rounded-xl bg-card shadow-sm transition-colors',
                    snapshot.isDraggingOver && 'bg-secondary/30'
                  )}
                >
                  {tags.map((tag, index) => (
                    <Draggable key={tag.id} draggableId={String(tag.id)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={provided.draggableProps.style}
                          className={clsx(
                            'bg-secondary/30 p-4 border border-border/50 rounded-xl transition-all',
                            snapshot.isDragging && 'shadow-lg shadow-primary/20 rotate-2 scale-105'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* Drag handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <GripVertical className="w-5 h-5" />
                            </div>

                            {/* Tag badge preview */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border rounded-full shrink-0">
                              <Tag className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground truncate max-w-[80px]">
                                {tag.name || 'Tag'}
                              </span>
                            </div>

                            {/* Name input */}
                            <Input
                              value={tag.name}
                              onChange={(e) => handleNameChange(index, e.target.value)}
                              onBlur={() => handleSaveTag(tag)}
                              className="flex-1 border-border/50 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50 font-medium"
                              placeholder="Nom du tag"
                            />

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTag(tag.id)}
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

                  {/* Add button */}
                  <button
                    onClick={handleAddTag}
                    className="flex bg-secondary/50 border border-border/50 items-center text-foreground w-full gap-2 p-4 rounded-xl hover:bg-secondary/80 hover:border-primary/20 transition-all font-medium justify-center"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter un tag
                  </button>
                </div>
              )}
            </StrictModeDroppable>
          </DragDropContext>
        )}
      </div>
    </div>
  )
}