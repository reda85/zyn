// components/Sidebar.js
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderKanban, Users, BarChart3, Settings, ChevronsUpDown, Check } from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useUserData } from '@/hooks/useUserData'
import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'

export default function Sidebar({ organizationId, currentPage = 'projects' }) {
  const { isAdmin } = useIsAdmin()
  const { user, profile, organization, organizations } = useUserData()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Derive the displayed org directly from the URL param — never from the atom
  const displayedOrg = organizations?.find((o) => o.id === organizationId) ?? organization

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOrgChange = (org) => {
    setDropdownOpen(false)
    if (org.id !== organizationId) {
      router.push(`/${org.id}/projects`)
    }
  }

  const getInitials = (fullName) => {
    if (!fullName) return user?.email?.[0]?.toUpperCase() || 'U'
    const parts = fullName.trim().split(' ')
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <aside className="w-64 h-screen bg-secondary/20 border-r border-border/40 flex flex-col">

      {/* Organization Selector */}
      <div className="px-4 my-6 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm hover:bg-secondary/40 transition-all"
        >
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {displayedOrg?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h2 className="text-sm font-semibold font-heading text-foreground truncate leading-tight">
              {displayedOrg?.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {displayedOrg?.members?.[0]?.count || 0} membres
            </p>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>

        {dropdownOpen && (
          <div className="absolute left-4 right-4 top-full mt-1 z-50 rounded-xl border border-border/60 bg-card shadow-lg overflow-hidden">
            <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Organisations
            </p>
            <ul className="py-1">
              {(organizations?.length ? organizations : [displayedOrg]).filter(Boolean).map((org) => (
                <li key={org.id}>
                  <button
                    onClick={() => handleOrgChange(org)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
                  >
                    <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {org.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="flex-1 text-left font-medium text-foreground truncate">
                      {org.name}
                    </span>
                    {org.id === organizationId && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <Link
          href={`/${organizationId}/projects`}
          className={clsx(
            'flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-xl transition-all',
            currentPage === 'projects'
              ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
              : 'text-foreground hover:bg-secondary/50 hover:text-primary border border-transparent hover:border-border/50'
          )}
        >
          <FolderKanban className="w-5 h-5" /> Projects
        </Link>

        {isAdmin && (
          <>
            <Link
              href={`/${organizationId}/members`}
              className={clsx(
                'flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-xl transition-all',
                currentPage === 'members'
                  ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                  : 'text-foreground hover:bg-secondary/50 hover:text-primary border border-transparent hover:border-border/50'
              )}
            >
              <Users className="w-5 h-5" /> Membres
            </Link>
            <Link
              href={`/${organizationId}/reports`}
              className={clsx(
                'flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-xl transition-all',
                currentPage === 'reports'
                  ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                  : 'text-foreground hover:bg-secondary/50 hover:text-primary border border-transparent hover:border-border/50'
              )}
            >
              <BarChart3 className="w-5 h-5" /> Rapports
            </Link>
            <Link
              href={`/${organizationId}/settings`}
              className={clsx(
                'flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-xl transition-all',
                currentPage === 'settings'
                  ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                  : 'text-foreground hover:bg-secondary/50 hover:text-primary border border-transparent hover:border-border/50'
              )}
            >
              <Settings className="w-5 h-5" /> Paramètres
            </Link>
          </>
        )}
      </nav>

      {/* PROFILE (BOTTOM) */}
      <div className="px-4 pb-6">
        <Link
          href={`/${organizationId}/profile`}
          className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/50 hover:bg-secondary/50 transition-all"
        >
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
            {getInitials(profile?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {profile?.full_name || user?.email || 'Utilisateur'}
            </p>
            <p className="text-xs text-muted-foreground truncate">Mon profil</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}