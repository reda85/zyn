// components/Sidebar.js
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderKanban, Users, BarChart3, Settings, ChevronsUpDown, Check } from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useUserData } from '@/hooks/useUserData'
import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { Outfit } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

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
    <aside className={clsx(outfit.className, "w-64 h-screen bg-white border-r border-gray-200 flex flex-col")}>

      {/* Organization Selector */}
      <div className="px-4 my-6 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all"
        >
          <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-900 flex-shrink-0">
            {displayedOrg?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h2 className="text-sm font-semibold text-gray-900 truncate leading-5">
              {displayedOrg?.name}
            </h2>
            <p className="text-xs text-gray-500 leading-4">
              {displayedOrg?.members?.[0]?.count || 0} membres
            </p>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>

        {dropdownOpen && (
          <div className="absolute left-4 right-4 top-full mt-1 z-50 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
            <p className="px-3 pt-3 pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Organisations
            </p>
            <ul className="py-1">
              {(organizations?.length ? organizations : [displayedOrg]).filter(Boolean).map((org) => (
                <li key={org.id}>
                  <button
                    onClick={() => handleOrgChange(org)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <div className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-900 flex-shrink-0">
                      {org.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="flex-1 text-left font-medium text-gray-900 truncate">
                      {org.name}
                    </span>
                    {org.id === organizationId && (
                      <Check className="w-4 h-4 text-gray-900 flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        <Link
          href={`/${organizationId}/projects`}
          className={clsx(
            'flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-lg transition-all',
            currentPage === 'projects'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          <FolderKanban className="w-5 h-5" /> Projects
        </Link>

        {isAdmin && (
          <>
            <Link
              href={`/${organizationId}/members`}
              className={clsx(
                'flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-lg transition-all',
                currentPage === 'members'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Users className="w-5 h-5" /> Membres
            </Link>
            <Link
              href={`/${organizationId}/reports`}
              className={clsx(
                'flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-lg transition-all',
                currentPage === 'reports'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <BarChart3 className="w-5 h-5" /> Rapports
            </Link>
            <Link
              href={`/${organizationId}/settings`}
              className={clsx(
                'flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-lg transition-all',
                currentPage === 'settings'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Settings className="w-5 h-5" /> Paramètres
            </Link>
          </>
        )}
      </nav>

      {/* Profile (Bottom) */}
      <div className="px-4 pb-6">
        <Link
          href={`/${organizationId}/profile`}
          className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all"
        >
          <div className="h-9 w-9 rounded-full bg-gray-900 flex items-center justify-center text-sm font-semibold text-white overflow-hidden">
            {getInitials(profile?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-5">
              {profile?.full_name || user?.email || 'Utilisateur'}
            </p>
            <p className="text-xs text-gray-500 truncate leading-4">Mon profil</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}