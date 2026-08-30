// app/projects/[projectId]/page.js
'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import ProjectPlans from '@/components/ProjectPlans'
import { useAtom } from 'jotai'
import { categoriesAtom, statusesAtom } from '@/store/atoms'
import Image from "next/image";
import { GeistSans } from 'geist/font/sans';
import clsx from "clsx";

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
   <div className={clsx("flex h-screen w-full items-center justify-center bg-[#fafaf9]", GeistSans.className)}>
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-12 h-12 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center animate-pulse">
                <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={52} height={52} />
              </div>
            </div>
            <h2 className="text-[17px] font-medium text-[#050505] mb-2">
              Chargement...
            </h2>
            <p className="text-[13px] text-[#8a8a84]">
              Veuillez patienter
            </p>
            <div className="mt-8 w-64 mx-auto">
              <div className="h-1 bg-[#eeeeec] rounded-full overflow-hidden">
                <div className="h-full bg-[#0d0d0c] w-0 animate-[loading_1.5s_ease-in-out_infinite]"></div>
              </div>
            </div>
          </div>
          <style jsx>{`
            @keyframes loading {
              0% { width: 0%; margin-left: 0%; }
              50% { width: 75%; margin-left: 0%; }
              100% { width: 0%; margin-left: 100%; }
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