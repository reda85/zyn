'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BellIcon,
  UserGroupIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { signOutAction } from '@/app/actions'
import { useProjectData } from '@/providers/ProjectProvider'

const tabs = ['Plans', 'Tâches', 'Médias', 'Documents', 'Discussions']

const tabSlugs = {
  Plans: 'plan',
  Tâches: 'tasks',
  Médias: 'medias',
  Documents: 'documents',
  Discussions: 'discussions',
}

export default function Navbar({ id, user, project: projectProp, organizationId, isLoading: isLoadingProp, isAdmin }) {
  // Sous une page projet, le projet vient du contexte : inutile de le repasser.
  const projectData = useProjectData()
  const project = projectProp ?? projectData.project
  const isLoading = isLoadingProp ?? (projectData.projectId ? !project && projectData.isLoading : false)
  const pathname = usePathname()
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const projectMenuRef = useRef(null)
  const userMenuRef = useRef(null)

  const router = useRouter()

  const currentTab = (() => {
    if (pathname === `/${organizationId}/projects/${id}` || pathname === `/${organizationId}/projects/${id}/`) {
      return 'Plans'
    }
    const match = tabs.find(tab =>
      pathname.startsWith(`/${organizationId}/projects/${id}/${tabSlugs[tab]}`)
    )
    return match ?? 'Plans'
  })()

  useEffect(() => {
    function handleClickOutside(e) {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target)) {
        setProjectMenuOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setUserMenuOpen(false)
    await signOutAction()
  }

  return (
    <nav
      className={clsx(
        'sticky top-0 z-30 flex items-center gap-6 h-14 px-8',
        'bg-white border-b border-[#e5e5e2]',
        'shadow-[0_1px_0_rgba(15,15,15,0.04)]',
        GeistSans.className
      )}
    >
      {/* Logo + Dropdown (Project Menu) */}
      <div className="relative flex items-center h-full" ref={projectMenuRef}>
        <button
  onClick={() => !isLoading && setProjectMenuOpen(prev => !prev)}
  className="flex items-center gap-2.5 h-full focus:outline-none"
>
  {isLoading ? (
    <>
      <div className="h-10 w-10 shrink-0 bg-[#eeeeec] rounded-[4px] animate-pulse" />
      <div className="h-3.5 w-28 bg-[#eeeeec] rounded-[3px] animate-pulse" />
    </>
  ) : (
    <>
      <div className="relative h-10 w-10 shrink-0">
        <Image src="/logo.png" alt="logo" fill className="object-contain" />
      </div>
      <span className="text-[14px] font-medium tracking-[-0.01em] text-[#050505]">
        {project?.name}
      </span>
    </>
  )}
</button>

        {!isLoading && projectMenuOpen && (
          <div className="absolute top-[52px] left-0 w-64 bg-white border border-[#e5e5e2] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] rounded-[4px] z-50">
            <ul className="py-1.5 text-[13px]">
              <li>
                <Link
                  href={`/${organizationId}/projects`}
                  className="block px-3.5 py-2 text-[#0d0d0c] hover:bg-[#f5f5f4] transition-colors"
                  onClick={() => setProjectMenuOpen(false)}
                >
                  Tous les projets
                </Link>
              </li>

              {isAdmin && (
                <>
                  <hr className="my-1 border-[#e5e5e2]" />
                  <li>
                    <Link
                      href={`/${organizationId}/projects/${id}/details`}
                      className="block px-3.5 py-2 text-[#0d0d0c] hover:bg-[#f5f5f4] transition-colors"
                      onClick={() => setProjectMenuOpen(false)}
                    >
                      Détails du projet
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${organizationId}/projects/${id}/sources`}
                      className="block px-3.5 py-2 text-[#0d0d0c] hover:bg-[#f5f5f4] transition-colors"
                      onClick={() => setProjectMenuOpen(false)}
                    >
                      Plans du projet
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${organizationId}/projects/${id}/categories`}
                      className="block px-3.5 py-2 text-[#0d0d0c] hover:bg-[#f5f5f4] transition-colors"
                      onClick={() => setProjectMenuOpen(false)}
                    >
                      Gestionnaire de catégories
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${organizationId}/projects/${id}/status`}
                      className="block px-3.5 py-2 text-[#0d0d0c] hover:bg-[#f5f5f4] transition-colors"
                      onClick={() => setProjectMenuOpen(false)}
                    >
                      Gestionnaire de statuts
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Center Tabs */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
        {tabs.map(tab => {
          const slug = tabSlugs[tab]
          const path = slug === 'plan'
            ? `/${organizationId}/projects/${id}`
            : `/${organizationId}/projects/${id}/${slug}`
          return (
            <Link key={tab} href={path}>
              <button
                className={clsx(
                  'h-8 px-3 rounded-[4px] text-[13px] transition-colors',
                  currentTab === tab
                    ? 'bg-[#eeeeec] text-[#050505] font-medium'
                    : 'text-[#666660] hover:bg-[#f5f5f4] hover:text-[#0d0d0c]'
                )}
              >
                {tab}
              </button>
            </Link>
          )
        })}
      </div>

      {/* Right Actions */}
      <div className="ml-auto flex items-center gap-3">
        <button className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[#666660] hover:bg-[#f5f5f4] hover:text-[#0d0d0c] transition-colors">
          <BellIcon className="h-5 w-5" />
        </button>

       

        {/* User Avatar and Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(prev => !prev)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eeeeec] border border-[#e5e5e2] text-[12px] font-medium text-[#0d0d0c] focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,94,224,0.22)] transition-shadow"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
             {isLoading ? (
      <span className="w-3 h-3 rounded-full bg-[#d5d5d2] animate-pulse" />
    ) : (
      user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'
    )}
          </button>

           {!isLoading && userMenuOpen && (
    <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e5e5e2] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] rounded-[4px] z-50">
      <div className="px-3.5 py-3 border-b border-[#e5e5e2]">
        <p className="text-[13px] font-medium text-[#050505]">{user?.name || user?.email || ''}</p>
        <p className="text-[12px] text-[#666660] truncate mt-0.5">{user?.email || ''}</p>
      </div>

              <div className="py-1.5">
                <Link
                  href={`/${organizationId}/profile`}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#0d0d0c] hover:bg-[#f5f5f4] transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <UserGroupIcon className="h-4 w-4 text-[#666660]" />
                  Profil
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-[13px] text-[#9c1b1b] hover:bg-[#fde8e8] transition-colors"
                  role="menuitem"
                >
                  <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}