'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CubeIcon,
  BellIcon,
  UserGroupIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Lexend, Outfit } from 'next/font/google'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { useAtom } from 'jotai'
import { selectedPlanAtom } from '@/store/atoms'
import { signOutAction } from '@/app/actions'
import { useIsAdmin } from '@/hooks/useIsAdmin'

const tabs = ['Plan', 'Tasks', 'Medias']
const lexend = Outfit({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export default function Navbar({ id, user, project, organizationId }) {
  const pathname = usePathname()
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { isAdmin } = useIsAdmin()
  
  const projectMenuRef = useRef(null)
  const userMenuRef = useRef(null)
  
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)

  // Derive the current tab from pathname
  const currentTab = (() => {
    if (pathname === `/${organizationId}/projects/${id}` || pathname === `/${organizationId}/projects/${id}/`) {
      return 'Plan'
    }
    const match = tabs.find(tab =>
      pathname.startsWith(`/${organizationId}/projects/${id}/${tab.toLowerCase()}`)
    )
    return match ?? 'Plan'
  })()

  // Close menus on outside click
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOutAction(); 
  }

  return (
    <nav className={`bg-background/80 backdrop-blur-md border-b border-border/40 ${lexend.className}`}>
      <div className="relative mx-auto flex h-16 items-center justify-between pl-0 pr-4 sm:pr-6 lg:pr-8">
        
        {/* Logo + Dropdown (Project Menu) */}
        <div className="relative flex items-center h-16" ref={projectMenuRef}>
          <button
            onClick={() => setProjectMenuOpen(prev => !prev)}
            className="flex items-center space-x-3 h-full focus:outline-none hover:opacity-80 transition-opacity"
          >
            <div className="relative group h-full w-12">
              <Image
                src="/logo.png"
                alt="logo"
                fill
                className="object-contain"
              />
              <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity rounded-lg" />
            </div>
            <span className="text-xl font-bold tracking-tight font-heading text-foreground">{project?.name}</span>
          </button>

          {projectMenuOpen && (
            <div className="absolute top-16 left-2 w-64 bg-card border border-border/50 shadow-xl rounded-xl z-50 backdrop-blur-sm">
              <ul className="py-2 text-sm">
                <li>
                  <Link
                    href={`/${organizationId}/projects`}
                    className="block px-4 py-2.5 text-foreground hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                    onClick={() => setProjectMenuOpen(false)}
                  >
                    Tous les projets
                  </Link>
                </li>
                
                {/* Admin-only menu items */}
                {isAdmin && (
                  <>
                    <li>
                      <Link
                        href={`/${organizationId}/projects/${id}/details`}
                        className="block px-4 py-2.5 text-foreground hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                        onClick={() => setProjectMenuOpen(false)}
                      >
                        Détails du projet
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/${organizationId}/projects/${id}/sources`}
                        className="block px-4 py-2.5 text-foreground hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                        onClick={() => setProjectMenuOpen(false)}
                      >
                        Plans du projet
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/${organizationId}/projects/${id}/categories`}
                        className="block px-4 py-2.5 text-foreground hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                        onClick={() => setProjectMenuOpen(false)}
                      >
                        Gestionnaire de catégories
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/${organizationId}/projects/${id}/status`}
                        className="block px-4 py-2.5 text-foreground hover:bg-primary/10 hover:text-primary transition-colors font-medium"
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
        <div className="absolute left-1/2 flex -translate-x-1/2 space-x-6">
          {tabs.map(tab => {
            const path = tab === 'Plan'
              ? `/${organizationId}/projects/${id}`
              : `/${organizationId}/projects/${id}/${tab.toLowerCase()}`
            return (
              <Link key={tab} href={path}>
                <button
                  className={clsx(
                    'px-4 py-2 transition-all text-sm font-medium',
                    currentTab === tab
                      ? 'border-b-2 border-primary text-primary'
                      : 'border-b-2 border-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  {tab}
                </button>
              </Link>
            )
          })}
        </div>

        {/* Right Actions (Including User Menu) */}
        <div className="flex items-center space-x-4">
          <BellIcon className="h-6 w-6 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
          <div className="flex items-center space-x-2 rounded-full bg-secondary/50 px-3 py-1.5 text-sm text-foreground font-medium border border-border/50 backdrop-blur-sm">
            <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
            <span>Members</span>
          </div>

          {/* User Avatar and Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(prev => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              {user?.name?.charAt(0).toUpperCase() || 'M'}
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl shadow-2xl bg-card border border-border/50 z-50 backdrop-blur-sm">
                <div className="py-2" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
                  {/* User Info */}
                  <div className="px-4 py-3 text-sm border-b border-border/50">
                    <p className="font-semibold font-heading text-foreground">{user?.name || 'My Account'}</p>
                    <p className="text-muted-foreground text-xs truncate mt-0.5">{user?.email || 'user@example.com'}</p>
                  </div>

                  {/* Profile Link */}
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 transition-colors font-medium"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserGroupIcon className="mr-3 h-5 w-5 text-muted-foreground" />
                    Profil
                  </Link>

                  {/* Sign Out Option */}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors font-medium rounded-b-xl"
                    role="menuitem"
                  >
                    <ArrowRightStartOnRectangleIcon className="mr-3 h-5 w-5" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}