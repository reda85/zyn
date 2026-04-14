'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedProjectAtom, selectedOrganizationAtom } from '@/store/atoms'
import { Check, ChevronDown, UserPlus, Search, X, Mail } from 'lucide-react'
import { Outfit } from 'next/font/google'
import clsx from 'clsx'
import { Dialog, DialogPanel, DialogTitle, Listbox, ListboxButton, ListboxOption, ListboxOptions, Switch } from '@headlessui/react'
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

const roles = [
  { id: 1, name: 'Membres', value: 'membres' },
  { id: 2, name: 'guest', value: 'guest' },
  { id: 3, name: 'Admins', value: 'admins' },
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
      <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-[11px] font-semibold text-neutral-600 flex-shrink-0">
        {getInitials(name)}
      </div>
    )
  }
}

function RoleBadge({ role }) {
  const styles = {
    Admins: 'bg-red-50 text-red-600 border-red-100',
    Membres: 'bg-neutral-50 text-neutral-600 border-neutral-200',
    guest: 'bg-amber-50 text-amber-600 border-amber-100',
  }

  return (
    <span className={clsx('px-2.5 py-0.5 inline-flex text-[11px] font-medium rounded-md border', styles[role] || styles.Membres)}>
      {role}
    </span>
  )
}

export default function MembersPage({ params }) {
  const { organizationId } = params
  const router = useRouter()
  const [selectedRoles, setSelectedRoles] = useState([])
  const [selectedOrganization] = useAtom(selectedOrganizationAtom)
  const [members, setMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [refresh, setRefresh] = useState(false)

  const [manageOpen, setManageOpen] = useState(false)
  const [currentMember, setCurrentMember] = useState(null)
  const [memberProjects, setMemberProjects] = useState([])
  const [projects, setProjects] = useState([])

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState(roles[0])
  const [inviteProjects, setInviteProjects] = useState([])
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
    role: m.role, // rôle de members_organizations, pas de members
    project_count: orgProjectCount,
  }
})

  setMembers(formatted)
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

  const openInviteModal = () => {
    setInviteEmail('')
    setInviteName('')
    setInviteRole(roles[0])
    setInviteProjects([])
    setInviteError('')
    setInviteSuccess(false)
    setInviteOpen(true)
  }

  const toggleInviteProject = (projectId) => {
    setInviteProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    )
  }

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const sendInvitation = async () => {
    setInviteError('')
    setInviteSuccess(false)

    if (!inviteName.trim()) { setInviteError('Le nom est requis'); return }
    if (!inviteEmail.trim()) { setInviteError("L'email est requis"); return }
    if (!validateEmail(inviteEmail)) { setInviteError('Veuillez entrer une adresse email valide'); return }

   // Replace the existing client-side check with this
const { data: existingOrgMember, error: orgMemberError } = await supabase
  .from('members_organizations')
  .select('member_id, members!inner(email)')
  .eq('organization_id', organizationId)
  .eq('members.email', inviteEmail.toLowerCase())
  .maybeSingle()

if (existingOrgMember) { setInviteError('Ce membre appartient déjà à cette organisation'); return }

    if (orgMemberError) { setInviteError("Erreur lors de la vérification de l'email"); return }
   

    setInviteLoading(true)
    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.toLowerCase().trim(),
          name: inviteName.trim(),
          role: inviteRole.name,
          organizationId: selectedOrganization?.id,
          projects: inviteProjects,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Erreur lors de l'envoi de l'invitation")

      setInviteSuccess(true)
      setRefresh((x) => !x)
      setTimeout(() => setInviteOpen(false), 2000)
    } catch (error) {
      setInviteError(error.message || "Une erreur est survenue lors de l'invitation")
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
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-neutral-900 mx-auto mb-3" />
          <p className="text-[13px] text-neutral-400">Vérification des accès...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('flex h-screen bg-neutral-50 overflow-hidden', outfit.className)}>
      <Sidebar organizationId={organizationId} currentPage="members" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Membres</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {members.length} membre{members.length !== 1 ? 's' : ''} dans l'organisation
            </p>
          </div>
          <button
            onClick={openInviteModal}
            className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Inviter un membre
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total seats', value: 'Unlimited' },
            { label: 'Assigned seats', value: members.length },
            { label: 'Available seats', value: 'Unlimited' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-neutral-200 rounded-lg px-4 py-3.5">
              <p className="text-[11px] text-neutral-400 font-medium mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-neutral-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              className="border border-neutral-200 bg-white pl-8 pr-3 py-[7px] w-full rounded-lg text-[13px] focus:outline-none focus:border-neutral-400 transition-colors text-neutral-900 placeholder:text-neutral-300"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Listbox value={selectedRoles} onChange={setSelectedRoles} multiple>
            <div className="relative">
              <ListboxButton className="flex items-center gap-1.5 px-3 py-[7px] rounded-lg bg-white border border-neutral-200 text-[13px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer">
                <span>{selectedRoles.length === 0 ? 'Tous les rôles' : selectedRoles.map((r) => r.name).join(', ')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </ListboxButton>
              <ListboxOptions className="absolute mt-1 w-48 overflow-auto rounded-lg bg-white border border-neutral-200 shadow-lg z-10 py-1">
                {roles.map((role) => (
                  <ListboxOption
                    key={role.id}
                    value={role}
                    className={({ active }) => clsx('relative cursor-pointer select-none py-2 pl-8 pr-3 text-[13px] transition-colors', active ? 'bg-neutral-50' : '')}
                  >
                    {({ selected }) => (
                      <>
                        <span className={clsx('block truncate', selected ? 'font-medium text-neutral-900' : 'text-neutral-600')}>{role.name}</span>
                        {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-2.5"><Check className="w-3.5 h-3.5 text-neutral-900" /></span>}
                      </>
                    )}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </div>
          </Listbox>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '40%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '25%' }} />
            </colgroup>
            <thead>
              <tr className="bg-neutral-50">
                {['Membre', 'Projets', 'Rôle', ''].map((h) => (
                  <th key={h} className="px-4 py-2 text-[10px] font-medium text-neutral-400 uppercase tracking-wider text-left border-b border-neutral-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={member.name} src={member.avatar_url} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 truncate">{member.name}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-neutral-500">{member.project_count} projet{member.project_count !== 1 ? 's' : ''}</span>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openManageModal(member)}
                      className="text-[12px] font-medium text-neutral-400 hover:text-neutral-900 px-3 py-1.5 rounded-md hover:bg-neutral-100 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Gérer les projets
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[13px] text-neutral-400">Aucun membre trouvé</p>
            </div>
          )}
        </div>

        {/* Manage Projects Modal */}
        <Dialog open={manageOpen} onClose={() => setManageOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" />
          <div className="fixed inset-0 flex justify-center items-center p-6">
            <DialogPanel className="bg-white border border-neutral-200 rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <DialogTitle className="text-base font-semibold text-neutral-900">Gérer les projets</DialogTitle>
                  <p className="text-[13px] text-neutral-400 mt-0.5">{currentMember?.name}</p>
                </div>
                <button onClick={() => setManageOpen(false)} className="p-1 rounded-md hover:bg-neutral-100 transition-colors">
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {projects.map((project) => {
                  const active = memberProjects.includes(project.id)
                  return (
                    <div key={project.id} className="flex justify-between items-center px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-900">
                          {project.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-[13px] font-medium text-neutral-900">{project.name}</span>
                      </div>
                      <Switch
                        checked={active}
                        onChange={(val) => toggleProject(project.id, val)}
                        className={clsx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', active ? 'bg-neutral-900' : 'bg-neutral-200')}
                      >
                        <span className={clsx('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', active ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
                      </Switch>
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-neutral-100">
                <button onClick={() => setManageOpen(false)} className="w-full py-2 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors">
                  Fermer
                </button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Invite Modal */}
        <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" />
          <div className="fixed inset-0 flex justify-center items-center p-6 overflow-y-auto">
            <DialogPanel className="bg-white border border-neutral-200 rounded-xl shadow-xl w-full max-w-md p-6 relative">
              <div className="flex items-center justify-between mb-5">
                <DialogTitle className="text-base font-semibold text-neutral-900">Inviter un nouveau membre</DialogTitle>
                <button onClick={() => setInviteOpen(false)} className="p-1 rounded-md hover:bg-neutral-100 transition-colors">
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              {inviteSuccess ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-5 h-5 text-neutral-900" />
                  </div>
                  <p className="text-[14px] font-semibold text-neutral-900 mb-1">Invitation envoyée</p>
                  <p className="text-[13px] text-neutral-400">Un email a été envoyé à {inviteEmail}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="invite-name" className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Nom complet</label>
                    <input
                      id="invite-name"
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-[13px] bg-white focus:outline-none focus:border-neutral-400 transition-colors text-neutral-900 placeholder:text-neutral-300"
                      placeholder="Jean Dupont"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label htmlFor="invite-email" className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Adresse email</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 pointer-events-none" />
                      <input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 border border-neutral-200 rounded-lg text-[13px] bg-white focus:outline-none focus:border-neutral-400 transition-colors text-neutral-900 placeholder:text-neutral-300"
                        placeholder="jean.dupont@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Rôle</label>
                    <Listbox value={inviteRole} onChange={setInviteRole}>
                      <div className="relative">
                        <ListboxButton className="relative w-full cursor-pointer rounded-lg bg-white border border-neutral-200 py-2.5 pl-3 pr-8 text-left text-[13px] font-medium text-neutral-900 hover:bg-neutral-50 transition-colors focus:outline-none focus:border-neutral-400">
                          <span className="block truncate">{inviteRole.name}</span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                          </span>
                        </ListboxButton>
                        <ListboxOptions className="absolute mt-1 w-full overflow-auto rounded-lg bg-white border border-neutral-200 shadow-lg z-[60] py-1">
                          {roles.map((role) => (
                            <ListboxOption
                              key={role.id}
                              value={role}
                              className={({ active }) => clsx('relative cursor-pointer select-none py-2 pl-8 pr-3 text-[13px] transition-colors', active ? 'bg-neutral-50' : '')}
                            >
                              {({ selected }) => (
                                <>
                                  <span className={clsx('block truncate', selected ? 'font-medium text-neutral-900' : 'text-neutral-600')}>{role.name}</span>
                                  {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-2.5"><Check className="w-3.5 h-3.5 text-neutral-900" /></span>}
                                </>
                              )}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </div>
                    </Listbox>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                      Assigner aux projets <span className="text-neutral-300 font-normal normal-case ml-1">(optionnel)</span>
                    </label>
                    <div className="space-y-0.5 max-h-[180px] overflow-y-auto border border-neutral-200 rounded-lg p-2">
                      {projects.length === 0 ? (
                        <p className="text-[13px] text-neutral-300 text-center py-4">Aucun projet disponible</p>
                      ) : (
                        projects.map((project) => {
                          const selected = inviteProjects.includes(project.id)
                          return (
                            <div key={project.id} className="flex items-center justify-between px-2.5 py-2 hover:bg-neutral-50 rounded-md transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-900">
                                  {project.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="text-[13px] font-medium text-neutral-900">{project.name}</span>
                              </div>
                              <Switch
                                checked={selected}
                                onChange={() => toggleInviteProject(project.id)}
                                className={clsx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', selected ? 'bg-neutral-900' : 'bg-neutral-200')}
                              >
                                <span className={clsx('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', selected ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
                              </Switch>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {inviteError && (
                    <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
                      <p className="text-[12px] text-red-600">{inviteError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setInviteOpen(false)} disabled={inviteLoading} className="px-4 py-2 text-[13px] font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">
                      Annuler
                    </button>
                    <button type="button" onClick={sendInvitation} disabled={inviteLoading} className="px-4 py-2 text-[13px] font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                      {inviteLoading ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi...</>
                      ) : (
                        <><Mail className="w-3.5 h-3.5" />Envoyer</>
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