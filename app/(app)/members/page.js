// app/members/page.js
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedPlanAtom, selectedProjectAtom, selectedOrganizationAtom } from '@/store/atoms'
import { FolderKanban, Users, BarChart3, Settings, Check, ChevronDown, UserPlus, Search } from 'lucide-react'
import Link from 'next/link'
import { Lexend } from 'next/font/google'
import clsx from 'clsx'
import { Dialog, DialogPanel, DialogTitle, Listbox, ListboxButton, ListboxOption, ListboxOptions, Switch } from '@headlessui/react'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

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

  if (!src || imageError) {
    return (
      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
        {getInitials(name)}
      </div>
    );
  }
}

export default function MembersPage() {
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



  /* -----------------------------------------------------------
   * FETCH MEMBERS + COUNT ASSIGNED PROJECTS
   ----------------------------------------------------------- */
  useEffect(() => {
    const fetchMembers = async () => {
      const { data: rawMembers } = await supabase
        .from('members')
        .select(`
          *,
          members_projects(count)
        `)
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
        .eq('organization_id', selectedOrganization?.id)
      setProjects(data || [])
    }

    fetchMembers()
    fetchProjects()
  }, [refresh, selectedOrganization])

  /* -----------------------------------------------------------
   * OPEN MANAGE PROJECT MODAL FOR SELECTED MEMBER
   ----------------------------------------------------------- */
  const openManageModal = async (member) => {
    setCurrentMember(member)

    const { data } = await supabase
      .from('members_projects')
      .select('project_id')
      .eq('member_id', member.id)

    setMemberProjects(data.map((p) => p.project_id))
    setManageOpen(true)
  }

  /* -----------------------------------------------------------
   * TOGGLE PROJECT ASSIGNMENT
   ----------------------------------------------------------- */
  const toggleProject = async (projectId, active) => {
    if (active) {
      await supabase.from('members_projects').insert({
        member_id: currentMember.id,
        project_id: projectId
      })
    } else {
      await supabase
        .from('members_projects')
        .delete()
        .eq('member_id', currentMember.id)
        .eq('project_id', projectId)
    }

    // Update local state
    setMemberProjects((prev) =>
      active
        ? [...prev, projectId]
        : prev.filter((id) => id !== projectId)
    )

    setRefresh((x) => !x)
  }

  /* -----------------------------------------------------------
   * FILTERED MEMBERS
   ----------------------------------------------------------- */
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole =
        selectedRoles.length === 0 ||
        selectedRoles.some((role) => role.name === member.role)

      return matchesSearch && matchesRole
    })
  }, [members, searchQuery, selectedRoles])


  return (
    <div className={clsx("flex min-h-screen bg-background font-sans", lexend.className)}>
      {/* Side Navigation */}
      <aside className="w-64 bg-secondary/20 border-r border-border/40 flex flex-col">
        {/* Organization Card */}
        <div className="px-4 py-5 flex-col border border-border/50 bg-card/80 backdrop-blur-sm flex mx-4 my-6 rounded-xl gap-2 shadow-sm">
          <h2 className="text-sm font-semibold font-heading text-foreground">{selectedOrganization?.name}</h2>
        <p className="text-xs text-muted-foreground">{selectedOrganization?.members[0]?.count} membres</p>
        </div>
      
        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-2">
          <Link 
            href="/projects" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <FolderKanban className="w-5 h-5" /> Projects
          </Link>
          <Link 
            href="/members" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 bg-primary/10 text-primary rounded-xl shadow-sm border border-primary/20"
          >
            <Users className="w-5 h-5" /> Membres
          </Link>
          <Link 
            href="/reports" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <BarChart3 className="w-5 h-5" /> Rapports
          </Link>
          <Link 
            href="/settings" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <Settings className="w-5 h-5" /> Paramètres
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        {/* Header */}
        <div className="flex flex-col mb-8 mt-12 gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground">Membres de l'organisation</h1>

          {/* Plan Card */}
          <div className='rounded-xl shadow-sm bg-secondary/30 border border-border/50 p-6 flex flex-col gap-4 my-8'>
            <div className='flex flex-row gap-3 items-center'>
              <p className='text-lg font-semibold font-heading text-foreground'>Zynspace Free Plan</p>
              <button className='bg-primary text-primary-foreground text-sm px-5 py-2 rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95'>
                Upgrade to team
              </button>
            </div>
            
            <div className='grid grid-cols-3 gap-4'>
              <div className='bg-card border border-border/50 rounded-xl px-4 py-4 text-sm'>
                <p className='text-muted-foreground mb-2'>Total seats</p>
                <p className='text-3xl font-bold font-heading text-foreground'>Unlimited</p>
              </div>
              <div className='bg-card border border-border/50 rounded-xl px-4 py-4 text-sm'>
                <p className='text-muted-foreground mb-2'>Assigned seats</p>
                <p className='text-3xl font-bold font-heading text-foreground'>1</p>
              </div>
              <div className='bg-card border border-border/50 rounded-xl px-4 py-4 text-sm'>
                <p className='text-muted-foreground mb-2'>Available seats</p>
                <p className='text-3xl font-bold font-heading text-foreground'>Unlimited</p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-row justify-between items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                className="border border-border/50 bg-card/50 backdrop-blur-sm pl-10 pr-4 py-2.5 w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground"
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Role Filter */}
            <div className="flex flex-row gap-3 items-center">
              <p className="text-sm font-medium text-foreground">Rôles</p>
              <div className="w-56">
                <Listbox value={selectedRoles} onChange={setSelectedRoles} multiple>
                  <div className="relative">
                    <ListboxButton className="relative w-full cursor-pointer rounded-xl bg-secondary/50 border border-border/50 py-2.5 pl-3 pr-10 text-left text-sm font-medium text-foreground hover:bg-secondary/80 hover:border-primary/20 transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <span className="block truncate">
                        {selectedRoles.length === 0
                          ? 'Filtrer par rôle'
                          : selectedRoles.map(role => role.name).join(', ')}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      </span>
                    </ListboxButton>

                    <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-card border border-border/50 shadow-xl backdrop-blur-sm focus:outline-none text-sm z-10 py-1">
                      {roles.map((role) => (
                        <ListboxOption
                          key={role.id}
                          value={role}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors ${
                              active ? 'bg-primary/10 text-foreground' : 'text-foreground'
                            }`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span className={`block truncate font-medium ${selected ? 'font-semibold' : 'font-normal'}`}>
                                {role.name}
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                                  <Check className="h-5 w-5" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </div>
                </Listbox>
              </div>
            </div>

            {/* Invite Button */}
            <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Inviter des membres
            </button>
          </div>
        </div>

        {/* Members Table */}
        <div className="overflow-hidden rounded-xl border border-border/50 shadow-sm bg-card">
          <table className="min-w-full divide-y divide-border/50">
            <thead className="bg-secondary/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold font-heading text-foreground uppercase tracking-wider">
                  Membres
                </th>
                 <th className="px-6 py-4 text-left text-xs font-semibold font-heading text-foreground uppercase tracking-wider">
                  Projets
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold font-heading text-foreground uppercase tracking-wider">
                  Rôle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-secondary/20 transition-colors">
                  {/* Avatar + Name + Email */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar name={member.name} src={member.avatar_url} />
                      <div className="ml-4">
                        <div className="text-sm font-semibold font-heading text-foreground">
                          {member.name}
                        </div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                  </td>
 <td className="px-6 py-4 whitespace-nowrap flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {member.project_count} projets
                </span>

                <button
                  onClick={() => openManageModal(member)}
                  className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Manage
                </button>
              </td>
                  {/* Role Badge */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.role === "Admins"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : member.role === "Membres"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredMembers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Aucun membre trouvé
            </div>
          )}
        </div> 
        <Dialog open={manageOpen} onClose={() => setManageOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />

        <div className="fixed inset-0 flex justify-center items-center p-6">
          <DialogPanel className="bg-card border border-border/50 rounded-xl shadow-xl w-full max-w-lg p-6">
            <DialogTitle className="text-xl font-bold mb-4">
              Manage projects for {currentMember?.name}
            </DialogTitle>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {projects.map((project) => {
                const active = memberProjects.includes(project.id)

                return (
                  <div key={project.id} className="flex justify-between items-center bg-secondary/30 p-3 rounded-lg">
                    <span className="font-medium">{project.name}</span>

                    <Switch
                      checked={active}
                      onChange={(val) => toggleProject(project.id, val)}
                      className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-all",
                        active ? "bg-primary" : "bg-gray-300"
                      )}
                    >
                      <span
                        className={clsx(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition",
                          active ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </Switch>
                  </div>
                )
              })}
            </div>

            <button
              className="mt-6 w-full py-2 bg-secondary/40 hover:bg-secondary rounded-lg text-sm font-medium"
              onClick={() => setManageOpen(false)}
            >
              Close
            </button>
          </DialogPanel>
        </div>
      </Dialog> 
      </main>
    </div>
  )
}