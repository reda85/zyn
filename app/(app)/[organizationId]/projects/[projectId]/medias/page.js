'use client'
import { useAtom } from "jotai"
import { selectedPlanAtom, selectedProjectAtom } from "@/store/atoms"
import NavBar from "@/components/NavBar"
import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Outfit } from "next/font/google"
import GroupedMediaGallery from "@/components/GroupedMediaGallery"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Calendar, X, Image as ImageIcon, Download, Search } from "lucide-react"
import clsx from "clsx"
import { useUserData } from "@/hooks/useUserData"

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

export default function Medias({ params }) {
  const [plan, setPlan] = useAtom(selectedPlanAtom)
  const [project, setProject] = useAtom(selectedProjectAtom)
  const { user, profile, organization } = useUserData()

  const { projectId, organizationId } = params

  const [medias, setMedias] = useState([])
  const [filteredMedias, setFilteredMedias] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Filter states
  const [selectedCanvas, setSelectedCanvas] = useState("")
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [selectedTags, setSelectedTags] = useState([])

  // Dropdown data
  const [users, setUsers] = useState([])
  const [tags, setTags] = useState([])

  // Fetch project
  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, created_at, name, plans(id, name)')
        .eq('id', projectId)
        .is('plans.deleted_at', null)
        .single()
      if (data) setProject(data)
    }
    if (projectId) fetchProject()
  }, [projectId])

  // Fetch medias
  useEffect(() => {
    if (!projectId || !user || !profile) return
    const fetchMedias = async () => {
      if (profile?.role === 'guest') {
        const { data, error } = await supabase
          .from('pins_photos')
          .select(`*, pdf_pins!inner(*, assigned_to)`)
          .eq('project_id', projectId)
          .eq('pdf_pins.assigned_to', profile.id)
          .order('created_at', { ascending: false })
        if (data) { setMedias(data); setFilteredMedias(data) }
        if (error) console.error("Medias error", error)
      } else {
        const { data, error } = await supabase
          .from('pins_photos')
          .select('*, pdf_pins(*,assigned_to(id,name))')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
        if (data) { setMedias(data); setFilteredMedias(data) }
        if (error) console.error("Medias error", error)
      }
    }
    fetchMedias()
  }, [projectId, user, profile])

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('members').select('id, name')
      if (data) setUsers(data)
    }
    fetchUsers()
  }, [])

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase.from('tags').select('id, name')
      if (data) setTags(data)
    }
    fetchTags()
  }, [])

  // Local filtering
  useEffect(() => {
    let result = [...medias]
    if (selectedCanvas) result = result.filter(m => m.pdf_pins?.plan_id == selectedCanvas)
    if (startDate || endDate) {
      result = result.filter(m => {
        const created = new Date(m.created_at)
        const start = startDate || new Date(0)
        const end = endDate || new Date()
        return created >= start && created <= end
      })
    }
    if (selectedUsers.length > 0) result = result.filter(m => selectedUsers.includes(m.user_id))
    if (selectedTags.length > 0) result = result.filter(m => m.tags?.some(t => selectedTags.includes(t.id)))
    setFilteredMedias(result)
  }, [medias, selectedCanvas, startDate, endDate, selectedUsers, selectedTags])

  const clearFilters = () => {
    setSelectedCanvas("")
    setStartDate(null)
    setEndDate(null)
    setSelectedUsers([])
    setSelectedTags([])
  }

  const handleDownload = async () => {
    const ids = Array.from(selectedIds).join(',')
    const downloadUrl = `https://zaynbackend-production.up.railway.app/api/mediareport?projectId=${projectId}&selectedIds=${ids}`
    try {
      const response = await fetch(downloadUrl)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'rapport-medias.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to download PDF:", error)
    }
  }

  const hasActiveFilters = selectedCanvas || startDate || endDate || selectedUsers.length > 0 || selectedTags.length > 0

  return (
    <div className={clsx(outfit.className, "min-h-screen bg-[#f9fafb]")}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} />

      <div className="px-6 pt-5 pb-10 max-w-[1400px] mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[15px] font-semibold text-[#111827] tracking-tight">
              Médiathèque
            </h1>
            <p className="text-[12px] text-[#6b7280] mt-0.5">
              {filteredMedias.length} photo{filteredMedias.length > 1 ? 's' : ''}{hasActiveFilters ? ` sur ${medias.length} au total` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Canvas select */}
            <select
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-[#374151] font-medium focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-all"
              value={selectedCanvas}
              onChange={(e) => setSelectedCanvas(e.target.value)}
            >
              <option value="">Tous les plans</option>
              {project?.plans?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Date range picker */}
            <div className="relative">
              <DatePicker
                selectsRange
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  const [start, end] = update
                  setStartDate(start)
                  setEndDate(end)
                }}
                isClearable
                placeholderText="Période"
                className="rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-2 text-[13px] text-[#374151] font-medium focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-all w-52"
                dateFormat="dd/MM/yyyy"
              />
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#6b7280] hover:text-[#111827] border border-gray-200 bg-white rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

          {/* Active filters + selection bar */}
          {(hasActiveFilters || selectedIds.size > 0) && (
            <div className="flex items-center justify-between px-5 py-3 bg-[#f9fafb] border-b border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedIds.size > 0 && (
                  <p className="text-[12px] font-medium text-[#374151]">
                    {selectedIds.size} photo{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
                  </p>
                )}
                {selectedCanvas && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-md text-[11px] font-medium text-[#374151]">
                    Plan : {project?.plans?.find(p => p.id == selectedCanvas)?.name}
                    <button onClick={() => setSelectedCanvas("")} className="hover:text-[#111827] transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {(startDate || endDate) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-md text-[11px] font-medium text-[#374151]">
                    {startDate?.toLocaleDateString('fr-FR')} – {endDate?.toLocaleDateString('fr-FR') || 'Maintenant'}
                    <button onClick={() => { setStartDate(null); setEndDate(null) }} className="hover:text-[#111827] transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              {selectedIds.size > 0 && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] text-white rounded-lg text-[12px] font-medium hover:bg-[#1f2937] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Rapport PDF
                </button>
              )}
            </div>
          )}

          {/* Gallery */}
          <div className="p-6">
            {filteredMedias.length === 0 ? (
              <div className="py-16 text-center">
                <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-[13px] text-[#9ca3af]">
                  {hasActiveFilters ? "Aucun résultat pour ces filtres" : "Aucune photo à afficher"}
                </p>
              </div>
            ) : (
              <GroupedMediaGallery
                media={filteredMedias}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}