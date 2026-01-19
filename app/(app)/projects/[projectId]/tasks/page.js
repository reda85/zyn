'use client'
import { useAtom } from "jotai"
import { categoriesAtom, pinsAtom, selectedPinAtom, selectedPlanAtom, statusesAtom } from "@/store/atoms"
import NavBar from "@/components/NavBar"
import { selectedProjectAtom } from "@/store/atoms"
import { use, useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { DM_Sans, Figtree, Lexend, Outfit, PT_Sans, Rubik, Work_Sans } from "next/font/google"
import Pin from "@/components/Pin"
import { Square3Stack3DIcon } from "@heroicons/react/24/outline"
import CategoryComboBox from "@/components/CategoryComboBox"
import { Calendar1Icon, Download, FileText, Search } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css";
import { Document, Page, PDFDownloadLink, Text } from "@react-pdf/renderer"
import PdfReport from "@/components/PdfReport"
//import { getZoomedInPinImage } from "@/utils/pdfUtils"
import FilterPanel from "@/components/FilterPanel"
import ListFilterPanel from "../../../../../components/ListFilterPanel"
import LoadingScreen from "@/components/LoadingScreen"
import clsx from "clsx"
import { useUserData } from "@/hooks/useUserData"
import {fr} from 'date-fns/locale/fr'
import PinDrawer from "@/components/PinDrawer"
import * as XLSX from "xlsx"
 import ExcelJS from "exceljs"


const figtree = Outfit({subsets: ['latin'], variable: '--font-figtree', display: 'swap'});

const DueDatePicker = ({ pin, onUpdate }) => {
  const [selectedDate, setSelectedDate] = useState(
    pin?.due_date ? new Date(pin.due_date) : null
  );
  const [open, setOpen] = useState(false);

  const isOverDue =
    selectedDate instanceof Date && selectedDate < new Date();

  const handleChange = async (date) => {
    setSelectedDate(date);
    setOpen(false);

    const { error } = await supabase
      .from("pdf_pins")
      .update({ due_date: date })
      .eq("id", pin.id);

    if (!error) {
     // onUpdate(pin.id, date);
    } else {
      console.error("update due_date failed", error);
    }
  };

  return (
    <div className="relative w-48">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "w-full border rounded-lg px-3 py-2 pl-10 text-left bg-secondary/50 hover:bg-secondary/80 relative transition-all text-sm font-medium",
          isOverDue
            ? "border-destructive text-destructive"
            : "border-border/50 text-foreground"
        )}
      >
        {selectedDate
          ? selectedDate.toLocaleDateString("fr-FR")
          : "Ajouter échéance"}

        <Calendar1Icon
          size={16}
          className={clsx(
            "absolute left-3 top-1/2 -translate-y-1/2",
            isOverDue && "text-destructive"
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2">
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
      .is('deleted_at', null)
      .select('*')
      .single();
    if (data) {
      console.log('updateDueDate', data);
      setSelectedDate(date);
      setPins(pins.map((p) => (p.id === selectedPin.id ? { ...p, due_date: date } : p)));
    }
    if (error) {
      console.log('updateDueDate', error);
    }
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
    
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [pinsWithSnapshots, setPinsWithSnapshots] = useState(null);
     const { projectId } = params;
     const {user,profile,organization} = useUserData();

    const handleDueDateUpdate = (pinId, date) => {
  setPins((prev) =>
    prev.map((p) =>
      p.id === pinId ? { ...p, due_date: date } : p
    )
  );

  setOriginalPins((prev) =>
    prev.map((p) =>
      p.id === pinId ? { ...p, due_date: date } : p
    )
  );
};
   {/*  async function prepareSnapshots() {
    const pinsWithImages = await Promise.all(
      pins.filter((pin) => selectedIds.has(pin.id)).map(async (pin) => {
        let fileurl = await supabase.storage.from('project-plans').getPublicUrl(pin.plans.file_url).data.publicUrl
        const snapshot = await getZoomedInPinImage(
         fileurl,
          1,
          pin.x,
          pin.y,
          200,
          200,
          1,
        );
        return { ...pin, snapshot };
      })
    );
    setPinsWithSnapshots(pinsWithImages);
  }
*/}

const handleDownload = async () => {
    const ids = Array.from(selectedIds).join(',');
    const downloadUrl = `https://zaynbackend-production.up.railway.app/api/report?projectId=${projectId}&selectedIds=${ids}`;

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
        a.download = 'rapport-taches-server.pdf';
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


     useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase.from('projects').select('id,created_at,name,plans(id,name)').eq('id', projectId).single();
     if(data) { setProject(data)}
    }
    fetchProject()
  }, [projectId])

  useEffect(() => {
   if(projectId && user && profile) {
    console.log('fetchPins', profile)
    const isGuest = profile?.role === 'guest';
    const fetchPins = async () => {
      if(isGuest) {
        console.log('fetchPins', isGuest)
        const { data,error } = await supabase
            .from('pdf_pins')
            .select('id,name,note,x,y,created_by,status_id,assigned_to(id,name),category_id,categories(name),due_date,pin_number,pdf_name,projects(id,name,project_number),project_id,pins_photos(id,public_url),plans(id,name,file_url)')
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .eq('assigned_to', profile.id)
        if (data) {
            setOriginalPins(data)
        }
        if (error) {
            console.log('pins', error)
        }
    }
  else {
    const { data,error } = await supabase
            .from('pdf_pins')
            .select('id,name,note,x,y,created_by,status_id,assigned_to(id,name),category_id,categories(name),due_date,pin_number,pdf_name,projects(id,name,project_number),project_id,pins_photos(id,public_url),plans(id,name,file_url)')
            .is('deleted_at', null)
            .eq('project_id', projectId)
            
        if (data) {
            setOriginalPins(data)
        }
        if (error) {
            console.log('pins', error)
        }

  }}
    fetchPins()
   }
  }, [projectId,user,profile])

  useEffect(() => {
  const filtered = originalPinspins.filter((pin) =>
    (pin.name || "Pin sans nom")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );
  setPins(filtered);
}, [searchQuery, originalPinspins]);

  useEffect(() => {
    setPins(originalPinspins)
  }, [originalPinspins])

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pins.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pins.map((p) => p.id)));
    }
  };


  const handleExportExcel = () => {
  const selectedPins = pins.filter(pin => selectedIds.has(pin.id))

  if (selectedPins.length === 0) return

  const data = selectedPins.map(pin => ({
    Nom: pin.name || "Pin sans nom",
    ID: `${pin.projects?.project_number}-${pin.pin_number}`,
    "Assigné à": pin.assigned_to?.name || "",
    Catégorie: pin.categories?.name || "",
    Échéance: pin.due_date
      ? new Date(pin.due_date).toLocaleDateString("fr-FR")
      : "",
    Localisation: pin.pdf_name || "",
    Description: pin.note || "", // ✅ NOUVELLE COLONNE
    "Date de création": pin.created_at
      ? new Date(pin.created_at).toLocaleDateString("fr-FR")
      : ""
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tâches")

  XLSX.writeFile(workbook, "liste-des-taches.xlsx")
}


 

const handleExportExcelWithEmbeddedMedia = async () => {
  const selectedPins = pins.filter(pin => selectedIds.has(pin.id))
  if (selectedPins.length === 0) return

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
        due: pin.due_date
          ? new Date(pin.due_date).toLocaleDateString("fr-FR")
          : "",
        note: pin.note || "",
        plan: pin.pdf_name || ""
      })

      // Hauteur de ligne pour l’image
      row.height = 90

      if (media?.public_url) {
        try {
          const response = await fetch(media.public_url)
          const blob = await response.blob()
          const buffer = await blob.arrayBuffer()

          const imageId = workbook.addImage({
            buffer,
            extension: "jpeg" // ou png
          })

          sheet.addImage(imageId, {
            tl: { col: 7, row: row.number - 1 },
            ext: { width: 120, height: 80 }
          })
        } catch (err) {
          console.error("Image fetch failed", err)
        }
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  })

  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "pins-medias-avec-images.xlsx"
  a.click()
  window.URL.revokeObjectURL(url)
}

  return (
  <>  
  {categories && statuses && (
    <div className={clsx(figtree.className, "min-h-screen bg-background font-sans")}>
      <NavBar project={project} id={projectId} user={profile} />
      
      <div className="pt-6 px-6">
        {/* Header Card */}
        <div className="bg-card border border-border/50 rounded-xl shadow-sm mb-6">
          <div className="flex flex-row items-center justify-between p-6">
            <div>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-1">
                Liste des tâches
              </h2>
              <p className="text-sm text-muted-foreground">
                {pins.length} tâche{pins.length > 1 ? 's' : ''} au total
              </p>
            </div>
            
            <div className="flex flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher une tâche..."
                  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 rounded-xl border border-border/50 bg-secondary/30 pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                />
              </div>
              <ListFilterPanel 
                pins={pins} 
                setPins={setPins} 
                originalPins={originalPinspins} 
                setOriginalPins={setOriginalPins} 
                user={profile} 
              />
            </div>
          </div>
          
          {/* Actions Bar 
          {selectedIds.size > 0 && (
            <div className="px-6 py-4 bg-secondary/30 border-t border-border/50 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {selectedIds.size} tâche{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={prepareSnapshots}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 transition-all flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Préparer le rapport
                </button>
                
                {pinsWithSnapshots && (
                  <PDFDownloadLink 
                    document={
                      <PdfReport 
                        selectedPins={pinsWithSnapshots.filter((p) => selectedIds.has(p.id))} 
                        pins={pinsWithSnapshots} 
                        categories={categories} 
                        statuses={statuses} 
                        selectedProject={project} 
                      />
                    } 
                    fileName="rapport-taches.pdf"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 flex items-center gap-2"
                  >
                    {({ blob, url, loading, error }) => (
                      <>
                        <Download className="w-4 h-4" />
                        {loading ? 'Génération...' : 'Télécharger le rapport'}
                      </>
                    )}
                  </PDFDownloadLink>
                )}
              </div>
            </div>
          )}
          */}
          {selectedIds.size > 0 && (
  <div className="px-6 py-4 bg-secondary/30 border-t border-border/50 flex items-center justify-between">
    {/* ... selection count ... */}
    <div className="flex gap-3">
      <button 
        onClick={handleDownload}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        Télécharger le rapport
      </button>

      <button
  onClick={handleExportExcel}
  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 transition-all flex items-center gap-2"
>
  <Download className="w-4 h-4" />
  Exporter Excel
</button>

<button
  onClick={handleExportExcelWithEmbeddedMedia}
  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 transition-all flex items-center gap-2"
>
  <Download className="w-4 h-4" />
  Export Excel Pins + Médias
</button>
    </div>
  </div>
)}
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-secondary/30 border-y border-border/50">
                  <th className="text-left p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === pins.length && pins.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-border/50 text-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </th>
                  {['Nom', 'ID', 'Assigné à', 'Catégorie', 'Échéance', 'Localisation', 'Tags'].map((header) => (
                    <th key={header} className="p-4 text-left text-xs font-semibold font-heading text-foreground uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-border/50">
                {pins.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">Aucune tâche à afficher</p>
                    </td>
                  </tr>
                )}

                {pins.map((pin) => (
                  <tr
                    key={pin.id}
                    className={clsx(
                      "text-sm hover:bg-secondary/20 transition-colors hover:cursor-pointer",
                      selectedIds.has(pin.id) && "bg-primary/5"
                    )}
                    onClick={() => { setSelectedPin({ ...pin })}}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(pin.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(pin.id)}
                        className="w-4 h-4 rounded border-border/50 text-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex flex-row items-center gap-3">
                        <Pin pin={pin} />
                        <span className="text-sm font-semibold font-heading text-foreground">
                          {pin.name || "Pin sans nom"}
                        </span>
                      </div>
                    </td>
                    
                    <td className="p-4 text-xs text-muted-foreground font-medium">
                      {pin.projects?.project_number}-{pin.pin_number}
                    </td>
                    
                    <td className="p-4 text-sm text-foreground">
                      {pin.assigned_to?.name || '-'}
                    </td>
                    
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <CategoryComboBox pin={pin} />
                    </td>
                    
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <DueDatePicker pin={pin} onUpdate={handleDueDateUpdate} />
                    </td>
                    
                    <td className="p-4">
                      {pin.pdf_name ? (
                        <div className="flex flex-row items-center gap-2 p-2 hover:cursor-pointer hover:bg-secondary/50 rounded-lg bg-secondary/30 w-fit transition-colors border border-border/50">
                          <Square3Stack3DIcon className='w-5 h-5 text-muted-foreground' />
                          <span className="text-sm text-foreground">{pin.pdf_name}</span>
                        </div>
                      ) : '-'}
                    </td>
                    
                    <td className="p-4 text-sm text-foreground">
                      {pin.tags?.length > 0 ? pin.tags.join(', ') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {selectedPin && ( <PinDrawer pin={selectedPin} /> )}
    </div>
  )}
  
  {(!categories || !statuses) && <LoadingScreen projectId={projectId} />}
  </>
  )
}