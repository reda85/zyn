'use client'

import React, { useState } from "react"
import { 
  Image as ImageIcon, Layout, Settings, FileText, Eye, 
  Users, AlignLeft, Plus, Trash2, Type, Palette, 
  Grid, Upload, Download, Columns, List, Table,
  ChevronDown, ChevronRight, Maximize2, Minimize2
} from "lucide-react"
import clsx from "clsx"

/**
 * DATABASE SCHEMA NEEDED:
 * 
 * Table: report_templates
 * Columns:
 * - id: uuid (primary key)
 * - name: text (template name, from config.reportTitle)
 * - config: jsonb (entire config object)
 * - created_at: timestamp
 * - updated_at: timestamp
 * - user_id: uuid (foreign key to auth.users)
 * - organization_id: uuid (foreign key to organizations)
 * 
 * SQL to create table:
 * 
 * CREATE TABLE report_templates (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name text NOT NULL,
 *   config jsonb NOT NULL,
 *   created_at timestamp with time zone DEFAULT now(),
 *   updated_at timestamp with time zone DEFAULT now(),
 *   user_id uuid REFERENCES auth.users(id),
 *   organization_id uuid REFERENCES organizations(id)
 * );
 * 
 * CREATE INDEX idx_report_templates_user ON report_templates(user_id);
 * CREATE INDEX idx_report_templates_org ON report_templates(organization_id);
 */

export default function ReportTemplateBuilder({ onSave, initialTemplate = null }) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [previewMode, setPreviewMode] = useState("pdf") // "pdf" | "cover" | "content"
  
  const [config, setConfig] = useState(initialTemplate?.config || {
    // Design global
    primaryColor: "#44403c", // stone-700 par défaut
    fontFamily: "helvetica",
    reportTitle: "RAPPORT DE TÂCHES",
    
    // === OPTIONS PDF ACTUELLES (cochées par défaut) ===
    
    // En-tête du rapport PDF
    header: {
      showOrganizationName: true,
      showProjectName: true,
      showDate: true,
      showLogo: false,
      layout: "horizontal", // horizontal, vertical
    },
    
    // Boîte de résumé PDF
    summary: {
      enabled: true,
      showPeriod: true,
      showTotalCount: true,
      showOverdueCount: true,
      showPlanCount: true,
      showStatusBreakdown: true,
      backgroundColor: "#f5f5f4", // stone-50
    },
    
    // Affichage des tâches PDF
    tasks: {
      displayMode: "list", // "list" ou "table"
      groupBy: "none", // "none", "status", "category", "plan"
      sortBy: "created_at", // "created_at", "due_date", "status"
    },
    
    // Champs à afficher (PDF)
    fields: {
      description: true,
      photos: true,
      snapshot: true,
      assignedTo: true,
      dueDate: true,
      category: true,
      status: true,
      createdBy: true,
      plan: true,
    },
    
    // Mode Liste (PDF)
    listView: {
      showIndex: true,
      showCategoryIcon: true,
      showStatusPill: true,
      photoLayout: "grid",
      snapshotSize: "large",
      showDividers: true,
      snapshotBorder: true,
      snapshotBorderWidth: 4,
    },
    
    // Mode Tableau (PDF)
    tableView: {
      showIndex: true,
      showPhotosInline: true,
      photoSize: "medium",
      compactMode: false,
      alternateRowColors: true,
      headerBackgroundColor: "#f5f5f4",
    },
    
    // === OPTIONS ADDITIONNELLES (non cochées par défaut) ===
    
    // Page de garde (désactivée par défaut)
    coverPage: {
      enabled: false,
      showCompanyLogo: true,
      companyLogoPosition: "top-left",
      companyLogoSize: "medium",
      showClientLogo: true,
      clientLogoPosition: "top-right",
      clientLogoSize: "medium",
      showProjectPhoto: true,
      projectPhotoSize: "medium",
      projectPhotoPosition: "center",
      showSummary: true,
      showParticipants: true,
      participantsLayout: "grid",
      backgroundStyle: "none",
    },
    
    // Informations projet supplémentaires
    projectInfo: {
      showLocation: true,
      showClientName: true,
      showProjectNumber: true,
      showContractor: false,
      showArchitect: false,
      showPhase: false,
    },
    
    // Galerie photos supplémentaire
    photoGallery: {
      enabled: false,
      title: "Galerie de photos",
      layout: "grid",
      photosPerRow: 4,
      showCaptions: true,
      showMetadata: false,
    },
    
    // Section participants
    participants: {
      enabled: false,
      title: "Équipe projet",
      layout: "grid",
      showRoles: true,
      showContact: false,
      showCompany: false,
    },
    
    // Signatures
    signatures: {
      enabled: false,
      title: "Signatures",
      layout: "horizontal",
      fields: [
        { label: "Chef de projet", enabled: true },
        { label: "Client", enabled: true },
        { label: "Entrepreneur", enabled: false },
      ]
    },
    
    // Pied de page
    footer: {
      enabled: false,
      showPageNumbers: true,
      showProjectInfo: true,
      showCompanyInfo: false,
      customText: "",
    },
    
    // Sections personnalisées
    customSections: [],
  })

  const [expandedSections, setExpandedSections] = useState({
    header: true,
    summary: false,
    tasks: false,
    fields: false,
    listView: false,
    tableView: false,
    // Additional sections
    coverPage: false,
    projectInfo: false,
    photoGallery: false,
    participants: false,
    signatures: false,
    footer: false,
  })

  const fontOptions = [
    { value: "helvetica", label: "Helvetica" },
    { value: "times", label: "Times New Roman" },
    { value: "courier", label: "Courier" },
  ]

  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev[section]
      
      if (isCurrentlyExpanded) {
        return { ...prev, [section]: false }
      }
      
      const newState = {}
      Object.keys(prev).forEach(key => {
        newState[key] = key === section
      })
      return newState
    })
  }

  const addCustomSection = () => {
    const newSectionId = Date.now()
    const newSection = {
      id: newSectionId,
      title: "Nouvelle section",
      type: "text",
      enabled: true,
    }
    
    setConfig(prev => ({
      ...prev,
      customSections: [...prev.customSections, newSection]
    }))
    
    setExpandedSections(prev => {
      const newState = {}
      Object.keys(prev).forEach(key => {
        newState[key] = false
      })
      newState[`custom-${newSectionId}`] = true
      return newState
    })
  }

  const saveTemplate = async () => {
    setIsSaving(true)
    setSaveStatus(null)

    try {
      // TODO: Replace with your actual Supabase call
      // const { data, error } = await supabase
      //   .from('report_templates')
      //   .upsert({
      //     name: config.reportTitle,
      //     config: config,
      //     updated_at: new Date().toISOString()
      //   })
      //   .select()
      //   .single()

      // if (error) throw error

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000))

      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 3000)

      // Call parent callback if provided
      if (onSave) {
        onSave(config)
      }

      console.log('Template saved:', config)
    } catch (error) {
      console.error('Error saving template:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const Section = ({ title, icon: Icon, section, children }) => (
    <div className="border-b border-border/30">
      <button
        onClick={(e) => {
          e.preventDefault()
          toggleSection(section)
        }}
        className="w-full flex items-center justify-between p-5 hover:bg-secondary/20 transition-all text-left group"
      >
        <div className="flex items-center gap-3">
          <div className={clsx(
            "p-2 rounded-lg transition-all",
            expandedSections[section] ? "bg-primary/10" : "bg-secondary/30 group-hover:bg-secondary/50"
          )}>
            <Icon className={clsx(
              "w-4 h-4 transition-colors",
              expandedSections[section] ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {expandedSections[section] ? (
          <ChevronDown className="w-5 h-5 text-primary" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </button>
      {expandedSections[section] && (
        <div className="px-5 pb-6 pt-2 space-y-5 bg-secondary/5">
          {children}
        </div>
      )}
    </div>
  )

  const Toggle = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer group py-2 px-3 rounded-lg hover:bg-secondary/30 transition-all">
      <span className="text-sm text-foreground font-medium">
        {label}
      </span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className={clsx(
          "w-11 h-6 rounded-full transition-all",
          checked ? "bg-primary" : "bg-secondary/50"
        )}>
          <div className={clsx(
            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
            checked && "translate-x-5"
          )} />
        </div>
      </div>
    </label>
  )

  const Select = ({ label, value, onChange, options }) => (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => {
          e.stopPropagation()
          onChange(e)
        }}
        className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="flex h-screen bg-background text-foreground font-sans">
      
      {/* PANNEAU DE CONTRÔLE */}
      <aside className="w-[420px] bg-background border-r border-border/50 flex flex-col shadow-lg overflow-y-auto">
        {/* Header - Compact - Sticky */}
        <div className="sticky top-0 z-10 p-5 border-b border-border/50 bg-card backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">
                Template de Rapport
              </h1>
            </div>
          </div>
          
          {/* Configuration globale compacte */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Titre du rapport
              </label>
              <input
                type="text"
                value={config.reportTitle}
                onChange={(e) => {
                  e.stopPropagation()
                  setConfig({ ...config, reportTitle: e.target.value })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault()
                }}
                placeholder="RAPPORT DE TÂCHES"
                className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Couleur
                </label>
                <div className="flex items-center gap-2 bg-secondary/30 rounded-lg border border-border/50 px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => {
                      e.stopPropagation()
                      setConfig({ ...config, primaryColor: e.target.value })
                    }}
                    className="w-7 h-7 rounded cursor-pointer border-0"
                  />
                  <span className="text-xs text-foreground font-mono">{config.primaryColor}</span>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Police
                </label>
                <select
                  value={config.fontFamily}
                  onChange={(e) => {
                    e.stopPropagation()
                    setConfig({ ...config, fontFamily: e.target.value })
                  }}
                  className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                >
                  {fontOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sections configurables */}
        <div className="flex-1 bg-card">
          {/* En-tête */}
          <Section title="En-tête du rapport" icon={Layout} section="header">
            <Toggle
              label="Afficher le nom de l'organisation"
              checked={config.header.showOrganizationName}
              onChange={(e) => setConfig({
                ...config,
                header: { ...config.header, showOrganizationName: e.target.checked }
              })}
            />
            
            <Toggle
              label="Afficher le nom du projet"
              checked={config.header.showProjectName}
              onChange={(e) => setConfig({
                ...config,
                header: { ...config.header, showProjectName: e.target.checked }
              })}
            />
            
            <Toggle
              label="Afficher la date"
              checked={config.header.showDate}
              onChange={(e) => setConfig({
                ...config,
                header: { ...config.header, showDate: e.target.checked }
              })}
            />
            
            <Toggle
              label="Afficher le logo"
              checked={config.header.showLogo}
              onChange={(e) => setConfig({
                ...config,
                header: { ...config.header, showLogo: e.target.checked }
              })}
            />
          </Section>

          {/* Résumé */}
          <Section title="Boîte de résumé" icon={FileText} section="summary">
            <Toggle
              label="Activer le résumé"
              checked={config.summary.enabled}
              onChange={(e) => setConfig({
                ...config,
                summary: { ...config.summary, enabled: e.target.checked }
              })}
            />
            
            {config.summary.enabled && (
              <div className="space-y-5 pl-5 border-l-2 border-border/30 mt-2">
                <Toggle
                  label="Afficher la période"
                  checked={config.summary.showPeriod}
                  onChange={(e) => setConfig({
                    ...config,
                    summary: { ...config.summary, showPeriod: e.target.checked }
                  })}
                />
                
                <Toggle
                  label="Afficher le total des tâches"
                  checked={config.summary.showTotalCount}
                  onChange={(e) => setConfig({
                    ...config,
                    summary: { ...config.summary, showTotalCount: e.target.checked }
                  })}
                />
                
                <Toggle
                  label="Afficher les tâches en retard"
                  checked={config.summary.showOverdueCount}
                  onChange={(e) => setConfig({
                    ...config,
                    summary: { ...config.summary, showOverdueCount: e.target.checked }
                  })}
                />
                
                <Toggle
                  label="Afficher le nombre de plans"
                  checked={config.summary.showPlanCount}
                  onChange={(e) => setConfig({
                    ...config,
                    summary: { ...config.summary, showPlanCount: e.target.checked }
                  })}
                />
                
                <Toggle
                  label="Afficher la répartition par statut"
                  checked={config.summary.showStatusBreakdown}
                  onChange={(e) => setConfig({
                    ...config,
                    summary: { ...config.summary, showStatusBreakdown: e.target.checked }
                  })}
                />
              </div>
            )}
          </Section>

          {/* Mode d'affichage */}
          <Section title="Affichage des tâches" icon={Layout} section="tasks">
            <Select
              label="Mode d'affichage"
              value={config.tasks.displayMode}
              onChange={(e) => setConfig({
                ...config,
                tasks: { ...config.tasks, displayMode: e.target.value }
              })}
              options={[
                { value: "list", label: "Liste détaillée" },
                { value: "table", label: "Tableau compact" },
              ]}
            />
            
            <Select
              label="Grouper par"
              value={config.tasks.groupBy}
              onChange={(e) => setConfig({
                ...config,
                tasks: { ...config.tasks, groupBy: e.target.value }
              })}
              options={[
                { value: "none", label: "Aucun groupement" },
                { value: "status", label: "Par statut" },
                { value: "category", label: "Par catégorie" },
                { value: "plan", label: "Par plan" },
              ]}
            />
            
            <Select
              label="Trier par"
              value={config.tasks.sortBy}
              onChange={(e) => setConfig({
                ...config,
                tasks: { ...config.tasks, sortBy: e.target.value }
              })}
              options={[
                { value: "created_at", label: "Date de création" },
                { value: "due_date", label: "Échéance" },
                { value: "status", label: "Statut" },
                { value: "category", label: "Catégorie" },
              ]}
            />
          </Section>

          {/* Champs à afficher */}
          <Section title="Champs à afficher" icon={Eye} section="fields">
            <p className="text-xs text-muted-foreground mb-4">
              Sélectionnez les informations à inclure dans le rapport
            </p>
            <div className="space-y-3">
              <Toggle
                label="Description"
                checked={config.fields.description}
                onChange={(e) => setConfig({
                  ...config,
                  fields: { ...config.fields, description: e.target.checked }
                })}
              />
              
              <Toggle
                label="Photos"
                checked={config.fields.photos}
                onChange={(e) => setConfig({
                  ...config,
                  fields: { ...config.fields, photos: e.target.checked }
                })}
              />
              
              <Toggle
                label="Snapshot du plan"
                checked={config.fields.snapshot}
                onChange={(e) => setConfig({
                  ...config,
                  fields: { ...config.fields, snapshot: e.target.checked }
                })}
              />
              
              <Toggle
                label="Assigné à"
                checked={config.fields.assignedTo}
                onChange={(e) => setConfig({
                  ...config,
                  fields: { ...config.fields, assignedTo: e.target.checked }
                })}
              />
              
              <Toggle
                label="Échéance"
                checked={config.fields.dueDate}
                onChange={(e) => setConfig({
                  ...config,
                  fields: { ...config.fields, dueDate: e.target.checked }
                })}
              />
              
              <Toggle
                label="Catégorie"
                checked={config.fields.category}
                onChange={(e) => setConfig({
                  ...config,
                  fields: { ...config.fields, category: e.target.checked }
                })}
              />
              
              <Toggle
                label="Statut"
                checked={config.fields.status}
                onChange={(e) => setConfig({
                  ...config,
                  fields: { ...config.fields, status: e.target.checked }
                })}
              />
              
              <Toggle
                label="Créé par"
                checked={config.fields.createdBy}
                onChange={(e) => setConfig({
                  ...config,
                  fields: { ...config.fields, createdBy: e.target.checked }
                })}
              />
              
              <Toggle
                label="Plan/Localisation"
                checked={config.fields.plan}
                onChange={(e) => setConfig({
                  ...config,
                  fields: { ...config.fields, plan: e.target.checked }
                })}
              />
            </div>
          </Section>

          {/* Options mode Liste */}
          <Section title="Options mode Liste" icon={List} section="listView">
            <p className="text-xs text-muted-foreground mb-4">
              Paramètres spécifiques au mode liste détaillée
            </p>
            
            <Toggle
              label="Afficher les numéros"
              checked={config.listView.showIndex}
              onChange={(e) => setConfig({
                ...config,
                listView: { ...config.listView, showIndex: e.target.checked }
              })}
            />
            
            <Toggle
              label="Afficher l'icône de catégorie"
              checked={config.listView.showCategoryIcon}
              onChange={(e) => setConfig({
                ...config,
                listView: { ...config.listView, showCategoryIcon: e.target.checked }
              })}
            />
            
            <Toggle
              label="Afficher le badge de statut"
              checked={config.listView.showStatusPill}
              onChange={(e) => setConfig({
                ...config,
                listView: { ...config.listView, showStatusPill: e.target.checked }
              })}
            />
            
            <Toggle
              label="Afficher les séparateurs"
              checked={config.listView.showDividers}
              onChange={(e) => setConfig({
                ...config,
                listView: { ...config.listView, showDividers: e.target.checked }
              })}
            />
            
            <Select
              label="Disposition des photos"
              value={config.listView.photoLayout}
              onChange={(e) => setConfig({
                ...config,
                listView: { ...config.listView, photoLayout: e.target.value }
              })}
              options={[
                { value: "grid", label: "Grille" },
                { value: "vertical", label: "Verticale" },
                { value: "horizontal", label: "Horizontale" },
              ]}
            />
            
            <Select
              label="Taille du snapshot"
              value={config.listView.snapshotSize}
              onChange={(e) => setConfig({
                ...config,
                listView: { ...config.listView, snapshotSize: e.target.value }
              })}
              options={[
                { value: "small", label: "Petit (150px)" },
                { value: "medium", label: "Moyen (200px)" },
                { value: "large", label: "Grand (220px)" },
              ]}
            />
          </Section>

          {/* Options mode Tableau */}
          <Section title="Options mode Tableau" icon={Table} section="tableView">
            <p className="text-xs text-muted-foreground mb-4">
              Paramètres spécifiques au mode tableau compact
            </p>
            
            <Toggle
              label="Afficher les numéros"
              checked={config.tableView.showIndex}
              onChange={(e) => setConfig({
                ...config,
                tableView: { ...config.tableView, showIndex: e.target.checked }
              })}
            />
            
            <Toggle
              label="Photos dans les cellules"
              checked={config.tableView.showPhotosInline}
              onChange={(e) => setConfig({
                ...config,
                tableView: { ...config.tableView, showPhotosInline: e.target.checked }
              })}
            />
            
            <Toggle
              label="Mode compact"
              checked={config.tableView.compactMode}
              onChange={(e) => setConfig({
                ...config,
                tableView: { ...config.tableView, compactMode: e.target.checked }
              })}
            />
            
            <Toggle
              label="Alterner les couleurs de lignes"
              checked={config.tableView.alternateRowColors}
              onChange={(e) => setConfig({
                ...config,
                tableView: { ...config.tableView, alternateRowColors: e.target.checked }
              })}
            />
            
            <Select
              label="Taille des photos"
              value={config.tableView.photoSize}
              onChange={(e) => setConfig({
                ...config,
                tableView: { ...config.tableView, photoSize: e.target.value }
              })}
              options={[
                { value: "small", label: "Petit (80x80)" },
                { value: "medium", label: "Moyen (120x120)" },
                { value: "large", label: "Grand (160x160)" },
              ]}
            />
          </Section>

          {/* === SECTIONS ADDITIONNELLES === */}

          {/* Page de garde */}
          <Section title="Page de garde (optionnelle)" icon={FileText} section="coverPage">
            <Toggle
              label="Activer la page de garde"
              checked={config.coverPage.enabled}
              onChange={(e) => setConfig({
                ...config,
                coverPage: { ...config.coverPage, enabled: e.target.checked }
              })}
            />
            
            {config.coverPage.enabled && (
              <div className="space-y-6 pl-5 border-l-2 border-border/30 mt-2">
                <div className="space-y-4">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Logo entreprise
                  </p>
                  <Toggle
                    label="Afficher"
                    checked={config.coverPage.showCompanyLogo}
                    onChange={(e) => setConfig({
                      ...config,
                      coverPage: { ...config.coverPage, showCompanyLogo: e.target.checked }
                    })}
                  />
                  {config.coverPage.showCompanyLogo && (
                    <>
                      <Select
                        label="Position"
                        value={config.coverPage.companyLogoPosition}
                        onChange={(e) => setConfig({
                          ...config,
                          coverPage: { ...config.coverPage, companyLogoPosition: e.target.value }
                        })}
                        options={[
                          { value: "top-left", label: "Haut gauche" },
                          { value: "top-right", label: "Haut droite" },
                          { value: "center", label: "Centre" },
                        ]}
                      />
                      <Select
                        label="Taille"
                        value={config.coverPage.companyLogoSize}
                        onChange={(e) => setConfig({
                          ...config,
                          coverPage: { ...config.coverPage, companyLogoSize: e.target.value }
                        })}
                        options={[
                          { value: "small", label: "Petit" },
                          { value: "medium", label: "Moyen" },
                          { value: "large", label: "Grand" },
                        ]}
                      />
                    </>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-border/30">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Logo client
                  </p>
                  <Toggle
                    label="Afficher"
                    checked={config.coverPage.showClientLogo}
                    onChange={(e) => setConfig({
                      ...config,
                      coverPage: { ...config.coverPage, showClientLogo: e.target.checked }
                    })}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-border/30">
                  <Toggle
                    label="Afficher photo de projet"
                    checked={config.coverPage.showProjectPhoto}
                    onChange={(e) => setConfig({
                      ...config,
                      coverPage: { ...config.coverPage, showProjectPhoto: e.target.checked }
                    })}
                  />
                  
                  <Toggle
                    label="Afficher résumé"
                    checked={config.coverPage.showSummary}
                    onChange={(e) => setConfig({
                      ...config,
                      coverPage: { ...config.coverPage, showSummary: e.target.checked }
                    })}
                  />
                  
                  <Toggle
                    label="Afficher participants"
                    checked={config.coverPage.showParticipants}
                    onChange={(e) => setConfig({
                      ...config,
                      coverPage: { ...config.coverPage, showParticipants: e.target.checked }
                    })}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Informations projet */}
          <Section title="Informations projet supplémentaires" icon={Layout} section="projectInfo">
            <p className="text-xs text-muted-foreground mb-4">
              Champs additionnels à afficher
            </p>
            <div className="space-y-3">
              <Toggle
                label="Localisation"
                checked={config.projectInfo.showLocation}
                onChange={(e) => setConfig({
                  ...config,
                  projectInfo: { ...config.projectInfo, showLocation: e.target.checked }
                })}
              />
              
              <Toggle
                label="Nom du client"
                checked={config.projectInfo.showClientName}
                onChange={(e) => setConfig({
                  ...config,
                  projectInfo: { ...config.projectInfo, showClientName: e.target.checked }
                })}
              />
              
              <Toggle
                label="Numéro de projet"
                checked={config.projectInfo.showProjectNumber}
                onChange={(e) => setConfig({
                  ...config,
                  projectInfo: { ...config.projectInfo, showProjectNumber: e.target.checked }
                })}
              />
              
              <Toggle
                label="Entrepreneur"
                checked={config.projectInfo.showContractor}
                onChange={(e) => setConfig({
                  ...config,
                  projectInfo: { ...config.projectInfo, showContractor: e.target.checked }
                })}
              />
              
              <Toggle
                label="Architecte"
                checked={config.projectInfo.showArchitect}
                onChange={(e) => setConfig({
                  ...config,
                  projectInfo: { ...config.projectInfo, showArchitect: e.target.checked }
                })}
              />
              
              <Toggle
                label="Phase du projet"
                checked={config.projectInfo.showPhase}
                onChange={(e) => setConfig({
                  ...config,
                  projectInfo: { ...config.projectInfo, showPhase: e.target.checked }
                })}
              />
            </div>
          </Section>

          {/* Galerie photos */}
          <Section title="Galerie photos supplémentaire" icon={Grid} section="photoGallery">
            <Toggle
              label="Activer la galerie"
              checked={config.photoGallery.enabled}
              onChange={(e) => setConfig({
                ...config,
                photoGallery: { ...config.photoGallery, enabled: e.target.checked }
              })}
            />
            
            {config.photoGallery.enabled && (
              <div className="space-y-5 pl-5 border-l-2 border-border/30 mt-2">
                <Select
                  label="Disposition"
                  value={config.photoGallery.layout}
                  onChange={(e) => setConfig({
                    ...config,
                    photoGallery: { ...config.photoGallery, layout: e.target.value }
                  })}
                  options={[
                    { value: "grid", label: "Grille" },
                    { value: "masonry", label: "Mosaïque" },
                    { value: "list", label: "Liste" },
                  ]}
                />
                
                <Select
                  label="Photos par ligne"
                  value={config.photoGallery.photosPerRow}
                  onChange={(e) => setConfig({
                    ...config,
                    photoGallery: { ...config.photoGallery, photosPerRow: parseInt(e.target.value) }
                  })}
                  options={[
                    { value: "2", label: "2" },
                    { value: "3", label: "3" },
                    { value: "4", label: "4" },
                    { value: "6", label: "6" },
                  ]}
                />
                
                <Toggle
                  label="Afficher les légendes"
                  checked={config.photoGallery.showCaptions}
                  onChange={(e) => setConfig({
                    ...config,
                    photoGallery: { ...config.photoGallery, showCaptions: e.target.checked }
                  })}
                />
              </div>
            )}
          </Section>

          {/* Participants */}
          <Section title="Section participants" icon={Users} section="participants">
            <Toggle
              label="Activer la section"
              checked={config.participants.enabled}
              onChange={(e) => setConfig({
                ...config,
                participants: { ...config.participants, enabled: e.target.checked }
              })}
            />
            
            {config.participants.enabled && (
              <div className="space-y-5 pl-5 border-l-2 border-border/30 mt-2">
                <Select
                  label="Disposition"
                  value={config.participants.layout}
                  onChange={(e) => setConfig({
                    ...config,
                    participants: { ...config.participants, layout: e.target.value }
                  })}
                  options={[
                    { value: "list", label: "Liste" },
                    { value: "grid", label: "Grille" },
                    { value: "table", label: "Tableau" },
                  ]}
                />
                
                <Toggle
                  label="Afficher les rôles"
                  checked={config.participants.showRoles}
                  onChange={(e) => setConfig({
                    ...config,
                    participants: { ...config.participants, showRoles: e.target.checked }
                  })}
                />
                
                <Toggle
                  label="Afficher les contacts"
                  checked={config.participants.showContact}
                  onChange={(e) => setConfig({
                    ...config,
                    participants: { ...config.participants, showContact: e.target.checked }
                  })}
                />
              </div>
            )}
          </Section>

          {/* Signatures */}
          <Section title="Section signatures" icon={FileText} section="signatures">
            <Toggle
              label="Activer les signatures"
              checked={config.signatures.enabled}
              onChange={(e) => setConfig({
                ...config,
                signatures: { ...config.signatures, enabled: e.target.checked }
              })}
            />
            
            {config.signatures.enabled && (
              <div className="space-y-5 pl-5 border-l-2 border-border/30 mt-2">
                <Select
                  label="Disposition"
                  value={config.signatures.layout}
                  onChange={(e) => setConfig({
                    ...config,
                    signatures: { ...config.signatures, layout: e.target.value }
                  })}
                  options={[
                    { value: "horizontal", label: "Horizontale" },
                    { value: "vertical", label: "Verticale" },
                  ]}
                />
                
                <div className="space-y-3">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Champs de signature
                  </p>
                  {config.signatures.fields.map((field, index) => (
                    <Toggle
                      key={index}
                      label={field.label}
                      checked={field.enabled}
                      onChange={(e) => {
                        const newFields = [...config.signatures.fields]
                        newFields[index].enabled = e.target.checked
                        setConfig({
                          ...config,
                          signatures: { ...config.signatures, fields: newFields }
                        })
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Pied de page */}
          <Section title="Pied de page" icon={AlignLeft} section="footer">
            <Toggle
              label="Activer le pied de page"
              checked={config.footer.enabled}
              onChange={(e) => setConfig({
                ...config,
                footer: { ...config.footer, enabled: e.target.checked }
              })}
            />
            
            {config.footer.enabled && (
              <div className="space-y-5 pl-5 border-l-2 border-border/30 mt-2">
                <Toggle
                  label="Numéros de page"
                  checked={config.footer.showPageNumbers}
                  onChange={(e) => setConfig({
                    ...config,
                    footer: { ...config.footer, showPageNumbers: e.target.checked }
                  })}
                />
                
                <Toggle
                  label="Informations projet"
                  checked={config.footer.showProjectInfo}
                  onChange={(e) => setConfig({
                    ...config,
                    footer: { ...config.footer, showProjectInfo: e.target.checked }
                  })}
                />
                
                <Toggle
                  label="Informations entreprise"
                  checked={config.footer.showCompanyInfo}
                  onChange={(e) => setConfig({
                    ...config,
                    footer: { ...config.footer, showCompanyInfo: e.target.checked }
                  })}
                />
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Texte personnalisé
                  </label>
                  <textarea
                    value={config.footer.customText}
                    onChange={(e) => {
                      e.stopPropagation()
                      setConfig({
                        ...config,
                        footer: { ...config.footer, customText: e.target.value }
                      })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.stopPropagation()
                    }}
                    placeholder="Ex: Confidentiel - Document propriétaire"
                    rows={2}
                    className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Custom Sections */}
          {config.customSections.map((customSection, index) => (
            <Section 
              key={customSection.id} 
              title={customSection.title} 
              icon={FileText} 
              section={`custom-${customSection.id}`}
            >
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Titre de la section
                  </label>
                  <input
                    type="text"
                    value={customSection.title}
                    onChange={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const newSections = [...config.customSections]
                      newSections[index].title = e.target.value
                      setConfig({ ...config, customSections: newSections })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault()
                    }}
                    className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                
                <Select
                  label="Type de contenu"
                  value={customSection.type}
                  onChange={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const newSections = [...config.customSections]
                    newSections[index].type = e.target.value
                    setConfig({ ...config, customSections: newSections })
                  }}
                  options={[
                    { value: "text", label: "Texte libre" },
                    { value: "list", label: "Liste à puces" },
                    { value: "table", label: "Tableau" },
                    { value: "photos", label: "Galerie photos" },
                  ]}
                />
                
                <Toggle
                  label="Activer cette section"
                  checked={customSection.enabled}
                  onChange={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const newSections = [...config.customSections]
                    newSections[index].enabled = e.target.checked
                    setConfig({ ...config, customSections: newSections })
                  }}
                />
                
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setConfig({
                      ...config,
                      customSections: config.customSections.filter((_, i) => i !== index)
                    })
                  }}
                  className="w-full px-4 py-2.5 border border-red-200 bg-red-50 rounded-lg text-sm font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer cette section
                </button>
              </div>
            </Section>
          ))}

          {/* Actions */}
          <div className="p-5 space-y-3 bg-secondary/10 border-t border-border/30">
            <button
              onClick={addCustomSection}
              className="w-full px-4 py-2.5 border-2 border-dashed border-border/50 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter une section personnalisée
            </button>
            
            <button 
              onClick={saveTemplate}
              disabled={isSaving}
              className={clsx(
                "w-full py-3 rounded-xl font-bold text-sm shadow-lg transition-all uppercase tracking-wide flex items-center justify-center gap-2",
                isSaving && "opacity-50 cursor-not-allowed",
                saveStatus === 'success' && "bg-green-600 hover:bg-green-700 text-white",
                saveStatus === 'error' && "bg-red-600 hover:bg-red-700 text-white",
                !saveStatus && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sauvegarde...
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Template sauvegardé !
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Erreur de sauvegarde
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Sauvegarder le template
                </>
              )}
            </button>
            
            {saveStatus === 'success' && (
              <p className="text-xs text-center text-green-600 font-medium">
                Votre template a été sauvegardé avec succès
              </p>
            )}
            {saveStatus === 'error' && (
              <p className="text-xs text-center text-red-600 font-medium">
                Une erreur est survenue lors de la sauvegarde
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* ZONE DE PREVIEW */}
      <main className="flex-1 overflow-y-auto bg-slate-100 p-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Preview Toolbar */}
          <div className="bg-white rounded-lg shadow-sm border border-border/50 p-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Aperçu du PDF</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Les modifications sont appliquées en temps réel</span>
            </div>
          </div>

          {/* PDF Preview */}
          <div className="space-y-6">
            {/* COVER PAGE (if enabled) */}
            {config.coverPage.enabled && (
              <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-slate-300">
                <div className="w-full aspect-[210/297] p-12 bg-white flex flex-col" style={{ fontFamily: config.fontFamily }}>
                  
                  {/* Logos */}
                  <div className="flex justify-between items-start mb-12">
                    {config.coverPage.showCompanyLogo && (
                      <div 
                        className={`bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center ${
                          config.coverPage.companyLogoSize === 'small' ? 'w-20 h-14' :
                          config.coverPage.companyLogoSize === 'medium' ? 'w-28 h-20' : 'w-36 h-24'
                        }`}
                      >
                        <span className="text-xs text-slate-400">Logo</span>
                      </div>
                    )}
                    {config.coverPage.showClientLogo && (
                      <div 
                        className={`bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center ${
                          config.coverPage.clientLogoSize === 'small' ? 'w-20 h-14' :
                          config.coverPage.clientLogoSize === 'medium' ? 'w-28 h-20' : 'w-36 h-24'
                        }`}
                      >
                        <span className="text-xs text-slate-400">Client</span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div className="border-l-8 pl-8 mb-12" style={{ borderColor: config.primaryColor }}>
                    <h1 
                      className="text-5xl font-black mb-4 tracking-tight uppercase leading-tight"
                      style={{ color: config.primaryColor }}
                    >
                      {config.reportTitle}
                    </h1>
                    <p className="text-2xl text-slate-500 font-light">
                      Projet Example - Nice, France
                    </p>
                  </div>

                  {/* Project Photo */}
                  {config.coverPage.showProjectPhoto && (
                    <div className="flex justify-center mb-10">
                      <div 
                        className={`bg-slate-100 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center ${
                          config.coverPage.projectPhotoSize === 'small' ? 'w-64 h-48' :
                          config.coverPage.projectPhotoSize === 'medium' ? 'w-2/3 h-64' :
                          config.coverPage.projectPhotoSize === 'large' ? 'w-4/5 h-80' : 'w-full h-96'
                        }`}
                      >
                        <div className="text-center">
                          <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                          <p className="text-sm text-slate-400 font-medium">Photo de couverture</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary on cover */}
                  {config.coverPage.showSummary && (
                    <div className="bg-slate-50 p-6 rounded-2xl border-l-4 mb-8" style={{ borderLeftColor: config.primaryColor }}>
                      <h4 className="text-xs font-black uppercase mb-3 tracking-wider" style={{ color: config.primaryColor }}>
                        Résumé Exécutif
                      </h4>
                      <p className="text-slate-700 leading-relaxed text-sm italic">
                        "Le projet progresse conformément au planning. Les travaux de fondation sont achevés."
                      </p>
                    </div>
                  )}

                  {/* Participants on cover */}
                  {config.coverPage.showParticipants && (
                    <div className="mt-auto">
                      <h4 className="text-xs font-black uppercase mb-4 tracking-wider text-slate-400">
                        Équipe Projet
                      </h4>
                      <div className={config.coverPage.participantsLayout === 'grid' ? 'grid grid-cols-2 gap-6' : 'space-y-3'}>
                        {["Architecte", "Chef de projet", "Ingénieur", "Client"].map((role) => (
                          <div key={role} className="border-b border-slate-200 pb-3">
                            <p className="text-sm font-bold text-slate-800">{role}</p>
                            <p className="text-xs text-slate-500">Nom du participant</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-auto pt-6 border-t flex justify-between text-xs text-slate-400 font-medium">
                    <span>Client Example</span>
                    <span>Page 01</span>
                  </div>
                </div>
              </div>
            )}

            {/* MAIN REPORT PAGE */}
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-slate-300">
              <div className="w-full aspect-[210/297] p-12 bg-white overflow-auto" style={{ fontFamily: config.fontFamily }}>
                
                {/* === HEADER === */}
                {(config.header.showOrganizationName || config.header.showProjectName || config.header.showDate) && (
                  <div className="flex justify-between items-start mb-8 pb-4 border-b" style={{ borderColor: config.primaryColor + '20' }}>
                    <div>
                      {config.header.showOrganizationName && (
                        <div className="text-lg font-bold mb-1" style={{ color: config.primaryColor }}>
                          Votre Organisation
                        </div>
                      )}
                      {config.header.showProjectName && (
                        <div className="text-base text-slate-700">
                          Projet Example
                        </div>
                      )}
                    </div>
                    {config.header.showDate && (
                      <div className="text-sm text-slate-600">
                        {new Date().toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                )}

                {/* === SUMMARY BOX === */}
                {config.summary.enabled && (
                  <div 
                    className="p-6 rounded-lg mb-8"
                    style={{ backgroundColor: config.summary.backgroundColor }}
                  >
                    <div className="text-base font-bold mb-4" style={{ color: config.primaryColor }}>
                      {config.reportTitle}
                    </div>

                    <div className="grid grid-cols-2 gap-6 text-sm">
                      {config.summary.showPeriod && (
                        <div>
                          <div className="text-xs font-bold text-slate-600 mb-2">Période</div>
                          <div className="text-slate-800">01/01/2026 - 01/02/2026</div>
                        </div>
                      )}

                      <div className="flex gap-6">
                        {config.summary.showTotalCount && (
                          <div>
                            <div className="text-xs font-bold text-slate-600">Total</div>
                            <div className="text-base font-bold mt-1">15</div>
                          </div>
                        )}
                        {config.summary.showOverdueCount && (
                          <div>
                            <div className="text-xs font-bold text-slate-600">En retard</div>
                            <div className="text-base font-bold mt-1 text-red-600">3</div>
                          </div>
                        )}
                        {config.summary.showPlanCount && (
                          <div>
                            <div className="text-xs font-bold text-slate-600">Plans</div>
                            <div className="text-base font-bold mt-1">5</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {config.summary.showStatusBreakdown && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="text-xs font-bold text-slate-600 mb-2">Par statut</div>
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: '#22c55e' }}>
                            Terminé (5)
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: '#eab308' }}>
                            En cours (7)
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: '#ef4444' }}>
                            Bloqué (3)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* === TASKS PREVIEW === */}
                <div className="space-y-6">
                  {config.tasks.displayMode === 'list' ? (
                    // LIST VIEW
                    <>
                      {[1, 2].map((taskNum) => (
                        <div key={taskNum} className="border-l-4 pl-4" style={{ borderColor: config.primaryColor }}>
                          <div className="flex gap-6">
                            {/* Left column - Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {config.listView.showIndex && (
                                  <span className="text-base font-bold" style={{ color: config.primaryColor }}>
                                    {taskNum}.
                                  </span>
                                )}
                                <span className="text-base font-bold text-slate-800">
                                  Tâche d'exemple {taskNum}
                                </span>
                              </div>

                              {(config.listView.showCategoryIcon || config.listView.showStatusPill) && (
                                <div className="flex gap-2 mb-3">
                                  {config.listView.showCategoryIcon && (
                                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: config.primaryColor }}></div>
                                  )}
                                  {config.listView.showStatusPill && (
                                    <span className="px-2 py-1 rounded-full text-xs text-white bg-green-600">
                                      Terminé
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="space-y-1.5 text-sm">
                                {config.fields.category && (
                                  <div className="flex gap-2">
                                    <span className="font-bold text-slate-600 w-32">Catégorie:</span>
                                    <span className="text-slate-800">Structure</span>
                                  </div>
                                )}
                                {config.fields.createdBy && (
                                  <div className="flex gap-2">
                                    <span className="font-bold text-slate-600 w-32">Créé par:</span>
                                    <span className="text-slate-800">Jean Dupont</span>
                                  </div>
                                )}
                                {config.fields.assignedTo && (
                                  <div className="flex gap-2">
                                    <span className="font-bold text-slate-600 w-32">Assigné à:</span>
                                    <span className="text-slate-800">Marie Martin</span>
                                  </div>
                                )}
                                {config.fields.dueDate && (
                                  <div className="flex gap-2">
                                    <span className="font-bold text-slate-600 w-32">Échéance:</span>
                                    <span className="text-slate-800">15/02/2026</span>
                                  </div>
                                )}
                                {config.fields.description && (
                                  <div className="flex gap-2">
                                    <span className="font-bold text-slate-600 w-32">Description:</span>
                                    <span className="text-slate-800">Vérifier la conformité des travaux</span>
                                  </div>
                                )}
                                {config.fields.plan && (
                                  <div className="flex gap-2">
                                    <span className="font-bold text-slate-600 w-32">Plan:</span>
                                    <span className="text-slate-800">RDC - Plan 01</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right column - Images */}
                            {config.fields.snapshot && (
                              <div className="flex-shrink-0">
                                <div 
                                  className="bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs"
                                  style={{ 
                                    width: config.listView.snapshotSize === 'small' ? '120px' :
                                           config.listView.snapshotSize === 'medium' ? '160px' : '200px',
                                    height: config.listView.snapshotSize === 'small' ? '120px' :
                                            config.listView.snapshotSize === 'medium' ? '160px' : '200px',
                                    border: config.listView.snapshotBorder ? `${config.listView.snapshotBorderWidth}px solid ${config.primaryColor}` : 'none'
                                  }}
                                >
                                  Snapshot
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Photos grid */}
                          {config.fields.photos && (
                            <div className="mt-4">
                              <div className="text-xs font-bold text-slate-600 mb-2">Médias</div>
                              <div className={`grid gap-2 ${
                                config.listView.photoLayout === 'grid' ? 'grid-cols-3' :
                                config.listView.photoLayout === 'vertical' ? 'grid-cols-1' : 'grid-cols-4'
                              }`}>
                                {[1, 2, 3].map(i => (
                                  <div key={i} className="aspect-square bg-slate-200 rounded flex items-center justify-center text-xs text-slate-400">
                                    Photo {i}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {config.listView.showDividers && taskNum === 1 && (
                            <div className="h-px bg-slate-300 mt-6"></div>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    // TABLE VIEW
                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 p-2 text-xs font-bold" style={{ backgroundColor: config.tableView.headerBackgroundColor || '#f5f5f4' }}>
                        {config.tableView.showIndex && <div className="col-span-1">#</div>}
                        <div className={config.tableView.showIndex ? 'col-span-3' : 'col-span-4'}>Tâche</div>
                        <div className="col-span-2">ID</div>
                        {config.fields.category && <div className="col-span-2">Catégorie</div>}
                        {config.fields.status && <div className="col-span-2">Statut</div>}
                        {config.fields.assignedTo && <div className="col-span-2">Assigné</div>}
                      </div>

                      {/* Table Rows */}
                      {[1, 2].map((taskNum, idx) => (
                        <div 
                          key={taskNum} 
                          className={`grid grid-cols-12 gap-2 p-2 text-xs border-t border-slate-200 ${
                            config.tableView.alternateRowColors && idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                          }`}
                        >
                          {config.tableView.showIndex && (
                            <div className="col-span-1 flex items-center justify-center font-bold">
                              {taskNum}
                            </div>
                          )}
                          <div className={`${config.tableView.showIndex ? 'col-span-3' : 'col-span-4'} space-y-1`}>
                            <div className="font-bold">Tâche {taskNum}</div>
                            {config.tableView.showPhotosInline && config.fields.photos && (
                              <div 
                                className="bg-slate-200 rounded flex items-center justify-center text-slate-400"
                                style={{ 
                                  width: config.tableView.photoSize === 'small' ? '60px' :
                                         config.tableView.photoSize === 'medium' ? '80px' : '100px',
                                  height: config.tableView.photoSize === 'small' ? '60px' :
                                          config.tableView.photoSize === 'medium' ? '80px' : '100px',
                                }}
                              >
                                📷
                              </div>
                            )}
                          </div>
                          <div className="col-span-2 flex items-start">PR-{taskNum}</div>
                          {config.fields.category && (
                            <div className="col-span-2 flex items-start">Structure</div>
                          )}
                          {config.fields.status && (
                            <div className="col-span-2 flex items-start">
                              <span className="px-2 py-1 rounded-full text-xs text-white bg-green-600">
                                OK
                              </span>
                            </div>
                          )}
                          {config.fields.assignedTo && (
                            <div className="col-span-2 flex items-start">J. Dupont</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* === PHOTO GALLERY (if enabled) === */}
                {config.photoGallery.enabled && (
                  <div className="mt-12 pt-8 border-t" style={{ borderColor: config.primaryColor + '20' }}>
                    <h3 className="text-lg font-bold mb-6" style={{ color: config.primaryColor }}>
                      {config.photoGallery.title}
                    </h3>
                    <div className={`grid gap-4 ${
                      config.photoGallery.photosPerRow === 2 ? 'grid-cols-2' :
                      config.photoGallery.photosPerRow === 3 ? 'grid-cols-3' :
                      config.photoGallery.photosPerRow === 4 ? 'grid-cols-4' : 'grid-cols-6'
                    }`}>
                      {Array.from({ length: Math.min(config.photoGallery.photosPerRow * 2, 12) }).map((_, i) => (
                        <div key={i} className="space-y-2">
                          <div className="aspect-video bg-slate-200 rounded flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                          </div>
                          {config.photoGallery.showCaptions && (
                            <p className="text-xs text-slate-600">Photo {i + 1}</p>
                          )}
                          {config.photoGallery.showMetadata && (
                            <p className="text-[10px] text-slate-400">01/02/2026 • 14:30</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === PARTICIPANTS SECTION (if enabled) === */}
                {config.participants.enabled && (
                  <div className="mt-12 pt-8 border-t" style={{ borderColor: config.primaryColor + '20' }}>
                    <h3 className="text-lg font-bold mb-6" style={{ color: config.primaryColor }}>
                      {config.participants.title}
                    </h3>
                    <div className={
                      config.participants.layout === 'grid' ? 'grid grid-cols-2 gap-6' :
                      config.participants.layout === 'table' ? 'space-y-0' : 'space-y-4'
                    }>
                      {["Architecte principal", "Chef de projet", "Ingénieur structure", "Client"].map((role, idx) => (
                        <div key={role} className={
                          config.participants.layout === 'table' 
                            ? 'flex justify-between border-b border-slate-200 py-3' 
                            : 'border-b border-slate-200 pb-3'
                        }>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{role}</p>
                            {config.participants.showRoles && (
                              <p className="text-xs text-slate-500 mt-1">Nom du participant</p>
                            )}
                            {config.participants.showContact && (
                              <p className="text-xs text-slate-500 mt-1">contact@example.com</p>
                            )}
                            {config.participants.showCompany && (
                              <p className="text-xs text-slate-500 mt-1">Entreprise Example</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === SIGNATURES (if enabled) === */}
                {config.signatures.enabled && (
                  <div className="mt-12 pt-8 border-t" style={{ borderColor: config.primaryColor + '20' }}>
                    <h3 className="text-lg font-bold mb-6" style={{ color: config.primaryColor }}>
                      {config.signatures.title}
                    </h3>
                    <div className={
                      config.signatures.layout === 'horizontal' 
                        ? 'grid grid-cols-3 gap-8' 
                        : 'space-y-8'
                    }>
                      {config.signatures.fields.filter(f => f.enabled).map((field) => (
                        <div key={field.label} className="space-y-4">
                          <div className="text-sm font-bold text-slate-700">{field.label}</div>
                          <div className="border-b-2 border-slate-300 h-16"></div>
                          <div className="text-xs text-slate-500">Date: ___________</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === CUSTOM SECTIONS === */}
                {config.customSections.filter(s => s.enabled).map((section) => (
                  <div key={section.id} className="mt-12 pt-8 border-t" style={{ borderColor: config.primaryColor + '20' }}>
                    <h3 className="text-lg font-bold mb-6" style={{ color: config.primaryColor }}>
                      {section.title}
                    </h3>
                    <div className="text-sm text-slate-600 italic">
                      Contenu de type: {
                        section.type === 'text' ? 'Texte libre' :
                        section.type === 'list' ? 'Liste à puces' :
                        section.type === 'table' ? 'Tableau' : 'Galerie photos'
                      }
                    </div>
                  </div>
                ))}

                {/* Footer preview */}
                {config.footer.enabled && (
                  <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between text-xs text-slate-500">
                    <div>
                      {config.footer.showProjectInfo && <span>Projet Example</span>}
                      {config.footer.showCompanyInfo && <span className="ml-4">Votre Organisation</span>}
                      {config.footer.customText && <span className="ml-4">{config.footer.customText}</span>}
                    </div>
                    {config.footer.showPageNumbers && <span>Page 1</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm mb-1">
                  Comment appliquer ce template ?
                </h4>
                <p className="text-xs text-blue-700">
                  Une fois sauvegardé, ce template sera automatiquement appliqué lors de la génération de vos prochains rapports PDF. Les modifications sont appliquées en temps réel dans l'aperçu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}