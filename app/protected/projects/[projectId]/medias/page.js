'use client'
import { useAtom } from "jotai"
import { pinsAtom, selectedPlanAtom } from "@/store/atoms"
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
import GroupedMediaGallery from "@/components/GroupedMediaGallery";


const figtree = Lexend({subsets: ['latin'], variable: '--font-figtree', display: 'swap'});



  
  
export default function Medias({ params }) {
   // const [pins, setPins] = useAtom(pinsAtom)
   const [medias, setMedias] = useState([])
    const [plan, setPlan] = useAtom(selectedPlanAtom)
    const [project, setProject] = useAtom(selectedProjectAtom)
    
    const [selectedIds, setSelectedIds] = useState(new Set());

    const [pinsWithSnapshots, setPinsWithSnapshots] = useState(null);
     const { projectId } = use(params);

     

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
    const fetchMedias = async () => {
        const { data,error } = await supabase
            .from('pins_photos')
            .select('*,pdf_pins(*)')
            .eq('project_id', projectId)
        if (data) {
            setMedias(data)
            console.log('medias', data)
        }
        if (error) {
            console.log('medias error', error)
        }
    }
fetchMedias()
 } },    [projectId])



     const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  

  return (
  <div className={figtree.className}>
 <NavBar project={project} id={projectId} />
<div className="pt-3 px-3 bg-gray-100 min-h-screen">

<div className="bg-white border   border-gray-300 rounded-t-lg p-6">
    <h2 className="text-xl font-bold mb-6  ">Medias</h2>
    
    <GroupedMediaGallery media={medias}  selectedIds={selectedIds}
  setSelectedIds={setSelectedIds} />

      </div>
</div>
  </div>)
}