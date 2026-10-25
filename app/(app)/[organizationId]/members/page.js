'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { Check, ChevronDown, UserPlus, Search, X, Mail, Send } from 'lucide-react'
import { GeistSans } from 'geist/font/sans';
import clsx from 'clsx'
import { Dialog, DialogPanel, DialogTitle, Listbox, ListboxButton, ListboxOption, ListboxOptions, Switch } from '@headlessui/react'
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'

const roles = [
  { id: 1, name: 'Membres', value: 'membres' },
  { id: 2, name: 'Invités', value: 'guest' },
  { id: 3, name: 'Administrateurs', value: 'admin' },
]

function Avatar({ name, src }) {
  const [imageError, setImageError] = useState(false)
  const getInitials = (fullName) => {
    if (!fullName) return '?'
    const parts = fullName.trim().split(' ')
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (!src || imageError) {
    return (
      <div className="h-8 w-8 rounded-full bg-voile border border-filet flex items-center justify-center text-[12px] font-medium text-mine flex-shrink-0">
        {getInitials(name)}
      </div>
    )
  }
}

const ROLE_LABELS = { admin: 'Administrateur', member: 'Membre', guest: 'Invité' }

function RoleBadge({ role }) {
  return (
    <span
      className={clsx(
        'px-1.5 py-px inline-flex text-[13px] rounded-[6px] border',
        role === 'admin' ? 'border-encre text-encre' : role === 'guest' ? 'border-dashed border-filet-fort text-mine' : 'border-filet text-mine'
      )}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function MembersTableSkeleton() {
  return (
    <div className="bg-white rounded-[12px] border border-filet overflow-hidden shadow-carte">
      <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '32%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-filet">
            {['Membre', 'Projets', 'Rôle', 'Invitation'].map((h) => (
              <th key={h} className={clsx('px-4 py-2 text-[12px] font-medium text-mine text-left border-b border-filet', 'tabular-nums')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3, 4].map((i) => (
            <tr key={i} className="border-b border-voile">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-voile animate-pulse flex-shrink-0" />
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="h-3 rounded-[4px] bg-voile animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
                    <div className="h-2.5 w-2/3 rounded-[4px] bg-voile animate-pulse" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="h-3 w-16 rounded-[4px] bg-voile animate-pulse" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-14 rounded-[6px] bg-voile animate-pulse" />
              </td>
              <td className="px-4 py-3">
                <div className="h-3 w-28 rounded-[4px] bg-voile animate-pulse" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MembersPage({ params }) {
  const { organizationId } = params
  const router = useRouter()
  const [selectedRoles, setSelectedRoles] = useState([])
  const [selectedOrganization] = useAtom(selectedOrganizationAtom)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [refresh, setRefresh] = useState(false)

  const [manageOpen, setManageOpen] = useState(false)
  const [currentMember, setCurrentMember] = useState(null)
  const [memberProjects, setMemberProjects] = useState([])
  const [projects, setProjects] = useState([])

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState(roles[0])
  const [addProjects, setAddProjects] = useState([])
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState(false)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteMember, setInviteMember] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)

  const { user, organization, organizations, isAdmin } = useUserData()
  const isCheckingAccess = organizations.length === 0

  useEffect(() => {
    if (isCheckingAccess) return
    if (!isAdmin) router.push(`/${organizationId}/projects`)
  }, [isCheckingAccess, isAdmin, organizationId])

  useEffect(() => {
    const fetchMembers = async () => {
      setMembersLoading(true)
      try {
        const { data: rawMembers } = await supabase
          .from('members_organizations')
          .select('*, members(*, members_projects(project_id, project:projects!inner(id, organization_id)))')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })

        const formatted = (rawMembers || []).map((m) => {
          const allMemberProjects = m.members?.members_projects || []
          const orgProjectCount = allMemberProjects.filter(
            (mp) => mp.project?.organization_id === organizationId
          ).length
          return {
            ...m.members,
            role: m.role,
            project_count: orgProjectCount,
            invited: m?.invited ?? false,
          }
        })
        setMembers(formatted)
      } finally {
        setMembersLoading(false)
      }
    }

    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organizationId)
      setProjects(data || [])
    }

    if (!isCheckingAccess && isAdmin) {
      fetchMembers()
      fetchProjects()
    }
  }, [refresh, isCheckingAccess, isAdmin, organizationId])

  const openManageModal = async (member) => {
    setCurrentMember(member)
    const { data } = await supabase
      .from('members_projects')
      .select('project_id')
      .eq('member_id', member.id)
    setMemberProjects((data || []).map((p) => p.project_id))
    setManageOpen(true)
  }

  const toggleProject = async (projectId, active) => {
    if (active) {
      await supabase.from('members_projects').insert({ member_id: currentMember.id, project_id: projectId })
    } else {
      await supabase.from('members_projects').delete().eq('member_id', currentMember.id).eq('project_id', projectId)
    }
    setMemberProjects((prev) => active ? [...prev, projectId] : prev.filter((id) => id !== projectId))
    setRefresh((x) => !x)
  }

  const openAddModal = () => {
    setAddName('')
    setAddEmail('')
    setAddRole(roles[0])
    setAddProjects([])
    setAddError('')
    setAddSuccess(false)
    setAddOpen(true)
  }

  const toggleAddProject = (projectId) => {
    setAddProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    )
  }

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const addMember = async () => {
    setAddError('')
    if (!addName.trim()) { setAddError('Le nom est requis'); return }
    if (addEmail.trim() && !validateEmail(addEmail)) { setAddError('Adresse email invalide'); return }

    if (addEmail.trim()) {
      const { data: existing } = await supabase
        .from('members_organizations')
        .select('member_id, members!inner(email)')
        .eq('organization_id', organizationId)
        .eq('members.email', addEmail.toLowerCase())
        .maybeSingle()
      if (existing) { setAddError('Un membre avec cet email existe déjà dans cette organisation'); return }
    }

    setAddLoading(true)
    try {
      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert({
          name: addName.trim(),
          email: addEmail.toLowerCase().trim() || null,
          invited: false,
        })
        .select()
        .single()
      if (insertError) throw insertError

      const { error: orgError } = await supabase
        .from('members_organizations')
        .insert({ member_id: newMember.id, organization_id: organizationId, role: addRole.name, invited: false })
      if (orgError) throw orgError

      if (addProjects.length > 0) {
        await supabase.from('members_projects').insert(
          addProjects.map((projectId) => ({ member_id: newMember.id, project_id: projectId }))
        )
      }

      setAddSuccess(true)
      setRefresh((x) => !x)
      setTimeout(() => setAddOpen(false), 1500)
    } catch (error) {
      setAddError(error.message || 'Une erreur est survenue')
    } finally {
      setAddLoading(false)
    }
  }

  const openInviteModal = (member) => {
    setInviteMember(member)
    setInviteEmail(member.email || '')
    setInviteError('')
    setInviteSuccess(false)
    setInviteOpen(true)
  }

  const sendInvitation = async () => {
    setInviteError('')
    if (!inviteEmail.trim()) { setInviteError("L'email est requis pour envoyer une invitation"); return }
    if (!validateEmail(inviteEmail)) { setInviteError('Adresse email invalide'); return }

    setInviteLoading(true)
    try {
      if (inviteEmail.toLowerCase().trim() !== inviteMember.email) {
        await supabase.from('members').update({ email: inviteEmail.toLowerCase().trim() }).eq('id', inviteMember.id)
      }

      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.toLowerCase().trim(),
          name: inviteMember.name,
          role: inviteMember.role,
          organizationId,
          memberId: inviteMember.id,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Erreur lors de l'envoi")
      setInviteResult(result)


      setInviteSuccess(true)
      setRefresh((x) => !x)
      setTimeout(() => setInviteOpen(false), 2000)
    } catch (error) {
      setInviteError(error.message || 'Une erreur est survenue')
    } finally {
      setInviteLoading(false)
    }
  }

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole =
        selectedRoles.length === 0 || selectedRoles.some((role) => role.name === member.role)
      return matchesSearch && matchesRole
    })
  }, [members, searchQuery, selectedRoles])

  if (isCheckingAccess || !isAdmin) {
    return (
      <div className={clsx('flex h-screen items-center justify-center bg-papier', GeistSans.className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-filet border-t-encre mx-auto mb-3" />
          <p className="text-[14px] text-mine-clair">Vérification des accès...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('flex h-screen bg-papier overflow-hidden', GeistSans.className)}>
      <Sidebar organizationId={organizationId} currentPage="members" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre">Membres</h1>
            {membersLoading ? (
              <div className="h-3 w-40 rounded-[4px] bg-voile animate-pulse mt-1.5" />
            ) : (
              <p className={clsx('text-[13px] text-mine-clair mt-0.5', 'tabular-nums')}>
                {members.length} membre{members.length !== 1 ? 's' : ''} dans l'organisation
              </p>
            )}
          </div>
          <button
            onClick={openAddModal}
            className="bg-encre text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-encre-survol transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un membre
          </button>
        </div>

        <div className="grid grid-cols-3 bg-white border border-filet rounded-[12px] mb-6 shadow-carte">
          {[
            { label: 'Membres', value: members.length, hint: 'dans l\u2019organisation' },
            { label: 'Administrateurs', value: members.filter((m) => m.role === 'admin').length, hint: 'gèrent projets et membres' },
            { label: 'Invités', value: members.filter((m) => m.role === 'guest').length, hint: 'ne voient que leurs réserves' },
          ].map((stat, i) => (
            <div key={stat.label} className={clsx('px-5 py-4', i > 0 && 'border-l border-filet')}>
              <p className="text-[13px] text-mine">{stat.label}</p>
              {membersLoading ? (
                <div className="h-7 w-10 mt-1.5 rounded-[6px] bg-voile animate-pulse" />
              ) : (
                <p className="mt-1 text-[26px] leading-none font-semibold tracking-[-0.02em] text-encre tabular-nums">{stat.value}</p>
              )}
              <p className="mt-2 text-[13px] text-mine-clair">{stat.hint}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mine-clair" />
            <input
              type="text"
              className="border border-filet bg-white pl-8 pr-3 py-[7px] w-full rounded-[8px] text-[14px] focus:outline-none focus:border-encre transition-colors text-encre placeholder:text-trait"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Listbox value={selectedRoles} onChange={setSelectedRoles} multiple>
            <div className="relative">
              <ListboxButton className="flex items-center gap-1.5 px-3 py-[7px] rounded-[8px] bg-white border border-filet text-[14px] font-medium text-mine hover:bg-survol transition-colors cursor-pointer">
                <span>{selectedRoles.length === 0 ? 'Tous les rôles' : selectedRoles.map((r) => r.name).join(', ')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-mine-clair" />
              </ListboxButton>
              <ListboxOptions className="absolute mt-1 w-48 overflow-auto rounded-[8px] bg-white border border-filet shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] z-10 py-1">
                {roles.map((role) => (
                  <ListboxOption
                    key={role.id}
                    value={role}
                    className={({ active }) => clsx('relative cursor-pointer select-none py-2 pl-8 pr-3 text-[14px] transition-colors', active ? 'bg-survol' : '')}
                  >
                    {({ selected }) => (
                      <>
                        <span className={clsx('block truncate', selected ? 'font-medium text-encre' : 'text-mine')}>{role.name}</span>
                        {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-2.5"><Check className="w-3.5 h-3.5 text-tirage" /></span>}
                      </>
                    )}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </div>
          </Listbox>
        </div>

        {/* ── Table ── */}
        {membersLoading ? (
          <MembersTableSkeleton />
        ) : (
          <div className="bg-white rounded-[12px] border border-filet overflow-hidden shadow-carte">
            <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '35%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '32%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-filet">
                  {['Membre', 'Projets', 'Rôle', 'Invitation'].map((h) => (
                    <th key={h} className={clsx('px-4 py-2 text-[12px] font-medium text-mine text-left border-b border-filet', 'tabular-nums')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-voile hover:bg-survol transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={member.name} src={member.avatar_url} />
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-encre truncate">{member.name}</p>
                          <p className="text-[12px] text-mine-clair truncate">
                            {member.email || <span className="italic text-trait">Pas d'email</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-[14px] text-mine', 'tabular-nums')}>{member.project_count} projet{member.project_count !== 1 ? 's' : ''}</span>
                        <button
                          onClick={() => openManageModal(member)}
                          className="text-[12px] text-mine-clair hover:text-encre-survol underline opacity-0 group-hover:opacity-100 transition-all"
                        >
                          gérer
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                    <td className="px-4 py-3">
                      {member.invited ? (
                        <span className="flex items-center gap-1.5 text-[13px] text-mine-clair">
                          <Check className="w-3.5 h-3.5 text-[#16a34a] flex-shrink-0" />
                          Invitation envoyée
                        </span>
                      ) : (
                        <button
                          onClick={() => openInviteModal(member)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium border border-filet rounded-[6px] hover:bg-voile hover:border-filet-fort transition-colors text-mine"
                        >
                          <Send className="w-3 h-3" />
                          Envoyer une invitation
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredMembers.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-[14px] text-mine-clair">Aucun membre trouvé</p>
              </div>
            )}
          </div>
        )}

        {/* ── Manage Projects Modal ── */}
        <Dialog open={manageOpen} onClose={() => setManageOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" />
          <div className="fixed inset-0 flex justify-center items-center p-6">
            <DialogPanel className="bg-white border border-filet rounded-[12px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <DialogTitle className="text-base font-medium text-encre">Gérer les projets</DialogTitle>
                  <p className="text-[14px] text-mine-clair mt-0.5">{currentMember?.name}</p>
                </div>
                <button onClick={() => setManageOpen(false)} className="p-1 rounded-[6px] hover:bg-voile transition-colors">
                  <X className="w-4 h-4 text-mine-clair" />
                </button>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {projects.map((project) => {
                  const active = memberProjects.includes(project.id)
                  return (
                    <div key={project.id} className="flex justify-between items-center px-3 py-2.5 rounded-[8px] hover:bg-survol transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[6px] bg-voile border border-filet flex items-center justify-center text-xs font-medium text-encre">
                          {project.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-[14px] font-medium text-encre">{project.name}</span>
                      </div>
                      <Switch
                        checked={active}
                        onChange={(val) => toggleProject(project.id, val)}
                        className={clsx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', active ? 'bg-encre' : 'bg-voile')}
                      >
                        <span className={clsx('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', active ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
                      </Switch>
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-voile">
                <button onClick={() => setManageOpen(false)} className="w-full py-2 text-[14px] font-medium text-mine bg-voile hover:bg-filet-fort rounded-[8px] transition-colors">
                  Fermer
                </button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* ── Add Member Modal ── */}
        <Dialog open={addOpen} onClose={() => setAddOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" />
          <div className="fixed inset-0 flex justify-center items-center p-6 overflow-y-auto">
            <DialogPanel className="bg-white border border-filet rounded-[12px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-md p-6 relative">
              <div className="flex items-center justify-between mb-5">
                <DialogTitle className="text-base font-medium text-encre">Ajouter un membre</DialogTitle>
                <button onClick={() => setAddOpen(false)} className="p-1 rounded-[6px] hover:bg-voile transition-colors">
                  <X className="w-4 h-4 text-mine-clair" />
                </button>
              </div>

              {addSuccess ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-voile rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-5 h-5 text-encre" />
                  </div>
                  <p className="text-[14px] font-medium text-encre mb-1">Membre ajouté</p>
                  <p className="text-[14px] text-mine-clair">Vous pourrez l'inviter par email depuis la liste.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className={clsx('block text-[12px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>Nom complet *</label>
                    <input
                      type="text"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-filet rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-encre transition-colors text-encre placeholder:text-trait"
                      placeholder="Jean Dupont"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className={clsx('block text-[12px] font-medium text-mine-clair mb-1', 'tabular-nums')}>
                      Adresse email <span className="text-trait font-normal normal-case">(optionnel)</span>
                    </label>
                    <p className="text-[12px] text-trait mb-1.5">Vous pourrez envoyer l'invitation plus tard.</p>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-trait pointer-events-none" />
                      <input
                        type="email"
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 border border-filet rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-encre transition-colors text-encre placeholder:text-trait"
                        placeholder="jean.dupont@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={clsx('block text-[12px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>Rôle</label>
                    <Listbox value={addRole} onChange={setAddRole}>
                      <div className="relative">
                        <ListboxButton className="relative w-full cursor-pointer rounded-[8px] bg-white border border-filet py-2.5 pl-3 pr-8 text-left text-[14px] font-medium text-encre hover:bg-survol transition-colors focus:outline-none focus:border-encre">
                          <span className="block truncate">{addRole.name}</span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                            <ChevronDown className="w-3.5 h-3.5 text-mine-clair" />
                          </span>
                        </ListboxButton>
                        <ListboxOptions className="absolute mt-1 w-full overflow-auto rounded-[8px] bg-white border border-filet shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] z-[60] py-1">
                          {roles.map((role) => (
                            <ListboxOption key={role.id} value={role} className={({ active }) => clsx('relative cursor-pointer select-none py-2 pl-8 pr-3 text-[14px] transition-colors', active ? 'bg-survol' : '')}>
                              {({ selected }) => (
                                <>
                                  <span className={clsx('block truncate', selected ? 'font-medium text-encre' : 'text-mine')}>{role.name}</span>
                                  {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-2.5"><Check className="w-3.5 h-3.5 text-tirage" /></span>}
                                </>
                              )}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </div>
                    </Listbox>
                  </div>

                  <div>
                    <label className={clsx('block text-[12px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>
                      Projets <span className="text-trait font-normal normal-case">(optionnel)</span>
                    </label>
                    <div className="space-y-0.5 max-h-[180px] overflow-y-auto border border-filet rounded-[8px] p-2">
                      {projects.length === 0 ? (
                        <p className="text-[14px] text-trait text-center py-4">Aucun projet disponible</p>
                      ) : (
                        projects.map((project) => {
                          const selected = addProjects.includes(project.id)
                          return (
                            <div key={project.id} className="flex items-center justify-between px-2.5 py-2 hover:bg-survol rounded-[6px] transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-[6px] bg-voile border border-filet flex items-center justify-center text-[11px] font-medium text-encre">
                                  {project.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="text-[14px] font-medium text-encre">{project.name}</span>
                              </div>
                              <Switch
                                checked={selected}
                                onChange={() => toggleAddProject(project.id)}
                                className={clsx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', selected ? 'bg-encre' : 'bg-voile')}
                              >
                                <span className={clsx('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', selected ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
                              </Switch>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {addError && (
                    <div className="px-3 py-2.5 bg-alerte-pale border border-alerte-clair rounded-[8px]">
                      <p className="text-[13px] text-alerte">{addError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setAddOpen(false)} disabled={addLoading} className="px-4 py-2 text-[14px] font-medium text-encre bg-white border border-filet rounded-[8px] hover:bg-survol transition-colors">
                      Annuler
                    </button>
                    <button type="button" onClick={addMember} disabled={addLoading} className="px-4 py-2 text-[14px] font-medium text-white bg-encre rounded-[8px] hover:bg-encre-survol transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                      {addLoading ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ajout...</>
                      ) : (
                        <><UserPlus className="w-3.5 h-3.5" />Ajouter</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </DialogPanel>
          </div>
        </Dialog>

        {/* ── Invite Existing Member Modal ── */}
        <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" />
          <div className="fixed inset-0 flex justify-center items-center p-6">
            <DialogPanel className="bg-white border border-filet rounded-[12px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-sm p-6 relative">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <DialogTitle className="text-base font-medium text-encre">Inviter par email</DialogTitle>
                  <p className="text-[14px] text-mine-clair mt-0.5">{inviteMember?.name}</p>
                </div>
                <button onClick={() => setInviteOpen(false)} className="p-1 rounded-[6px] hover:bg-voile transition-colors">
                  <X className="w-4 h-4 text-mine-clair" />
                </button>
              </div>

              {inviteSuccess ? (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 bg-voile rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-5 h-5 text-encre" />
                  </div>
                  <p className="text-[14px] font-medium text-encre mb-1">
                    {inviteResult?.emailSent === false ? 'Membre ajouté' : 'Invitation envoyée'}
                  </p>
                  <p className="text-[14px] text-mine-clair">
                    {inviteResult?.emailSent === false ? inviteResult.message : `Un email a été envoyé à ${inviteEmail}`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className={clsx('block text-[12px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>Adresse email</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-trait pointer-events-none" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 border border-filet rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-encre transition-colors text-encre placeholder:text-trait"
                        placeholder="jean.dupont@example.com"
                        autoFocus
                      />
                    </div>
                  </div>

                  {inviteError && (
                    <div className="px-3 py-2.5 bg-alerte-pale border border-alerte-clair rounded-[8px]">
                      <p className="text-[13px] text-alerte">{inviteError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setInviteOpen(false)} disabled={inviteLoading} className="px-4 py-2 text-[14px] font-medium text-encre bg-white border border-filet rounded-[8px] hover:bg-survol transition-colors">
                      Annuler
                    </button>
                    <button type="button" onClick={sendInvitation} disabled={inviteLoading} className="px-4 py-2 text-[14px] font-medium text-white bg-encre rounded-[8px] hover:bg-encre-survol transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                      {inviteLoading ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi...</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" />Envoyer</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </DialogPanel>
          </div>
        </Dialog>
      </main>
    </div>
  )
}