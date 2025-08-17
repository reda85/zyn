'use client'

import { useEffect, useState,use } from 'react'
import { supabase } from '@/utils/supabase/client'
import PdfCanvas from '@/components/PdfCanvas';
import PinsList from '@/components/PinsList';
import NavBar from '@/components/NavBar';
import { useAtom } from 'jotai';
import { pinsAtom } from '@/store/atoms';
import { useUser } from '@/components/UserContext';
import { useUserData } from '@/hooks/useUserData';



export default  function ProjectDetail({ params }) {
  const { projectId, planId } = use(params);
  const [project, setProject] = useState(null)
  const [plan, setPlan] = useState(null)
  const [pins, setPins] = useAtom(pinsAtom)

const {user,profile,organization} = useUserData();


console.log('uuuser', user, profile, organization)

  useEffect(() => {
     {
    const fetchProject = async () => {
      const { data } = await supabase.from('projects').select('id,created_at,name,plans(id,name)').eq('id', projectId).single()
      setProject(data)
    }

    const fetchPlan = async () => {
      const { data } = await supabase.from('plans').select('*').eq('id', planId).single()
      setPlan(data)
     
    }

    fetchProject()
    fetchPlan()
}
  }, [projectId, planId])

  useEffect(() => {
    if (!project || !plan) return

    const fetchPins = async () => {
      const { data } = await supabase
        .from('pdf_pins')
      .select(`
      *,
      pins_photos(*),
      assigned_to(id,name)
    `)
        .eq('pdf_name', plan.name)
     if(data) {console.log('pins', data); setPins(data)}
    }

    fetchPins()
  },
  [project, plan])
  useEffect(() => {
    console.log('pins', pins)
  }, [pins])

  if (!project || !plan) return <p>Loading...</p>

  return (
    
   <div className="h-screen flex flex-col">
  <NavBar project={project} id={projectId} user={profile} />
  
  <div className="flex flex-1 overflow-hidden">
    <div className="w-72 overflow-y-auto border-r border-gray-200">
      {pins.length > 0 && <PinsList pins={pins} plans={project.plans} />}
    </div>

    <div className="flex-1 overflow-auto">
      <PdfCanvas
        fileUrl={supabase.storage.from('project-plans').getPublicUrl(plan.file_url).data.publicUrl}
        pins={pins}
        project={project}
        plan={plan}
        user={profile}
      />
    </div>
  </div>
</div>

  )
  
}