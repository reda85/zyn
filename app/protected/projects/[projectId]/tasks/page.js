'use client'
import { useAtom } from "jotai"
import { categoriesAtom, pinsAtom, selectedPlanAtom, statusesAtom } from "@/store/atoms"
import NavBar from "@/components/NavBar"
import { selectedProjectAtom } from "@/store/atoms"
import { use, useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Figtree, Lexend } from "next/font/google"
import Pin from "@/components/Pin"
import { Square3Stack3DIcon } from "@heroicons/react/24/outline"
import CategoryComboBox from "@/components/CategoryComboBox"
import { Calendar1Icon } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css";
import { Document, Page, PDFDownloadLink, Text } from "@react-pdf/renderer"
import PdfReport from "@/components/PdfReport"
import { getZoomedInPinImage } from "@/utils/pdfUtils"
import FilterPanel from "@/components/FilterPanel"
import ListFilterPanel from "../../../../../components/ListFilterPanel"
import LoadingScreen from "@/components/LoadingScreen"
import clsx from "clsx"


const figtree = Lexend({subsets: ['latin'], variable: '--font-figtree', display: 'swap'});



  const DueDatePicker = ({ pin }) => {
 
    let isOverDue = false
    if (pin?.due_date) {
      const dueDate = new Date(pin?.due_date)
      const now = new Date()
      isOverDue = dueDate < now
    }
    const [selectedDate, setSelectedDate] = useState(pin?.due_date ? new Date(pin.due_date) : null );
    const [isPickingDate, setIsPickingDate] = useState(false);
    console.log('selectedDate', selectedDate)

    return (
      <div className="w-48 relative">
        {isPickingDate ? (
          <DatePicker
            selected={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              setIsPickingDate(false);
            }}
            onBlur={() => setIsPickingDate(false)}
            autoFocus
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
            dateFormat="dd/MM/yyyy"
            placeholderText="Sélectionner une date"
          />
        ) : (
          <button
            type="button"
            className={clsx("w-full border rounded px-3 py-2 pl-10 text-left bg-gray-100 hover:bg-blue-50 relative", isOverDue && "border-red-600 text-red-600")}
            onClick={() => setIsPickingDate(true)}
          >
           {selectedDate instanceof Date
  ? selectedDate.toLocaleDateString('fr-FR')
  : 'Ajouter échéance'}
            <div className={clsx("absolute left-3 top-1/2 -translate-y-1/2", isOverDue && "text-red-600")}>
              <Calendar1Icon size={16} />
            </div>
          </button>
        )}
      </div>
      );
  }
  
export default function Tasks({ params }) {
   // const [pins, setPins] = useAtom(pinsAtom)
   const [pins, setPins] = useState([])
   const [originalPinspins, setOriginalPins] = useState([])
    const [plan, setPlan] = useAtom(selectedPlanAtom)
    const [project, setProject] = useAtom(selectedProjectAtom)
    const [categories, setCategories] = useAtom(categoriesAtom)
    const [statuses, setStatuses] = useAtom(statusesAtom)
    
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [pinsWithSnapshots, setPinsWithSnapshots] = useState(null);
     const { projectId } = use(params);

      async function prepareSnapshots() {
    const pinsWithImages = await Promise.all(
      pins.filter((pin) => selectedIds.has(pin.id)).map(async (pin) => {
        console.log('pin props', pin)
        let fileurl = await supabase.storage.from('project-plans').getPublicUrl(pin.plans.file_url).data.publicUrl
        console.log('fileurl', fileurl)
        const snapshot = await getZoomedInPinImage(
         fileurl,
          1,
          pin.x,
          pin.y,
          200,
          200,
          1, // zoom factor
        );
        return { ...pin, snapshot };
      })
    );
    setPinsWithSnapshots(pinsWithImages);
  }

     useEffect(() => {
     {
    const fetchProject = async () => {
      const { data } = await supabase.from('projects').select('id,created_at,name,plans(id,name)').eq('id', projectId).single();
     if(data) {console.log('project', data); setProject(data)}
    }

  
    fetchProject()
   
}
  }, [projectId])

  useEffect(() => {
   if(projectId) 
    {
    const fetchPins = async () => {
        const { data,error } = await supabase
            .from('pdf_pins')
            .select('id,name,note,x,y,status_id,assigned_to(id,name),category_id,due_date,pdf_name,project_id,pins_photos(id,public_url),plans(id,name,file_url)')
            .eq('project_id', projectId)
        if (data) {
            setOriginalPins(data)
            console.log('pins', data)
        }
        if (error) {
            console.log('pins', error)
        }
    }
fetchPins()
 } },    [projectId])

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

 
  return (
  <>  
  {categories && statuses &&<div className={figtree.className}>
 <NavBar project={project} id={projectId} />
<div className="pt-3 px-3 bg-gray-100 min-h-screen">

<div className="bg-white border   border-gray-300 rounded-t-lg">
  <div className="flex flex-row items-center justify-between p-6 ">
    <h2 className="text-xl font-bold ">Liste des taches ({pins.length})</h2>
    <div className="flex flex-row gap-2">
      <input
        type="text"
        placeholder="Rechercher"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
    <ListFilterPanel pins={pins} setPins={setPins} originalPins={originalPinspins} setOriginalPins={setOriginalPins} />
    </div>
    </div>
    {selectedIds.size > 0 && <div className="p-3 bg-neutral-200">
        <div>
   {pinsWithSnapshots && <PDFDownloadLink document={<PdfReport selectedPins={pinsWithSnapshots.filter((p) => selectedIds.has(p.id))} pins={pinsWithSnapshots} />} fileName="tasks.pdf">
      {({ blob, url, loading, error }) =>
        loading ? 'Loading document...' : 'Download now!'
      }
    </PDFDownloadLink>}
  </div>
      <button onClick={prepareSnapshots}>Creer un rapport</button></div>}
  <table className="min-w-full border-collapse border   border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-3 ">
              <input
                type="checkbox"
                checked={selectedIds.size === pins.length && pins.length > 0}
                onChange={toggleSelectAll}
              />
            </th>
            {['Name', 'ID', 'Assignee', 'Category', 'Due date', 'Location', 'Tags'].map((header) => (
              <th key={header} className="p-2 text-left  text-xs font-semibold text-gray-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {pins.length === 0 && (
            <tr>
              <td colSpan={8} className="p-4 text-center text-gray-500 italic">
               Aucun pin à afficher
              </td>
            </tr>
          )}

          {pins.map((pin) => (
            <tr
              key={pin.id}
              className={`border border-gray-300 text-sm items-center hover:bg-blue-50 ${
                selectedIds.has(pin.id) ? 'bg-blue-100' : ''
              }`}
            >
              <td className="p-3  text-sm ">
                <input
                  type="checkbox"
                  checked={selectedIds.has(pin.id)}
                  onChange={() => toggleSelect(pin.id)}
                />
              </td>

              <td className="flex flex-row items-center   gap-2 p-3  text-xs font-semibold "> <Pin pin={pin} /> {pin.name || 'Pin sans nom'}</td>
              <td className="p-3  text-xs ">{pin.id}</td>
              <td className="p-3  text-xs ">{pin.assigned_to?.name || '-'}</td>
              <td className="p-3  text-xs ">{<CategoryComboBox pin={pin} />}</td> 
              <td className="p-3  text-xs ">
                <DueDatePicker pin={pin} />
              </td>
              <td className="p-3  text-xs ">{<div className="flex flex-row p-2 hover:cursor-pointer hover:bg-blue-100  rounded-full gap-2 bg-neutral-100 w-fit"> <Square3Stack3DIcon className='w-5 h-5' />{pin.pdf_name}</div> || '-'}</td>
              <td className="p-3  text-xs ">
                {pin.tags?.length > 0
                  ? pin.tags.join(', ')
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
</div>
  </div>}
  {(!categories || !statuses) && <LoadingScreen projectId={projectId} /> }
  </>)
 
}