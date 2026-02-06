// components/Sidebar.js
'use client'

import Link from 'next/link'
import { FolderKanban, Users, BarChart3, Settings } from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useUserData } from '@/hooks/useUserData'
import clsx from 'clsx'

export default function Sidebar({ organizationId, currentPage = 'projects' }) {
  const { isAdmin } = useIsAdmin()
  const { user, profile, organization } = useUserData()

  const getInitials = (fullName) => {
    if (!fullName) return user?.email?.[0]?.toUpperCase() || "U";
    const parts = fullName.trim().split(" ");
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (
    <aside className="w-64 h-screen bg-secondary/20 border-r border-border/40 flex flex-col">
      <div className="px-4 py-5 flex-col border border-border/50 bg-card/80 backdrop-blur-sm flex mx-4 my-6 rounded-xl gap-2 shadow-sm">
        <h2 className="text-sm font-semibold font-heading text-foreground">{organization?.name}</h2>
        <p className="text-xs text-muted-foreground">{organization?.members?.[0]?.count || 0} membres</p>
      </div>
    
      <nav className="flex-1 px-4 space-y-2">
        <Link 
          href={`/${organizationId}/projects`} 
          className={clsx(
            "flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
            currentPage === 'projects'
              ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
              : "text-foreground hover:bg-secondary/50 hover:text-primary border border-transparent hover:border-border/50"
          )}
        >
          <FolderKanban className="w-5 h-5" /> Projects
        </Link>
        
        {isAdmin && (
          <>
            <Link 
              href={`/${organizationId}/members`} 
              className={clsx(
                "flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                currentPage === 'members'
                  ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                  : "text-foreground hover:bg-secondary/50 hover:text-primary border border-transparent hover:border-border/50"
              )}
            >
              <Users className="w-5 h-5" /> Membres
            </Link>
            <Link 
              href={`/${organizationId}/reports`} 
              className={clsx(
                "flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                currentPage === 'reports'
                  ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                  : "text-foreground hover:bg-secondary/50 hover:text-primary border border-transparent hover:border-border/50"
              )}
            >
              <BarChart3 className="w-5 h-5" /> Rapports
            </Link>
            <Link 
              href={`/${organizationId}/settings`} 
              className={clsx(
                "flex text-sm font-medium items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                currentPage === 'settings'
                  ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                  : "text-foreground hover:bg-secondary/50 hover:text-primary border border-transparent hover:border-border/50"
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
          {/* Avatar */}
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
            {getInitials(profile?.full_name)}
          </div>
    
          {/* User info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {profile?.full_name || user?.email || 'Utilisateur'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Mon profil
            </p>
          </div>
        </Link>
      </div>
    </aside>
  )
}