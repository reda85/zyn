'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CubeIcon,
  BellIcon,
  UserGroupIcon,
  ArrowRightStartOnRectangleIcon, // Added icon for sign out
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Lexend } from 'next/font/google'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { useAtom } from 'jotai'
import { selectedPlanAtom } from '@/store/atoms'

// **IMPORTANT:** You need to define this function, likely in a separate 'use server' file (e.g., actions.js)
// For this client component to call it, it must be imported.
// Assuming your signoutAction is imported like this:
// import { signoutAction } from '@/lib/actions'

const tabs = ['Plan', 'Tasks', 'Medias']
const lexend = Lexend({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

// Placeholder for the signout action import. Replace this with your actual import.
// This example uses a placeholder function.
async function signoutAction() {
  console.log('Signing out...')
  // Your actual sign out logic goes here (e.g., calling a server action)
  await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay
  alert('Signed out! Redirecting...')
}


export default function Navbar({ id, user, project }) {
  const pathname = usePathname()
  const [projectMenuOpen, setProjectMenuOpen] = useState(false) // Renamed for clarity
  const [userMenuOpen, setUserMenuOpen] = useState(false) // **New state for user menu**
  
  const projectMenuRef = useRef(null) // Renamed for clarity
  const userMenuRef = useRef(null) // **New ref for user menu**
  
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)

  // Derive the current tab from pathname
  const currentTab = (() => {
    if (pathname === `/projects/${id}` || pathname === `/projects/${id}/`) {
      return 'Plan'
    }
    const match = tabs.find(tab =>
      pathname.startsWith(`/projects/${id}/${tab.toLowerCase()}`)
    )
    return match ?? 'Plan'
  })()

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      // Close Project Menu
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target)) {
        setProjectMenuOpen(false)
      }
      // Close User Menu
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    // You should call your imported signoutAction here.
    await signoutAction(); 
    // After signout, you typically redirect to the login page or home page
    router.push('/'); 
  }

  return (
    <nav className={`bg-white border-b border-gray-300 ${lexend.className}`}>
      <div className="relative mx-auto flex h-12 items-center justify-between pl-0 pr-4 sm:pr-6 lg:pr-8">
        
        {/* Logo + Dropdown (Project Menu) */}
        <div className="relative flex items-center h-12" ref={projectMenuRef}>
          <button
            onClick={() => setProjectMenuOpen(prev => !prev)}
            className="flex items-center space-x-2 h-full focus:outline-none"
          >
            <div className="relative group h-full w-12">
              <Image
                src="/logo.png"
                alt="logo"
                fill
                className="object-contain"
              />
              <div className="absolute inset-0 bg-teal-500 opacity-0 group-hover:opacity-30 transition-opacity rounded-sm" />
            </div>
            <span className="text-lg font-semibold text-gray-900">{project?.name}</span>
          </button>

          {projectMenuOpen && (
            <div className="absolute top-12 left-2 w-56 bg-gray-50 border border-gray-200 shadow-xl rounded-md z-50">
              <ul className="py-1 text-sm text-gray-700">
                <li>
                  <Link
                    href="/projects"
                    className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    onClick={() => setProjectMenuOpen(false)}
                  >
                    All Projects
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/projects/${id}`}
                    className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    onClick={() => setProjectMenuOpen(false)}
                  >
                    Project Details
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/projects/${id}/sources`}
                    className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    onClick={() => setProjectMenuOpen(false)}
                  >
                    Project Plans
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/projects/${id}/categories`}
                    className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    onClick={() => setProjectMenuOpen(false)}
                  >
                    Task Categories Manager
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/projects/${id}/status`}
                    className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    onClick={() => setProjectMenuOpen(false)}
                  >
                    Status Manager
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Center Tabs */}
        <div className="absolute left-1/2 flex -translate-x-1/2 space-x-4">
          {tabs.map(tab => {
            const path = tab === 'Plan'
              ? `/projects/${id}`
              : `/projects/${id}/${tab.toLowerCase()}`
            return (
              <Link key={tab} href={path}>
                <button
                  className={clsx(
                    'px-3 py-2 transition text-sm',
                    currentTab === tab
                      ? 'border-b-2 border-teal-400 text-teal-400'
                      : 'border-b-2 border-transparent text-gray-500 hover:border-teal-400 hover:text-teal-400'
                  )}
                >
                  {tab}
                </button>
              </Link>
            )
          })}
        </div>

        {/* Right Actions (Including User Menu) */}
        <div className="flex items-center space-x-4">
          <BellIcon className="h-6 w-6 text-gray-500 hover:text-teal-600 cursor-pointer" />
          <div className="flex items-center space-x-1 rounded-full bg-gray-100 px-2 py-1 text-sm text-gray-800">
            <UserGroupIcon className="h-4 w-4 text-gray-600" />
            <span>Members</span>
          </div>

          {/* User Avatar and Menu (New Section) */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(prev => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition duration-150"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              {user?.name?.charAt(0).toUpperCase() || 'M'}
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
                  {/* User Info (Optional) */}
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                    <p className="font-medium">{user?.name || 'My Account'}</p>
                    <p className="text-gray-500 text-xs truncate">{user?.email || 'user@example.com'}</p>
                  </div>

                  {/* Other Menu Links (Add them here if needed) */}
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserGroupIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Profile
                  </Link>

                  {/* Sign Out Option */}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                    role="menuitem"
                  >
                    <ArrowRightStartOnRectangleIcon className="mr-3 h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}