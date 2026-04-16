'use client'

import React, { useState } from "react"
import {
  Layout, Settings, FileText, Eye,
  Users, AlignLeft, Plus, Trash2, Download,
  ChevronDown, ChevronRight, List, Table, Grid,
  Image as ImageIcon, Map,
} from "lucide-react"
import clsx from "clsx"

const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&family=Outfit:wght@300;400;700;900&family=Roboto:wght@300;400;700;900&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;700;900&family=Poppins:wght@300;400;700;900&family=Raleway:wght@300;400;700;900&family=Open+Sans:wght@300;400;700&family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;700&display=swap"

const webFontMap = {
  helvetica:  'Arial, sans-serif',
  times:      '"Times New Roman", serif',
  courier:    '"Courier New", monospace',
  inter:      '"Inter", sans-serif',
  outfit:     '"Outfit", sans-serif',
  roboto:     '"Roboto", sans-serif',
  lato:       '"Lato", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  poppins:    '"Poppins", sans-serif',
  raleway:    '"Raleway", sans-serif',
  opensans:   '"Open Sans", sans-serif',
  playfair:   '"Playfair Display", serif',
  dmsans:     '"DM Sans", sans-serif',
}

const fontOptions = [
  { value: "inter",      label: "Inter" },
  { value: "outfit",     label: "Outfit" },
  { value: "roboto",     label: "Roboto" },
  { value: "lato",       label: "Lato" },
  { value: "montserrat", label: "Montserrat" },
  { value: "poppins",    label: "Poppins" },
  { value: "raleway",    label: "Raleway" },
  { value: "opensans",   label: "Open Sans" },
  { value: "dmsans",     label: "DM Sans" },
  { value: "playfair",   label: "Playfair Display" },
  { value: "helvetica",  label: "Helvetica" },
  { value: "times",      label: "Times New Roman" },
  { value: "courier",    label: "Courier" },
]

const DEFAULT_SECTION_ORDER = ['summary', 'planOverviews', 'participants', 'signatures', 'tasks', 'customSections']

const SECTION_LABELS = {
  summary:        { label: 'Résumé',                  icon: '📊' },
  planOverviews:  { label: 'Aperçus des plans',        icon: '🗺️' },
  participants:   { label: 'Participants',             icon: '👥' },
  signatures:     { label: 'Signatures',              icon: '✍️' },
  tasks:          { label: 'Tâches',                  icon: '📋' },
  customSections: { label: 'Sections personnalisées', icon: '📝' },
}

// ── Sub-components at module level ────────────────────────────────────────────

const Section = ({ title, icon: Icon, section, expandedSections, toggleSection, children }) => (
  <div className="border-b border-border/30">
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-5 hover:bg-secondary/20 transition-all text-left group"
    >
      <div className="flex items-center gap-3">
        <div className={clsx("p-2 rounded-lg transition-all", expandedSections[section] ? "bg-primary/10" : "bg-secondary/30 group-hover:bg-secondary/50")}>
          <Icon className={clsx("w-4 h-4 transition-colors", expandedSections[section] ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
        </div>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      {expandedSections[section]
        ? <ChevronDown className="w-5 h-5 text-primary" />
        : <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />}
    </button>
    {expandedSections[section] && (
      <div className="px-5 pb-6 pt-2 space-y-4 bg-secondary/5">{children}</div>
    )}
  </div>
)

const Toggle = ({ label, checked, onChange }) => {
  const handleChange = (e) => {
    const aside = e.currentTarget.closest('aside')
    const scrollTop = aside?.scrollTop ?? 0
    onChange(e)
    requestAnimationFrame(() => {
      if (aside) aside.scrollTop = scrollTop
    })
  }

  return (
    <label
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center justify-between cursor-pointer group py-2 px-3 rounded-lg hover:bg-secondary/30 transition-all"
    >
      <span className="text-sm text-foreground font-medium">{label}</span>
      <div className="relative flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={handleChange} className="sr-only peer" />
        <div className={clsx("w-11 h-6 rounded-full transition-all", checked ? "bg-primary" : "bg-secondary/50")}>
          <div className={clsx("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm", checked && "translate-x-5")} />
        </div>
      </div>
    </label>
  )
}

const SelectField = ({ label, value, onChange, options }) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
    <select
      value={value}
      onChange={(e) => { e.stopPropagation(); onChange(e) }}
      className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
)

const SectionOrderItem = ({ id, label, icon, index, total, onMoveUp, onMoveDown }) => (
  <div className="flex items-center gap-3 bg-white border border-border/50 rounded-lg px-3 py-2.5 group">
    <span className="text-base">{icon}</span>
    <span className="text-sm font-medium text-foreground flex-1">{label}</span>
    <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveUp(index) }} disabled={index === 0} className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-bold">▲</button>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveDown(index) }} disabled={index === total - 1} className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-bold">▼</button>
    </div>
  </div>
)

const CoverTitlePreview = ({ config }) => {
  const cp           = config.coverPage || {}
  const titleStyle   = cp.titleStyle ?? 'bold'
  const titleSize    = cp.titleSize ?? 'large'
  const titleAlign   = cp.titleAlign ?? 'left'
  const titleSpacing = cp.titleLetterSpacing ?? 'normal'
  const showBar      = cp.titleAccentBar ?? true
  const titleColor   = (cp.titleColor ?? 'primary') === 'custom' ? (cp.titleCustomColor ?? '#000000') : config.primaryColor
  const fontFamily   = webFontMap[config.fontFamily] || 'Arial, sans-serif'
  const fontSizeMap  = { small: '1.75rem', medium: '2.75rem', large: '3.75rem' }
  const subSizeMap   = { small: '0.875rem', medium: '1.125rem', large: '1.375rem' }
  const spacingMap   = { tight: '-0.04em', normal: '0', wide: '0.1em' }
  const fontSize     = fontSizeMap[titleSize]
  const subSize      = subSizeMap[titleSize]
  const spacing      = spacingMap[titleSpacing]
  const justify      = titleAlign === 'center' ? 'center' : titleAlign === 'right' ? 'flex-end' : 'flex-start'
  const barStyle     = showBar
    ? titleAlign === 'center' ? { borderTop: `4px solid ${titleColor}`, paddingTop: '1rem' }
    : titleAlign === 'right'  ? { borderRight: `8px solid ${titleColor}`, paddingRight: '2rem' }
    :                           { borderLeft: `8px solid ${titleColor}`, paddingLeft: '2rem' }
    : {}
  const words     = (config.reportTitle || 'RAPPORT DE TÂCHES').split(' ')
  const boldPart  = words.slice(0, 2).join(' ')
  const lightPart = words.slice(2).join(' ') || 'DE VISITE'
  return (
    <div style={{ ...barStyle, marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: justify, textAlign: titleAlign, fontFamily }}>
      {titleStyle === 'bold' && (<>
        <div style={{ fontSize, fontWeight: 900, color: titleColor, letterSpacing: spacing, textTransform: 'uppercase', lineHeight: 1.1, marginBottom: '0.5rem' }}>{config.reportTitle}</div>
        <div style={{ fontSize: subSize, color: '#78716c', fontWeight: 300 }}>Projet Example — Casablanca</div>
      </>)}
      {titleStyle === 'light' && (<>
        <div style={{ fontSize, fontWeight: 200, color: titleColor, letterSpacing: spacing, lineHeight: 1.1, marginBottom: '0.5rem' }}>{config.reportTitle}</div>
        <div style={{ fontSize: subSize, color: '#78716c', fontWeight: 300 }}>Projet Example — Casablanca</div>
      </>)}
      {titleStyle === 'boldlight' && (<>
        <div style={{ fontSize, fontWeight: 900, color: titleColor, letterSpacing: spacing, textTransform: 'uppercase', lineHeight: 1.1, marginBottom: '0.15rem' }}>{boldPart}</div>
        <div style={{ fontSize: `calc(${fontSize} * 0.6)`, fontWeight: 200, color: titleColor, letterSpacing: spacing, opacity: 0.75, marginBottom: '0.5rem' }}>{lightPart}</div>
        <div style={{ fontSize: subSize, color: '#78716c', fontWeight: 300 }}>Projet Example — Casablanca</div>
      </>)}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReportTemplateBuilder({ onSave, initialTemplate = null }) {
  const [isSaving, setIsSaving]     = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  const defaultConfig = {
    primaryColor:  "#44403c",
    fontFamily:    "inter",
    reportTitle:   "RAPPORT DE TÂCHES",
    sectionOrder:  [...DEFAULT_SECTION_ORDER],
    sectionTitles: {
      titleSize:      "medium",
      titleAccentBar: true,
      titleUnderline: false,
    },
    header: {
      showOrganizationName: true,
      showProjectName:      true,
      showDate:             true,
      showLogo:             false,
      logoSize:             'medium',
      showClientLogo:       false,
      clientLogoSize:       'medium',
      layout:               "horizontal",
    },
    summary: {
      enabled:             true,
      showPeriod:          true,
      showTotalCount:      true,
      showOverdueCount:    true,
      showPlanCount:       true,
      showStatusBreakdown: true,
      backgroundColor:     "#f5f5f4",
    },
    planOverviews: {
      enabled:      false,
      title:        "Aperçus des plans",
      showPinCount: true,
      showLegend:   true,
    },
    tasks: {
      displayMode:            "list",
      groupBy:                "none",
      sortBy:                 "created_at",
      title:                  "Tâches",
      photosPerRow:           3,
      galleryShowName:        true,
      galleryShowDescription: false,
      galleryShowStatus:      true,
    },
    fields: {
      description: true,
      photos:      true,
      snapshot:    true,
      assignedTo:  true,
      dueDate:     true,
      category:    true,
      status:      true,
      createdBy:   true,
      plan:        true,
    },
    listView: {
      showIndex:           true,
      showCategoryIcon:    true,
      showStatusPill:      true,
      photoLayout:         "grid",
      snapshotSize:        "large",
      showDividers:        true,
      snapshotBorder:      true,
      snapshotBorderWidth: 4,
    },
    tableView: {
      showIndex:             true,
      showPhotosInline:      true,
      photoSize:             "medium",
      compactMode:           false,
      alternateRowColors:    true,
      headerBackgroundColor: "#f5f5f4",
    },
    coverPage: {
      enabled:            false,
      showCompanyLogo:    true,
      companyLogoSize:    "medium",
      showClientLogo:     true,
      clientLogoSize:     "medium",
      showProjectPhoto:   true,
      projectPhotoSize:   "medium",
      showSummary:        true,
      participantsLayout: "grid",
      backgroundStyle:    "none",
      titleStyle:         "bold",
      titleSize:          "large",
      titleAlign:         "left",
      titleLetterSpacing: "normal",
      titleColor:         "primary",
      titleCustomColor:   "#000000",
      titleAccentBar:     true,
    },
    projectInfo: {
      showLocation:      true,
      showClientName:    true,
      showProjectNumber: true,
      showContractor:    false,
      showArchitect:     false,
      showPhase:         false,
    },
    photoGallery: {
      enabled:      false,
      title:        "Galerie de photos",
      layout:       "grid",
      photosPerRow: 4,
      showCaptions: true,
      showMetadata: false,
    },
    participants: {
      enabled:     false,
      title:       "Équipe projet",
      layout:      "grid",
      showRoles:   true,
      showContact: false,
      showCompany: false,
    },
    signatures: {
      enabled: false,
      title:   "Signatures",
      layout:  "horizontal",
      fields: [
        { label: "Chef de projet", enabled: true },
        { label: "Client",         enabled: true },
        { label: "Entrepreneur",   enabled: false },
      ],
    },
    footer: {
      enabled:         false,
      showPageNumbers: true,
      showProjectInfo: true,
      showCompanyInfo: false,
      customText:      "",
    },
    customSections: [],
  }

  const [config, setConfig] = useState(() => {
    if (!initialTemplate?.config) return defaultConfig
    const saved = initialTemplate.config
    return {
      ...defaultConfig,
      ...saved,
      sectionOrder:  saved.sectionOrder  || defaultConfig.sectionOrder,
      sectionTitles: { ...defaultConfig.sectionTitles, ...(saved.sectionTitles || {}) },
      header:        { ...defaultConfig.header,        ...saved.header },
      summary:       { ...defaultConfig.summary,       ...saved.summary },
      planOverviews: { ...defaultConfig.planOverviews, ...(saved.planOverviews || {}) },
      tasks:         { ...defaultConfig.tasks,         ...saved.tasks },
      fields:        { ...defaultConfig.fields,        ...saved.fields },
      listView:      { ...defaultConfig.listView,      ...saved.listView },
      tableView:     { ...defaultConfig.tableView,     ...saved.tableView },
      coverPage:     { ...defaultConfig.coverPage,     ...saved.coverPage },
      projectInfo:   { ...defaultConfig.projectInfo,   ...saved.projectInfo },
      photoGallery:  { ...defaultConfig.photoGallery,  ...saved.photoGallery },
      participants:  { ...defaultConfig.participants,  ...saved.participants },
      signatures: {
        ...defaultConfig.signatures,
        ...saved.signatures,
        fields: saved.signatures?.fields || defaultConfig.signatures.fields,
      },
      footer:         { ...defaultConfig.footer, ...saved.footer },
      customSections: saved.customSections || [],
    }
  })

  const [expandedSections, setExpandedSections] = useState(() => {
    const base = {
      header:        true,
      summary:       false,
      planOverviews: false,
      tasks:         false,
      fields:        false,
      listView:      false,
      tableView:     false,
      sectionTitles: false,
      sectionOrder:  false,
      coverPage:     false,
      projectInfo:   false,
      photoGallery:  false,
      participants:  false,
      signatures:    false,
      footer:        false,
    }
    const saved = initialTemplate?.config?.customSections || []
    saved.forEach(s => { base[`custom-${s.id}`] = false })
    return base
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const addCustomSection = () => {
    const id  = Date.now()
    const key = `custom-${id}`
    setConfig(prev => ({
      ...prev,
      customSections: [...prev.customSections, { id, title: "Nouvelle section", type: "text", enabled: true }],
    }))
    setExpandedSections(prev => ({ ...prev, [key]: true }))
  }

  const moveSection = (index, direction) => {
    const arr  = [...(config.sectionOrder || DEFAULT_SECTION_ORDER)]
    const swap = index + direction
    ;[arr[index], arr[swap]] = [arr[swap], arr[index]]
    setConfig(p => ({ ...p, sectionOrder: arr }))
  }

  const saveTemplate = async () => {
    setIsSaving(true)
    setSaveStatus(null)
    try {
      await new Promise(r => setTimeout(r, 600))
      if (onSave) onSave(config)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const logoPlaceholderStyle = (size) => ({
    width:  size === 'small' ? '44px' : size === 'large' ? '80px' : '64px',
    height: size === 'small' ? '28px' : size === 'large' ? '52px' : '40px',
  })

  const previewFont = webFontMap[config.fontFamily] || 'Arial, sans-serif'

  const sectionTitlePreviewStyle = () => ({
    fontSize:            (config.sectionTitles?.titleSize ?? 'medium') === 'small' ? '12px' : (config.sectionTitles?.titleSize ?? 'medium') === 'large' ? '18px' : '14px',
    fontWeight:          'bold',
    color:               config.primaryColor,
    borderLeft:          (config.sectionTitles?.titleAccentBar ?? true) ? `3px solid ${config.primaryColor}` : 'none',
    paddingLeft:         (config.sectionTitles?.titleAccentBar ?? true) ? '8px' : '0',
    textDecoration:      (config.sectionTitles?.titleUnderline ?? false) ? 'underline' : 'none',
    textDecorationColor: config.primaryColor,
    marginBottom:        '12px',
    fontFamily:          previewFont,
  })

  const sectionOrder = config.sectionOrder || DEFAULT_SECTION_ORDER

  const S = (props) => <Section {...props} expandedSections={expandedSections} toggleSection={toggleSection} />

  // ── Preview renderers per section ─────────────────────────────────────────
  const renderPreviewSection = (sectionId) => {
    switch (sectionId) {

      case 'summary':
        if (!config.summary.enabled) return null
        return (
          <div key="summary" className="p-5 rounded-lg" style={{ backgroundColor: config.summary.backgroundColor }}>
            <div className="text-base font-bold mb-4" style={{ color: config.primaryColor }}>{config.reportTitle}</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {config.summary.showPeriod && <div><div className="text-xs font-bold text-slate-600 mb-1">Période</div><div>01/01/2026 — 01/02/2026</div></div>}
              <div className="flex gap-4">
                {config.summary.showTotalCount   && <div><div className="text-xs font-bold text-slate-600">Total</div><div className="text-lg font-bold mt-1">15</div></div>}
                {config.summary.showOverdueCount && <div><div className="text-xs font-bold text-slate-600">En retard</div><div className="text-lg font-bold mt-1 text-red-600">3</div></div>}
                {config.summary.showPlanCount    && <div><div className="text-xs font-bold text-slate-600">Plans</div><div className="text-lg font-bold mt-1">5</div></div>}
              </div>
            </div>
            {config.summary.showStatusBreakdown && (
              <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs text-white bg-green-500">Terminé (5)</span>
                <span className="px-3 py-1 rounded-full text-xs text-white bg-yellow-500">En cours (7)</span>
                <span className="px-3 py-1 rounded-full text-xs text-white bg-red-500">Bloqué (3)</span>
              </div>
            )}
          </div>
        )

      case 'planOverviews':
        if (!config.planOverviews?.enabled) return null
        return (
          <div key="planOverviews">
            <div style={sectionTitlePreviewStyle()}>{config.planOverviews.title || 'Aperçus des plans'}</div>
            <div className="space-y-4">
              {['Plan RDC', 'Plan R+1'].map((planName, pi) => (
                <div key={planName} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Plan image placeholder with dots */}
                  <div className="relative bg-slate-100 flex items-center justify-center" style={{ height: '140px' }}>
                    {/* Grid lines to suggest a blueprint */}
                    <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                      <defs><pattern id={`grid-${pi}`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#94a3b8" strokeWidth="0.5"/></pattern></defs>
                      <rect width="100%" height="100%" fill={`url(#grid-${pi})`}/>
                    </svg>
                    <Map className="w-8 h-8 text-slate-300" />
                    {/* Mock pin dots */}
                    {[
                      { top: '30%', left: '40%', color: config.primaryColor },
                      { top: '55%', left: '65%', color: config.primaryColor },
                      { top: '70%', left: '28%', color: '#ef4444' },
                    ].map((dot, di) => (
                      <div key={di} className="absolute flex items-center justify-center rounded-full border-2 border-white shadow text-white" style={{ backgroundColor: dot.color, top: dot.top, left: dot.left, width: '18px', height: '18px', fontSize: '8px', fontWeight: 700, transform: 'translate(-50%, -50%)' }}>
                        {di + 1}
                      </div>
                    ))}
                    {/* Pin count badge */}
                    {config.planOverviews.showPinCount && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: config.primaryColor }}>
                        3 tâches
                      </span>
                    )}
                  </div>
                  {/* Plan name + legend */}
                  <div className="px-3 py-2 bg-white space-y-2">
                    <div className="text-xs font-semibold text-slate-700">{planName}</div>
                    {config.planOverviews.showLegend && (
                      <div className="grid grid-cols-2 gap-1">
                        {['Fissure cloison', 'Défaut peinture', 'Conformité porte'].map((name, li) => (
                          <div key={li} className="flex items-center gap-1.5">
                            <div className="flex items-center justify-center rounded-full text-white flex-shrink-0" style={{ backgroundColor: li === 2 ? '#ef4444' : config.primaryColor, width: '14px', height: '14px', fontSize: '7px', fontWeight: 700 }}>{li + 1}</div>
                            <span className="text-[10px] text-slate-600 truncate">{name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'participants':
        if (!config.participants.enabled) return null
        return (
          <div key="participants">
            <div style={sectionTitlePreviewStyle()}>{config.participants.title || 'Équipe projet'}</div>
            <div className={clsx(config.participants.layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-3')}>
              {["Jean Dupont", "Marie Martin", "Ahmed Alami", "Sara Client"].map((name, i) => (
                <div key={name} className="border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-sm font-medium">{name}</span></div>
                  {config.participants.showRoles && <p className="text-xs text-slate-400 ml-4">{["Chef de projet", "Architecte", "Ingénieur", "MOA"][i]}</p>}
                </div>
              ))}
            </div>
          </div>
        )

      case 'signatures':
        if (!config.signatures.enabled) return null
        return (
          <div key="signatures">
            <div style={sectionTitlePreviewStyle()}>{config.signatures.title || 'Signatures'}</div>
            <div className={config.signatures.layout === 'horizontal' ? 'grid grid-cols-3 gap-6' : 'space-y-6'}>
              {config.signatures.fields.filter(f => f.enabled).map((field) => (
                <div key={field.label}>
                  <div className="text-sm font-bold text-slate-600 mb-2">{field.label}</div>
                  <div className="border-b-2 border-slate-300 h-12 mb-1" />
                  <div className="text-xs text-slate-400">Date & Signature</div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'tasks':
        return (
          <div key="tasks">
            {config.tasks.title && <div style={sectionTitlePreviewStyle()}>{config.tasks.title}</div>}

            {config.tasks.displayMode === 'photoGallery' ? (
              <div className="space-y-5">
                {[1, 2].map((n) => (
                  <div key={n}>
                    {config.tasks.galleryShowName !== false && (
                      <div className="text-xs font-bold text-slate-600 mb-2">Tâche d'exemple {n}</div>
                    )}
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${config.tasks.photosPerRow ?? 3}, 1fr)` }}>
                      {[1, 2, 3].slice(0, config.tasks.photosPerRow ?? 3).map((p) => (
                        <div key={p} className="relative">
                          <div className="bg-slate-200 rounded aspect-square flex items-center justify-center text-slate-400 text-[10px]">Photo {p}</div>
                          {config.tasks.galleryShowStatus !== false && (
                            <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[9px] text-white bg-green-500">OK</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {config.tasks.galleryShowDescription && (
                      <p className="text-xs text-slate-500 italic mt-1">Description de la tâche {n}…</p>
                    )}
                  </div>
                ))}
              </div>
            ) : config.tasks.displayMode === 'list' ? (
              [1, 2].map((n) => (
                <div key={n} className="border-l-4 pl-4 mb-4" style={{ borderColor: config.primaryColor }}>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {config.listView.showIndex && <span className="font-bold" style={{ color: config.primaryColor }}>{n}.</span>}
                        <span className="font-bold text-slate-800">Tâche d'exemple {n}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {config.fields.category    && <div className="flex gap-2"><span className="font-bold text-slate-500 w-28">Catégorie:</span><span>Structure</span></div>}
                        {config.fields.assignedTo  && <div className="flex gap-2"><span className="font-bold text-slate-500 w-28">Assigné à:</span><span>Marie Martin</span></div>}
                        {config.fields.dueDate     && <div className="flex gap-2"><span className="font-bold text-slate-500 w-28">Échéance:</span><span>15/02/2026</span></div>}
                        {config.fields.description && <div className="flex gap-2"><span className="font-bold text-slate-500 w-28">Description:</span><span>Vérifier la conformité</span></div>}
                      </div>
                    </div>
                    {config.fields.snapshot && (
                      <div className="flex-shrink-0 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs" style={{
                        width:  config.listView.snapshotSize === 'small' ? '100px' : config.listView.snapshotSize === 'medium' ? '120px' : '140px',
                        height: config.listView.snapshotSize === 'small' ? '100px' : config.listView.snapshotSize === 'medium' ? '120px' : '140px',
                        border: config.listView.snapshotBorder ? `${config.listView.snapshotBorderWidth}px solid ${config.primaryColor}` : 'none',
                      }}>Snapshot</div>
                    )}
                  </div>
                  {config.listView.showDividers && n === 1 && <div className="h-px bg-slate-200 mt-4" />}
                </div>
              ))
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
                <div className="grid grid-cols-12 gap-2 p-2 text-xs font-bold" style={{ backgroundColor: config.tableView.headerBackgroundColor }}>
                  {config.tableView.showIndex && <div className="col-span-1">#</div>}
                  <div className={config.tableView.showIndex ? 'col-span-3' : 'col-span-4'}>Tâche</div>
                  <div className="col-span-2">ID</div>
                  {config.fields.category   && <div className="col-span-2">Catégorie</div>}
                  {config.fields.status     && <div className="col-span-2">Statut</div>}
                  {config.fields.assignedTo && <div className="col-span-2">Assigné</div>}
                </div>
                {[1, 2].map((n, idx) => (
                  <div key={n} className={clsx("grid grid-cols-12 gap-2 p-2 text-xs border-t border-slate-100", config.tableView.alternateRowColors && idx % 2 === 1 ? 'bg-slate-50' : 'bg-white')}>
                    {config.tableView.showIndex && <div className="col-span-1 font-bold">{n}</div>}
                    <div className={config.tableView.showIndex ? 'col-span-3' : 'col-span-4'}>Tâche {n}</div>
                    <div className="col-span-2">PR-{n}</div>
                    {config.fields.category   && <div className="col-span-2">Structure</div>}
                    {config.fields.status     && <div className="col-span-2"><span className="px-2 py-0.5 rounded-full text-xs text-white bg-green-500">OK</span></div>}
                    {config.fields.assignedTo && <div className="col-span-2">J. Dupont</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'customSections':
        if (config.customSections.filter(s => s.enabled).length === 0) return null
        return (
          <div key="customSections" className="space-y-6">
            {config.customSections.filter(s => s.enabled).map((section) => (
              <div key={section.id}>
                <div style={sectionTitlePreviewStyle()}>{section.title}</div>
                {section.type === 'list' ? (
                  <div className="space-y-1.5">
                    {['Élément 1', 'Élément 2', 'Élément 3'].map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: config.primaryColor }} />
                        <span className="text-sm text-slate-600 italic">{item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded p-3"><p className="text-sm text-slate-500 italic">Contenu texte libre…</p></div>
                )}
              </div>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground font-sans">
      <style>{`@import url('${GOOGLE_FONTS_URL}');`}</style>

      {/* ── CONTROL PANEL ─────────────────────────────────────────────────── */}
      <aside className="w-[420px] bg-background border-r border-border/50 flex flex-col shadow-lg overflow-y-auto">

        <div className="sticky top-0 z-10 p-5 border-b border-border/50 bg-card backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Template de Rapport</h1>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Titre du rapport</label>
              <input type="text" value={config.reportTitle} onChange={(e) => { e.stopPropagation(); setConfig(p => ({ ...p, reportTitle: e.target.value })) }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} placeholder="RAPPORT DE TÂCHES" className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Couleur</label>
                <div className="flex items-center gap-2 bg-secondary/30 rounded-lg border border-border/50 px-3 py-2.5">
                  <input type="color" value={config.primaryColor} onChange={(e) => { e.stopPropagation(); setConfig(p => ({ ...p, primaryColor: e.target.value })) }} className="w-7 h-7 rounded cursor-pointer border-0" />
                  <span className="text-xs text-foreground font-mono">{config.primaryColor}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Police</label>
                <select value={config.fontFamily} onChange={(e) => { e.stopPropagation(); setConfig(p => ({ ...p, fontFamily: e.target.value })) }} className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                  {fontOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground px-1 truncate" style={{ fontFamily: previewFont }}>AaBbCcDd 0123</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-card">

          {/* ── En-tête ── */}
          <S title="En-tête du rapport" icon={Layout} section="header">
            <Toggle label="Nom de l'organisation" checked={config.header.showOrganizationName} onChange={(e) => setConfig(p => ({ ...p, header: { ...p.header, showOrganizationName: e.target.checked } }))} />
            <Toggle label="Nom du projet"         checked={config.header.showProjectName}       onChange={(e) => setConfig(p => ({ ...p, header: { ...p.header, showProjectName:       e.target.checked } }))} />
            <Toggle label="Date"                  checked={config.header.showDate}              onChange={(e) => setConfig(p => ({ ...p, header: { ...p.header, showDate:              e.target.checked } }))} />
            <Toggle label="Logo entreprise"       checked={config.header.showLogo ?? false}     onChange={(e) => setConfig(p => ({ ...p, header: { ...p.header, showLogo:              e.target.checked } }))} />
            {config.header.showLogo && (
              <div className="pl-5 border-l-2 border-border/30">
                <SelectField label="Taille" value={config.header.logoSize ?? 'medium'} onChange={(e) => setConfig(p => ({ ...p, header: { ...p.header, logoSize: e.target.value } }))} options={[{ value: 'small', label: 'Petit' }, { value: 'medium', label: 'Moyen' }, { value: 'large', label: 'Grand' }]} />
              </div>
            )}
            <Toggle label="Logo client" checked={config.header.showClientLogo ?? false} onChange={(e) => setConfig(p => ({ ...p, header: { ...p.header, showClientLogo: e.target.checked } }))} />
            {config.header.showClientLogo && (
              <div className="pl-5 border-l-2 border-border/30">
                <SelectField label="Taille" value={config.header.clientLogoSize ?? 'medium'} onChange={(e) => setConfig(p => ({ ...p, header: { ...p.header, clientLogoSize: e.target.value } }))} options={[{ value: 'small', label: 'Petit' }, { value: 'medium', label: 'Moyen' }, { value: 'large', label: 'Grand' }]} />
              </div>
            )}
            <p className="text-[10px] text-muted-foreground px-3">Logos chargés automatiquement depuis votre organisation et votre projet.</p>
          </S>

          {/* ── Résumé ── */}
          <S title="Boîte de résumé" icon={FileText} section="summary">
            <Toggle label="Activer le résumé" checked={config.summary.enabled} onChange={(e) => setConfig(p => ({ ...p, summary: { ...p.summary, enabled: e.target.checked } }))} />
            {config.summary.enabled && (
              <div className="space-y-3 pl-5 border-l-2 border-border/30">
                <Toggle label="Période"                checked={config.summary.showPeriod}          onChange={(e) => setConfig(p => ({ ...p, summary: { ...p.summary, showPeriod:          e.target.checked } }))} />
                <Toggle label="Total des tâches"       checked={config.summary.showTotalCount}      onChange={(e) => setConfig(p => ({ ...p, summary: { ...p.summary, showTotalCount:      e.target.checked } }))} />
                <Toggle label="Tâches en retard"       checked={config.summary.showOverdueCount}    onChange={(e) => setConfig(p => ({ ...p, summary: { ...p.summary, showOverdueCount:    e.target.checked } }))} />
                <Toggle label="Nombre de plans"        checked={config.summary.showPlanCount}       onChange={(e) => setConfig(p => ({ ...p, summary: { ...p.summary, showPlanCount:       e.target.checked } }))} />
                <Toggle label="Répartition par statut" checked={config.summary.showStatusBreakdown} onChange={(e) => setConfig(p => ({ ...p, summary: { ...p.summary, showStatusBreakdown: e.target.checked } }))} />
              </div>
            )}
          </S>

          {/* ── Aperçus des plans ── */}
          <S title="Aperçus des plans" icon={Map} section="planOverviews">
            <Toggle
              label="Activer les aperçus de plans"
              checked={config.planOverviews?.enabled ?? false}
              onChange={(e) => setConfig(p => ({ ...p, planOverviews: { ...p.planOverviews, enabled: e.target.checked } }))}
            />
            {config.planOverviews?.enabled && (
              <div className="space-y-3 pl-5 border-l-2 border-border/30">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Titre de la section</label>
                  <input
                    type="text"
                    value={config.planOverviews.title ?? 'Aperçus des plans'}
                    onChange={(e) => { e.stopPropagation(); setConfig(p => ({ ...p, planOverviews: { ...p.planOverviews, title: e.target.value } })) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                    className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <Toggle
                  label="Afficher le nombre de tâches"
                  checked={config.planOverviews.showPinCount ?? true}
                  onChange={(e) => setConfig(p => ({ ...p, planOverviews: { ...p.planOverviews, showPinCount: e.target.checked } }))}
                />
                <Toggle
                  label="Afficher la légende numérotée"
                  checked={config.planOverviews.showLegend ?? true}
                  onChange={(e) => setConfig(p => ({ ...p, planOverviews: { ...p.planOverviews, showLegend: e.target.checked } }))}
                />
                <p className="text-[10px] text-muted-foreground px-1">
                  Une page par plan — image complète du plan avec les pins numérotés et leur légende.
                </p>
              </div>
            )}
          </S>

          {/* ── Tâches ── */}
          <S title="Affichage des tâches" icon={Layout} section="tasks">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Titre de la section</label>
              <input type="text" value={config.tasks.title ?? 'Tâches'} onChange={(e) => { e.stopPropagation(); setConfig(p => ({ ...p, tasks: { ...p.tasks, title: e.target.value } })) }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <SelectField
              label="Mode d'affichage"
              value={config.tasks.displayMode}
              onChange={(e) => setConfig(p => ({ ...p, tasks: { ...p.tasks, displayMode: e.target.value } }))}
              options={[
                { value: "list",         label: "Liste détaillée" },
                { value: "table",        label: "Tableau compact" },
                { value: "photoGallery", label: "Galerie photo" },
              ]}
            />
            {config.tasks.displayMode === 'photoGallery' && (
              <div className="space-y-3 pl-4 border-l-2 border-border/30">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">Options galerie</p>
                <SelectField
                  label="Photos par ligne"
                  value={String(config.tasks.photosPerRow ?? 3)}
                  onChange={(e) => setConfig(p => ({ ...p, tasks: { ...p.tasks, photosPerRow: parseInt(e.target.value) } }))}
                  options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]}
                />
                <Toggle label="Afficher le nom de la tâche"  checked={config.tasks.galleryShowName ?? true}        onChange={(e) => setConfig(p => ({ ...p, tasks: { ...p.tasks, galleryShowName:        e.target.checked } }))} />
                <Toggle label="Afficher la description"      checked={config.tasks.galleryShowDescription ?? false} onChange={(e) => setConfig(p => ({ ...p, tasks: { ...p.tasks, galleryShowDescription: e.target.checked } }))} />
                <Toggle label="Afficher le statut"           checked={config.tasks.galleryShowStatus ?? true}      onChange={(e) => setConfig(p => ({ ...p, tasks: { ...p.tasks, galleryShowStatus:      e.target.checked } }))} />
              </div>
            )}
            <SelectField label="Grouper par" value={config.tasks.groupBy} onChange={(e) => setConfig(p => ({ ...p, tasks: { ...p.tasks, groupBy: e.target.value } }))} options={[{ value: "none", label: "Aucun" }, { value: "status", label: "Par statut" }, { value: "category", label: "Par catégorie" }, { value: "plan", label: "Par plan" }]} />
            <SelectField label="Trier par"   value={config.tasks.sortBy}  onChange={(e) => setConfig(p => ({ ...p, tasks: { ...p.tasks, sortBy:  e.target.value } }))} options={[{ value: "created_at", label: "Date de création" }, { value: "due_date", label: "Échéance" }, { value: "status", label: "Statut" }, { value: "category", label: "Catégorie" }]} />
          </S>

          {/* ── Champs ── */}
          <S title="Champs à afficher" icon={Eye} section="fields">
            <p className="text-xs text-muted-foreground">Informations à inclure dans le rapport</p>
            {[
              { key: 'description', label: 'Description' },
              { key: 'photos',      label: 'Photos' },
              { key: 'snapshot',    label: 'Snapshot du plan' },
              { key: 'assignedTo',  label: 'Assigné à' },
              { key: 'dueDate',     label: 'Échéance' },
              { key: 'category',    label: 'Catégorie' },
              { key: 'status',      label: 'Statut' },
              { key: 'createdBy',   label: 'Créé par' },
              { key: 'plan',        label: 'Plan / Localisation' },
            ].map(({ key, label }) => (
              <Toggle key={key} label={label} checked={config.fields[key] ?? true} onChange={(e) => setConfig(p => ({ ...p, fields: { ...p.fields, [key]: e.target.checked } }))} />
            ))}
          </S>

          {/* ── Mode Liste ── */}
          <S title="Options mode Liste" icon={List} section="listView">
            <Toggle label="Numéros"            checked={config.listView.showIndex}        onChange={(e) => setConfig(p => ({ ...p, listView: { ...p.listView, showIndex:        e.target.checked } }))} />
            <Toggle label="Icône de catégorie" checked={config.listView.showCategoryIcon} onChange={(e) => setConfig(p => ({ ...p, listView: { ...p.listView, showCategoryIcon: e.target.checked } }))} />
            <Toggle label="Badge de statut"    checked={config.listView.showStatusPill}   onChange={(e) => setConfig(p => ({ ...p, listView: { ...p.listView, showStatusPill:   e.target.checked } }))} />
            <Toggle label="Séparateurs"        checked={config.listView.showDividers}     onChange={(e) => setConfig(p => ({ ...p, listView: { ...p.listView, showDividers:     e.target.checked } }))} />
            <SelectField label="Disposition des photos" value={config.listView.photoLayout}  onChange={(e) => setConfig(p => ({ ...p, listView: { ...p.listView, photoLayout:  e.target.value } }))} options={[{ value: "grid", label: "Grille" }, { value: "vertical", label: "Verticale" }, { value: "horizontal", label: "Horizontale" }]} />
            <SelectField label="Taille du snapshot"     value={config.listView.snapshotSize} onChange={(e) => setConfig(p => ({ ...p, listView: { ...p.listView, snapshotSize: e.target.value } }))} options={[{ value: "small", label: "Petit" }, { value: "medium", label: "Moyen" }, { value: "large", label: "Grand" }]} />
          </S>

          {/* ── Mode Tableau ── */}
          <S title="Options mode Tableau" icon={Table} section="tableView">
            <Toggle label="Numéros"                  checked={config.tableView.showIndex}          onChange={(e) => setConfig(p => ({ ...p, tableView: { ...p.tableView, showIndex:          e.target.checked } }))} />
            <Toggle label="Photos dans les cellules" checked={config.tableView.showPhotosInline}   onChange={(e) => setConfig(p => ({ ...p, tableView: { ...p.tableView, showPhotosInline:   e.target.checked } }))} />
            <Toggle label="Mode compact"             checked={config.tableView.compactMode}        onChange={(e) => setConfig(p => ({ ...p, tableView: { ...p.tableView, compactMode:        e.target.checked } }))} />
            <Toggle label="Alterner les couleurs"    checked={config.tableView.alternateRowColors} onChange={(e) => setConfig(p => ({ ...p, tableView: { ...p.tableView, alternateRowColors: e.target.checked } }))} />
            <SelectField label="Taille des photos" value={config.tableView.photoSize} onChange={(e) => setConfig(p => ({ ...p, tableView: { ...p.tableView, photoSize: e.target.value } }))} options={[{ value: "small", label: "Petit (80×80)" }, { value: "medium", label: "Moyen (120×120)" }, { value: "large", label: "Grand (160×160)" }]} />
          </S>

          {/* ── Style titres de section (global) ── */}
          <S title="Style des titres de section" icon={FileText} section="sectionTitles">
            <p className="text-xs text-muted-foreground px-1">S'applique aux tâches, participants, signatures et sections personnalisées.</p>
            <SelectField label="Taille" value={config.sectionTitles?.titleSize ?? 'medium'} onChange={(e) => setConfig(p => ({ ...p, sectionTitles: { ...p.sectionTitles, titleSize: e.target.value } }))} options={[{ value: "small", label: "Petit" }, { value: "medium", label: "Moyen" }, { value: "large", label: "Grand" }]} />
            <Toggle label="Barre d'accent (bordure gauche)" checked={config.sectionTitles?.titleAccentBar ?? true}  onChange={(e) => setConfig(p => ({ ...p, sectionTitles: { ...p.sectionTitles, titleAccentBar: e.target.checked } }))} />
            <Toggle label="Souligné"                        checked={config.sectionTitles?.titleUnderline ?? false} onChange={(e) => setConfig(p => ({ ...p, sectionTitles: { ...p.sectionTitles, titleUnderline: e.target.checked } }))} />
            <div className="rounded-lg bg-slate-50 p-4 space-y-2 mt-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Aperçu</p>
              {[config.tasks.title || 'Tâches', config.participants.title || 'Équipe projet', config.signatures.title || 'Signatures', 'Section personnalisée'].map((title) => (
                <div key={title} style={sectionTitlePreviewStyle()}>{title}</div>
              ))}
            </div>
          </S>

          {/* ── Ordre des sections ── */}
          <S title="Ordre des sections" icon={List} section="sectionOrder">
            <p className="text-xs text-muted-foreground px-1">Définissez l'ordre d'apparition des sections dans le PDF.</p>
            <div className="space-y-2 mt-1">
              {sectionOrder.map((id, index) => (
                <SectionOrderItem key={id} id={id} label={SECTION_LABELS[id]?.label || id} icon={SECTION_LABELS[id]?.icon || '•'} index={index} total={sectionOrder.length} onMoveUp={(i) => moveSection(i, -1)} onMoveDown={(i) => moveSection(i, 1)} />
              ))}
            </div>
          </S>

          {/* ── Page de garde ── */}
          <S title="Page de garde (optionnelle)" icon={FileText} section="coverPage">
            <Toggle label="Activer la page de garde" checked={config.coverPage.enabled} onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, enabled: e.target.checked } }))} />
            {config.coverPage.enabled && (
              <div className="space-y-5 pl-5 border-l-2 border-border/30">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">Logo entreprise</p>
                  <Toggle label="Afficher" checked={config.coverPage.showCompanyLogo} onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, showCompanyLogo: e.target.checked } }))} />
                  {config.coverPage.showCompanyLogo && <SelectField label="Taille" value={config.coverPage.companyLogoSize} onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, companyLogoSize: e.target.value } }))} options={[{ value: "small", label: "Petit" }, { value: "medium", label: "Moyen" }, { value: "large", label: "Grand" }]} />}
                </div>
                <div className="space-y-3 pt-4 border-t border-border/30">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">Logo client</p>
                  <Toggle label="Afficher" checked={config.coverPage.showClientLogo} onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, showClientLogo: e.target.checked } }))} />
                  {config.coverPage.showClientLogo && <SelectField label="Taille" value={config.coverPage.clientLogoSize} onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, clientLogoSize: e.target.value } }))} options={[{ value: "small", label: "Petit" }, { value: "medium", label: "Moyen" }, { value: "large", label: "Grand" }]} />}
                  <p className="text-[10px] text-muted-foreground">Chargés automatiquement depuis votre organisation et votre projet.</p>
                </div>
                <div className="space-y-4 pt-4 border-t border-border/30">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">Style du titre</p>
                  <SelectField label="Style"              value={config.coverPage.titleStyle ?? 'bold'}           onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, titleStyle:         e.target.value } }))} options={[{ value: "bold", label: "Gras majuscule" }, { value: "light", label: "Léger / thin" }, { value: "boldlight", label: "Gras + léger" }]} />
                  <SelectField label="Taille"             value={config.coverPage.titleSize ?? 'large'}           onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, titleSize:          e.target.value } }))} options={[{ value: "small", label: "Petit" }, { value: "medium", label: "Moyen" }, { value: "large", label: "Grand" }]} />
                  <SelectField label="Alignement"         value={config.coverPage.titleAlign ?? 'left'}           onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, titleAlign:         e.target.value } }))} options={[{ value: "left", label: "Gauche" }, { value: "center", label: "Centré" }, { value: "right", label: "Droite" }]} />
                  <SelectField label="Espacement lettres" value={config.coverPage.titleLetterSpacing ?? 'normal'}  onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, titleLetterSpacing: e.target.value } }))} options={[{ value: "tight", label: "Serré" }, { value: "normal", label: "Normal" }, { value: "wide", label: "Large" }]} />
                  <Toggle label="Barre d'accent" checked={config.coverPage.titleAccentBar ?? true} onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, titleAccentBar: e.target.checked } }))} />
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Couleur du titre</label>
                    <div className="flex gap-2">
                      {['primary', 'custom'].map((opt) => (
                        <button key={opt} onClick={() => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, titleColor: opt } }))} className={clsx("flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all", (config.coverPage.titleColor ?? 'primary') === opt ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/30 text-foreground border-border/50 hover:bg-secondary/50")}>
                          {opt === 'primary' ? 'Principale' : 'Personnalisée'}
                        </button>
                      ))}
                    </div>
                    {(config.coverPage.titleColor ?? 'primary') === 'custom' && (
                      <div className="flex items-center gap-2 bg-secondary/30 rounded-lg border border-border/50 px-3 py-2">
                        <input type="color" value={config.coverPage.titleCustomColor ?? '#000000'} onChange={(e) => { e.stopPropagation(); setConfig(p => ({ ...p, coverPage: { ...p.coverPage, titleCustomColor: e.target.value } })) }} className="w-7 h-7 rounded cursor-pointer border-0" />
                        <span className="text-xs font-mono">{config.coverPage.titleCustomColor ?? '#000000'}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-border/30">
                  <Toggle label="Photo de projet"  checked={config.coverPage.showProjectPhoto} onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, showProjectPhoto: e.target.checked } }))} />
                  {config.coverPage.showProjectPhoto && <SelectField label="Taille photo" value={config.coverPage.projectPhotoSize} onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, projectPhotoSize: e.target.value } }))} options={[{ value: "small", label: "Petit" }, { value: "medium", label: "Moyen" }, { value: "large", label: "Grand" }, { value: "full", label: "Pleine largeur" }]} />}
                  <Toggle label="Résumé exécutif"  checked={config.coverPage.showSummary}      onChange={(e) => setConfig(p => ({ ...p, coverPage: { ...p.coverPage, showSummary:      e.target.checked } }))} />
                </div>
              </div>
            )}
          </S>

          {/* ── Informations projet ── */}
          <S title="Informations projet" icon={Layout} section="projectInfo">
            {[
              { key: 'showLocation',      label: 'Localisation' },
              { key: 'showClientName',    label: 'Nom du client' },
              { key: 'showProjectNumber', label: 'Numéro de projet' },
              { key: 'showContractor',    label: 'Entrepreneur' },
              { key: 'showArchitect',     label: 'Architecte' },
              { key: 'showPhase',         label: 'Phase du projet' },
            ].map(({ key, label }) => (
              <Toggle key={key} label={label} checked={config.projectInfo[key]} onChange={(e) => setConfig(p => ({ ...p, projectInfo: { ...p.projectInfo, [key]: e.target.checked } }))} />
            ))}
          </S>

          {/* ── Galerie photos ── */}
          <S title="Galerie photos supplémentaire" icon={Grid} section="photoGallery">
            <Toggle label="Activer la galerie" checked={config.photoGallery.enabled} onChange={(e) => setConfig(p => ({ ...p, photoGallery: { ...p.photoGallery, enabled: e.target.checked } }))} />
            {config.photoGallery.enabled && (
              <div className="space-y-4 pl-5 border-l-2 border-border/30">
                <SelectField label="Disposition"      value={config.photoGallery.layout}               onChange={(e) => setConfig(p => ({ ...p, photoGallery: { ...p.photoGallery, layout:       e.target.value } }))}            options={[{ value: "grid", label: "Grille" }, { value: "masonry", label: "Mosaïque" }, { value: "list", label: "Liste" }]} />
                <SelectField label="Photos par ligne" value={String(config.photoGallery.photosPerRow)} onChange={(e) => setConfig(p => ({ ...p, photoGallery: { ...p.photoGallery, photosPerRow: parseInt(e.target.value) } }))} options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "6", label: "6" }]} />
                <Toggle label="Légendes" checked={config.photoGallery.showCaptions} onChange={(e) => setConfig(p => ({ ...p, photoGallery: { ...p.photoGallery, showCaptions: e.target.checked } }))} />
              </div>
            )}
          </S>

          {/* ── Participants ── */}
          <S title="Section participants" icon={Users} section="participants">
            <Toggle label="Activer la section" checked={config.participants.enabled} onChange={(e) => setConfig(p => ({ ...p, participants: { ...p.participants, enabled: e.target.checked } }))} />
            {config.participants.enabled && (
              <div className="space-y-4 pl-5 border-l-2 border-border/30">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Titre</label>
                  <input type="text" value={config.participants.title} onChange={(e) => { e.stopPropagation(); setConfig(p => ({ ...p, participants: { ...p.participants, title: e.target.value } })) }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <SelectField label="Disposition" value={config.participants.layout} onChange={(e) => setConfig(p => ({ ...p, participants: { ...p.participants, layout: e.target.value } }))} options={[{ value: "list", label: "Liste" }, { value: "grid", label: "Grille" }, { value: "table", label: "Tableau" }]} />
                <Toggle label="Afficher les rôles"    checked={config.participants.showRoles}   onChange={(e) => setConfig(p => ({ ...p, participants: { ...p.participants, showRoles:   e.target.checked } }))} />
                <Toggle label="Afficher les contacts" checked={config.participants.showContact} onChange={(e) => setConfig(p => ({ ...p, participants: { ...p.participants, showContact: e.target.checked } }))} />
                <Toggle label="Afficher l'entreprise" checked={config.participants.showCompany} onChange={(e) => setConfig(p => ({ ...p, participants: { ...p.participants, showCompany: e.target.checked } }))} />
              </div>
            )}
          </S>

          {/* ── Signatures ── */}
          <S title="Section signatures" icon={FileText} section="signatures">
            <Toggle label="Activer les signatures" checked={config.signatures.enabled} onChange={(e) => setConfig(p => ({ ...p, signatures: { ...p.signatures, enabled: e.target.checked } }))} />
            {config.signatures.enabled && (
              <div className="space-y-4 pl-5 border-l-2 border-border/30">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Titre</label>
                  <input type="text" value={config.signatures.title} onChange={(e) => { e.stopPropagation(); setConfig(p => ({ ...p, signatures: { ...p.signatures, title: e.target.value } })) }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <SelectField label="Disposition" value={config.signatures.layout} onChange={(e) => setConfig(p => ({ ...p, signatures: { ...p.signatures, layout: e.target.value } }))} options={[{ value: "horizontal", label: "Horizontale" }, { value: "vertical", label: "Verticale" }]} />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">Champs</p>
                  {config.signatures.fields.map((field, index) => (
                    <Toggle key={index} label={field.label} checked={field.enabled} onChange={(e) => { const nf = config.signatures.fields.map((f, i) => i === index ? { ...f, enabled: e.target.checked } : f); setConfig(p => ({ ...p, signatures: { ...p.signatures, fields: nf } })) }} />
                  ))}
                </div>
              </div>
            )}
          </S>

          {/* ── Pied de page ── */}
          <S title="Pied de page" icon={AlignLeft} section="footer">
            <Toggle label="Activer le pied de page" checked={config.footer.enabled} onChange={(e) => setConfig(p => ({ ...p, footer: { ...p.footer, enabled: e.target.checked } }))} />
            {config.footer.enabled && (
              <div className="space-y-4 pl-5 border-l-2 border-border/30">
                <Toggle label="Numéros de page"         checked={config.footer.showPageNumbers} onChange={(e) => setConfig(p => ({ ...p, footer: { ...p.footer, showPageNumbers: e.target.checked } }))} />
                <Toggle label="Informations projet"     checked={config.footer.showProjectInfo} onChange={(e) => setConfig(p => ({ ...p, footer: { ...p.footer, showProjectInfo: e.target.checked } }))} />
                <Toggle label="Informations entreprise" checked={config.footer.showCompanyInfo} onChange={(e) => setConfig(p => ({ ...p, footer: { ...p.footer, showCompanyInfo: e.target.checked } }))} />
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Texte personnalisé</label>
                  <textarea value={config.footer.customText} onChange={(e) => { e.stopPropagation(); setConfig(p => ({ ...p, footer: { ...p.footer, customText: e.target.value } })) }} onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation() }} placeholder="Ex: Confidentiel" rows={2} className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>
              </div>
            )}
          </S>

          {/* ── Custom sections ── */}
          {config.customSections.map((customSection, index) => (
            <S key={customSection.id} title={customSection.title || "Section personnalisée"} icon={FileText} section={`custom-${customSection.id}`}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Titre</label>
                  <input type="text" value={customSection.title} onChange={(e) => { e.preventDefault(); e.stopPropagation(); const next = config.customSections.map((s, i) => i === index ? { ...s, title: e.target.value } : s); setConfig(p => ({ ...p, customSections: next })) }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <SelectField label="Type de contenu" value={customSection.type} onChange={(e) => { e.preventDefault(); e.stopPropagation(); const next = config.customSections.map((s, i) => i === index ? { ...s, type: e.target.value } : s); setConfig(p => ({ ...p, customSections: next })) }} options={[{ value: "text", label: "Texte libre" }, { value: "list", label: "Liste à puces" }]} />
                <Toggle label="Activer" checked={customSection.enabled} onChange={(e) => { const next = config.customSections.map((s, i) => i === index ? { ...s, enabled: e.target.checked } : s); setConfig(p => ({ ...p, customSections: next })) }} />
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfig(p => ({ ...p, customSections: p.customSections.filter((_, i) => i !== index) })) }} className="w-full px-4 py-2.5 border border-red-200 bg-red-50 rounded-lg text-sm font-medium text-red-600 hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />Supprimer
                </button>
              </div>
            </S>
          ))}

          {/* ── Actions ── */}
          <div className="p-5 space-y-3 bg-secondary/10 border-t border-border/30">
            <button onClick={addCustomSection} className="w-full px-4 py-2.5 border-2 border-dashed border-border/50 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />Ajouter une section personnalisée
            </button>
            <button onClick={saveTemplate} disabled={isSaving} className={clsx("w-full py-3 rounded-xl font-bold text-sm shadow-lg transition-all uppercase tracking-wide flex items-center justify-center gap-2", isSaving && "opacity-50 cursor-not-allowed", saveStatus === 'success' && "bg-green-600 text-white", saveStatus === 'error' && "bg-red-600 text-white", !saveStatus && "bg-primary text-primary-foreground hover:bg-primary/90")}>
              {isSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sauvegarde...</>
                : saveStatus === 'success' ? '✓ Template sauvegardé !'
                : saveStatus === 'error'   ? '✗ Erreur de sauvegarde'
                : <><Download className="w-4 h-4" />Sauvegarder le template</>}
            </button>
          </div>
        </div>
      </aside>

      {/* ── PREVIEW PANEL ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-slate-100 p-12">
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="bg-white rounded-lg shadow-sm border border-border/50 p-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Aperçu du PDF</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-md bg-secondary/30 font-medium" style={{ fontFamily: previewFont }}>{fontOptions.find(f => f.value === config.fontFamily)?.label}</span>
              <span className="text-xs text-muted-foreground">Modifications en temps réel</span>
            </div>
          </div>

          {/* ── COVER PAGE preview ── */}
          {config.coverPage.enabled && (
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-slate-300">
              <div className="w-full aspect-[210/297] p-12 bg-white flex flex-col" style={{ fontFamily: previewFont }}>
                <div className="flex justify-between items-start mb-12">
                  {config.coverPage.showCompanyLogo && <div className="bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400 font-medium" style={logoPlaceholderStyle(config.coverPage.companyLogoSize)}>Logo</div>}
                  {config.coverPage.showClientLogo  && <div className="bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400 font-medium" style={logoPlaceholderStyle(config.coverPage.clientLogoSize)}>Client</div>}
                </div>
                <CoverTitlePreview config={config} />
                {config.coverPage.showProjectPhoto && (
                  <div className="flex justify-center mb-8">
                    <div className={clsx("bg-slate-100 rounded-2xl flex items-center justify-center", config.coverPage.projectPhotoSize === 'small' ? 'w-64 h-48' : config.coverPage.projectPhotoSize === 'large' ? 'w-4/5 h-72' : config.coverPage.projectPhotoSize === 'full' ? 'w-full h-80' : 'w-2/3 h-60')}>
                      <div className="text-center"><ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400">Photo de couverture</p></div>
                    </div>
                  </div>
                )}
                {config.coverPage.showSummary && (
                  <div className="p-5 rounded-xl mb-6" style={{ backgroundColor: '#f5f5f4', borderLeft: `4px solid ${config.primaryColor}` }}>
                    <p className="text-xs font-black uppercase mb-2 tracking-wider" style={{ color: config.primaryColor }}>Résumé Exécutif</p>
                    <p className="text-slate-700 text-sm italic">"Le projet progresse conformément au planning."</p>
                  </div>
                )}
                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                  <span>Client Example</span><span>{new Date().toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── MAIN PAGE preview ── */}
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-slate-300">
            <div className="w-full aspect-[210/297] bg-white overflow-auto" style={{ fontFamily: previewFont }}>
              {(config.header.showOrganizationName || config.header.showProjectName || config.header.showDate || config.header.showLogo || config.header.showClientLogo) && (
                <div className="flex justify-between items-center px-12 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    {config.header.showLogo && <div className="bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400" style={logoPlaceholderStyle(config.header.logoSize ?? 'medium')}>Logo</div>}
                    <div>
                      {config.header.showOrganizationName && <div className="text-base font-bold" style={{ color: config.primaryColor }}>Votre Organisation</div>}
                      {config.header.showProjectName      && <div className="text-sm text-slate-700">Projet Example</div>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {config.header.showClientLogo && <div className="bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400" style={logoPlaceholderStyle(config.header.clientLogoSize ?? 'medium')}>Client</div>}
                    {config.header.showDate && <div className="text-sm text-slate-600">{new Date().toLocaleDateString('fr-FR')}</div>}
                  </div>
                </div>
              )}
              <div className="p-12 pt-6 space-y-6">
                {sectionOrder.map((id) => renderPreviewSection(id))}
                {config.footer.enabled && (
                  <div className="pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-400">
                    <div className="flex gap-4">
                      {config.footer.showProjectInfo && <span>Projet Example</span>}
                      {config.footer.showCompanyInfo && <span>Votre Organisation</span>}
                      {config.footer.customText      && <span>{config.footer.customText}</span>}
                    </div>
                    {config.footer.showPageNumbers && <span>Page 1</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 text-sm mb-1">Comment appliquer ce template ?</h4>
              <p className="text-xs text-blue-700">Une fois sauvegardé, ce template sera appliqué lors de la génération de vos prochains rapports PDF.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}