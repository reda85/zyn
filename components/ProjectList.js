import { useAtom } from 'jotai'
import { supabase } from '../lib/supabaseClient'
import { projectsAtom, selectedProjectAtom } from '../store/atoms'
import { useEffect } from 'react'
import { GeistSans } from 'geist/font/sans'
import clsx from 'clsx'

export default function ProjectList() {
  const [projects, setProjects] = useAtom(projectsAtom)
  const [, setSelectedProject] = useAtom(selectedProjectAtom)

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
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
    <div className={clsx('p-4', GeistSans.className)}>
      <h2 className="text-[17px] font-medium text-[#050505] mb-3">Projects</h2>
      <ul className="space-y-1.5">
        {projects.map((proj) => (
          <li
            key={proj.id}
            onClick={() => setSelectedProject(proj)}
            className="cursor-pointer px-3 py-2 bg-[#f5f5f4] border border-[#e5e5e2] rounded-[4px] text-[13px] text-[#0d0d0c] hover:bg-[#eeeeec] transition-colors"
          >
            {proj.name}
          </li>
        ))}
      </ul>
    </div>
  )
}