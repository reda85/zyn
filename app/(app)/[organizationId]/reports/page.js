'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useUserData } from '@/hooks/useUserData'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useRouter } from 'next/navigation'
import ReportTemplateBuilder from '@/components/ReportTemplateBuilder'
import Sidebar from '@/components/Sidebar'
import { 
  FileText, Plus, Edit, Trash2, Copy, Star, StarOff, 
  Search, ArrowLeft
} from 'lucide-react'
import clsx from 'clsx'
import { Outfit } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

export default function ReportsPage({ params }) {
  const { organizationId } = params
  const router = useRouter()
  const { user, profile, organization } = useUserData()
  const { isAdmin, isLoading: isCheckingAccess } = useIsAdmin()

  const [templates, setTemplates] = useState([])
  const [filteredTemplates, setFilteredTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentView, setCurrentView] = useState('list')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  // Redirect non-admins
  useEffect(() => {
    if (!isCheckingAccess && !isAdmin) {
      router.push(`/${organizationId}/projects`)
    }
  }, [isAdmin, isCheckingAccess, router, organizationId])

  useEffect(() => {
    if (!isCheckingAccess && isAdmin) {
      fetchTemplates()
    }
  }, [organizationId, isCheckingAccess, isAdmin])

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

  // Show loading while checking access OR if user is not admin (during redirect)
  if (isCheckingAccess || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">Vérification des accès...</p>
        </div>
      </div>
    )
  }

  if (currentView === 'builder') {
    return (
      <div className={clsx(outfit.className, "h-screen bg-gray-50")}>
        <button
          onClick={handleBackToList}
          className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
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
    <div className={clsx("flex h-screen bg-gray-50 overflow-hidden", outfit.className)}>
      <Sidebar organizationId={organizationId} currentPage="reports" />

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="flex flex-row items-baseline mb-8 gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 leading-8">Templates de rapports</h1>
          <span className="text-xl font-medium text-gray-500">({templates.length})</span>
        </div>

        <p className="text-gray-600 mb-8 leading-6">
          Gérez vos templates pour personnaliser l'apparence de vos rapports PDF
        </p>

        <div className="flex flex-row mb-8 justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-200 bg-white pl-10 pr-4 py-2.5 w-full rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={handleCreateNew}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouveau template
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement des templates...</p>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-6">
              {searchQuery ? 'Aucun template trouvé' : 'Aucun template'}
            </h3>
            <p className="text-gray-500 mb-6 leading-6">
              {searchQuery 
                ? 'Essayez une autre recherche'
                : 'Commencez par créer votre premier template de rapport'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
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
        "bg-white border rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden group",
        isDefault ? "border-gray-400 ring-2 ring-gray-300" : "border-gray-200 hover:border-gray-300"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 p-6 overflow-hidden">
        <div className="space-y-3">
          <div 
            className="h-8 rounded"
            style={{ 
              backgroundColor: config.primaryColor || '#111827',
              opacity: 0.2
            }}
          />
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-200 rounded w-1/2" />
          </div>
        </div>

        {isDefault && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-gray-900 text-white rounded-full text-xs font-medium">
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
            <Edit className="w-5 h-5 text-gray-900" />
          </button>

          <button
            onClick={() => onDuplicate(template)}
            className="p-2 bg-white/90 hover:bg-white rounded-lg transition-all"
            title="Dupliquer"
          >
            <Copy className="w-5 h-5 text-gray-900" />
          </button>

          <button
            onClick={() => onDelete(template.id)}
            className="p-2 bg-red-600/90 hover:bg-red-600 rounded-lg transition-all"
            title="Supprimer"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 leading-6">
          {template.name}
        </h3>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.primaryColor || '#111827' }}
          />
          <span>{config.fontFamily || 'helvetica'}</span>
          <span>•</span>
          <span>{config.tasks?.displayMode === 'table' ? 'Tableau' : 'Liste'}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {config.coverPage?.enabled && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              Page de garde
            </span>
          )}
          {config.summary?.enabled && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              Résumé
            </span>
          )}
          {config.footer?.enabled && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              Pied de page
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(template)}
            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            Modifier
          </button>

          {!isDefault && (
            <button
              onClick={() => onSetDefault(template.id)}
              className="px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              title="Définir par défaut"
            >
              <StarOff className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-3 leading-4">
          Modifié {new Date(template.updated_at).toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  )
}