// app/members/page.js
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedPlanAtom, selectedProjectAtom, selectedOrganizationAtom } from '@/store/atoms'
import { FolderKanban, Users, BarChart3, Settings, Check, ChevronDown, UserPlus, Search, X, Mail, Send } from 'lucide-react'
import Link from 'next/link'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import clsx from 'clsx'
import { Dialog, DialogPanel, DialogTitle, Listbox, ListboxButton, ListboxOption, ListboxOptions, Switch } from '@headlessui/react'
import { useUserData } from '@/hooks/useUserData'

const roles = [
  { id: 1, name: 'Membres', value: 'membres' },
  { id: 2, name: 'Invités', value: 'invites' },
  { id: 3, name: 'Admins', value: 'admins' },
];

function Avatar({ name, src }) {
  const [imageError, setImageError] = useState(false);
  const getInitials = (fullName) => {
    if (!fullName) return "?";
    const parts = fullName.trim().split(" ");
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  return (
    <div className="h-10 w-10 rounded-full bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-sm font-medium text-[#0d0d0c]">
      {getInitials(name)}
    </div>
  );
}

export default function MembersPage({ params }) {
  const { organizationId } = params;
  const [selectedRoles, setSelectedRoles] = useState([])
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const [selectedOrganization, setSelectedOrganization] = useAtom(selectedOrganizationAtom)
  const [members, setMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState("");
  const [refresh, setRefresh] = useState(false)

  const [manageOpen, setManageOpen] = useState(false)
  const [currentMember, setCurrentMember] = useState(null)
  const [memberProjects, setMemberProjects] = useState([])
  const [projects, setProjects] = useState([])

  // Add member modal states
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState(roles[0])
  const [addProjects, setAddProjects] = useState([])
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState(false)

  // Invite modal states (for existing members)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteMember, setInviteMember] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const { user, profile, organization } = useUserData();

  useEffect(() => {
    const fetchMembers = async () => {
      const { data: rawMembers } = await supabase
        .from('members')
        .select(`*, members_projects(count)`)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      const formatted = rawMembers.map((m) => ({
        ...m,
        project_count: m.members_projects?.[0]?.count || 0
      }))
      setMembers(formatted)
    }

    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organizationId)
      setProjects(data || [])
    }

    fetchMembers()
    fetchProjects()
  }, [refresh, selectedOrganization, organization])

  // ─── Manage projects modal ───────────────────────────────────────────────────

  const openManageModal = async (member) => {
    setCurrentMember(member)
    const { data } = await supabase
      .from('members_projects')
      .select('project_id')
      .eq('member_id', member.id)
    setMemberProjects(data.map((p) => p.project_id))
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

  // ─── Add member modal ────────────────────────────────────────────────────────

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
    setAddProjects(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    )
  }

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const addMember = async () => {
    setAddError('')
    setAddSuccess(false)

    if (!addName.trim()) {
      setAddError('Le nom est requis')
      return
    }

    if (addEmail.trim() && !validateEmail(addEmail)) {
      setAddError('Adresse email invalide')
      return
    }

    if (addEmail.trim()) {
      const { data: existing } = await supabase
        .from('members')
        .select('email')
        .eq('email', addEmail.toLowerCase())
        .maybeSingle()

      if (existing) {
        setAddError('Un membre avec cet email existe déjà')
        return
      }
    }

    setAddLoading(true)
    try {
      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert({
          name: addName.trim(),
          email: addEmail.toLowerCase().trim() || null,
          role: addRole.name,
          organization_id: organizationId,
          invited: false,
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (addProjects.length > 0) {
        await supabase.from('members_projects').insert(
          addProjects.map(projectId => ({ member_id: newMember.id, project_id: projectId }))
        )
      }

      setAddSuccess(true)
      setRefresh(x => !x)
      setTimeout(() => setAddOpen(false), 1500)
    } catch (error) {
      console.error('Add member error:', error)
      setAddError(error.message || 'Une erreur est survenue')
    } finally {
      setAddLoading(false)
    }
  }

  // ─── Invite existing member modal ────────────────────────────────────────────

  const openInviteModal = (member) => {
    setInviteMember(member)
    setInviteEmail(member.email || '')
    setInviteError('')
    setInviteSuccess(false)
    setInviteOpen(true)
  }

  const sendInvitation = async () => {
    setInviteError('')
    setInviteSuccess(false)

    if (!inviteEmail.trim()) {
      setInviteError("L'email est requis pour envoyer une invitation")
      return
    }
    if (!validateEmail(inviteEmail)) {
      setInviteError('Adresse email invalide')
      return
    }

    setInviteLoading(true)
    try {
      if (inviteEmail.toLowerCase().trim() !== inviteMember.email) {
        await supabase
          .from('members')
          .update({ email: inviteEmail.toLowerCase().trim() })
          .eq('id', inviteMember.id)
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
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Erreur lors de l'envoi")

      await supabase.from('members').update({ invited: true }).eq('id', inviteMember.id)

      setInviteSuccess(true)
      setRefresh(x => !x)
      setTimeout(() => setInviteOpen(false), 2000)
    } catch (error) {
      setInviteError(error.message || 'Une erreur est survenue')
    } finally {
      setInviteLoading(false)
    }
  }

  // ─── Filtering ───────────────────────────────────────────────────────────────

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.email || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole =
        selectedRoles.length === 0 ||
        selectedRoles.some((role) => role.name === member.role)
      return matchesSearch && matchesRole
    })
  }, [members, searchQuery, selectedRoles])

  const ROLE_STYLES = {
    Admins:  'bg-[#fde8e8] text-[#9c1b1b] border border-[#f5c6c6]',
    Membres: 'bg-[#e6f4ea] text-[#0f7a3a] border border-[#bfe3cb]',
    Invités: 'bg-[#fef3dc] text-[#8a5a00] border border-[#f5e0ab]',
  }

  return (
    <div className={clsx("flex h-screen bg-[#fafaf9] overflow-hidden", GeistSans.className)}>
      <aside className="w-64 h-screen bg-white border-r border-[#e5e5e2] flex flex-col">
        <div className="px-3 pt-4 pb-3 mx-3 my-3 rounded-[4px] border border-[#e5e5e2] bg-white flex flex-col gap-1">
          <h2 className="text-[13px] font-medium text-[#050505]">{organization?.name}</h2>
          <p className={clsx('text-[11px] text-[#8a8a84]', GeistMono.className)}>{organization?.members[0]?.count} membres</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          <Link href={`/${organizationId}/projects`} className="flex text-[13px] items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-[#666660] hover:bg-[#f5f5f4] hover:text-[#0d0d0c] transition-colors">
            <FolderKanban className="w-4 h-4 text-[#8a8a84]" /> Projects
          </Link>
          <Link href={`/${organizationId}/members`} className="flex text-[13px] items-center gap-2.5 px-2.5 py-2 rounded-[4px] bg-[#eeeeec] text-[#050505] font-medium">
            <Users className="w-4 h-4 text-[#0d0d0c]" /> Membres
          </Link>
          <Link href={`/${organizationId}/reports`} className="flex text-[13px] items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-[#666660] hover:bg-[#f5f5f4] hover:text-[#0d0d0c] transition-colors">
            <BarChart3 className="w-4 h-4 text-[#8a8a84]" /> Rapports
          </Link>
          <Link href={`/${organizationId}/settings`} className="flex text-[13px] items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-[#666660] hover:bg-[#f5f5f4] hover:text-[#0d0d0c] transition-colors">
            <Settings className="w-4 h-4 text-[#8a8a84]" /> Paramètres
          </Link>
        </nav>

        <div className="px-3 pb-4">
          <div className="h-px bg-[#eeeeec] mb-3" />
          <Link href={`/${organizationId}/profile`} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] hover:bg-[#f5f5f4] transition-colors">
            <div className="h-7 w-7 rounded-full bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-[10px] font-medium text-[#0d0d0c] flex-shrink-0">MR</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#0d0d0c] truncate leading-tight">{profile?.full_name || user?.email || 'Utilisateur'}</p>
              <p className="text-[11px] text-[#8a8a84] leading-tight">Mon profil</p>
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10">
        <div className="flex flex-col mb-8 gap-2">
          <h1 className="text-[30px] font-medium tracking-[-0.02em] text-[#050505]">Membres de l'organisation</h1>

          <div className='rounded-[6px] bg-white border border-[#e5e5e2] p-6 flex flex-col gap-4 my-8'>
            <div className='flex flex-row gap-3 items-center'>
              <p className='text-[17px] font-medium text-[#050505]'>Zynspace Free Plan</p>
              <button className='bg-[#2f5ee0] text-white text-[13px] px-4 py-2 rounded-[4px] font-medium hover:bg-[#264dc2] transition-colors'>
                Upgrade to team
              </button>
            </div>
            <div className='grid grid-cols-3 gap-4'>
              <div className='bg-[#f5f5f4] border border-[#e5e5e2] rounded-[4px] px-4 py-4 text-[13px]'>
                <p className='text-[#8a8a84] mb-2'>Total seats</p>
                <p className={clsx('text-[24px] font-medium text-[#050505]', GeistMono.className)}>Unlimited</p>
              </div>
              <div className='bg-[#f5f5f4] border border-[#e5e5e2] rounded-[4px] px-4 py-4 text-[13px]'>
                <p className='text-[#8a8a84] mb-2'>Assigned seats</p>
                <p className={clsx('text-[24px] font-medium text-[#050505]', GeistMono.className)}>{members.length}</p>
              </div>
              <div className='bg-[#f5f5f4] border border-[#e5e5e2] rounded-[4px] px-4 py-4 text-[13px]'>
                <p className='text-[#8a8a84] mb-2'>Available seats</p>
                <p className={clsx('text-[24px] font-medium text-[#050505]', GeistMono.className)}>Unlimited</p>
              </div>
            </div>
          </div>

          <div className="flex flex-row justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a84]" />
              <input
                type="text"
                className="border border-[#e5e5e2] bg-white pl-9 pr-4 py-2.5 w-full rounded-[4px] focus:outline-none focus:border-[#0d0d0c] transition-colors text-[13px] text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-row gap-3 items-center">
              <p className="text-[13px] font-medium text-[#0d0d0c]">Rôles</p>
              <div className="w-56">
                <Listbox value={selectedRoles} onChange={setSelectedRoles} multiple>
                  <div className="relative">
                    <ListboxButton className="relative w-full cursor-pointer rounded-[4px] bg-white border border-[#e5e5e2] py-2.5 pl-3 pr-9 text-left text-[13px] font-medium text-[#0d0d0c] hover:bg-[#f5f5f4] transition-colors focus:outline-none focus:border-[#0d0d0c]">
                      <span className="block truncate">
                        {selectedRoles.length === 0 ? 'Filtrer par rôle' : selectedRoles.map(r => r.name).join(', ')}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronDown className="h-4 w-4 text-[#8a8a84]" />
                      </span>
                    </ListboxButton>
                    <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-[4px] bg-white border border-[#e5e5e2] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] focus:outline-none text-[13px] z-10 py-1">
                      {roles.map((role) => (
                        <ListboxOption key={role.id} value={role} className={({ active }) => clsx('relative cursor-pointer select-none py-2.5 pl-9 pr-4 transition-colors', active ? 'bg-[#f5f5f4] text-[#0d0d0c]' : 'text-[#0d0d0c]')}>
                          {({ selected }) => (
                            <>
                              <span className={clsx('block truncate', selected ? 'font-medium' : 'font-normal')}>{role.name}</span>
                              {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#2f5ee0]"><Check className="h-4 w-4" /></span>}
                            </>
                          )}
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </div>
                </Listbox>
              </div>
            </div>

            <button
              onClick={openAddModal}
              className="bg-[#0d0d0c] text-white px-4 py-2.5 rounded-[4px] font-medium text-[13px] hover:bg-[#1a1a18] transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Ajouter un membre
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-hidden rounded-[4px] border border-[#e5e5e2] bg-white">
          <table className="min-w-full divide-y divide-[#eeeeec]">
            <thead className="bg-[#f5f5f4]">
              <tr>
                <th className={clsx('px-6 py-3 text-left text-[11px] font-medium text-[#666660] uppercase tracking-[0.08em]', GeistMono.className)}>Membres</th>
                <th className={clsx('px-6 py-3 text-left text-[11px] font-medium text-[#666660] uppercase tracking-[0.08em]', GeistMono.className)}>Projets</th>
                <th className={clsx('px-6 py-3 text-left text-[11px] font-medium text-[#666660] uppercase tracking-[0.08em]', GeistMono.className)}>Rôle</th>
                <th className={clsx('px-6 py-3 text-left text-[11px] font-medium text-[#666660] uppercase tracking-[0.08em]', GeistMono.className)}>Invitation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeec]">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-[#f5f5f4] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar name={member.name} src={member.avatar_url} />
                      <div className="ml-3">
                        <div className="text-[13px] font-medium text-[#0d0d0c]">{member.name}</div>
                        <div className="text-[12px] text-[#8a8a84]">{member.email || <span className="italic text-[#b8b8b3]">Pas d'email</span>}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className={clsx('text-[13px] text-[#8a8a84]', GeistMono.className)}>{member.project_count} projets</span>
                      <button onClick={() => openManageModal(member)} className="px-3 py-1 text-[12px] bg-[#0d0d0c] text-white rounded-[3px] hover:bg-[#1a1a18] transition-colors">
                        Manage
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      'px-2 py-0.5 inline-flex text-[11px] font-medium rounded-[3px]',
                      ROLE_STYLES[member.role] || 'bg-[#eeeeec] text-[#4a4a46] border border-[#e5e5e2]'
                    )}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.invited ? (
                      <span className="flex items-center gap-1.5 text-[12px] text-[#8a8a84]">
                        <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                        Invité
                      </span>
                    ) : (
                      <button
                        onClick={() => openInviteModal(member)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-[#e5e5e2] rounded-[4px] hover:bg-[#f5f5f4] transition-colors text-[#4a4a46]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Inviter
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="p-8 text-center text-[#8a8a84] text-[13px]">Aucun membre trouvé</div>
          )}
        </div>

        {/* ── Manage projects modal ── */}
        <Dialog open={manageOpen} onClose={() => setManageOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" />
          <div className="fixed inset-0 flex justify-center items-center p-6">
            <DialogPanel className="bg-white border border-[#e5e5e2] rounded-[6px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-lg p-6">
              <DialogTitle className="text-[17px] font-medium text-[#050505] mb-4">
                Manage projects for {currentMember?.name}
              </DialogTitle>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {projects.map((project) => {
                  const active = memberProjects.includes(project.id)
                  return (
                    <div key={project.id} className="flex justify-between items-center bg-[#f5f5f4] border border-[#e5e5e2] p-3 rounded-[4px]">
                      <span className="text-[13px] font-medium text-[#0d0d0c]">{project.name}</span>
                      <Switch
                        checked={active}
                        onChange={(val) => toggleProject(project.id, val)}
                        className={clsx("relative inline-flex h-6 w-11 items-center rounded-full transition-all", active ? "bg-[#0d0d0c]" : "bg-[#d6d6d2]")}
                      >
                        <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition", active ? "translate-x-6" : "translate-x-1")} />
                      </Switch>
                    </div>
                  )
                })}
              </div>
              <button className="mt-6 w-full py-2 bg-[#eeeeec] hover:bg-[#d6d6d2] rounded-[4px] text-[13px] font-medium text-[#4a4a46] transition-colors" onClick={() => setManageOpen(false)}>
                Close
              </button>
            </DialogPanel>
          </div>
        </Dialog>

        {/* ── Add member modal ── */}
        <Dialog open={addOpen} onClose={() => setAddOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
          <div className="fixed inset-0 flex justify-center items-center p-6 overflow-y-auto">
            <DialogPanel className="bg-white border border-[#e5e5e2] rounded-[6px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-lg p-6 relative">
              <div className="flex justify-between items-center mb-6">
                <DialogTitle className="text-[17px] font-medium text-[#050505]">Ajouter un membre</DialogTitle>
                <button onClick={() => setAddOpen(false)} className="text-[#8a8a84] hover:text-[#0d0d0c] transition-colors" type="button">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {addSuccess ? (
                <div className="py-8 text-center">
                  <div className="w-14 h-14 bg-[#e6f4ea] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-7 h-7 text-[#0f7a3a]" />
                  </div>
                  <p className="text-[15px] font-medium text-[#050505] mb-2">Membre ajouté !</p>
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
                      className="w-full px-3 py-2.5 border border-[#e5e5e2] rounded-[4px] bg-white focus:outline-none focus:border-[#0d0d0c] transition-colors text-[13px] text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                      placeholder="Jean Dupont"
                    />
                  </div>

                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1', GeistMono.className)}>
                      Adresse email <span className="text-[#b8b8b3] font-normal normal-case">(optionnel)</span>
                    </label>
                    <p className="text-[11px] text-[#8a8a84] mb-2">Vous pourrez envoyer l'invitation plus tard.</p>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a84] pointer-events-none" />
                      <input
                        type="email"
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 border border-[#e5e5e2] rounded-[4px] bg-white focus:outline-none focus:border-[#0d0d0c] transition-colors text-[13px] text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                        placeholder="jean.dupont@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>Rôle</label>
                    <Listbox value={addRole} onChange={setAddRole}>
                      <div className="relative">
                        <ListboxButton className="relative w-full cursor-pointer rounded-[4px] bg-white border border-[#e5e5e2] py-2.5 pl-3 pr-9 text-left text-[13px] font-medium text-[#0d0d0c] hover:bg-[#f5f5f4] transition-colors">
                          <span className="block truncate">{addRole.name}</span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <ChevronDown className="h-4 w-4 text-[#8a8a84]" />
                          </span>
                        </ListboxButton>
                        <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-[4px] bg-white border border-[#e5e5e2] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] z-[60] py-1">
                          {roles.map((role) => (
                            <ListboxOption key={role.id} value={role} className={({ active }) => clsx('relative cursor-pointer select-none py-2.5 pl-9 pr-4 transition-colors', active ? 'bg-[#f5f5f4] text-[#0d0d0c]' : 'text-[#0d0d0c]')}>
                              {({ selected }) => (
                                <>
                                  <span className={clsx('block truncate', selected ? 'font-medium' : 'font-normal')}>{role.name}</span>
                                  {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#2f5ee0]"><Check className="h-4 w-4" /></span>}
                                </>
                              )}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </div>
                    </Listbox>
                  </div>

                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>Assigner aux projets (optionnel)</label>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto border border-[#e5e5e2] rounded-[4px] p-3 bg-[#f5f5f4]">
                      {projects.length === 0 ? (
                        <p className="text-[13px] text-[#8a8a84] text-center py-4">Aucun projet disponible</p>
                      ) : (
                        projects.map((project) => (
                          <div key={project.id} className="flex items-center justify-between p-2 hover:bg-white rounded-[3px] transition-colors">
                            <span className="text-[13px] font-medium text-[#0d0d0c]">{project.name}</span>
                            <Switch
                              checked={addProjects.includes(project.id)}
                              onChange={() => toggleAddProject(project.id)}
                              className={clsx("relative inline-flex h-6 w-11 items-center rounded-full transition-all", addProjects.includes(project.id) ? "bg-[#0d0d0c]" : "bg-[#d6d6d2]")}
                            >
                              <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition", addProjects.includes(project.id) ? "translate-x-6" : "translate-x-1")} />
                            </Switch>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {addError && (
                    <div className="p-3 bg-[#fde8e8] border border-[#f5c6c6] rounded-[4px]">
                      <p className="text-[13px] text-[#9c1b1b]">{addError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setAddOpen(false)} className="flex-1 py-2.5 bg-[#eeeeec] hover:bg-[#d6d6d2] rounded-[4px] text-[13px] font-medium text-[#4a4a46] transition-colors" disabled={addLoading}>
                      Annuler
                    </button>
                    <button type="button" onClick={addMember} disabled={addLoading} className="flex-1 py-2.5 bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {addLoading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ajout...</>
                      ) : (
                        <><UserPlus className="w-4 h-4" />Ajouter</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </DialogPanel>
          </div>
        </Dialog>

        {/* ── Invite existing member modal ── */}
        <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
          <div className="fixed inset-0 flex justify-center items-center p-6">
            <DialogPanel className="bg-white border border-[#e5e5e2] rounded-[6px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-md p-6 relative">
              <div className="flex justify-between items-center mb-6">
                <DialogTitle className="text-[17px] font-medium text-[#050505]">Inviter {inviteMember?.name}</DialogTitle>
                <button onClick={() => setInviteOpen(false)} className="text-[#8a8a84] hover:text-[#0d0d0c] transition-colors" type="button">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {inviteSuccess ? (
                <div className="py-8 text-center">
                  <div className="w-14 h-14 bg-[#e6f4ea] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-7 h-7 text-[#0f7a3a]" />
                  </div>
                  <p className="text-[15px] font-medium text-[#050505] mb-2">Invitation envoyée !</p>
                  <p className="text-[13px] text-[#8a8a84]">Un email a été envoyé à {inviteEmail}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>Adresse email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a84] pointer-events-none" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 border border-[#e5e5e2] rounded-[4px] bg-white focus:outline-none focus:border-[#0d0d0c] transition-colors text-[13px] text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                        placeholder="jean.dupont@example.com"
                      />
                    </div>
                  </div>

                  {inviteError && (
                    <div className="p-3 bg-[#fde8e8] border border-[#f5c6c6] rounded-[4px]">
                      <p className="text-[13px] text-[#9c1b1b]">{inviteError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setInviteOpen(false)} className="flex-1 py-2.5 bg-[#eeeeec] hover:bg-[#d6d6d2] rounded-[4px] text-[13px] font-medium text-[#4a4a46] transition-colors" disabled={inviteLoading}>
                      Annuler
                    </button>
                    <button type="button" onClick={sendInvitation} disabled={inviteLoading} className="flex-1 py-2.5 bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {inviteLoading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi...</>
                      ) : (
                        <><Send className="w-4 h-4" />Envoyer l'invitation</>
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