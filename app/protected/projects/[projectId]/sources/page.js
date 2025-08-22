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
      const { data } = await supabase.from('projects').select('*,Status(*),categories(*)').eq('id', projectId).single()
      setProject(data)
      
      console.log('Fetched project:', data)
    }

    fetchProject()
  }, [projectId])

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

  if (!project) return <p>Loading...</p>

  return (
    <div>
     {/* <h1 className="text-2xl font-bold mb-4">{project.name}</h1> */}
      <ProjectPlans project={project} />
    </div>
  )
}
