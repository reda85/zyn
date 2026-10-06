'use client'

import { ProjectProvider } from '@/providers/ProjectProvider'

export default function ProjectLayout({ children, params }) {
  return <ProjectProvider projectId={params.projectId}>{children}</ProjectProvider>
}
