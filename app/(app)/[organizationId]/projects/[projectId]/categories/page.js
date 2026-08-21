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
import { useParams, useRouter } from 'next/navigation'
import { GeistSans } from 'geist/font/sans'
import clsx from 'clsx'

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

  if (!enabled) {
    return null
  }

  return <Droppable {...props}>{children}</Droppable>
}

export default function ProjectCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const { projectId } = useParams()
  const router = useRouter()

  useEffect(() => {
    const fetchCategories = async () => {
      if (!projectId) return

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
    if (result.destination.index === result.source.index) return

    const reordered = Array.from(categories)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)

    const updated = reordered.map((cat, index) => ({
      ...cat,
      order: index,
    }))

    setCategories(updated)

    try {
      await Promise.all(
        updated.map((cat) =>
          supabase.from('categories').update({ order: cat.order }).eq('id', cat.id)
        )
      )
    } catch (error) {
      console.error('Error updating order:', error)
    }
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
    try {
      await supabase
        .from('categories')
        .update({ name: category.name, icon: category.icon })
        .eq('id', category.id)
    } catch (error) {
      console.error('Error saving category:', error)
    }
  }

  const handleAddCategory = async () => {
    try {
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
    } catch (error) {
      console.error('Error adding category:', error)
    }
  }

  const handleDeleteCategory = async (id) => {
    try {
      await supabase.from('categories').delete().eq('id', id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  if (loading) {
    return (
      <div className={clsx("flex h-screen w-full items-center justify-center bg-[#fafaf9]", GeistSans.className)}>
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-12 h-12 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center animate-pulse">
              <span className="text-white font-medium text-xl">z</span>
            </div>
          </div>
          <h2 className="text-[17px] font-medium text-[#050505] mb-2">
            Chargement...
          </h2>
          <p className="text-[13px] text-[#8a8a84]">
            Veuillez patienter
          </p>
          <div className="mt-8 w-64 mx-auto">
            <div className="h-1 bg-[#eeeeec] rounded-full overflow-hidden">
              <div className="h-full bg-[#0d0d0c] w-0 animate-[loading_1.5s_ease-in-out_infinite]"></div>
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
    <div className={clsx("min-h-screen bg-[#fafaf9]", GeistSans.className)}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 px-3 py-1.5 bg-[#eeeeec] text-[#4a4a46] rounded-[4px] text-[13px] font-medium hover:bg-[#e5e5e2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          <h1 className="text-[30px] font-medium tracking-[-0.02em] text-[#050505] mb-4">
            Gestionnaire de catégories
          </h1>
          <p className="text-[13px] text-[#666660] leading-relaxed max-w-2xl">
            Les catégories vous permettent d'organiser vos tâches par thème ou par type.
            Organisez-les par glisser-déposer pour définir leur ordre d'apparition dans l'application.
          </p>
        </div>

        {/* Categories List */}
        {categories.length === 0 ? (
          <div className="bg-white border border-[#e5e5e2] rounded-[4px] p-12 text-center">
            <Folder className="w-12 h-12 text-[#d6d6d2] mx-auto mb-4" />
            <p className="text-[13px] text-[#8a8a84] mb-4">Aucune catégorie trouvée pour ce projet.</p>
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer la première catégorie
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <StrictModeDroppable droppableId="categories">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={clsx(
                    "space-y-2 border border-[#e5e5e2] p-6 rounded-[4px] bg-white transition-colors",
                    snapshot.isDraggingOver && "bg-[#f5f5f4]"
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
                          style={provided.draggableProps.style}
                          className={clsx(
                            "bg-[#f5f5f4] p-3 border border-[#e5e5e2] rounded-[4px] transition-all",
                            snapshot.isDragging && "shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-[#8a8a84] hover:text-[#0d0d0c] transition-colors"
                            >
                              <GripVertical className="w-4 h-4" />
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
                              className="flex-1 border-[#e5e5e2] bg-white focus:outline-none focus:border-[#0d0d0c] focus:ring-0 font-medium text-[13px]"
                              placeholder="Nom de la catégorie"
                            />

                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="hover:bg-[#fde8e8] text-[#dc2626] hover:text-[#9c1b1b] rounded-[3px] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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
                    className="flex bg-[#f5f5f4] border border-[#e5e5e2] items-center text-[#0d0d0c] w-full gap-2 p-3 rounded-[4px] hover:bg-[#eeeeec] hover:border-[#d6d6d2] transition-colors text-[13px] font-medium justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une catégorie
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