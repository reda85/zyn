'use client'
import { useAtom } from "jotai"
import { selectedPlanAtom, selectedProjectAtom } from "@/store/atoms"
import NavBar from "@/components/NavBar"
import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Lexend, Outfit } from "next/font/google"
import GroupedMediaGallery from "@/components/GroupedMediaGallery"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Calendar, X, Image as ImageIcon, Download } from "lucide-react"
import clsx from "clsx"
import { useUserData } from "@/hooks/useUserData"

const lexend = Outfit({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export default function Medias({ params }) {
  const [plan, setPlan] = useAtom(selectedPlanAtom)
  const [project, setProject] = useAtom(selectedProjectAtom)
  const {user, profile, organization} = useUserData()

  const { projectId, organizationId } = params
  console.log('projectId', projectId)

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
        .is('plans.deleted_at',null)
        .single()
      if (data) setProject(data)
    }
    if (projectId) fetchProject()
  }, [projectId])

  // Fetch medias
  useEffect(() => {
    console.log('fetchMedias', profile, user, projectId)
    if (!projectId || !user || !profile) return;
    const fetchMedias = async () => {
      console.log('on est dans fetchMedias')
      if (profile?.role === 'guest') {
        console.log('fetchMedias isguest')
        const { data, error } = await supabase
    .from('pins_photos')
    .select(`
      *,
      pdf_pins!inner(
        *,
        assigned_to
      )
    `)
    .eq('project_id', projectId)
    .eq('pdf_pins.assigned_to', profile.id) // C'est ici que le filtre s'applique
    .order('created_at', { ascending: false });
     if (data) {
        console.log('medias', data)
        setMedias(data)
        setFilteredMedias(data)
      }
      if (error) console.error("Medias error", error)
      }
      else {
      const { data, error } = await supabase
        .from('pins_photos')
        .select('*, pdf_pins(*,assigned_to(id,name))')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (data) {
        console.log('medias', data)
        setMedias(data)
        setFilteredMedias(data)
      }
      if (error) console.error("Medias error", error)
    }
    }
    if (projectId && user  && profile) {
      console.log('fetchMedias 1')
      fetchMedias()
    }
    
  }, [projectId, user, profile])

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('members').select('id, name')
      if (data) setUsers(data)
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    console.log('selectedIds', selectedIds)
  }, [selectedIds])

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

    // Filter by canvas/plan
    if (selectedCanvas) {
      console.log('Filtering by canvas', selectedCanvas)
      result = result.filter(m => m.pdf_pins?.plan_id == selectedCanvas)
    }

    // Filter by date range
    if (startDate || endDate) {
      result = result.filter(m => {
        const created = new Date(m.created_at)
        const start = startDate || new Date(0) // Beginning of time if no start
        const end = endDate || new Date() // Now if no end
        return created >= start && created <= end
      })
    }

    // Filter by users
    if (selectedUsers.length > 0) {
      result = result.filter(m => selectedUsers.includes(m.user_id))
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      result = result.filter(m => m.tags?.some(t => selectedTags.includes(t.id)))
    }

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
    const ids = Array.from(selectedIds).join(',');
    console.log('ids', ids)
    const downloadUrl = `https://zaynbackend-production.up.railway.app/api/mediareport?projectId=${projectId}&selectedIds=${ids}`;

    // Optionally: show loading state here
    
    try {
       const response = await fetch(downloadUrl);
  if (!response.ok) {
      console.error('Download Failed. Status:', response.status); // <--- ADD THIS LOG
      // To see the server's error message, read the text response
      const errorText = await response.text();
      console.error('Server Error Message:', errorText); // <--- AND THIS LOG
      throw new Error(`HTTP error! status: ${response.status}`);
  }
        
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rapport-medias.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Failed to download PDF:", error);
        // Handle error display
    } finally {
        // Optionally: hide loading state
    }
};

  const hasActiveFilters = selectedCanvas || startDate || endDate || selectedUsers.length > 0 || selectedTags.length > 0

  return (
    <div className={clsx(lexend.className, "min-h-screen bg-gray-50 font-sans")}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} />
      
      <div className="pt-6 px-6">
        {/* Header Card */}
        <div className="bg-card border border-border/50 rounded-xl shadow-sm mb-6">
          
          {/* Title + Filters Row */}
          <div className="p-6 border-b border-border/50">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold font-heading text-stone-900 mb-1">
                  Médiathèque
                </h2>
                <p className="text-sm text-stone-500">
                  {filteredMedias.length} photo{filteredMedias.length > 1 ? 's' : ''} {hasActiveFilters && `sur ${medias.length} au total`}
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Réinitialiser les filtres
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Canvas select */}
              <select
                className="border border-border/50 bg-secondary/30 rounded-xl px-4 py-2.5 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
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
                  className="border border-border/50 bg-secondary/30 rounded-xl px-4 py-2.5 pl-10 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all w-64"
                  dateFormat="dd/MM/yyyy"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
              </div>

              {/* Active filters badges */}
              {selectedCanvas && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
                  Plan: {project?.plans?.find(p => p.id == selectedCanvas)?.name}
                  <button 
                    onClick={() => setSelectedCanvas("")}
                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
                  {startDate?.toLocaleDateString('fr-FR')} - {endDate?.toLocaleDateString('fr-FR') || 'Maintenant'}
                  <button 
                    onClick={() => { setStartDate(null); setEndDate(null); }}
                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
              {selectedIds.size > 0 && (
              <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
                {/* ... selection count ... */}
                <div className="flex gap-3">
                  <button 
                    onClick={handleDownload}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger le rapport
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gallery */}
          <div className="p-6">
            {filteredMedias.length === 0 ? (
              <div className="py-16 text-center">
                <ImageIcon className="w-16 h-16 text-stone-500/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold font-heading text-stone-900 mb-2">
                  Aucune photo trouvée
                </h3>
                <p className="text-stone-500 text-sm">
                  {hasActiveFilters 
                    ? "Essayez de modifier vos filtres pour voir plus de résultats" 
                    : "Les photos ajoutées au projet apparaîtront ici"}
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