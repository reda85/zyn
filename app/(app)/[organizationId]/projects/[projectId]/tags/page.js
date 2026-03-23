'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Tag, ArrowLeft, Search, X } from 'lucide-react'
import { supabase } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Lexend } from 'next/font/google'
import clsx from 'clsx'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export default function ProjectTags() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleNameChange = (index, name) => {
    // Work on the original tags array using the tag's id
    const tagId = filteredTags[index].id
    setTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, name } : t))
    )
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
          </p>
        </div>

        {/* Search bar */}
        {tags.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un tag..."
              className="pl-9 pr-9 border-border/50 bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

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
          <div className="border border-border/50 p-6 rounded-xl bg-card shadow-sm space-y-3">
            {filteredTags.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun tag ne correspond à votre recherche.</p>
              </div>
            ) : (
              filteredTags.map((tag, index) => (
                <div
                  key={tag.id}
                  className="bg-secondary/30 p-4 border border-border/50 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
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
              ))
            )}

            {/* Add button — always visible */}
            <button
              onClick={handleAddTag}
              className="flex bg-secondary/50 border border-border/50 items-center text-foreground w-full gap-2 p-4 rounded-xl hover:bg-secondary/80 hover:border-primary/20 transition-all font-medium justify-center"
            >
              <Plus className="w-5 h-5" />
              Ajouter un tag
            </button>
          </div>
        )}
      </div>
    </div>
  )
}