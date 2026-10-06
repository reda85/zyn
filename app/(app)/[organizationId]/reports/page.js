'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useUserData } from '@/hooks/useUserData'
import { useRouter } from 'next/navigation'
import ReportTemplateBuilder from '@/components/ReportTemplateBuilder'
import Sidebar from '@/components/Sidebar'
import {
  FileText, Plus, Edit, Trash2, Copy, Star, StarOff,
  Search, ArrowLeft,
} from 'lucide-react'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

function TemplatesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white border border-[#e5e5e2] rounded-[4px] overflow-hidden">
          <div className="h-36 bg-[#f5f5f4] p-5">
            <div className="space-y-2.5">
              <div className="h-6 rounded-[3px] bg-[#eeeeec] animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-1.5 bg-[#eeeeec] rounded-[2px] w-3/4 animate-pulse" />
                <div className="h-1.5 bg-[#eeeeec] rounded-[2px] w-1/2 animate-pulse" />
                <div className="h-1.5 bg-[#eeeeec] rounded-[2px] w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="h-3.5 rounded-[2px] bg-[#eeeeec] animate-pulse mb-2.5" style={{ width: `${100 + (i % 3) * 20}px` }} />
            <div className="h-3 w-24 rounded-[2px] bg-[#eeeeec] animate-pulse mb-2.5" />
            <div className="h-2.5 w-20 rounded-[2px] bg-[#eeeeec] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage({ params }) {
  const { organizationId } = params
  const router = useRouter()
  const { user, profile, organization, organizations, isAdmin } = useUserData(organizationId)

  const [templates, setTemplates] = useState([])
  const [filteredTemplates, setFilteredTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentView, setCurrentView] = useState('list')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  const isCheckingAccess = organizations.length === 0

  useEffect(() => {
    if (isCheckingAccess) return
    if (!isAdmin) router.push(`/${organizationId}/projects`)
  }, [isCheckingAccess, isAdmin, organizationId])

  useEffect(() => {
    if (!isCheckingAccess && isAdmin) {
      fetchTemplates()
    }
  }, [organizationId, isCheckingAccess, isAdmin])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTemplates(templates)
    } else {
      setFilteredTemplates(
        templates.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
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
        updated_at: new Date().toISOString(),
      }

      if (selectedTemplate?.id && !isCreating) {
        const { data, error } = await supabase
          .from('report_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id)
          .select()
          .single()

        if (error) throw error
        setTemplates((prev) => prev.map((t) => (t.id === data.id ? data : t)))
        alert('Template mis à jour avec succès!')
      } else {
        const { data, error } = await supabase
          .from('report_templates')
          .insert(templateData)
          .select()
          .single()

        if (error) throw error
        setTemplates((prev) => [data, ...prev])
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
      const { error } = await supabase.from('report_templates').delete().eq('id', templateId)
      if (error) throw error
      setTemplates((prev) => prev.filter((t) => t.id !== templateId))
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
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      setTemplates((prev) => [data, ...prev])
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

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return ''
    const now = new Date()
    const date = new Date(dateStr)
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `il y a ${diffDays} jours`
    if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`
    if (diffDays < 365) return `il y a ${Math.floor(diffDays / 30)} mois`
    return `il y a ${Math.floor(diffDays / 365)} an(s)`
  }

  if (isCheckingAccess || !isAdmin) {
    return (
      <div className={clsx('flex h-screen items-center justify-center bg-[#fafaf9]', GeistSans.className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#e5e5e2] border-t-[#0d0d0c] mx-auto mb-3" />
          <p className="text-[13px] text-[#8a8a84]">Vérification des accès...</p>
        </div>
      </div>
    )
  }

  if (currentView === 'builder') {
    return (
      <div className={clsx(GeistSans.className, 'h-screen bg-[#fafaf9]')}>
        <button
          onClick={handleBackToList}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e5e5e2] rounded-[4px] shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)] hover:bg-[#f5f5f4] transition-colors text-[13px] font-medium text-[#4a4a46]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>
        <ReportTemplateBuilder initialTemplate={selectedTemplate} onSave={handleSaveTemplate} />
      </div>
    )
  }

  return (
    <div className={clsx('flex h-screen bg-[#fafaf9] overflow-hidden', GeistSans.className)}>
      <Sidebar organizationId={organizationId} currentPage="reports" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium tracking-[-0.003em] text-[#050505]">Templates de rapports</h1>
            {isLoading ? (
              <div className="h-3 w-56 rounded-[2px] bg-[#eeeeec] animate-pulse mt-1.5" />
            ) : (
              <p className={clsx('text-[12px] text-[#8a8a84] mt-0.5', GeistMono.className)}>
                {templates.length} template{templates.length !== 1 ? 's' : ''} · Personnalisez
                l'apparence de vos rapports PDF
              </p>
            )}
          </div>
          <button
            onClick={handleCreateNew}
            className="bg-[#0d0d0c] text-white px-4 py-2 rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nouveau template
          </button>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a84]" />
            <input
              type="text"
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-[#e5e5e2] bg-white pl-8 pr-3 py-[7px] w-full rounded-[4px] text-[13px] focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c] placeholder:text-[#b8b8b3]"
            />
          </div>
        </div>

        {isLoading ? (
          <TemplatesGridSkeleton />
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-10 h-10 text-[#eeeeec] mx-auto mb-3" />
            <h3 className="text-[14px] font-medium text-[#050505] mb-1">
              {searchQuery ? 'Aucun template trouvé' : 'Aucun template'}
            </h3>
            <p className="text-[13px] text-[#8a8a84] mb-5">
              {searchQuery
                ? 'Essayez une autre recherche'
                : 'Commencez par créer votre premier template de rapport'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Créer un template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onDuplicate={handleDuplicateTemplate}
                onSetDefault={handleSetDefault}
                getRelativeTime={getRelativeTime}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function TemplateCard({ template, onEdit, onDelete, onDuplicate, onSetDefault, getRelativeTime }) {
  const [showActions, setShowActions] = useState(false)
  const config = template.config || {}
  const isDefault = template.is_default

  return (
    <div
      className={clsx(
        'bg-white border rounded-[4px] transition-all overflow-hidden group cursor-pointer',
        isDefault
          ? 'border-[#8a8a84]'
          : 'border-[#e5e5e2] hover:border-[#d6d6d2] hover:shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)]'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onEdit(template)}
    >
      <div className="relative h-36 bg-[#f5f5f4] p-5 overflow-hidden">
        <div className="space-y-2.5">
          <div
            className="h-6 rounded-[3px]"
            style={{ backgroundColor: config.primaryColor || '#0d0d0c', opacity: 0.15 }}
          />
          <div className="space-y-1.5">
            <div className="h-1.5 bg-[#e5e5e2] rounded-[2px] w-3/4" />
            <div className="h-1.5 bg-[#e5e5e2] rounded-[2px] w-1/2" />
            <div className="h-1.5 bg-[#e5e5e2] rounded-[2px] w-2/3" />
          </div>
        </div>

        {isDefault && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 bg-[#0d0d0c] text-white rounded-[3px] text-[10px] font-medium">
            <Star className="w-2.5 h-2.5 fill-current" />
            Défaut
          </div>
        )}

        <div
          className={clsx(
            'absolute inset-0 bg-black/50 flex items-center justify-center gap-1.5 transition-opacity',
            showActions ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button onClick={(e) => { e.stopPropagation(); onEdit(template) }} className="p-2 bg-white hover:bg-[#f5f5f4] rounded-[4px] transition-colors" title="Modifier">
            <Edit className="w-4 h-4 text-[#0d0d0c]" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(template) }} className="p-2 bg-white hover:bg-[#f5f5f4] rounded-[4px] transition-colors" title="Dupliquer">
            <Copy className="w-4 h-4 text-[#0d0d0c]" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(template.id) }} className="p-2 bg-white hover:bg-[#fde8e8] rounded-[4px] transition-colors" title="Supprimer">
            <Trash2 className="w-4 h-4 text-[#dc2626]" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-medium text-[#0d0d0c] truncate flex-1 pr-2">
            {template.name}
          </h3>
          {!isDefault && (
            <button
              onClick={(e) => { e.stopPropagation(); onSetDefault(template.id) }}
              className="p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors opacity-0 group-hover:opacity-100"
              title="Définir par défaut"
            >
              <StarOff className="w-3.5 h-3.5 text-[#8a8a84]" />
            </button>
          )}
        </div>

        <div className={clsx('flex items-center gap-1.5 text-[11px] text-[#8a8a84] mb-2.5', GeistMono.className)}>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: config.primaryColor || '#0d0d0c' }} />
          <span>{config.fontFamily || 'helvetica'}</span>
          <span className="text-[#d6d6d2]">·</span>
          <span>{config.tasks?.displayMode === 'table' ? 'Tableau' : 'Liste'}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-2.5">
          {config.coverPage?.enabled && <span className="px-1.5 py-0.5 bg-[#eeeeec] text-[#666660] rounded-[2px] text-[10px] font-medium">Page de garde</span>}
          {config.summary?.enabled && <span className="px-1.5 py-0.5 bg-[#eeeeec] text-[#666660] rounded-[2px] text-[10px] font-medium">Résumé</span>}
          {config.footer?.enabled && <span className="px-1.5 py-0.5 bg-[#eeeeec] text-[#666660] rounded-[2px] text-[10px] font-medium">Pied de page</span>}
        </div>

        <p className={clsx('text-[11px] text-[#b8b8b3]', GeistMono.className)}>Modifié {getRelativeTime(template.updated_at)}</p>
      </div>
    </div>
  )
}