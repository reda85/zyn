'use client'
import { useAtom } from "jotai"
import { selectedPlanAtom, selectedProjectAtom } from "@/store/atoms"
import NavBar from "@/components/NavBar"
import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Lexend } from "next/font/google"
import GroupedMediaGallery from "@/components/GroupedMediaGallery"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export default function Medias({ params }) {
  const [plan, setPlan] = useAtom(selectedPlanAtom)
  const [project, setProject] = useAtom(selectedProjectAtom)

  const { projectId } = params

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
        .single()
      if (data) setProject(data)
    }
    if (projectId) fetchProject()
  }, [projectId])

  // Fetch medias
  useEffect(() => {
    const fetchMedias = async () => {
      const { data, error } = await supabase
        .from('pins_photos')
        .select('*, pdf_pins(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (data) {
        setMedias(data)
        setFilteredMedias(data)
      }
      if (error) console.error("Medias error", error)
    }
    if (projectId) fetchMedias()
  }, [projectId])

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
    let result = medias

    if (selectedCanvas) {
      result = result.filter(m => m.pdf_pins?.plan_id === selectedCanvas)
    }
    if (startDate && endDate) {
      result = result.filter(m => {
        const created = new Date(m.created_at)
        return created >= startDate && created <= endDate
      })
    }
    if (selectedUsers.length > 0) {
      result = result.filter(m => selectedUsers.includes(m.user_id))
    }
    if (selectedTags.length > 0) {
      result = result.filter(m => m.tags?.some(t => selectedTags.includes(t.id)))
    }

    setFilteredMedias(result)
  }, [medias, selectedCanvas, startDate, endDate, selectedUsers, selectedTags])

  return (
    <div className={lexend.className}>
      <NavBar project={project} id={projectId} />
      <div className="pt-3 px-3 bg-gray-100 min-h-screen">
        <div className="bg-white border border-gray-300 rounded-t-lg p-6">

          {/* Title + Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold">Medias</h2>

            <div className="flex flex-wrap items-center gap-3">

              {/* Canvas select */}
              <select
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                value={selectedCanvas}
                onChange={(e) => setSelectedCanvas(e.target.value)}
              >
                <option value="">All Canvases</option>
                {project?.plans?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Date range */}
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
                placeholderText="Date range"
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              />

              {/* Users multi-select 
             <select
  multiple
  className="border border-gray-300 rounded px-3 py-1 text-sm"
  value={selectedUsers}
  onChange={(e) =>
    setSelectedUsers(
      Array.from(e.target.selectedOptions, opt => Number(opt.value)) // <-- convert to number
    )
  }
>
  {users.map((u) => (
    <option key={u.id} value={u.id}>{u.name}</option>
  ))}
</select>

*/}
              {/* Tags multi-select 
              <select
                multiple
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                value={selectedTags}
                onChange={(e) =>
                  setSelectedTags(Array.from(e.target.selectedOptions, opt => opt.value))
                }
              >
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              */}
            </div>
          </div>

          {/* Gallery */}
          <GroupedMediaGallery
            media={filteredMedias}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
          />
        </div>
      </div>
    </div>
  )
}
