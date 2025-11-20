// app/projects/page.js
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedPlanAtom, selectedProjectAtom } from '@/store/atoms'
import { FolderKanban, Users, BarChart3, Settings, Check, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { Lexend } from 'next/font/google'
import clsx from 'clsx'
import { Dialog, Listbox, ListboxButton, ListboxOption, ListboxOptions, Select } from '@headlessui/react'



const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })
const roles = [
  { id: 1, name: 'Membres', value: 'membres' },
  { id: 2, name: 'Invités', value: 'invites' },
  { id: 3, name: 'Admins', value: 'admins' },
];
export default function MembersPage() {
  const [selectedRoles, setSelectedRoles] = useState([])
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [refresh, setRefresh] = useState(false)
  const [members, setMembers] = useState([])
   const [searchQuery, setSearchQuery] = useState("");
  

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })
      setMembers(data || [])
      console.log('Fetched members:', data)
    }
    fetchMembers()
  }, [refresh])

  {/*const createProject = async () => {
    if (!newProjectName.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: newProjectName, organization_id: selectedProject?.organization_id || projects[0]?.organization_id })
      .select()
      .single()

    if (error) {
      alert('Failed to create project.')
      setLoading(false)
      return
    }

    setProjects((prev) => [data, ...prev])
    if(data) {
      console.log('Created project:', data)
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .insert({ name: 'Sample Floor Plan (PDF)', project_id: data.id , file_url : '1/1748379744388-Sample Floor Plan (PDF).pdf'})
        .select('*')
        
        if (planError) {
          alert('Failed to create plan.')
          setLoading(false)
          return
        }
        console.log('Created plan:', planData)
      setSelectedPlan(planData)
      setRefresh(!refresh)
    }
    setNewProjectName('')
    setLoading(false)
  }
*/}

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
      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
        {getInitials(name)}
      </div>
    );
  }
}

const createProject = async () => {
    if (!newProjectName.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .rpc('create_project_with_defaults', {
    p_name: newProjectName,
    p_organization_id: selectedProject?.organization_id || projects[0]?.organization_id
  });
      
      

    if (error) {
      alert('Failed to create project.')
      setLoading(false)
      return
    }

    setProjects((prev) => [data, ...prev])
    setRefresh(!refresh)
     setNewProjectName('')
    setLoading(false)
  }

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRoles.length === 0 ||
        selectedRoles.some((role) => role.name === member.role);

      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, selectedRoles]);
  return (
    <div className={clsx("flex min-h-screen ", lexend.className)}>
      {/* Side Navigation */}
      <aside className="w-52 bg-neutral-50 text-stone-600 flex flex-col">
        <div className="px-4 py-5 flex-col border-2 border-blue-50 bg-white flex  mx-4 my-6 rounded-md gap-2 shadow-sm">
          <h2 className="text-sm  text-stone-800">{projects[0]?.organizations?.name}</h2>
          <p className="text-xs  text-stone-500">{projects[0]?.organizations?.members?.length} members</p>
          </div>
      
        <nav className="flex-1 px-4 space-y-1">
          <Link href="/projects" className="flex text-sm items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-stone-800 hover:rounded-lg hover:shadow-sm border-2 border-neutral-50 hover:border-blue-200   ">
            <FolderKanban className="w-5 h-5" /> Projects
          </Link>
          <Link href="/members" className="flex text-sm items-center gap-3 px-4 py-2 bg-blue-100 text-stone-800 rounded-lg shadow-sm border-blue-300  ">
            <Users className="w-5 h-5" /> Members
          </Link>
          <Link href="/reports" className="flex text-sm items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-stone-800 hover:rounded-lg hover:shadow-sm border-2 border-neutral-50 hover:border-blue-200   ">
            <BarChart3 className="w-5 h-5" /> Reports
          </Link>
          <Link href="/settings" className="flex text-sm items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-stone-800 hover:rounded-lg hover:shadow-sm border-2 border-neutral-50 hover:border-blue-200   ">
            <Settings className="w-5 h-5" /> Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <div className="flex flex-col mb-6 mt-12 gap-2">
        <h1 className="text-3xl font-bold ">Organization Members</h1>

        <div className='rounded-md shadow-sm bg-neutral-100 border-neutral-300 border p-4 flex flex-col gap-2 my-8 '>
           <div className='flex flex-row gap-2 items-center'>
            <p className='text-md text-stone-800'>Zynspace Free Plan</p>
            <button className='bg-blue-600 text-sm text-white px-4 py-2 rounded'>
              Upgrade to team
            </button>
             </div>
            <div className='grid grid-cols-3 gap-2'>
                <div className='bg-white border border-neutral-300 rounded-md px-3 py-3 text-sm text-stone-600 ml-2 gap-10'>
                  <p>Total seats</p>
                  <p className='text-3xl font-bold'>Unlimited</p>
                </div>
                <div className='bg-white border border-neutral-300 rounded-md px-3 py-3 text-sm text-stone-600 ml-2 gap-10'>
                  <p>Assigned seats</p>
                  <p className='text-3xl font-bold'>1</p>
                </div>
                <div className='bg-white border border-neutral-300 rounded-md px-3 py-3 text-sm text-stone-600 ml-2 gap-10'>
                   <p>Available seats</p>
                  <p className='text-3xl font-bold'>Unlimited</p>
                </div>
               
                </div>
             
            </div>

            <div className="flex flex-row justify-between items-center gap-2">
      {/* Champ de recherche */}
       <input
          type="text"
          className="bg-neutral-100 w-64 border border-neutral-300 rounded-md px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

      {/* Select Multi-choix */}
      <div className=" flex flex-row gap-2 items-center">
        <p>Roles</p>
      <div className="w-48">
        <Listbox value={selectedRoles} onChange={setSelectedRoles} multiple>
          <div className="relative">
            <ListboxButton className="relative w-full cursor-default rounded-md bg-neutral-100 border border-neutral-300 py-2 pl-3 pr-10 text-left text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <span className="block truncate">
                {selectedRoles.length === 0
                  ? 'Filtrer par rôle'
                  : selectedRoles.map(role => role.name).join(', ')}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </span>
            </ListboxButton>

            <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white shadow-lg ring-1 ring-black/10 focus:outline-none text-sm z-10">
              {roles.map((role) => (
                <ListboxOption
                  key={role.id}
                  value={role}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {role.name}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                          <Check className="h-4 w-4" />
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

      {/* Bouton d'invitation */}
      <button className="bg-blue-600 text-xs text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
        Inviter des membres
      </button>
    </div>

        
        </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 shadow-sm">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Membres
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Rôle
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-neutral-50">
                {/* Avatar + Name + Email */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Avatar name={member.name} src={member.avatar_url} />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {member.name}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </div>
                </td>

                {/* Role Badge */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.role === "Admins"
                        ? "bg-red-100 text-red-800"
                        : member.role === "Membres"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
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
          <div className="p-6 text-center text-gray-500 text-sm">
            Aucun membre trouvé
          </div>
        )}
      </div>  
           
         
      </main>
    </div>
  )
}
