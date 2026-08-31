'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderKanban, Users, BarChart3, Settings, ChevronsUpDown, Check, LogOut } from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useUserData } from '@/hooks/useUserData'
import { useState, useRef, useEffect } from 'react'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { signOutAction } from '@/app/actions'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

export default function Sidebar({ organizationId, currentPage = 'projects' }) {
  const { user, profile, organization, organizations, isAdmin, isLoading } = useUserData(organizationId)
  const [, setSelectedOrganization] = useAtom(selectedOrganizationAtom)
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
      setSelectedOrganization(org)
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
      <aside className={clsx('w-60 h-screen bg-white border-r border-[#e5e5e2] flex flex-col', GeistSans.className)}>
        {/* ── Organization Selector skeleton ── */}
        <div className="px-3 pt-4 pb-3">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <div className="h-[30px] w-[30px] rounded-[4px] bg-[#eeeeec] animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3 w-24 rounded-[2px] bg-[#eeeeec] animate-pulse" />
              <div className="h-2.5 w-16 rounded-[2px] bg-[#eeeeec] animate-pulse" />
            </div>
          </div>
        </div>

        <div className="h-px bg-[#eeeeec] mx-3" />

        {/* ── Navigation skeleton ── */}
        <nav className="flex-1 px-3 pt-2 space-y-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
              <div className="h-4 w-4 rounded-[2px] bg-[#eeeeec] animate-pulse flex-shrink-0" />
              <div className="h-3 rounded-[2px] bg-[#eeeeec] animate-pulse" style={{ width: `${60 + i * 8}px` }} />
            </div>
          ))}
        </nav>

        {/* ── Profile skeleton ── */}
        <div className="px-3 pb-4">
          <div className="h-px bg-[#eeeeec] mb-3" />
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <div className="h-7 w-7 rounded-full bg-[#eeeeec] animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3 w-28 rounded-[2px] bg-[#eeeeec] animate-pulse" />
              <div className="h-2.5 w-14 rounded-[2px] bg-[#eeeeec] animate-pulse" />
            </div>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className={clsx('w-60 h-screen bg-white border-r border-[#e5e5e2] flex flex-col', GeistSans.className)}>

      {/* ── Organization Selector ── */}
      <div className="px-3 pt-4 pb-3 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] hover:bg-[#f5f5f4] transition-colors"
        >
          <div className="h-[30px] w-[30px] rounded-[4px] bg-[#0d0d0c] flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
            {displayedOrg?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-medium text-[#050505] truncate leading-tight">
              {displayedOrg?.name}
            </p>
            <p className={clsx('text-[11px] text-[#8a8a84] leading-tight', GeistMono.className)}>
              {getMemberCount(displayedOrg)} membres
            </p>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-[#8a8a84] flex-shrink-0" />
        </button>

        {dropdownOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-[4px] border border-[#e5e5e2] bg-white shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] overflow-hidden">
            <p className={clsx('px-3 pt-3 pb-2 text-[11px] font-medium text-[#666660] uppercase tracking-[0.08em]', GeistMono.className)}>
              Organisations
            </p>
            <ul className="pb-1">
              {(organizations?.length ? organizations : [displayedOrg]).filter(Boolean).map((org) => (
                <li key={org.id}>
                  <button
                    onClick={() => handleOrgChange(org)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[#f5f5f4] transition-colors"
                  >
                    <div className="h-6 w-6 rounded-[3px] bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-[10px] font-medium text-[#050505] flex-shrink-0">
                      {org.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="flex-1 text-left font-medium text-[#0d0d0c] truncate">
                      {org.name}
                    </span>
                    {org.id === organizationId && (
                      <Check className="w-3.5 h-3.5 text-[#2f5ee0] flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[#eeeeec] mx-3" />

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
                'flex text-[13px] items-center gap-2.5 px-2.5 py-2 rounded-[4px] transition-colors',
                isActive
                  ? 'bg-[#eeeeec] text-[#050505] font-medium'
                  : 'text-[#666660] hover:bg-[#f5f5f4] hover:text-[#0d0d0c] font-normal'
              )}
            >
              <Icon className={clsx('w-4 h-4', isActive ? 'text-[#0d0d0c]' : 'text-[#8a8a84]')} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* ── Profile + Sign out ── */}
      <div className="px-3 pb-4">
        <div className="h-px bg-[#eeeeec] mb-3" />
        <div className="flex items-center gap-1 group">
          <Link
            href={`/${organizationId}/profile`}
            className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] hover:bg-[#f5f5f4] transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-[10px] font-medium text-[#0d0d0c] flex-shrink-0">
              {getInitials(profile?.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#0d0d0c] truncate leading-tight">
                {profile?.full_name || user?.email || 'Utilisateur'}
              </p>
              <p className="text-[11px] text-[#8a8a84] leading-tight">Mon profil</p>
            </div>
          </Link>

          <button
            onClick={handleSignOut}
            title="Se déconnecter"
            className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-[3px] text-[#8a8a84] hover:bg-[#fde8e8] hover:text-[#9c1b1b] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}