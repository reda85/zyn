'use client'
import { useAtom } from 'jotai'
import { categoriesAtom, pinsAtom, projectPlansAtom, selectedPinAtom, selectedPlanAtom, statusesAtom } from '@/store/atoms'
import NavBar from '@/components/NavBar'
import { selectedProjectAtom } from '@/store/atoms'
import { use, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Outfit } from 'next/font/google'
import Pin from '@/components/Pin'
import { Square3Stack3DIcon } from '@heroicons/react/24/outline'
import CategoryComboBox from '@/components/CategoryComboBox'
import { Calendar1Icon, Download, FileText, Search, Settings, X, XIcon } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Document, Page, PDFDownloadLink, Text } from '@react-pdf/renderer'
import PdfReport from '@/components/PdfReport'
import FilterPanel from '@/components/FilterPanel'
import ListFilterPanel from '@/components/ListFilterPanel'
import LoadingScreen from '@/components/LoadingScreen'
import clsx from 'clsx'
import { useUserData } from '@/hooks/useUserData'
import { fr } from 'date-fns/locale/fr'
import PinDrawer from '@/components/PinDrawer'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

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
      .update({ due_date: date })
      .eq('id', pin.id)
    if (error) console.error('update due_date failed', error)
  }

  return (
    <div className="relative w-40">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'w-full border rounded-md px-2.5 py-1.5 pl-7 text-left bg-white hover:bg-neutral-50 relative transition-colors text-[12px] font-medium',
          isOverDue
            ? 'border-red-200 text-red-600'
            : selectedDate
              ? 'border-neutral-200 text-neutral-900'
              : 'border-neutral-200 text-neutral-300'
        )}
      >
        {selectedDate ? (
          selectedDate.toLocaleDateString('fr-FR')
        ) : (
          'Ajouter échéance'
        )}
        <Calendar1Icon
          size={12}
          className={clsx(
            'absolute left-2.5 top-1/2 -translate-y-1/2',
            isOverDue ? 'text-red-400' : selectedDate ? 'text-neutral-500' : 'text-neutral-300'
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

const updateDueDate = async (date) => {
  const { data, error } = await supabase
    .from('pdf_pins')
    .update({ due_date: date })
    .eq('id', selectedPin.id)
    .select('*')
    .single()
  if (data) {
    setSelectedDate(date)
    setPins(pins.map((p) => (p.id === selectedPin.id ? { ...p, due_date: date } : p)))
  }
  if (error) console.log('updateDueDate', error)
}

export default function Tasks({ params }) {
  const [pins, setPins] = useState([])
  const [originalPinspins, setOriginalPins] = useState([])
  const [plan, setPlan] = useAtom(selectedPlanAtom)
  const [project, setProject] = useAtom(selectedProjectAtom)
  const [categories, setCategories] = useAtom(categoriesAtom)
  const [statuses, setStatuses] = useAtom(statusesAtom)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [projectPlans, setProjectPlans] = useAtom(projectPlansAtom)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [pinsWithSnapshots, setPinsWithSnapshots] = useState(null)
  const { projectId, organizationId } = params
  const { user, profile, organization } = useUserData()
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportFields, setReportFields] = useState({
    description: true,
    photos: true,
    snapshot: true,
    assignedTo: true,
    dueDate: true,
    category: true,
    status: true,
  })
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [availableTemplates, setAvailableTemplates] = useState([])

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase
        .from('report_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      if (data) {
        setAvailableTemplates(data)
        const defaultTemplate = data.find((t) => t.is_default) || data[0]
        setSelectedTemplate(defaultTemplate)
      }
    }
    if (organizationId) fetchTemplates()
  }, [organizationId])

  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#pin-')) {
      const pinId = hash.substring(5)
      const pin = pins.find((p) => p.id === pinId)
      if (pin) {
        setSelectedPin(pin)
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
  }, [pins])

  const handleGenerateReport = async (displayMode) => {
    setIsReportModalOpen(false)
    const selectedPinsArr = pins.filter((p) => selectedIds.has(p.id))
    try {
      const response = await fetch('https://zaynbackend-production.up.railway.app/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          selectedIds: selectedPinsArr.map((p) => p.id),
          fields: reportFields,
          displayMode,
          templateConfig: selectedTemplate?.config || null,
        }),
      })
      if (!response.ok) throw new Error('Erreur lors de la génération PDF')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'rapport-taches.pdf'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Impossible de générer le rapport')
    }
  }

  const handleDueDateUpdate = (pinId, date) => {
    setPins((prev) => prev.map((p) => (p.id === pinId ? { ...p, due_date: date } : p)))
    setOriginalPins((prev) => prev.map((p) => (p.id === pinId ? { ...p, due_date: date } : p)))
  }

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id,created_at,name,plans(id,name)')
        .is('plans.deleted_at', null)
        .eq('id', projectId)
        .single()
      if (data) {
        setProject(data)
        setProjectPlans(data.plans)
      }
    }
    fetchProject()
  }, [projectId])

  useEffect(() => {
    if (projectId && user && profile) {
      const isGuest = profile?.role === 'guest'
      const fetchPins = async () => {
        let query = supabase
          .from('pdf_pins')
          .select(
            'id,name,note,x,y,created_by,status_id,assigned_to(id,name),category_id,categories(name),due_date,pin_number,pdf_name,projects(id,name,project_number,organization_id),project_id,pins_photos(id,public_url),plans(id,name,file_url)'
          )
          .is('deleted_at', null)
          .eq('project_id', projectId)
        if (isGuest) query = query.eq('assigned_to', profile.id)
        const { data, error } = await query
        if (data) setOriginalPins(data)
        if (error) console.log('pins', error)
      }
      fetchPins()
    }
  }, [projectId, user, profile])

  useEffect(() => {
    const filtered = originalPinspins.filter((pin) =>
      (pin.name || 'Pin sans nom').toLowerCase().includes(searchQuery.toLowerCase())
    )
    setPins(filtered)
  }, [searchQuery, originalPinspins])

  useEffect(() => {
    setPins(originalPinspins)
  }, [originalPinspins])

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === pins.length ? new Set() : new Set(pins.map((p) => p.id)))
  }

  const handleExportExcel = () => {
    const selectedPins = pins.filter((pin) => selectedIds.has(pin.id))
    if (!selectedPins.length) return
    const data = selectedPins.map((pin) => ({
      Nom: pin.name || 'Pin sans nom',
      ID: `${pin.projects?.project_number}-${pin.pin_number}`,
      'Assigné à': pin.assigned_to?.name || '',
      Catégorie: pin.categories?.name || '',
      Échéance: pin.due_date ? new Date(pin.due_date).toLocaleDateString('fr-FR') : '',
      Localisation: pin.pdf_name || '',
      Description: pin.note || '',
      'Date de création': pin.created_at
        ? new Date(pin.created_at).toLocaleDateString('fr-FR')
        : '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tâches')
    XLSX.writeFile(wb, 'liste-des-taches.xlsx')
  }

  const handleExportExcelWithEmbeddedMedia = async () => {
    const selectedPins = pins.filter((pin) => selectedIds.has(pin.id))
    if (!selectedPins.length) return
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Pins & Médias')
    sheet.columns = [
      { header: 'Nom pin', key: 'name', width: 25 },
      { header: 'ID pin', key: 'id', width: 15 },
      { header: 'Assigné à', key: 'assignee', width: 20 },
      { header: 'Catégorie', key: 'category', width: 20 },
      { header: 'Échéance', key: 'due', width: 15 },
      { header: 'Description', key: 'note', width: 40 },
      { header: 'Plan', key: 'plan', width: 20 },
      { header: 'Média', key: 'media', width: 25 },
    ]
    for (const pin of selectedPins) {
      const medias = pin.pins_photos?.length ? pin.pins_photos : [null]
      for (const media of medias) {
        const row = sheet.addRow({
          name: pin.name || 'Pin sans nom',
          id: `${pin.projects?.project_number}-${pin.pin_number}`,
          assignee: pin.assigned_to?.name || '',
          category: pin.categories?.name || '',
          due: pin.due_date ? new Date(pin.due_date).toLocaleDateString('fr-FR') : '',
          note: pin.note || '',
          plan: pin.pdf_name || '',
        })
        row.height = 90
        if (media?.public_url) {
          try {
            const response = await fetch(media.public_url)
            const blob = await response.blob()
            const buffer = await blob.arrayBuffer()
            const imageId = workbook.addImage({ buffer, extension: 'jpeg' })
            sheet.addImage(imageId, {
              tl: { col: 7, row: row.number - 1 },
              ext: { width: 120, height: 80 },
            })
          } catch (err) {
            console.error('Image fetch failed', err)
          }
        }
      }
    }
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
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
          name: newTaskName,
          note: newTaskDescription,
          project_id: projectId,
          created_by: profile.id,
          category_id: categories.find((c) => c.order === 0)?.id,
          status_id: statuses.find((s) => s.order === 0)?.id,
        })
        .select('*')
        .single()
      if (error) throw error
      setOriginalPins((prev) => [data, ...prev])
      setPins((prev) => [data, ...prev])
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

  const TABLE_HEADERS = [
    'Nom',
    'ID',
    'Assigné à',
    'Catégorie',
    'Échéance',
    'Localisation',
    'Tags',
  ]

  return (
    <>
      {categories && statuses && (
        <div className={clsx(outfit.className, 'min-h-screen bg-neutral-50')}>
          <NavBar
            project={project}
            id={projectId}
            user={profile}
            organizationId={organizationId}
          />

          <div className="px-8 pt-6 pb-10 max-w-[1400px] mx-auto">
            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h1 className="text-xl font-semibold text-neutral-900">Liste des tâches</h1>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {pins.length} tâche{pins.length > 1 ? 's' : ''} au total
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Rechercher…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 rounded-lg border border-neutral-200 bg-white pl-8 pr-3 py-[7px] text-[13px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 transition-colors"
                  />
                </div>

                <ListFilterPanel
                  pins={pins}
                  setPins={setPins}
                  originalPins={originalPinspins}
                  setOriginalPins={setOriginalPins}
                  user={profile}
                />

                <button
                  onClick={() => setIsAddTaskOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-[7px] bg-neutral-900 text-white rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors"
                >
                  <span className="text-sm leading-none">+</span>
                  Nouvelle tâche
                </button>
              </div>
            </div>

            {/* ── Main card ── */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              {/* Selection bar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                  <p className="text-[12px] font-medium text-neutral-900">
                    {selectedIds.size} tâche{selectedIds.size > 1 ? 's' : ''} sélectionnée
                    {selectedIds.size > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedTemplate?.id || ''}
                      onChange={(e) =>
                        setSelectedTemplate(
                          availableTemplates.find((t) => t.id === e.target.value)
                        )
                      }
                      className="px-2.5 py-1.5 bg-white text-neutral-600 rounded-lg text-[12px] font-medium border border-neutral-200 focus:outline-none focus:border-neutral-400 transition-colors"
                    >
                      <option value="">Template par défaut</option>
                      {availableTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-[12px] font-medium hover:bg-neutral-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>

                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-neutral-600 rounded-lg text-[12px] font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Excel
                    </button>

                    <button
                      onClick={handleExportExcelWithEmbeddedMedia}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-neutral-600 rounded-lg text-[12px] font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors"
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
                />
              )}

              {/* ── Table ── */}
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-4 py-2 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === pins.length && pins.length > 0}
                          onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 rounded border-neutral-300 accent-neutral-900"
                        />
                      </th>
                      {TABLE_HEADERS.map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left text-[10px] font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {pins.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <FileText className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
                          <p className="text-[13px] text-neutral-400">
                            Aucune tâche à afficher
                          </p>
                        </td>
                      </tr>
                    )}

                    {pins.map((pin) => (
                      <tr
                        key={pin.id}
                        onClick={() => setSelectedPin({ ...pin })}
                        className={clsx(
                          'border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer group',
                          selectedIds.has(pin.id) && 'bg-neutral-50'
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(pin.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelect(pin.id)}
                            className="w-3.5 h-3.5 rounded border-neutral-300 accent-neutral-900"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Pin pin={pin} />
                            <span className="text-[13px] font-medium text-neutral-900">
                              {pin.name || 'Pin sans nom'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {pin.projects?.project_number}-{pin.pin_number}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {pin.assigned_to?.name ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-[9px] font-semibold text-neutral-600 flex-shrink-0">
                                {pin.assigned_to.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[13px] text-neutral-600">
                                {pin.assigned_to.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-neutral-300">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <CategoryComboBox pin={pin} />
                        </td>

                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <DueDatePicker pin={pin} onUpdate={handleDueDateUpdate} />
                        </td>

                        <td className="px-4 py-3">
                          {pin.pdf_name ? (
                            <span className="text-[13px] text-neutral-500 truncate max-w-[180px] block">
                              {pin.pdf_name}
                            </span>
                          ) : (
                            <span className="text-[13px] text-neutral-300">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-[13px] text-neutral-500">
                            {pin.tags?.length > 0 ? pin.tags.join(', ') : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {selectedPin && <PinDrawer pin={selectedPin} />}

          {/* ── Create Task Modal ── */}
          {isAddTaskOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
              <div
                className={clsx(
                  outfit.className,
                  'bg-white w-full max-w-md rounded-xl border border-neutral-200 shadow-xl'
                )}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                  <h3 className="text-base font-semibold text-neutral-900">Nouvelle tâche</h3>
                  <button
                    onClick={() => setIsAddTaskOpen(false)}
                    className="p-1 rounded-md hover:bg-neutral-100 transition-colors"
                  >
                    <XIcon className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                      Nom
                    </label>
                    <input
                      type="text"
                      placeholder="Nom de la tâche"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 transition-colors"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                      Description
                      <span className="text-neutral-300 font-normal normal-case ml-1">
                        (optionnel)
                      </span>
                    </label>
                    <textarea
                      placeholder="Ajouter une description..."
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 resize-none transition-colors"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-100">
                  <button
                    onClick={() => setIsAddTaskOpen(false)}
                    className="px-4 py-2 text-[13px] font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={isCreating || !newTaskName.trim()}
                    className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-[13px] font-medium hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreating ? 'Création…' : 'Créer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(!categories || !statuses) && <LoadingScreen projectId={projectId} />}
    </>
  )
}

function ReportFieldsModal({ fields, setFields, onClose, onConfirm }) {
  const [displayMode, setDisplayMode] = useState('list')
  const toggle = (key) => setFields((f) => ({ ...f, [key]: !f[key] }))

  const FIELD_LABELS = {
    description: 'Description',
    photos: 'Photos',
    snapshot: 'Snapshot du plan',
    assignedTo: 'Assigné à',
    dueDate: 'Échéance',
    category: 'Catégorie',
    status: 'Statut',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div
        className={clsx(
          'bg-white w-full max-w-md rounded-xl border border-neutral-200 shadow-xl'
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h3 className="text-base font-semibold text-neutral-900">Options du rapport</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-neutral-100 transition-colors"
          >
            <XIcon className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2">
              Mode d'affichage
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  key: 'list',
                  label: 'Liste détaillée',
                  icon: <FileText className="w-4 h-4" />,
                },
                {
                  key: 'table',
                  label: 'Tableau compact',
                  icon: (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  ),
                },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setDisplayMode(key)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[13px] font-medium transition-colors',
                    displayMode === key
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              {displayMode === 'list'
                ? 'Affichage détaillé avec snapshots et photos'
                : "Vue tableau compacte idéale pour l'impression"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2">
              Champs à inclure
            </p>
            <div className="space-y-0.5 max-h-52 overflow-y-auto">
              {Object.entries(fields).map(([key, value]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => toggle(key)}
                    className="w-3.5 h-3.5 rounded border-neutral-300 accent-neutral-900"
                  />
                  <span className="text-[13px] text-neutral-600">{FIELD_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(displayMode)}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Générer PDF
          </button>
        </div>
      </div>
    </div>
  )
}