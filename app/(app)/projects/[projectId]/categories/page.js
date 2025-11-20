'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Input } from '@/components/ui/input'
import { IconPicker } from '@/components/IconPicker'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'
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
          icon: 'folder', // default icon
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
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-200" />
    </div>
  );

  return (
<div className={clsx("space-y-4 w-1/2 mx-auto relative", lexend.className)}>
      
      <div className="flex flex-col">
        <button onClick={() => {router.back()}}  className="mt-6 flex bg-blue-500 border-blue-500 items-center text-white w-24 gap-2 p-2 rounded hover:bg-blue-600 justify-center">
          Fermer
        </button>
        <h1 className="mt-6 text-2xl font-bold">Catégories du projet</h1>
        <p className="mt-6 text-sm text-stone-500">
          Les catégories vous permettent d'organiser vos tâches par thème ou par type. Vous pouvez les utiliser pour regrouper des tâches similaires et faciliter leur gestion.
        </p>
      </div>

      {categories.length === 0 ? (
        <p>Aucune catégorie trouvée.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col space-y-3 border p-4 rounded bg-white border-gray-200 min-h-[50px]"

              >
                {categories.map((cat, index) => (
                  <Draggable
                    key={cat.id}
                    draggableId={String(cat.id)}
                    index={index}
                  
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-neutral-50 p-3 border border-blue-100 rounded flex items-center gap-3"

                      >
                        <IconPicker
                          selected={cat.icon}
                          onChange={(icon) => {
                            handleIconChange(index, icon)
                            handleSaveCategory({ ...cat, icon })
                          }}
                        />
                        <Input
                          value={cat.name}
                          onChange={(e) =>
                            handleNameChange(index, e.target.value)
                          }
                          onBlur={() => handleSaveCategory(cat)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 size={18} className="text-red-500" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                 <button onClick={handleAddCategory} className="flex bg-neutral-50 border-blue-100 items-center text-stone-600 w-full gap-2 p-2 rounded hover:bg-neutral-100 justify-center">
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
