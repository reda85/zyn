'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Input } from '@/components/ui/input'
import { IconPicker } from '@/components/IconPicker'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Folder, GripVertical, ArrowLeft } from 'lucide-react'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedProjectAtom } from '@/store/atoms'
import { useParams } from 'next/navigation'
import { Lexend } from 'next/font/google'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export default function ProjectCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const { projectId } = useParams()
  const router = useRouter()
  const [isBrowser, setIsBrowser] = useState(false)

  // Fix pour le drag & drop
  useEffect(() => {
    setIsBrowser(true)
  }, [])

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true })

      if (data) setCategories(data)
      if (error) console.error('Error fetching categories:', error)
      setLoading(false)
    }

    fetchCategories()
  }, [projectId])

  const handleDragEnd = async (result) => {
    if (!result.destination) return
    const reordered = [...categories]
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)

    const updated = reordered.map((cat, index) => ({
      ...cat,
      order: index,
    }))
    setCategories(updated)

    await Promise.all(
      updated.map((cat) =>
        supabase.from('categories').update({ order: cat.order }).eq('id', cat.id)
      )
    )
  }

  const handleNameChange = (index, name) => {
    const updated = [...categories]
    updated[index].name = name
    setCategories(updated)
  }

  const handleIconChange = (index, icon) => {
    const updated = [...categories]
    updated[index].icon = icon
    setCategories(updated)
  }

  const handleSaveCategory = async (category) => {
    await supabase
      .from('categories')
      .update({ name: category.name, icon: category.icon })
      .eq('id', category.id)
  }

  const handleAddCategory = async () => {
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          project_id: projectId,
          name: 'Nouvelle catégorie',
          icon: 'folder',
          order: categories.length,
        },
      ])
      .select()
      .single()

    if (data) {
      setCategories((prev) => [...prev, data])
    }
    if (error) console.error('Error adding category:', error)
  }

  const handleDeleteCategory = async (id) => {
    await supabase.from('categories').delete().eq('id', id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
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
            Gestionnaire de catégories
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            Les catégories vous permettent d'organiser vos tâches par thème ou par type. 
            Organisez-les par glisser-déposer pour définir leur ordre d'apparition dans l'application.
          </p>
        </div>

        {/* Categories List */}
        {categories.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-xl p-12 text-center">
            <Folder className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Aucune catégorie trouvée pour ce projet.</p>
            <button
              onClick={handleAddCategory}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer la première catégorie
            </button>
          </div>
        ) : (
          isBrowser && (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="categories">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={clsx(
                      "space-y-3 border border-border/50 p-6 rounded-xl bg-card shadow-sm transition-colors",
                      snapshot.isDraggingOver && "bg-secondary/30"
                    )}
                  >
                    {categories.map((cat, index) => (
                      <Draggable
                        key={cat.id}
                        draggableId={String(cat.id)}
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

                              {/* Icon Picker */}
                              <IconPicker
                                selected={cat.icon}
                                onChange={(icon) => {
                                  handleIconChange(index, icon)
                                  handleSaveCategory({ ...cat, icon })
                                }}
                              />

                              {/* Input */}
                              <Input
                                value={cat.name}
                                onChange={(e) => handleNameChange(index, e.target.value)}
                                onBlur={() => handleSaveCategory(cat)}
                                className="flex-1 border-border/50 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50 font-medium"
                                placeholder="Nom de la catégorie"
                              />

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCategory(cat.id)}
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
                      onClick={handleAddCategory} 
                      className="flex bg-secondary/50 border border-border/50 items-center text-foreground w-full gap-2 p-4 rounded-xl hover:bg-secondary/80 hover:border-primary/20 transition-all font-medium justify-center"
                    >
                      <Plus className="w-5 h-5" /> 
                      Ajouter une catégorie
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