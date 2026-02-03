'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useUserData } from '@/hooks/useUserData'
import ReportTemplateBuilder from '@/components/ReportTemplateBuilder'
import { 
  FileText, Plus, Edit, Trash2, Copy, Star, StarOff, 
  Search, ArrowLeft, Settings, FolderKanban, Users, BarChart3
} from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { Outfit } from 'next/font/google'

const lexend = Outfit({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export default function ReportsPage({ params }) {
  const { organizationId } = params
  const { user, profile, organization } = useUserData()

  const [templates, setTemplates] = useState([])
  const [filteredTemplates, setFilteredTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentView, setCurrentView] = useState('list')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [organizationId])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTemplates(templates)
    } else {
      const filtered = templates.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTemplates(filtered)
    }
  }, [searchQuery, templates])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
      setFilteredTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      alert('Erreur lors du chargement des templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveTemplate = async (config) => {
    try {
      const templateData = {
        name: config.reportTitle,
        config: config,
        organization_id: organizationId,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }

      if (selectedTemplate?.id && !isCreating) {
        const { data, error } = await supabase
          .from('report_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id)
          .select()
          .single()

        if (error) throw error
        setTemplates(prev => prev.map(t => t.id === data.id ? data : t))
        alert('Template mis à jour avec succès!')
      } else {
        const { data, error } = await supabase
          .from('report_templates')
          .insert(templateData)
          .select()
          .single()

        if (error) throw error
        setTemplates(prev => [data, ...prev])
        alert('Template créé avec succès!')
      }

      setCurrentView('list')
      setSelectedTemplate(null)
      setIsCreating(false)
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Erreur lors de la sauvegarde du template')
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return

    try {
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      alert('Template supprimé avec succès')
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleDuplicateTemplate = async (template) => {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .insert({
          name: `${template.name} (Copie)`,
          config: template.config,
          organization_id: organizationId,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error
      setTemplates(prev => [data, ...prev])
      alert('Template dupliqué avec succès')
    } catch (error) {
      console.error('Error duplicating template:', error)
      alert('Erreur lors de la duplication')
    }
  }

  const handleSetDefault = async (templateId) => {
    try {
      await supabase
        .from('report_templates')
        .update({ is_default: false })
        .eq('organization_id', organizationId)

      const { error } = await supabase
        .from('report_templates')
        .update({ is_default: true })
        .eq('id', templateId)

      if (error) throw error
      fetchTemplates()
      alert('Template défini comme par défaut')
    } catch (error) {
      console.error('Error setting default:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  const handleCreateNew = () => {
    setSelectedTemplate(null)
    setIsCreating(true)
    setCurrentView('builder')
  }

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template)
    setIsCreating(false)
    setCurrentView('builder')
  }

  const handleBackToList = () => {
    setCurrentView('list')
    setSelectedTemplate(null)
    setIsCreating(false)
  }

  if (currentView === 'builder') {
    return (
      <div className={clsx(lexend.className, "h-screen bg-background")}>
        <button
          onClick={handleBackToList}
          className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-card border border-border/50 rounded-xl shadow-lg hover:bg-secondary transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Retour à la liste</span>
        </button>

        <ReportTemplateBuilder
          initialTemplate={selectedTemplate}
          onSave={handleSaveTemplate}
        />
      </div>
    )
  }

  return (
    <div className={clsx("flex h-screen bg-background font-sans overflow-hidden", lexend.className)}>
      <aside className="w-64 h-screen bg-secondary/20 border-r border-border/40 flex flex-col">
        <div className="px-4 py-5 flex-col border border-border/50 bg-card/80 backdrop-blur-sm flex mx-4 my-6 rounded-xl gap-2 shadow-sm">
          <h2 className="text-sm font-semibold font-heading text-foreground">{organization?.name}</h2>
          <p className="text-xs text-muted-foreground">{organization?.members?.[0]?.count || 0} membres</p>
        </div>
      
        <nav className="flex-1 px-4 space-y-2">
          <Link 
            href={`/${organizationId}/projects`}
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <FolderKanban className="w-5 h-5" /> Projects
          </Link>
          <Link 
            href={`/${organizationId}/members`} 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <Users className="w-5 h-5" /> Membres
          </Link>
          <Link 
            href={`/${organizationId}/reports`} 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 bg-primary/10 text-primary rounded-xl shadow-sm border border-primary/20"
          >
            <BarChart3 className="w-5 h-5" /> Rapports
          </Link>
          <Link 
            href={`/${organizationId}/settings`} 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <Settings className="w-5 h-5" /> Paramètres
          </Link>
        </nav>

        <div className="px-4 pb-6">
          <Link
            href={`/${organizationId}/profile`}
            className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/50 hover:bg-secondary/50 transition-all"
          >
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
              {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {profile?.full_name || user?.email || 'Utilisateur'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Mon profil
              </p>
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10">
        <div className="flex flex-row items-baseline mb-8 mt-12 gap-3">
          <h1 className="text-4xl font-bold font-heading text-foreground">Templates de rapports</h1>
          <span className="text-2xl font-semibold text-muted-foreground">({templates.length})</span>
        </div>

        <p className="text-muted-foreground mb-8">
          Gérez vos templates pour personnaliser l'apparence de vos rapports PDF
        </p>

        <div className="flex flex-row mb-8 justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-border/50 bg-card/50 backdrop-blur-sm pl-10 pr-4 py-2.5 w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={handleCreateNew}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouveau template
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement des templates...</p>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'Aucun template trouvé' : 'Aucun template'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? 'Essayez une autre recherche'
                : 'Commencez par créer votre premier template de rapport'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Créer un template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onDuplicate={handleDuplicateTemplate}
                onSetDefault={handleSetDefault}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function TemplateCard({ template, onEdit, onDelete, onDuplicate, onSetDefault }) {
  const [showActions, setShowActions] = useState(false)
  const config = template.config || {}
  const isDefault = template.is_default

  return (
    <div
      className={clsx(
        "bg-secondary/30 border rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden group hover:-translate-y-1",
        isDefault ? "border-primary/50 ring-2 ring-primary/20" : "border-border/50 hover:border-primary/20"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative h-48 bg-gradient-to-br from-secondary/30 to-secondary/10 p-6 overflow-hidden">
        <div className="space-y-3">
          <div 
            className="h-8 rounded"
            style={{ 
              backgroundColor: config.primaryColor || '#44403c',
              opacity: 0.2
            }}
          />
          <div className="space-y-2">
            <div className="h-2 bg-foreground/10 rounded w-3/4" />
            <div className="h-2 bg-foreground/10 rounded w-1/2" />
          </div>
        </div>

        {isDefault && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
            <Star className="w-3 h-3 fill-current" />
            Par défaut
          </div>
        )}

        <div
          className={clsx(
            "absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 transition-opacity",
            showActions ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            onClick={() => onEdit(template)}
            className="p-2 bg-white/90 hover:bg-white rounded-lg transition-all"
            title="Modifier"
          >
            <Edit className="w-5 h-5 text-foreground" />
          </button>

          <button
            onClick={() => onDuplicate(template)}
            className="p-2 bg-white/90 hover:bg-white rounded-lg transition-all"
            title="Dupliquer"
          >
            <Copy className="w-5 h-5 text-foreground" />
          </button>

          <button
            onClick={() => onDelete(template.id)}
            className="p-2 bg-red-500/90 hover:bg-red-500 rounded-lg transition-all"
            title="Supprimer"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-foreground mb-2 line-clamp-1">
          {template.name}
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.primaryColor || '#44403c' }}
          />
          <span>{config.fontFamily || 'helvetica'}</span>
          <span>•</span>
          <span>{config.tasks?.displayMode === 'table' ? 'Tableau' : 'Liste'}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {config.coverPage?.enabled && (
            <span className="px-2 py-1 bg-secondary/50 rounded text-xs">
              Page de garde
            </span>
          )}
          {config.summary?.enabled && (
            <span className="px-2 py-1 bg-secondary/50 rounded text-xs">
              Résumé
            </span>
          )}
          {config.footer?.enabled && (
            <span className="px-2 py-1 bg-secondary/50 rounded text-xs">
              Pied de page
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(template)}
            className="flex-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all"
          >
            Modifier
          </button>

          {!isDefault && (
            <button
              onClick={() => onSetDefault(template.id)}
              className="px-3 py-2 border border-border/50 hover:bg-secondary/50 rounded-lg transition-all"
              title="Définir par défaut"
            >
              <StarOff className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Modifié {new Date(template.updated_at).toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  )
}