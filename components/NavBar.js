'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BellIcon,
  UserGroupIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronUpDownIcon,
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
        'sticky top-0 z-30 flex items-stretch gap-6 h-14 pl-5 pr-6',
        'bg-white border-b border-filet',
        GeistSans.className
      )}
    >
      {/* Logo + Dropdown (Project Menu) */}
      <div className="relative flex items-center h-full gap-2" ref={projectMenuRef}>
        <Link
          href={`/${organizationId}/projects`}
          title="Tous les projets"
          className="relative h-8 w-8 shrink-0 rounded-[4px] hover:bg-survol transition-colors"
        >
          <Image src="/logo.png" alt="ZaynSpace" fill className="object-contain p-1" />
        </Link>
        <span className="h-5 w-px bg-filet" aria-hidden="true" />
        <button
  onClick={() => !isLoading && setProjectMenuOpen(prev => !prev)}
  className="flex items-center gap-2 h-full pr-1 focus:outline-none group"
  aria-haspopup="true"
  aria-expanded={projectMenuOpen}
>
  {isLoading ? (
    <>
      <div className="h-3.5 w-28 bg-voile rounded-[3px] animate-pulse" />
    </>
  ) : (
    <>
      <span className="text-[14px] font-semibold tracking-[-0.01em] text-encre max-w-[280px] truncate">
        {project?.name}
      </span>
      <ChevronUpDownIcon className="h-4 w-4 text-mine-clair group-hover:text-encre transition-colors" />
    </>
  )}
</button>

        {!isLoading && projectMenuOpen && (
          <div className="absolute top-[52px] left-10 w-64 bg-white border border-filet shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] rounded-[4px] z-50">
            <ul className="py-1.5 text-[13px]">
              <li>
                <Link
                  href={`/${organizationId}/projects`}
                  className="block px-3.5 py-2 text-encre hover:bg-survol transition-colors"
                  onClick={() => setProjectMenuOpen(false)}
                >
                  Tous les projets
                </Link>
              </li>

              {isAdmin && (
                <>
                  <hr className="my-1 border-filet" />
                  <li>
                    <Link
                      href={`/${organizationId}/projects/${id}/details`}
                      className="block px-3.5 py-2 text-encre hover:bg-survol transition-colors"
                      onClick={() => setProjectMenuOpen(false)}
                    >
                      Détails du projet
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${organizationId}/projects/${id}/sources`}
                      className="block px-3.5 py-2 text-encre hover:bg-survol transition-colors"
                      onClick={() => setProjectMenuOpen(false)}
                    >
                      Plans du projet
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${organizationId}/projects/${id}/categories`}
                      className="block px-3.5 py-2 text-encre hover:bg-survol transition-colors"
                      onClick={() => setProjectMenuOpen(false)}
                    >
                      Gestionnaire de catégories
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${organizationId}/projects/${id}/status`}
                      className="block px-3.5 py-2 text-encre hover:bg-survol transition-colors"
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

      {/* Onglets du projet : soulignés d'un trait bleu, comme une cote active. */}
      <div className="flex items-stretch gap-1" role="tablist">
        {tabs.map(tab => {
          const slug = tabSlugs[tab]
          const path = slug === 'plan'
            ? `/${organizationId}/projects/${id}`
            : `/${organizationId}/projects/${id}/${slug}`
          const active = currentTab === tab
          return (
            <Link
              key={tab}
              href={path}
              role="tab"
              aria-selected={active}
              className={clsx(
                'relative flex items-center px-2.5 text-[13px] transition-colors',
                active
                  ? 'text-encre font-medium after:absolute after:inset-x-2.5 after:-bottom-px after:h-[2px] after:bg-tirage'
                  : 'text-mine hover:text-encre'
              )}
            >
              {tab}
            </Link>
          )
        })}
      </div>

      {/* Right Actions */}
      <div className="ml-auto flex items-center gap-2">
        <button className="flex h-8 w-8 items-center justify-center rounded-[4px] text-mine hover:bg-survol hover:text-encre transition-colors">
          <BellIcon className="h-5 w-5" />
        </button>

       

        {/* User Avatar and Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(prev => !prev)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-voile border border-filet text-[12px] font-medium text-encre focus:outline-none  transition-shadow"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
             {isLoading ? (
      <span className="w-3 h-3 rounded-full bg-trait animate-pulse" />
    ) : (
      user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'
    )}
          </button>

           {!isLoading && userMenuOpen && (
    <div className="absolute right-0 mt-2 w-56 bg-white border border-filet shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] rounded-[4px] z-50">
      <div className="px-3.5 py-3 border-b border-filet">
        <p className="text-[13px] font-medium text-encre">{user?.name || user?.email || ''}</p>
        <p className="text-[12px] text-mine truncate mt-0.5">{user?.email || ''}</p>
      </div>

              <div className="py-1.5">
                <Link
                  href={`/${organizationId}/profile`}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-encre hover:bg-survol transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <UserGroupIcon className="h-4 w-4 text-mine" />
                  Profil
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-[13px] text-alerte hover:bg-alerte-pale transition-colors"
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