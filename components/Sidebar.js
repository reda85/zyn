'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderKanban, Users, BarChart3, Settings, ChevronsUpDown, Check, LogOut } from 'lucide-react'
import { useUserData } from '@/hooks/useUserData'
import { useState, useRef, useEffect } from 'react'
import { signOutAction } from '@/app/actions'
import clsx from 'clsx'
import { outfit } from '@/lib/fonts';

export default function Sidebar({ organizationId, currentPage = 'projects' }) {
  const { user, profile, organization, organizations, isAdmin, isLoading } = useUserData(organizationId)
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

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
      router.push(`/${org.id}/projects`)
    }
  }

  const handleSignOut = async () => {
    await signOutAction()
  }

  const getInitials = (fullName) => {
    if (!fullName) return user?.email?.[0]?.toUpperCase() || 'U'
    const parts = fullName.trim().split(' ')
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getMemberCount = (org) => org?.members_organizations?.[0]?.count ?? 0

  const navLinks = [
    { key: 'projects', href: `/${organizationId}/projects`, icon: FolderKanban, label: 'Projets', show: true },
    { key: 'members', href: `/${organizationId}/members`, icon: Users, label: 'Membres', show: isAdmin },
    { key: 'reports', href: `/${organizationId}/reports`, icon: BarChart3, label: 'Rapports', show: isAdmin },
    { key: 'settings', href: `/${organizationId}/settings`, icon: Settings, label: 'Paramètres', show: isAdmin },
  ]

  if (isLoading) {
    return (
      <aside className={clsx('w-60 h-screen shrink-0 bg-papier flex flex-col', outfit.className)}>
        {/* ── Organization Selector skeleton ── */}
        <div className="px-3 pt-4 pb-3">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <div className="h-[30px] w-[30px] rounded-[8px] bg-voile animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3 w-24 rounded-[4px] bg-voile animate-pulse" />
              <div className="h-2.5 w-16 rounded-[4px] bg-voile animate-pulse" />
            </div>
          </div>
        </div>

        <div className="h-px bg-filet mx-3" />

        {/* ── Navigation skeleton ── */}
        <nav className="flex-1 px-3 pt-2 space-y-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
              <div className="h-4 w-4 rounded-[4px] bg-voile animate-pulse flex-shrink-0" />
              <div className="h-3 rounded-[4px] bg-voile animate-pulse" style={{ width: `${60 + i * 8}px` }} />
            </div>
          ))}
        </nav>

        {/* ── Profile skeleton ── */}
        <div className="px-3 pb-4">
          <div className="h-px bg-filet mb-3" />
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <div className="h-7 w-7 rounded-full bg-voile animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3 w-28 rounded-[4px] bg-voile animate-pulse" />
              <div className="h-2.5 w-14 rounded-[4px] bg-voile animate-pulse" />
            </div>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className={clsx('w-60 h-screen shrink-0 bg-papier flex flex-col', outfit.className)}>

      {/* ── Organization Selector ── */}
      <div className="px-3 pt-4 pb-3 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] hover:bg-white/70 transition-colors"
        >
          <div className="h-[30px] w-[30px] rounded-[8px] bg-encre flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
            {displayedOrg?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[14px] font-medium text-encre truncate leading-tight">
              {displayedOrg?.name}
            </p>
            <p className={clsx('text-[12px] text-mine-clair leading-tight', 'tabular-nums')}>
              {getMemberCount(displayedOrg)} membre{getMemberCount(displayedOrg) > 1 ? 's' : ''}
            </p>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-mine-clair flex-shrink-0" />
        </button>

        {dropdownOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-[8px] border border-filet bg-white shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] overflow-hidden">
            <p className="px-3 pt-3 pb-2 text-[13px] text-mine-clair">
              Organisations
            </p>
            <ul className="pb-1">
              {(organizations?.length ? organizations : [displayedOrg]).filter(Boolean).map((org) => (
                <li key={org.id}>
                  <button
                    onClick={() => handleOrgChange(org)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] hover:bg-survol transition-colors"
                  >
                    <div className="h-6 w-6 rounded-[6px] bg-voile border border-filet flex items-center justify-center text-[11px] font-medium text-encre flex-shrink-0">
                      {org.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="flex-1 text-left font-medium text-encre truncate">
                      {org.name}
                    </span>
                    {org.id === organizationId && (
                      <Check className="w-3.5 h-3.5 text-tirage flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-filet mx-3" />

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 pt-2 space-y-0.5">
        {navLinks.filter(l => l.show).map((link) => {
          const Icon = link.icon
          const isActive = currentPage === link.key
          return (
            <Link
              key={link.key}
              href={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'relative flex text-[14px] items-center gap-2.5 px-2.5 py-[7px] rounded-[8px] transition-colors',
                isActive
                  ? 'bg-white text-encre font-medium shadow-carte'
                  : 'text-mine hover:bg-white/70 hover:text-encre font-normal'
              )}
            >
              <Icon strokeWidth={1.75} className={clsx('w-4 h-4', isActive ? 'text-encre' : 'text-mine-clair')} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* ── Profile + Sign out ── */}
      <div className="px-3 pb-4">
        <div className="h-px bg-filet mb-3" />
        <div className="flex items-center gap-1 group">
          <Link
            href={`/${organizationId}/profile`}
            className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] hover:bg-survol transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-voile border border-filet flex items-center justify-center text-[11px] font-medium text-encre flex-shrink-0">
              {getInitials(profile?.name || profile?.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-encre truncate leading-tight">
                {profile?.name || profile?.full_name || user?.email || 'Utilisateur'}
              </p>
              <p className="text-[12px] text-mine-clair leading-tight truncate">{profile?.job_description || 'Mon profil'}</p>
            </div>
          </Link>

          <button
            onClick={handleSignOut}
            title="Se déconnecter"
            className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-[6px] text-mine-clair hover:bg-alerte-pale hover:text-alerte transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}