'use client'
import { useAtom } from 'jotai'
import { categoriesAtom, projectPlansAtom, selectedPinAtom, selectedPlanAtom, statusesAtom, pinsAtom } from '@/store/atoms'
import NavBar from '@/components/NavBar'
import { selectedProjectAtom } from '@/store/atoms'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import Pin from '@/components/Pin'
import CategoryComboBox from '@/components/CategoryComboBox'
import { Calendar1Icon, Download, FileText, Search, XIcon, Upload, X as XCloseIcon } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import ListFilterPanel from '@/components/ListFilterPanel'
import LoadingScreen from '@/components/LoadingScreen'
import clsx from 'clsx'
import { useUserData } from '@/hooks/useUserData'
import { fr } from 'date-fns/locale/fr'
import PinDrawer from '@/components/PinDrawer'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import RichTextEditor from '@/components/RichTextEditor'

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

// ── Due Date Picker ────────────────────────────────────────────────────────────
const DueDatePicker = ({ pin, onUpdate }) => {
  const [selectedDate, setSelectedDate] = useState(
    pin?.due_date ? new Date(pin.due_date) : null
  )
  const [open, setOpen] = useState(false)
  const isOverDue = selectedDate instanceof Date && selectedDate < new Date()

  const handleChange = async (date) => {
    setSelectedDate(date)
    setOpen(false)
    const { error } = await supabase
      .from('pdf_pins')
      .update({ due_date: date, updated_at: new Date().toISOString() })
      .eq('id', pin.id)
    if (error) console.error('update due_date failed', error)
    onUpdate?.(pin.id, date)
  }

  return (
    <div className="relative w-40">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'w-full border rounded-[4px] px-2.5 py-1.5 pl-7 text-left bg-white hover:bg-[#f5f5f4] relative transition-colors text-[12px] font-medium',
          GeistMono.className,
          isOverDue
            ? 'border-[#f5c6c6] text-[#9c1b1b]'
            : selectedDate
              ? 'border-[#e5e5e2] text-[#0d0d0c]'
              : 'border-[#e5e5e2] text-[#b8b8b3]'
        )}
      >
        {selectedDate ? selectedDate.toLocaleDateString('fr-FR') : 'Ajouter échéance'}
        <Calendar1Icon
          size={12}
          className={clsx(
            'absolute left-2.5 top-1/2 -translate-y-1/2',
            isOverDue ? 'text-[#dc2626]' : selectedDate ? 'text-[#666660]' : 'text-[#b8b8b3]'
          )}
        />
      </button>
      {open && (
        <div className="absolute z-50 mt-1">
          <DatePicker
            inline
            selected={selectedDate}
            onChange={handleChange}
            dateFormat="dd/MM/yyyy"
            locale={fr}
          />
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Tasks({ params }) {
  const { projectId, organizationId } = params

  const [allPins, setAllPins]       = useAtom(pinsAtom)
  const [, setPlan]                 = useAtom(selectedPlanAtom)
  const [project, setProject]       = useAtom(selectedProjectAtom)
  const [categories, setCategories] = useAtom(categoriesAtom)
  const [statuses, setStatuses]     = useAtom(statusesAtom)
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)
  const [, setProjectPlans]         = useAtom(projectPlansAtom)

  const [displayedPins, setDisplayedPins] = useState([])
  const [searchQuery, setSearchQuery]     = useState('')
  const [selectedIds, setSelectedIds]     = useState(new Set())

  const [isAddTaskOpen, setIsAddTaskOpen]         = useState(false)
  const [newTaskName, setNewTaskName]             = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [isCreating, setIsCreating]               = useState(false)

  const { user, profile } = useUserData(organizationId)
  const [isReportModalOpen, setIsReportModalOpen]     = useState(false)
  const [isGeneratingReport, setIsGeneratingReport]   = useState(false)
  const [reportFields, setReportFields] = useState({
    description: true, photos: true, snapshot: true,
    assignedTo: true,  dueDate: true, category: true, status: true,
  })
  const [selectedTemplate, setSelectedTemplate]       = useState(null)
  const [availableTemplates, setAvailableTemplates]   = useState([])
  const [projectMembers, setProjectMembers]           = useState([])
  const [loading, setLoading] = useState(true)
  const fetchedKeyRef = useRef(null)

  useEffect(() => {
    const q = searchQuery.toLowerCase()
    setDisplayedPins(
      q
        ? allPins.filter(p => (p.name || 'Pin sans nom').toLowerCase().includes(q))
        : allPins
    )
  }, [allPins, searchQuery])

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase
        .from('report_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      if (data) {
        setAvailableTemplates(data)
        setSelectedTemplate(data.find(t => t.is_default) || data[0] || null)
      }
    }
    if (organizationId) fetchTemplates()
  }, [organizationId])

  useEffect(() => {
    if (selectedTemplate?.config?.fields) {
      const f = selectedTemplate.config.fields
      setReportFields({
        description: f.description ?? true,
        photos:      f.photos      ?? true,
        snapshot:    f.snapshot    ?? true,
        assignedTo:  f.assignedTo  ?? true,
        dueDate:     f.dueDate     ?? true,
        category:    f.category    ?? true,
        status:      f.status      ?? true,
      })
    }
  }, [selectedTemplate])

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('members_projects')
        .select('id, role, members(id, name, email)')
        .eq('project_id', projectId)
      if (data) setProjectMembers(data.map(m => ({ ...m.members, role: m.role, memberId: m.id })))
      if (error) console.error('fetchMembers', error)
    }
    if (projectId) fetchMembers()
  }, [projectId])

  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#pin-')) {
      const pinId = hash.substring(5)
      const pin = allPins.find(p => p.id === pinId)
      if (pin) {
        setSelectedPin(pin)
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
  }, [allPins])

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id,created_at,name,plans(id,name)')
        .is('plans.deleted_at', null)
        .eq('id', projectId)
        .single()
      if (data) { setProject(data); setProjectPlans(data.plans) }
    }
    fetchProject()
  }, [projectId])

  useEffect(() => {
    if (!projectId || !user?.id || !profile?.id) return

    const key = `${projectId}:${user.id}:${profile.role}`
    if (fetchedKeyRef.current === key) return
    fetchedKeyRef.current = key

    const fetchPins = async () => {
      setLoading(true)
      try {
        const isGuest = profile.role === 'guest'
        let query = supabase
          .from('pdf_pins')
          .select(
            'id,isArchived,name,note,x,y,created_by,status_id,assigned_to(id,name),category_id,categories(name),due_date,pin_number,pdf_name,projects(id,name,project_number,organization_id),project_id,pins_photos(id,public_url),plans(id,name,file_url),pin_tags(tag_id,tags(*))'
          )
          .is('deleted_at', null)
          .eq('project_id', projectId)
        if (isGuest) query = query.eq('assigned_to', profile.id)

        const { data, error } = await query
        if (error) {
          console.error('pins fetch', error)
          return
        }
        setAllPins(data || [])
      } finally {
        setLoading(false)
      }
    }
    fetchPins()
  }, [projectId, user?.id, profile?.id, profile?.role])

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.size === displayedPins.length ? new Set() : new Set(displayedPins.map(p => p.id))
    )
  }

  const handleDueDateUpdate = (pinId, date) => {
    setAllPins(prev => prev.map(p => p.id === pinId ? { ...p, due_date: date } : p))
  }

  // ── Upload planning images to Supabase Storage ───────────────────────────
  const uploadPlanningImages = async (files) => {
    const uploadedUrls = []
    for (const file of files) {
      const ext      = file.name.split('.').pop()
      const fileName = `planning/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (error) {
        console.error('Planning image upload failed', error)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(data.path)
      uploadedUrls.push(publicUrl)
    }
    return uploadedUrls
  }

  // ── Generate PDF report ──────────────────────────────────────────────────
  const handleGenerateReport = async ({
    reportTitle,
    displayMode,
    participants,
    customSections,
    planningImageFiles,
    planningObservations,
  }) => {
    setIsReportModalOpen(false)
    setIsGeneratingReport(true)
    const selectedPinsArr = displayedPins.filter(p => selectedIds.has(p.id))
    try {
      const { data: { session } } = await supabase.auth.getSession()

      let planningImages = []
      if (planningImageFiles?.length) {
        planningImages = await uploadPlanningImages(planningImageFiles)
      }

      const response = await fetch('https://zaynbackend-production.up.railway.app/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          selectedIds:    selectedPinsArr.map(p => p.id),
          fields:         reportFields,
          displayMode,
          templateConfig: selectedTemplate?.config || null,
          reportTitle,
          participants,
          customSections,
          planningImages,
          planningObservations,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur API ${response.status}: ${errorText.substring(0, 200)}`)
      }

      const { downloadUrl, fileName } = await response.json()
      if (!downloadUrl) throw new Error('URL de téléchargement manquante')

      const a = document.createElement('a')
      a.href     = downloadUrl
      a.download = fileName || 'rapport-taches.pdf'
      a.target   = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Impossible de générer le rapport')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleExportExcel = () => {
    const selected = displayedPins.filter(p => selectedIds.has(p.id))
    if (!selected.length) return
    const data = selected.map(pin => ({
      Nom:              pin.name || 'Pin sans nom',
      ID:               `${pin.projects?.project_number}-${pin.pin_number}`,
      'Assigné à':      pin.assigned_to?.name || '',
      Catégorie:        pin.categories?.name  || '',
      Échéance:         pin.due_date ? new Date(pin.due_date).toLocaleDateString('fr-FR') : '',
      Localisation:     pin.pdf_name || '',
      Description:      pin.note    || '',
      'Date de création': pin.created_at ? new Date(pin.created_at).toLocaleDateString('fr-FR') : '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tâches')
    XLSX.writeFile(wb, 'liste-des-taches.xlsx')
  }

  const handleExportExcelWithEmbeddedMedia = async () => {
    const selected = displayedPins.filter(p => selectedIds.has(p.id))
    if (!selected.length) return
    const workbook = new ExcelJS.Workbook()
    const sheet    = workbook.addWorksheet('Pins & Médias')
    sheet.columns  = [
      { header: 'Nom pin',    key: 'name',     width: 25 },
      { header: 'ID pin',     key: 'id',       width: 15 },
      { header: 'Assigné à',  key: 'assignee', width: 20 },
      { header: 'Catégorie',  key: 'category', width: 20 },
      { header: 'Échéance',   key: 'due',      width: 15 },
      { header: 'Description',key: 'note',     width: 40 },
      { header: 'Plan',       key: 'plan',     width: 20 },
      { header: 'Média',      key: 'media',    width: 25 },
    ]
    for (const pin of selected) {
      const medias = pin.pins_photos?.length ? pin.pins_photos : [null]
      for (const media of medias) {
        const row = sheet.addRow({
          name:     pin.name || 'Pin sans nom',
          id:       `${pin.projects?.project_number}-${pin.pin_number}`,
          assignee: pin.assigned_to?.name || '',
          category: pin.categories?.name  || '',
          due:      pin.due_date ? new Date(pin.due_date).toLocaleDateString('fr-FR') : '',
          note:     pin.note    || '',
          plan:     pin.pdf_name || '',
        })
        row.height = 90
        if (media?.public_url) {
          try {
            const res     = await fetch(media.public_url)
            const blob    = await res.blob()
            const buffer  = await blob.arrayBuffer()
            const imageId = workbook.addImage({ buffer, extension: 'jpeg' })
            sheet.addImage(imageId, {
              tl:  { col: 7, row: row.number - 1 },
              ext: { width: 120, height: 80 },
            })
          } catch (err) {
            console.error('Image fetch failed', err)
          }
        }
      }
    }
    const buffer = await workbook.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href    = url
    a.download = 'pins-medias-avec-images.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleCreateTask = async () => {
    if (!newTaskName.trim()) return
    try {
      setIsCreating(true)
      const { data, error } = await supabase
        .from('pdf_pins')
        .insert({
          name:        newTaskName,
          note:        newTaskDescription,
          project_id:  projectId,
          created_by:  profile.id,
          category_id: categories.find(c => c.order === 0)?.id,
          status_id:   statuses.find(s => s.order === 0)?.id,
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()
      if (error) throw error
      setAllPins(prev => [data, ...prev])
      setNewTaskName('')
      setNewTaskDescription('')
      setIsAddTaskOpen(false)
    } catch (err) {
      console.error('Create task failed', err)
      alert('Erreur lors de la création de la tâche')
    } finally {
      setIsCreating(false)
    }
  }

  const selectedPinsCount = displayedPins.filter(p => selectedIds.has(p.id)).length
  const TABLE_HEADERS = ['Nom', 'ID', 'Assigné à', 'Catégorie', 'Échéance', 'Localisation', 'Tags']

  return (
    <>
      {categories && statuses && (
        <div className={clsx(GeistSans.className, 'min-h-screen bg-[#fafaf9]')}>
          <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} />

          <div className="px-8 pt-6 pb-10 max-w-[1400px] mx-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h1 className="text-xl font-medium tracking-[-0.003em] text-[#050505]">Liste des tâches</h1>
                <p className={clsx('text-[12px] text-[#8a8a84] mt-0.5', GeistMono.className)}>
                  {displayedPins.length} tâche{displayedPins.length > 1 ? 's' : ''} au total
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a84]" />
                  <input
                    type="text"
                    placeholder="Rechercher…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-48 rounded-[4px] border border-[#e5e5e2] bg-white pl-8 pr-3 py-[7px] text-[13px] text-[#0d0d0c] placeholder:text-[#b8b8b3] focus:outline-none focus:border-[#0d0d0c] transition-colors"
                  />
                </div>

                <ListFilterPanel
                  pins={displayedPins}
                  setPins={setDisplayedPins}
                  originalPins={allPins}
                  setOriginalPins={setAllPins}
                  user={profile}
                  projectId={projectId}
                />

                {profile?.role !== 'guest' && (
                  <button
                    onClick={() => setIsAddTaskOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-[7px] bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors"
                  >
                    <span className="text-sm leading-none">+</span>
                    Nouvelle tâche
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#e5e5e2] rounded-[4px] overflow-hidden">

              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#f5f5f4] border-b border-[#e5e5e2]">
                  <p className="text-[12px] font-medium text-[#050505]">
                    {selectedIds.size} tâche{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedTemplate?.id || ''}
                      onChange={e => {
                        const tpl = availableTemplates.find(t => t.id === e.target.value) || null
                        setSelectedTemplate(tpl)
                      }}
                      className="px-2.5 py-1.5 bg-white text-[#4a4a46] rounded-[4px] text-[12px] font-medium border border-[#e5e5e2] focus:outline-none focus:border-[#0d0d0c] transition-colors"
                    >
                      <option value="">Template par défaut</option>
                      {availableTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      disabled={isGeneratingReport}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors',
                        isGeneratingReport
                          ? 'bg-[#b8b8b3] text-white cursor-not-allowed'
                          : 'bg-[#0d0d0c] text-white hover:bg-[#1a1a18]'
                      )}
                    >
                      {isGeneratingReport
                        ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Download className="w-3.5 h-3.5" />
                      }
                      {isGeneratingReport ? 'Génération…' : 'PDF'}
                    </button>

                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#4a4a46] rounded-[4px] text-[12px] font-medium border border-[#e5e5e2] hover:bg-[#f5f5f4] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Excel
                    </button>

                    <button
                      onClick={handleExportExcelWithEmbeddedMedia}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#4a4a46] rounded-[4px] text-[12px] font-medium border border-[#e5e5e2] hover:bg-[#f5f5f4] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Excel + Médias
                    </button>
                  </div>
                </div>
              )}

              {isReportModalOpen && (
                <ReportFieldsModal
                  fields={reportFields}
                  setFields={setReportFields}
                  onClose={() => setIsReportModalOpen(false)}
                  onConfirm={handleGenerateReport}
                  templateConfig={selectedTemplate?.config || null}
                  projectMembers={projectMembers}
                />
              )}

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-7 h-7 border-2 border-[#e5e5e2] border-t-[#0d0d0c] rounded-full animate-spin" />
                    <p className="text-[13px] text-[#8a8a84] text-center">Chargement...</p>
                  </div>
                ) : (
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-[#f5f5f4] border-b border-[#e5e5e2]">
                      <th className="px-4 py-2 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === displayedPins.length && displayedPins.length > 0}
                          onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 rounded-[2px] border-[#d6d6d2] accent-[#0d0d0c]"
                        />
                      </th>
                      {TABLE_HEADERS.map(h => (
                        <th key={h} className={clsx('px-4 py-2 text-left text-[11px] font-medium text-[#666660] uppercase tracking-[0.08em] whitespace-nowrap', GeistMono.className)}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {displayedPins.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <FileText className="w-10 h-10 text-[#eeeeec] mx-auto mb-3" />
                          <p className="text-[13px] text-[#8a8a84]">Aucune tâche à afficher</p>
                        </td>
                      </tr>
                    )}

                    {displayedPins.map(pin => (
                      <tr
                        key={pin.id}
                        onClick={() => setSelectedPin({ ...pin })}
                        className={clsx(
                          'border-b border-[#eeeeec] hover:bg-[#f5f5f4] transition-colors cursor-pointer',
                          selectedIds.has(pin.id) && 'bg-[#f5f5f4]'
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(pin.id)}
                            onClick={e => e.stopPropagation()}
                            onChange={() => toggleSelect(pin.id)}
                            className="w-3.5 h-3.5 rounded-[2px] border-[#d6d6d2] accent-[#0d0d0c]"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Pin pin={pin} />
                            <span className="text-[13px] font-medium text-[#0d0d0c]">
                              {pin.name || 'Pin sans nom'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={clsx('text-[11px] text-[#8a8a84]', GeistMono.className)}>
                            {pin.projects?.project_number}-{pin.pin_number}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {pin.assigned_to?.name ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-[9px] font-medium text-[#4a4a46] flex-shrink-0">
                                {pin.assigned_to.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[13px] text-[#4a4a46]">{pin.assigned_to.name}</span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-[#b8b8b3]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <CategoryComboBox pin={pin} organization_id={organizationId} />
                        </td>

                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <DueDatePicker
                            key={pin.due_date ?? 'null'}
                            pin={pin}
                            onUpdate={handleDueDateUpdate}
                          />
                        </td>

                        <td className="px-4 py-3">
                          {pin.pdf_name ? (
                            <span className="text-[13px] text-[#666660] truncate max-w-[180px] block">
                              {pin.pdf_name}
                            </span>
                          ) : (
                            <span className="text-[13px] text-[#b8b8b3]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {pin.pin_tags?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {pin.pin_tags.map(pt =>
                                pt.tags ? (
                                  <span key={pt.tag_id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#eeeeec] text-[#4a4a46]">
                                    {pt.tags.name}
                                  </span>
                                ) : null
                              )}
                            </div>
                          ) : (
                            <span className="text-[13px] text-[#b8b8b3]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
              </div>
            </div>
          </div>

          {selectedPin && <PinDrawer pin={selectedPin} organization_id={organizationId} />}

          {isAddTaskOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
              <div className={clsx(GeistSans.className, 'bg-white w-full max-w-md rounded-[6px] border border-[#e5e5e2] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)]')}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#eeeeec]">
                  <h3 className="text-base font-medium text-[#050505]">Nouvelle tâche</h3>
                  <button onClick={() => setIsAddTaskOpen(false)} className="p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors">
                    <XIcon className="w-4 h-4 text-[#8a8a84]" />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>Nom</label>
                    <input
                      type="text"
                      placeholder="Nom de la tâche"
                      value={newTaskName}
                      onChange={e => setNewTaskName(e.target.value)}
                      className="w-full rounded-[4px] border border-[#e5e5e2] bg-white px-3 py-2.5 text-[13px] text-[#0d0d0c] placeholder:text-[#b8b8b3] focus:outline-none focus:border-[#0d0d0c] transition-colors"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>
                      Description <span className="text-[#b8b8b3] font-normal normal-case ml-1">(optionnel)</span>
                    </label>
                    <textarea
                      placeholder="Ajouter une description..."
                      value={newTaskDescription}
                      onChange={e => setNewTaskDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-[4px] border border-[#e5e5e2] bg-white px-3 py-2.5 text-[13px] text-[#0d0d0c] placeholder:text-[#b8b8b3] focus:outline-none focus:border-[#0d0d0c] resize-none transition-colors"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#eeeeec]">
                  <button onClick={() => setIsAddTaskOpen(false)} className="px-4 py-2 text-[13px] font-medium text-[#4a4a46] bg-[#eeeeec] rounded-[4px] hover:bg-[#d6d6d2] transition-colors">
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={isCreating || !newTaskName.trim()}
                    className="px-4 py-2 bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreating ? 'Création…' : 'Créer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isGeneratingReport && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 bg-[#0d0d0c] text-white rounded-[6px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] border border-[#2e2e2b]">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
              <div>
                <p className="text-[13px] font-medium">Génération du rapport en cours…</p>
                <p className={clsx('text-[11px] text-[#b8b8b3] mt-0.5', GeistMono.className)}>
                  Traitement de {selectedPinsCount} tâche{selectedPinsCount > 1 ? 's' : ''}, veuillez patienter.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {(!categories || !statuses) && <LoadingScreen projectId={projectId} />}
    </>
  )
}

// ── Report Fields Modal (refactorisée) ────────────────────────────────────────
function ReportFieldsModal({ fields, setFields, onClose, onConfirm, templateConfig: rawTemplateConfig, projectMembers }) {
  const templateConfig = {
    ...rawTemplateConfig,
    planning: {
      enabled:           false,
      title:             "Pointage de planning",
      imagesPerPage:     1,
      fitMode:           "contain",
      showObservations:  true,
      observationsTitle: "Retards et observations",
      ...(rawTemplateConfig?.planning || {}),
    },
  }
  const [displayMode, setDisplayMode] = useState(templateConfig?.tasks?.displayMode || 'list')
  const [reportTitle, setReportTitle] = useState(templateConfig?.reportTitle || 'RAPPORT DE TÂCHES')

  const showParticipants =
    templateConfig?.participants?.enabled === true ||
    templateConfig?.coverPage?.showParticipants === true
  const participantsConfig = templateConfig?.participants || {}

  const [participants, setParticipants] = useState(() =>
    projectMembers.map(m => ({ ...m, present: true }))
  )

  const planningEnabled = templateConfig?.planning?.enabled
  const showPlanningObs = planningEnabled && (templateConfig?.planning?.showObservations ?? true)

  const [planningImageFiles, setPlanningImageFiles]       = useState([])
  const [planningObservations, setPlanningObservations]   = useState(EMPTY_DOC)

  const enabledSections = (templateConfig?.customSections || []).filter(s => s.enabled)
  const [customSectionContents, setCustomSectionContents] = useState(() =>
    enabledSections.map(s => ({ id: s.id, title: s.title, enabled: s.enabled, content: EMPTY_DOC }))
  )

  const toggle = (key) => setFields(f => ({ ...f, [key]: !f[key] }))
  const toggleParticipant = (id) =>
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, present: !p.present } : p))
  const updateSectionContent = (id, content) =>
    setCustomSectionContents(prev => prev.map(s => s.id === id ? { ...s, content } : s))

  const handlePlanningImageUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const newImages = files.map(file => ({
      file,
      url:  URL.createObjectURL(file),
      name: file.name,
    }))
    setPlanningImageFiles(prev => [...prev, ...newImages])
    e.target.value = ''
  }

  const removePlanningImage = (index) => {
    setPlanningImageFiles(prev => {
      const next = [...prev]
      const removed = next.splice(index, 1)[0]
      if (removed?.url?.startsWith('blob:')) URL.revokeObjectURL(removed.url)
      return next
    })
  }

  const movePlanningImage = (index, dir) => {
    setPlanningImageFiles(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm({
      reportTitle,
      displayMode,
      participants,
      customSections:        customSectionContents,
      planningImageFiles:    planningImageFiles.map(p => p.file),
      planningObservations,
    })
  }

  const FIELD_LABELS = {
    description: 'Description', photos: 'Photos', snapshot: 'Snapshot du plan',
    assignedTo: 'Assigné à', dueDate: 'Échéance', category: 'Catégorie', status: 'Statut',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className={clsx(GeistSans.className, 'bg-white w-full max-w-2xl rounded-[6px] border border-[#e5e5e2] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] max-h-[92vh] flex flex-col')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eeeeec] flex-shrink-0">
          <div>
            <h3 className="text-base font-medium text-[#050505]">Composer le rapport</h3>
            {templateConfig?.reportTitle && (
              <p className={clsx('text-[11px] text-[#8a8a84] mt-0.5', GeistMono.className)}>{templateConfig.reportTitle}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors">
            <XIcon className="w-4 h-4 text-[#8a8a84]" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1">

          <div>
            <p className={clsx('text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-2', GeistMono.className)}>Titre du rapport</p>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="RAPPORT DE TÂCHES"
              className="w-full rounded-[4px] border border-[#e5e5e2] bg-white px-3 py-2.5 text-[13px] font-medium text-[#0d0d0c] placeholder:text-[#b8b8b3] focus:outline-none focus:border-[#0d0d0c] transition-colors"
            />
            <p className="text-[10px] text-[#8a8a84] mt-1">
              Ce titre apparaîtra sur la couverture et dans le résumé du rapport.
            </p>
          </div>

          {/* Display mode */}
          <div>
            <p className={clsx('text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-2', GeistMono.className)}>Mode d'affichage</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'list',  label: 'Liste détaillée', icon: <FileText className="w-4 h-4" /> },
                { key: 'table', label: 'Tableau compact',  icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )},
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setDisplayMode(key)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 rounded-[4px] border text-[13px] font-medium transition-colors',
                    displayMode === key
                      ? 'bg-[#0d0d0c] text-white border-[#0d0d0c]'
                      : 'bg-white text-[#4a4a46] border-[#e5e5e2] hover:bg-[#f5f5f4]'
                  )}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <p className={clsx('text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-2', GeistMono.className)}>Champs à inclure</p>
            <div className="space-y-0.5">
              {Object.entries(fields).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 px-3 py-2 rounded-[3px] hover:bg-[#f5f5f4] transition-colors cursor-pointer">
                  <input type="checkbox" checked={value} onChange={() => toggle(key)} className="w-3.5 h-3.5 rounded-[2px] border-[#d6d6d2] accent-[#0d0d0c]" />
                  <span className="text-[13px] text-[#4a4a46]">{FIELD_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Participants */}
          {showParticipants && (
            <div>
              <p className={clsx('text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-2', GeistMono.className)}>
                {participantsConfig.title || 'Participants'}
              </p>
              {participants.length === 0 ? (
                <p className="text-[12px] text-[#b8b8b3] px-1">Aucun membre trouvé sur ce projet.</p>
              ) : (
                <div className="border border-[#e5e5e2] rounded-[4px] overflow-hidden divide-y divide-[#eeeeec]">
                  {participants.map(member => (
                    <div key={member.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-[#f5f5f4] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-[10px] font-medium text-[#4a4a46] flex-shrink-0">
                          {member.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#2e2e2b]">{member.name || '—'}</p>
                          <div className="flex items-center gap-2">
                            {participantsConfig.showRoles   && member.role  && <p className="text-[11px] text-[#8a8a84]">{member.role}</p>}
                            {participantsConfig.showContact && member.email && <p className="text-[11px] text-[#b8b8b3]">{member.email}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={clsx('text-[11px] font-medium', member.present ? 'text-[#0f7a3a]' : 'text-[#b8b8b3]')}>
                          {member.present ? 'Présent' : 'Absent'}
                        </span>
                        <button
                          onClick={() => toggleParticipant(member.id)}
                          className={clsx('w-8 h-4 rounded-full transition-colors relative flex-shrink-0', member.present ? 'bg-[#0d0d0c]' : 'bg-[#eeeeec]')}
                        >
                          <span className={clsx('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform', member.present ? 'translate-x-4' : 'translate-x-0.5')} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Planning */}
          {planningEnabled && (
            <div className="space-y-3">
              <p className={clsx('text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em]', GeistMono.className)}>
                {templateConfig.planning.title || 'Pointage de planning'}
              </p>

              {planningImageFiles.length > 0 && (
                <div className="space-y-2">
                  {planningImageFiles.map((img, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#f5f5f4] rounded-[4px] p-2 border border-[#e5e5e2]">
                      <img src={img.url} alt={img.name} className="w-14 h-10 object-cover rounded-[3px]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#0d0d0c] truncate">{img.name}</p>
                        <p className={clsx('text-[10px] text-[#8a8a84]', GeistMono.className)}>Page {i + 1}</p>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => movePlanningImage(i, -1)} disabled={i === 0} className="w-6 h-6 flex items-center justify-center rounded-[3px] hover:bg-[#eeeeec] disabled:opacity-20 text-[11px] font-bold">▲</button>
                        <button type="button" onClick={() => movePlanningImage(i, 1)} disabled={i === planningImageFiles.length - 1} className="w-6 h-6 flex items-center justify-center rounded-[3px] hover:bg-[#eeeeec] disabled:opacity-20 text-[11px] font-bold">▼</button>
                        <button type="button" onClick={() => removePlanningImage(i)} className="w-6 h-6 flex items-center justify-center rounded-[3px] hover:bg-[#fde8e8] text-[#dc2626]">
                          <XCloseIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label className="block">
                <input type="file" accept="image/*" multiple onChange={handlePlanningImageUpload} className="sr-only" />
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#e5e5e2] rounded-[4px] cursor-pointer hover:border-[#8a8a84] hover:bg-[#f5f5f4] transition-all">
                  <Upload className="w-4 h-4 text-[#8a8a84]" />
                  <span className="text-[12px] text-[#4a4a46]">Ajouter des captures de planning</span>
                </div>
              </label>

              <p className="text-[10px] text-[#8a8a84] px-1">
                Format recommandé : capture d'écran de votre Gantt MS Project. {templateConfig.planning.imagesPerPage === 2 ? '2 images par page.' : '1 image par page.'}
              </p>

              {showPlanningObs && (
                <div className="space-y-2 pt-3 border-t border-[#eeeeec]">
                  <p className="text-[12px] font-medium text-[#2e2e2b]">{templateConfig.planning.observationsTitle || 'Retards et observations'}</p>
                  <RichTextEditor
                    content={planningObservations}
                    onChange={setPlanningObservations}
                    placeholder="Saisissez les retards constatés et observations..."
                    minHeight={120}
                  />
                </div>
              )}
            </div>
          )}

          {/* Custom sections */}
          {enabledSections.length > 0 && (
            <div className="space-y-4">
              <p className={clsx('text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em]', GeistMono.className)}>Sections additionnelles</p>
              {customSectionContents.map(section => (
                <div key={section.id} className="space-y-2">
                  <label className="text-[12px] font-medium text-[#2e2e2b]">{section.title}</label>
                  <RichTextEditor
                    content={section.content}
                    onChange={(content) => updateSectionContent(section.id, content)}
                    placeholder={`Contenu de "${section.title}"...`}
                    minHeight={150}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#eeeeec] flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#4a4a46] bg-[#eeeeec] rounded-[4px] hover:bg-[#d6d6d2] transition-colors">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Générer PDF
          </button>
        </div>
      </div>
    </div>
  )
}