import { useAtom } from 'jotai'
import { supabase } from '../lib/supabaseClient'
import { projectsAtom, selectedProjectAtom } from '../store/atoms'
import { useEffect } from 'react'

export default function ProjectList() {
  const [projects, setProjects] = useAtom(projectsAtom)
  const [, setSelectedProject] = useAtom(selectedProjectAtom)

  useEffect(() => {
    const fetchProjects = async () => {
      const { data,error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      if (error) {
        alert('Failed to fetch projects.')
        return
      }
if (data) {
      setProjects(data)
    }
}
    fetchProjects()
  }, [])

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Projects</h2>
      <ul className="space-y-2">
        {projects.map((proj) => (
          <li
            key={proj.id}
            onClick={() => setSelectedProject(proj)}
            className="cursor-pointer p-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            {proj.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
