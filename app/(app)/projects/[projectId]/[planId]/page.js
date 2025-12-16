'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/utils/supabase/client'
import PdfCanvas from '@/components/PdfCanvas';
import PinsList from '@/components/PinsList';
import NavBar from '@/components/NavBar';
import { useAtom } from 'jotai';
import { categoriesAtom, pinsAtom, selectedPlanAtom, statusesAtom } from '@/store/atoms';
import { useUser } from '@/components/UserContext';
import { useUserData } from '@/hooks/useUserData';
import Image from 'next/image';

export default function ProjectDetail({ params }) {
  const { projectId, planId } = params;
  const [project, setProject] = useState(null)
  //const [plan, setPlan] = useState(null)
  const [pins, setPins] = useAtom(pinsAtom)
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)
  const [statuses, setStatuses] = useAtom(statusesAtom)
  const [categories, setCategories] = useAtom(categoriesAtom)

  const { user, profile, organization } = useUserData();

  console.log('uuuser', user, profile, organization)

  useEffect(() => {
    const fetchStatuses = async () => {
      const { data } = await supabase.from('Status').select('*').eq('project_id', projectId).order('order', { ascending: true })
      setStatuses(data || [])
    }

    fetchStatuses()
  }, [projectId])

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').eq('project_id', projectId).order('order', { ascending: true })
      setCategories(data || [])
    }

    fetchCategories()
  }, [projectId])

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase.from('projects').select('id,created_at,name,plans(id,name)').eq('id', projectId).single()
      setProject(data)
    }

    const fetchPlan = async () => {
      const { data } = await supabase.from('plans').select('*').eq('id', planId).single()
    //  setPlan(data)
      setSelectedPlan(data)
    }

    fetchProject()
    fetchPlan()
  }, [projectId, planId])

 useEffect(() => {
    if (!project || !selectedPlan || !user || !profile) return;

const fetchPins = async () => {
      
      const isGuest = profile?.role === 'guest';

      // 1. Conditionally set the JOIN type
      const assignedToSelect = isGuest 
          ? 'assigned_to!inner(id,name,auth_id)' // INNER JOIN required for guest filter
          : 'assigned_to(id,name,auth_id)';    // LEFT JOIN for everyone else (includes unassigned pins)
          
      // Base Query Builder
      let query = supabase
        .from('pdf_pins')
        .select(`
          *,
          projects(id,name,project_number),
          pins_photos(*),
          categories(name),
          ${assignedToSelect} // Use the conditional select string
        `)
        .eq('plan_id', selectedPlan.id)
        .order('created_at', { ascending: true })

      // 2. CONDITIONAL FILTERING
      if (isGuest) {
        // Apply the filter only when it's a guest
        query = query.filter(
          'assigned_to.auth_id', 
          'eq', 
          user?.id 
        );
      }
      
      const { data, error } = await query; // Execute the final query

      // ... rest of the error and data handling ...
      
      if (data) { 
        console.log('pins', data); 
        setPins(data) 
      }
    }

    fetchPins()
  }, [project, selectedPlan, user, profile]) // Dependencies remain correct

  useEffect(() => {
    console.log('pins', pins)
  }, [pins])

  if (!project || !selectedPlan) return (
    <div className="flex h-screen w-full items-center justify-center bg-background font-sans">
      <div className="text-center">
        {/* Logo animé */}
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-pulse">
           <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={52} height={52} />
          </div>
        </div>
        
        {/* Texte de chargement */}
        <h2 className="text-2xl font-bold font-heading text-foreground mb-3 opacity-0 animate-fadeInUp">
          Chargement...
        </h2>
        <p className="text-muted-foreground opacity-0 animate-fadeInUp" style={{ animationDelay: '150ms' }}>
          Veuillez patienter
        </p>
        
        {/* Barre de progression animée */}
        <div className="mt-8 w-64 mx-auto">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-[loading_1.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(var(--primary),0.3)]"></div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes loading {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 75%;
            margin-left: 0%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-background font-sans">
      {/* Navbar with higher z-index - NO overflow constraints */}
      <div className="relative z-50">
        <NavBar project={project} id={projectId} user={profile} />
      </div>
      
      {/* Content area - overflow only on this level */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 overflow-y-auto border-r border-border/40 bg-secondary/20">
          <PinsList pins={pins} plans={project.plans} user={profile} projectId={projectId} />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <PdfCanvas
            fileUrl={supabase.storage.from('project-plans').getPublicUrl(selectedPlan.file_url).data.publicUrl}
            pins={pins}
            project={project}
            plan={selectedPlan}
            user={profile}
          />
        </div>
      </div>
    </div>
  )
}