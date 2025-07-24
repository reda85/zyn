// app/projects/[projectId]/page.js
'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import ProjectPlans from '@/components/ProjectPlans'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase.from('projects').select('*').eq('id', projectId).single()
      setProject(data)
    }

    fetchProject()
  }, [projectId])

  if (!project) return <p>Loading...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{project.name}</h1>
      <ProjectPlans project={project} />
    </div>
  )
}
