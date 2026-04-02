'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderKanban, Users, BarChart3, Settings, ChevronsUpDown, Check } from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useUserData } from '@/hooks/useUserData'
import { useState, useRef, useEffect } from 'react'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import clsx from 'clsx'
import { Outfit } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

export default function Sidebar({ organizationId, currentPage = 'projects' }) {
  const { isAdmin } = useIsAdmin()
  const { user, profile, organization, organizations } = useUserData()
  const [, setSelectedOrganization] = useAtom(selectedOrganizationAtom)
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Fix 2: prioritize the prop-matched org, no fallback to atom until orgs are loaded
  const displayedOrg = organizations?.find((o) => o.id === organizationId) ?? null

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
      setSelectedOrganization(org)
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

  // Fix 1: read count from members_organizations instead of members
  const getMemberCount = (org) => org?.members_organizations?.[0]?.count ?? 0

  const navLinks = [
    { key: 'projects', href: `/${organizationId}/projects`, icon: FolderKanban, label: 'Projects', show: true },
    { key: 'members', href: `/${organizationId}/members`, icon: Users, label: 'Membres', show: isAdmin },
    { key: 'reports', href: `/${organizationId}/reports`, icon: BarChart3, label: 'Rapports', show: isAdmin },
    { key: 'settings', href: `/${organizationId}/settings`, icon: Settings, label: 'Paramètres', show: isAdmin },
  ]

  return (
    <aside className={clsx(outfit.className, 'w-60 h-screen bg-white border-r border-neutral-200 flex flex-col')}>

      {/* ── Organization Selector ── */}
      <div className="px-3 pt-4 pb-3 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <div className="h-[30px] w-[30px] rounded-lg bg-neutral-900 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {displayedOrg?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-semibold text-neutral-900 truncate leading-tight">
              {displayedOrg?.name}
            </p>
            <p className="text-[11px] text-neutral-400 leading-tight">
              {getMemberCount(displayedOrg)} membres
            </p>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
        </button>

        {dropdownOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
            <p className="px-3 pt-3 pb-2 text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
              Organisations
            </p>
            <ul className="pb-1">
              {(organizations?.length ? organizations : [displayedOrg]).filter(Boolean).map((org) => (
                <li key={org.id}>
                  <button
                    onClick={() => handleOrgChange(org)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-neutral-50 transition-colors"
                  >
                    <div className="h-6 w-6 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-900 flex-shrink-0">
                      {org.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="flex-1 text-left font-medium text-neutral-900 truncate">
                      {org.name}
                    </span>
                    {org.id === organizationId && (
                      <Check className="w-3.5 h-3.5 text-neutral-900 flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-neutral-100 mx-3" />

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 pt-2 space-y-0.5">
        {navLinks.filter(l => l.show).map((link) => {
          const Icon = link.icon
          const isActive = currentPage === link.key
          return (
            <Link
              key={link.key}
              href={link.href}
              className={clsx(
                'flex text-[13px] items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-neutral-100 text-neutral-900 font-medium'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 font-normal'
              )}
            >
              <Icon className={clsx('w-4 h-4', isActive ? 'text-neutral-900' : 'text-neutral-400')} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* ── Profile ── */}
      <div className="px-3 pb-4">
        <div className="h-px bg-neutral-100 mb-3" />
        <Link
          href={`/${organizationId}/profile`}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-neutral-50 transition-colors group"
        >
          <div className="h-7 w-7 rounded-full bg-neutral-900 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
            {getInitials(profile?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-neutral-900 truncate leading-tight">
              {profile?.full_name || user?.email || 'Utilisateur'}
            </p>
            <p className="text-[11px] text-neutral-400 leading-tight">Mon profil</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}