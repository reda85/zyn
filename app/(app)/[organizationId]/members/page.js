'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { Check, ChevronDown, UserPlus, Search, X, Mail, Send } from 'lucide-react'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import clsx from 'clsx'
import { Dialog, DialogPanel, DialogTitle, Listbox, ListboxButton, ListboxOption, ListboxOptions, Switch } from '@headlessui/react'
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'

const roles = [
  { id: 1, name: 'Membres', value: 'membres' },
  { id: 2, name: 'guest', value: 'guest' },
  { id: 3, name: 'admin', value: 'admin' },
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
      <div className="h-8 w-8 rounded-full bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-[11px] font-medium text-[#4a4a46] flex-shrink-0">
        {getInitials(name)}
      </div>
    )
  }
}

function RoleBadge({ role }) {
  const styles = {
    Admins: 'bg-[#fde8e8] text-[#9c1b1b] border-[#f5c6c6]',
    Membres: 'bg-[#eeeeec] text-[#4a4a46] border-[#e5e5e2]',
    guest: 'bg-[#fef3dc] text-[#8a5a00] border-[#f5e0ab]',
  }
  return (
    <span className={clsx('px-2.5 py-0.5 inline-flex text-[11px] font-medium rounded-[3px] border', styles[role] || styles.Membres)}>
      {role}
    </span>
  )
}

function MembersTableSkeleton() {
  return (
    <div className="bg-white rounded-[4px] border border-[#e5e5e2] overflow-hidden">
      <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '32%' }} />
        </colgroup>
        <thead>
          <tr className="bg-[#f5f5f4]">
            {['Membre', 'Projets', 'Rôle', 'Invitation'].map((h) => (
              <th key={h} className={clsx('px-4 py-2 text-[11px] font-medium text-[#666660] uppercase tracking-[0.08em] text-left border-b border-[#e5e5e2]', GeistMono.className)}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3, 4].map((i) => (
            <tr key={i} className="border-b border-[#eeeeec]">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-[#eeeeec] animate-pulse flex-shrink-0" />
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="h-3 rounded-[2px] bg-[#eeeeec] animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
                    <div className="h-2.5 w-2/3 rounded-[2px] bg-[#eeeeec] animate-pulse" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="h-3 w-16 rounded-[2px] bg-[#eeeeec] animate-pulse" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-14 rounded-[3px] bg-[#eeeeec] animate-pulse" />
              </td>
              <td className="px-4 py-3">
                <div className="h-3 w-28 rounded-[2px] bg-[#eeeeec] animate-pulse" />
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
          organizationId: selectedOrganization?.id,
          memberId: inviteMember.id,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Erreur lors de l'envoi")

      await supabase.from('members_organizations').update({ invited: true }).eq('member_id', inviteMember.id)

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
      <div className={clsx('flex h-screen items-center justify-center bg-[#fafaf9]', GeistSans.className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#e5e5e2] border-t-[#0d0d0c] mx-auto mb-3" />
          <p className="text-[13px] text-[#8a8a84]">Vérification des accès...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('flex h-screen bg-[#fafaf9] overflow-hidden', GeistSans.className)}>
      <Sidebar organizationId={organizationId} currentPage="members" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium tracking-[-0.003em] text-[#050505]">Membres</h1>
            {membersLoading ? (
              <div className="h-3 w-40 rounded-[2px] bg-[#eeeeec] animate-pulse mt-1.5" />
            ) : (
              <p className={clsx('text-[12px] text-[#8a8a84] mt-0.5', GeistMono.className)}>
                {members.length} membre{members.length !== 1 ? 's' : ''} dans l'organisation
              </p>
            )}
          </div>
          <button
            onClick={openAddModal}
            className="bg-[#0d0d0c] text-white px-4 py-2 rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un membre
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total licences', value: 'Illimitées' },
            { label: 'Licences assignées', value: members.length },
            { label: 'Licences disponibles', value: 'Illimitées' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-[#e5e5e2] rounded-[4px] px-4 py-3.5">
              <p className="text-[11px] text-[#8a8a84] font-medium mb-1">{stat.label}</p>
              {membersLoading ? (
                <div className="h-6 w-16 rounded-[2px] bg-[#eeeeec] animate-pulse" />
              ) : (
                <p className={clsx('text-2xl font-medium text-[#050505]', GeistMono.className)}>{stat.value}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a84]" />
            <input
              type="text"
              className="border border-[#e5e5e2] bg-white pl-8 pr-3 py-[7px] w-full rounded-[4px] text-[13px] focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c] placeholder:text-[#b8b8b3]"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Listbox value={selectedRoles} onChange={setSelectedRoles} multiple>
            <div className="relative">
              <ListboxButton className="flex items-center gap-1.5 px-3 py-[7px] rounded-[4px] bg-white border border-[#e5e5e2] text-[13px] font-medium text-[#4a4a46] hover:bg-[#f5f5f4] transition-colors cursor-pointer">
                <span>{selectedRoles.length === 0 ? 'Tous les rôles' : selectedRoles.map((r) => r.name).join(', ')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8a8a84]" />
              </ListboxButton>
              <ListboxOptions className="absolute mt-1 w-48 overflow-auto rounded-[4px] bg-white border border-[#e5e5e2] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] z-10 py-1">
                {roles.map((role) => (
                  <ListboxOption
                    key={role.id}
                    value={role}
                    className={({ active }) => clsx('relative cursor-pointer select-none py-2 pl-8 pr-3 text-[13px] transition-colors', active ? 'bg-[#f5f5f4]' : '')}
                  >
                    {({ selected }) => (
                      <>
                        <span className={clsx('block truncate', selected ? 'font-medium text-[#0d0d0c]' : 'text-[#4a4a46]')}>{role.name}</span>
                        {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-2.5"><Check className="w-3.5 h-3.5 text-[#2f5ee0]" /></span>}
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
          <div className="bg-white rounded-[4px] border border-[#e5e5e2] overflow-hidden">
            <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '35%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '32%' }} />
              </colgroup>
              <thead>
                <tr className="bg-[#f5f5f4]">
                  {['Membre', 'Projets', 'Rôle', 'Invitation'].map((h) => (
                    <th key={h} className={clsx('px-4 py-2 text-[11px] font-medium text-[#666660] uppercase tracking-[0.08em] text-left border-b border-[#e5e5e2]', GeistMono.className)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-[#eeeeec] hover:bg-[#f5f5f4] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={member.name} src={member.avatar_url} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#0d0d0c] truncate">{member.name}</p>
                          <p className="text-[11px] text-[#8a8a84] truncate">
                            {member.email || <span className="italic text-[#b8b8b3]">Pas d'email</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-[13px] text-[#666660]', GeistMono.className)}>{member.project_count} projet{member.project_count !== 1 ? 's' : ''}</span>
                        <button
                          onClick={() => openManageModal(member)}
                          className="text-[11px] text-[#8a8a84] hover:text-[#2e2e2b] underline opacity-0 group-hover:opacity-100 transition-all"
                        >
                          gérer
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                    <td className="px-4 py-3">
                      {member.invited ? (
                        <span className="flex items-center gap-1.5 text-[12px] text-[#8a8a84]">
                          <Check className="w-3.5 h-3.5 text-[#16a34a] flex-shrink-0" />
                          Invitation envoyée
                        </span>
                      ) : (
                        <button
                          onClick={() => openInviteModal(member)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium border border-[#e5e5e2] rounded-[3px] hover:bg-[#eeeeec] hover:border-[#d6d6d2] transition-colors text-[#4a4a46]"
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
                <p className="text-[13px] text-[#8a8a84]">Aucun membre trouvé</p>
              </div>
            )}
          </div>
        )}

        {/* ── Manage Projects Modal ── */}
        <Dialog open={manageOpen} onClose={() => setManageOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" />
          <div className="fixed inset-0 flex justify-center items-center p-6">
            <DialogPanel className="bg-white border border-[#e5e5e2] rounded-[6px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <DialogTitle className="text-base font-medium text-[#050505]">Gérer les projets</DialogTitle>
                  <p className="text-[13px] text-[#8a8a84] mt-0.5">{currentMember?.name}</p>
                </div>
                <button onClick={() => setManageOpen(false)} className="p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors">
                  <X className="w-4 h-4 text-[#8a8a84]" />
                </button>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {projects.map((project) => {
                  const active = memberProjects.includes(project.id)
                  return (
                    <div key={project.id} className="flex justify-between items-center px-3 py-2.5 rounded-[4px] hover:bg-[#f5f5f4] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[3px] bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-xs font-medium text-[#050505]">
                          {project.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-[13px] font-medium text-[#0d0d0c]">{project.name}</span>
                      </div>
                      <Switch
                        checked={active}
                        onChange={(val) => toggleProject(project.id, val)}
                        className={clsx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', active ? 'bg-[#0d0d0c]' : 'bg-[#eeeeec]')}
                      >
                        <span className={clsx('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', active ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
                      </Switch>
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-[#eeeeec]">
                <button onClick={() => setManageOpen(false)} className="w-full py-2 text-[13px] font-medium text-[#4a4a46] bg-[#eeeeec] hover:bg-[#d6d6d2] rounded-[4px] transition-colors">
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
            <DialogPanel className="bg-white border border-[#e5e5e2] rounded-[6px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-md p-6 relative">
              <div className="flex items-center justify-between mb-5">
                <DialogTitle className="text-base font-medium text-[#050505]">Ajouter un membre</DialogTitle>
                <button onClick={() => setAddOpen(false)} className="p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors">
                  <X className="w-4 h-4 text-[#8a8a84]" />
                </button>
              </div>

              {addSuccess ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-[#eeeeec] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-5 h-5 text-[#0d0d0c]" />
                  </div>
                  <p className="text-[14px] font-medium text-[#050505] mb-1">Membre ajouté</p>
                  <p className="text-[13px] text-[#8a8a84]">Vous pourrez l'inviter par email depuis la liste.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>Nom complet *</label>
                    <input
                      type="text"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#e5e5e2] rounded-[4px] text-[13px] bg-white focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                      placeholder="Jean Dupont"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1', GeistMono.className)}>
                      Adresse email <span className="text-[#b8b8b3] font-normal normal-case">(optionnel)</span>
                    </label>
                    <p className="text-[11px] text-[#b8b8b3] mb-1.5">Vous pourrez envoyer l'invitation plus tard.</p>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b8b8b3] pointer-events-none" />
                      <input
                        type="email"
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 border border-[#e5e5e2] rounded-[4px] text-[13px] bg-white focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                        placeholder="jean.dupont@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>Rôle</label>
                    <Listbox value={addRole} onChange={setAddRole}>
                      <div className="relative">
                        <ListboxButton className="relative w-full cursor-pointer rounded-[4px] bg-white border border-[#e5e5e2] py-2.5 pl-3 pr-8 text-left text-[13px] font-medium text-[#0d0d0c] hover:bg-[#f5f5f4] transition-colors focus:outline-none focus:border-[#0d0d0c]">
                          <span className="block truncate">{addRole.name}</span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                            <ChevronDown className="w-3.5 h-3.5 text-[#8a8a84]" />
                          </span>
                        </ListboxButton>
                        <ListboxOptions className="absolute mt-1 w-full overflow-auto rounded-[4px] bg-white border border-[#e5e5e2] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] z-[60] py-1">
                          {roles.map((role) => (
                            <ListboxOption key={role.id} value={role} className={({ active }) => clsx('relative cursor-pointer select-none py-2 pl-8 pr-3 text-[13px] transition-colors', active ? 'bg-[#f5f5f4]' : '')}>
                              {({ selected }) => (
                                <>
                                  <span className={clsx('block truncate', selected ? 'font-medium text-[#0d0d0c]' : 'text-[#4a4a46]')}>{role.name}</span>
                                  {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-2.5"><Check className="w-3.5 h-3.5 text-[#2f5ee0]" /></span>}
                                </>
                              )}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </div>
                    </Listbox>
                  </div>

                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>
                      Projets <span className="text-[#b8b8b3] font-normal normal-case">(optionnel)</span>
                    </label>
                    <div className="space-y-0.5 max-h-[180px] overflow-y-auto border border-[#e5e5e2] rounded-[4px] p-2">
                      {projects.length === 0 ? (
                        <p className="text-[13px] text-[#b8b8b3] text-center py-4">Aucun projet disponible</p>
                      ) : (
                        projects.map((project) => {
                          const selected = addProjects.includes(project.id)
                          return (
                            <div key={project.id} className="flex items-center justify-between px-2.5 py-2 hover:bg-[#f5f5f4] rounded-[3px] transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-[3px] bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-[10px] font-medium text-[#050505]">
                                  {project.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="text-[13px] font-medium text-[#0d0d0c]">{project.name}</span>
                              </div>
                              <Switch
                                checked={selected}
                                onChange={() => toggleAddProject(project.id)}
                                className={clsx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', selected ? 'bg-[#0d0d0c]' : 'bg-[#eeeeec]')}
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
                    <div className="px-3 py-2.5 bg-[#fde8e8] border border-[#f5c6c6] rounded-[4px]">
                      <p className="text-[12px] text-[#9c1b1b]">{addError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setAddOpen(false)} disabled={addLoading} className="px-4 py-2 text-[13px] font-medium text-[#4a4a46] bg-[#eeeeec] rounded-[4px] hover:bg-[#d6d6d2] transition-colors">
                      Annuler
                    </button>
                    <button type="button" onClick={addMember} disabled={addLoading} className="px-4 py-2 text-[13px] font-medium text-white bg-[#0d0d0c] rounded-[4px] hover:bg-[#1a1a18] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
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
            <DialogPanel className="bg-white border border-[#e5e5e2] rounded-[6px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-sm p-6 relative">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <DialogTitle className="text-base font-medium text-[#050505]">Inviter par email</DialogTitle>
                  <p className="text-[13px] text-[#8a8a84] mt-0.5">{inviteMember?.name}</p>
                </div>
                <button onClick={() => setInviteOpen(false)} className="p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors">
                  <X className="w-4 h-4 text-[#8a8a84]" />
                </button>
              </div>

              {inviteSuccess ? (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 bg-[#eeeeec] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-5 h-5 text-[#0d0d0c]" />
                  </div>
                  <p className="text-[14px] font-medium text-[#050505] mb-1">Invitation envoyée</p>
                  <p className="text-[13px] text-[#8a8a84]">Un email a été envoyé à {inviteEmail}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>Adresse email</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b8b8b3] pointer-events-none" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 border border-[#e5e5e2] rounded-[4px] text-[13px] bg-white focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                        placeholder="jean.dupont@example.com"
                        autoFocus
                      />
                    </div>
                  </div>

                  {inviteError && (
                    <div className="px-3 py-2.5 bg-[#fde8e8] border border-[#f5c6c6] rounded-[4px]">
                      <p className="text-[12px] text-[#9c1b1b]">{inviteError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setInviteOpen(false)} disabled={inviteLoading} className="px-4 py-2 text-[13px] font-medium text-[#4a4a46] bg-[#eeeeec] rounded-[4px] hover:bg-[#d6d6d2] transition-colors">
                      Annuler
                    </button>
                    <button type="button" onClick={sendInvitation} disabled={inviteLoading} className="px-4 py-2 text-[13px] font-medium text-white bg-[#0d0d0c] rounded-[4px] hover:bg-[#1a1a18] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
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