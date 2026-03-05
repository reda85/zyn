'use client'
import { useAtom } from "jotai"
import { categoriesAtom, pinsAtom, projectPlansAtom, selectedPinAtom, selectedPlanAtom, statusesAtom } from "@/store/atoms"
import NavBar from "@/components/NavBar"
import { selectedProjectAtom } from "@/store/atoms"
import { use, useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Outfit } from "next/font/google"
import Pin from "@/components/Pin"
import { Square3Stack3DIcon } from "@heroicons/react/24/outline"
import CategoryComboBox from "@/components/CategoryComboBox"
import { Calendar1Icon, Download, FileText, Search, Settings, X, XIcon } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css";
import { Document, Page, PDFDownloadLink, Text } from "@react-pdf/renderer"
import PdfReport from "@/components/PdfReport"
import FilterPanel from "@/components/FilterPanel"
import ListFilterPanel from "@/components/ListFilterPanel"
import LoadingScreen from "@/components/LoadingScreen"
import clsx from "clsx"
import { useUserData } from "@/hooks/useUserData"
import {fr} from 'date-fns/locale/fr'
import PinDrawer from "@/components/PinDrawer"
import * as XLSX from "xlsx"
import ExcelJS from "exceljs"

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

const DueDatePicker = ({ pin, onUpdate }) => {
  const [selectedDate, setSelectedDate] = useState(
    pin?.due_date ? new Date(pin.due_date) : null
  );
  const [open, setOpen] = useState(false);
  const isOverDue = selectedDate instanceof Date && selectedDate < new Date();

  const handleChange = async (date) => {
    setSelectedDate(date);
    setOpen(false);
    const { error } = await supabase
      .from("pdf_pins")
      .update({ due_date: date })
      .eq("id", pin.id);
    if (error) console.error("update due_date failed", error);
  };

  return (
    <div className="relative w-44">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "w-full border rounded-lg px-3 py-1.5 pl-8 text-left bg-white hover:bg-gray-50 relative transition-all text-[12px] font-medium",
          isOverDue
            ? "border-red-200 text-red-600"
            : "border-gray-200 text-[#374151]"
        )}
      >
        {selectedDate ? selectedDate.toLocaleDateString("fr-FR") : (
          <span className="text-[#9ca3af]">Ajouter échéance</span>
        )}
        <Calendar1Icon
          size={13}
          className={clsx(
            "absolute left-2.5 top-1/2 -translate-y-1/2",
            isOverDue ? "text-red-400" : "text-[#9ca3af]"
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
  );
};

const updateDueDate = async (date) => {
  const { data, error } = await supabase
    .from('pdf_pins')
    .update({ due_date: date })
    .eq('id', selectedPin.id)
    .select('*')
    .single();
  if (data) {
    setSelectedDate(date);
    setPins(pins.map((p) => (p.id === selectedPin.id ? { ...p, due_date: date } : p)));
  }
  if (error) console.log('updateDueDate', error);
};

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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pinsWithSnapshots, setPinsWithSnapshots] = useState(null);
  const { projectId, organizationId } = params;
  const { user, profile, organization } = useUserData();
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
        const defaultTemplate = data.find(t => t.is_default) || data[0]
        setSelectedTemplate(defaultTemplate)
      }
    }
    if (organizationId) fetchTemplates()
  }, [organizationId])

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#pin-')) {
      const pinId = hash.substring(5);
      const pin = pins.find(p => p.id === pinId);
      if (pin) {
        setSelectedPin(pin);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [pins]);

  const handleGenerateReport = async (displayMode) => {
    setIsReportModalOpen(false)
    const selectedPinsArr = pins.filter((p) => selectedIds.has(p.id))
    try {
      const response = await fetch("https://zaynbackend-production.up.railway.app/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          selectedIds: selectedPinsArr.map((p) => p.id),
          fields: reportFields,
          displayMode,
          templateConfig: selectedTemplate?.config || null
        }),
      })
      if (!response.ok) throw new Error("Erreur lors de la génération PDF")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "rapport-taches.pdf"
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("Impossible de générer le rapport")
    }
  }

  const handleDueDateUpdate = (pinId, date) => {
    setPins(prev => prev.map(p => p.id === pinId ? { ...p, due_date: date } : p));
    setOriginalPins(prev => prev.map(p => p.id === pinId ? { ...p, due_date: date } : p));
  };

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase.from('projects').select('id,created_at,name,plans(id,name)').is('plans.deleted_at', null).eq('id', projectId).single();
      if (data) { setProject(data); setProjectPlans(data.plans) }
    }
    fetchProject()
  }, [projectId])

  useEffect(() => {
    if (projectId && user && profile) {
      const isGuest = profile?.role === 'guest';
      const fetchPins = async () => {
        let query = supabase
          .from('pdf_pins')
          .select('id,name,note,x,y,created_by,status_id,assigned_to(id,name),category_id,categories(name),due_date,pin_number,pdf_name,projects(id,name,project_number,organization_id),project_id,pins_photos(id,public_url),plans(id,name,file_url)')
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
    const filtered = originalPinspins.filter(pin =>
      (pin.name || "Pin sans nom").toLowerCase().includes(searchQuery.toLowerCase())
    );
    setPins(filtered);
  }, [searchQuery, originalPinspins]);

  useEffect(() => { setPins(originalPinspins) }, [originalPinspins])

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === pins.length ? new Set() : new Set(pins.map(p => p.id)));
  };

  const handleExportExcel = () => {
    const selectedPins = pins.filter(pin => selectedIds.has(pin.id))
    if (!selectedPins.length) return
    const data = selectedPins.map(pin => ({
      Nom: pin.name || "Pin sans nom",
      ID: `${pin.projects?.project_number}-${pin.pin_number}`,
      "Assigné à": pin.assigned_to?.name || "",
      Catégorie: pin.categories?.name || "",
      Échéance: pin.due_date ? new Date(pin.due_date).toLocaleDateString("fr-FR") : "",
      Localisation: pin.pdf_name || "",
      Description: pin.note || "",
      "Date de création": pin.created_at ? new Date(pin.created_at).toLocaleDateString("fr-FR") : ""
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Tâches")
    XLSX.writeFile(wb, "liste-des-taches.xlsx")
  }

  const handleExportExcelWithEmbeddedMedia = async () => {
    const selectedPins = pins.filter(pin => selectedIds.has(pin.id))
    if (!selectedPins.length) return
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Pins & Médias")
    sheet.columns = [
      { header: "Nom pin", key: "name", width: 25 },
      { header: "ID pin", key: "id", width: 15 },
      { header: "Assigné à", key: "assignee", width: 20 },
      { header: "Catégorie", key: "category", width: 20 },
      { header: "Échéance", key: "due", width: 15 },
      { header: "Description", key: "note", width: 40 },
      { header: "Plan", key: "plan", width: 20 },
      { header: "Média", key: "media", width: 25 }
    ]
    for (const pin of selectedPins) {
      const medias = pin.pins_photos?.length ? pin.pins_photos : [null]
      for (const media of medias) {
        const row = sheet.addRow({
          name: pin.name || "Pin sans nom",
          id: `${pin.projects?.project_number}-${pin.pin_number}`,
          assignee: pin.assigned_to?.name || "",
          category: pin.categories?.name || "",
          due: pin.due_date ? new Date(pin.due_date).toLocaleDateString("fr-FR") : "",
          note: pin.note || "",
          plan: pin.pdf_name || ""
        })
        row.height = 90
        if (media?.public_url) {
          try {
            const response = await fetch(media.public_url)
            const blob = await response.blob()
            const buffer = await blob.arrayBuffer()
            const imageId = workbook.addImage({ buffer, extension: "jpeg" })
            sheet.addImage(imageId, { tl: { col: 7, row: row.number - 1 }, ext: { width: 120, height: 80 } })
          } catch (err) {
            console.error("Image fetch failed", err)
          }
        }
      }
    }
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "pins-medias-avec-images.xlsx"
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
          category_id: categories.find(c => c.order === 0)?.id,
          status_id: statuses.find(s => s.order === 0)?.id,
        })
        .select('*')
        .single()
      if (error) throw error
      setOriginalPins(prev => [data, ...prev])
      setPins(prev => [data, ...prev])
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

  const TABLE_HEADERS = ['Nom', 'ID', 'Assigné à', 'Catégorie', 'Échéance', 'Localisation', 'Tags']

  return (
    <>
      {categories && statuses && (
        <div className={clsx(outfit.className, "min-h-screen bg-[#f9fafb]")}>
          <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} />

          <div className="px-6 pt-5 pb-10 max-w-[1400px] mx-auto">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-[15px] font-semibold text-[#111827] tracking-tight">
                  Liste des tâches
                </h1>
                <p className="text-[12px] text-[#6b7280] mt-0.5">
                  {pins.length} tâche{pins.length > 1 ? 's' : ''} au total
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
                  <input
                    type="text"
                    placeholder="Rechercher…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-52 rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-all"
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
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#111827] text-white rounded-lg text-[13px] font-medium hover:bg-[#1f2937] transition-colors"
                >
                  <span className="text-base leading-none">+</span>
                  Nouvelle tâche
                </button>
              </div>
            </div>

            {/* ── Main card ── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

              {/* Selection action bar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between px-5 py-3 bg-[#f9fafb] border-b border-gray-200">
                  <p className="text-[12px] font-medium text-[#374151]">
                    {selectedIds.size} tâche{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTemplate?.id || ''}
                      onChange={(e) => setSelectedTemplate(availableTemplates.find(t => t.id === e.target.value))}
                      className="px-3 py-1.5 bg-white text-[#374151] rounded-lg text-[12px] font-medium border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/10"
                    >
                      <option value="">Template par défaut</option>
                      {availableTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] text-white rounded-lg text-[12px] font-medium hover:bg-[#1f2937] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Rapport PDF
                    </button>

                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#374151] rounded-lg text-[12px] font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Excel
                    </button>

                    <button
                      onClick={handleExportExcelWithEmbeddedMedia}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#374151] rounded-lg text-[12px] font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
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
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === pins.length && pins.length > 0}
                          onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-[#111827]"
                        />
                      </th>
                      {TABLE_HEADERS.map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-[#6b7280] uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {pins.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                          <p className="text-[13px] text-[#9ca3af]">Aucune tâche à afficher</p>
                        </td>
                      </tr>
                    )}

                    {pins.map(pin => (
                      <tr
                        key={pin.id}
                        onClick={() => setSelectedPin({ ...pin })}
                        className={clsx(
                          "hover:bg-[#f9fafb] transition-colors cursor-pointer",
                          selectedIds.has(pin.id) && "bg-[#f5f5f5]"
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(pin.id)}
                            onClick={e => e.stopPropagation()}
                            onChange={() => toggleSelect(pin.id)}
                            className="w-3.5 h-3.5 rounded border-gray-300 accent-[#111827]"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Pin pin={pin} />
                            <span className="text-[13px] font-medium text-[#111827]">
                              {pin.name || "Pin sans nom"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-[12px] text-[#6b7280] font-mono">
                            {pin.projects?.project_number}-{pin.pin_number}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {pin.assigned_to?.name ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-[#6b7280] flex-shrink-0">
                                {pin.assigned_to.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[12px] text-[#374151]">{pin.assigned_to.name}</span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[#d1d5db]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <CategoryComboBox pin={pin} />
                        </td>

                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <DueDatePicker pin={pin} onUpdate={handleDueDateUpdate} />
                        </td>

                        <td className="px-4 py-3">
                          {pin.pdf_name ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md w-fit">
                              <Square3Stack3DIcon className="w-3.5 h-3.5 text-[#9ca3af]" />
                              <span className="text-[11px] text-[#374151]">{pin.pdf_name}</span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[#d1d5db]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-[12px] text-[#9ca3af]">
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

          {isAddTaskOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className={clsx(outfit.className, "bg-white w-full max-w-md rounded-xl border border-gray-200 shadow-2xl")}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <h3 className="text-[14px] font-semibold text-[#111827]">Nouvelle tâche</h3>
                  <button onClick={() => setIsAddTaskOpen(false)} className="text-[#9ca3af] hover:text-[#374151] transition-colors">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <input
                    type="text"
                    placeholder="Nom de la tâche"
                    value={newTaskName}
                    onChange={e => setNewTaskName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300"
                    autoFocus
                  />
                  <textarea
                    placeholder="Description (optionnel)"
                    value={newTaskDescription}
                    onChange={e => setNewTaskDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
                  <button
                    onClick={() => setIsAddTaskOpen(false)}
                    className="px-3 py-2 text-[13px] text-[#374151] rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={isCreating || !newTaskName.trim()}
                    className="px-4 py-2 bg-[#111827] text-white rounded-lg text-[13px] font-medium hover:bg-[#1f2937] disabled:opacity-40 transition-colors"
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
  const [displayMode, setDisplayMode] = useState("list")
  const toggle = (key) => setFields(f => ({ ...f, [key]: !f[key] }))

  const FIELD_LABELS = {
    description: "Description",
    photos: "Photos",
    snapshot: "Snapshot du plan",
    assignedTo: "Assigné à",
    dueDate: "Échéance",
    category: "Catégorie",
    status: "Statut",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className={clsx(outfit.className, "bg-white w-full max-w-md rounded-xl border border-gray-200 shadow-2xl")}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-[14px] font-semibold text-[#111827]">Options du rapport</h3>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151] transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wider mb-2">Mode d'affichage</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'list', label: 'Liste détaillée', icon: <FileText className="w-4 h-4" /> },
                {
                  key: 'table', label: 'Tableau compact', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )
                }
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setDisplayMode(key)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[13px] font-medium transition-all",
                    displayMode === key
                      ? "bg-[#111827] text-white border-[#111827]"
                      : "bg-white text-[#374151] border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#9ca3af] mt-1.5">
              {displayMode === "list" ? "Affichage détaillé avec snapshots et photos" : "Vue tableau compacte idéale pour l'impression"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wider mb-2">Champs à inclure</p>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {Object.entries(fields).map(([key, value]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => toggle(key)}
                    className="w-3.5 h-3.5 rounded border-gray-300 accent-[#111827]"
                  />
                  <span className="text-[13px] text-[#374151]">{FIELD_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-3 py-2 text-[13px] text-[#374151] rounded-lg hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(displayMode)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white rounded-lg text-[13px] font-medium hover:bg-[#1f2937] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Générer PDF
          </button>
        </div>
      </div>
    </div>
  )
}
