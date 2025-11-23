// app/projects/[projectId]/page.js
'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import ProjectPlans from '@/components/ProjectPlans'
import { useAtom } from 'jotai'
import { categoriesAtom, statusesAtom } from '@/store/atoms'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [options, setStatuses] = useAtom(statusesAtom)
  const [categories, setCategories] = useAtom(categoriesAtom)

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*,Status(*),categories(*)')
        .eq('id', projectId)
        .single()
      setProject(data)
      console.log('Fetched project:', data)
    }

    fetchProject()
  }, [projectId])

  useEffect(() => {
    const fetchStatuses = async () => {
      const { data } = await supabase
        .from('Status')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true })
      setStatuses(data || [])
    }

    fetchStatuses()
  }, [projectId])

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true })
      setCategories(data || [])
    }

    fetchCategories()
  }, [projectId])

  if (!project) return (
    <div className="flex h-screen w-full items-center justify-center bg-background font-sans">
      <div className="text-center">
        {/* Logo animé */}
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-pulse">
            <span className="text-primary-foreground font-bold text-3xl font-heading">z</span>
          </div>
        </div>
        
        {/* Texte de chargement */}
        <h2 className="text-2xl font-bold font-heading text-foreground mb-3 opacity-0 animate-fadeInUp">
          Chargement du projet...
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
  );

  return (
    <div className="bg-background min-h-screen font-sans">
      <ProjectPlans project={project} />
    </div>
  )
}