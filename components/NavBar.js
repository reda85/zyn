'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CubeIcon,
  BellIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Lexend } from 'next/font/google'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'

const tabs = ['Plan', 'Tasks', 'Medias']
const lexend = Lexend({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export default function Navbar({ id,user, project }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const router = useRouter()

  const currentTab = (() => {
    if (pathname === `/${id}`) return 'Plan'
    const match = tabs.find(tab =>
      pathname.startsWith(`/projects/${id}/${tab.toLowerCase()}`)
    )
    return match ?? 'Plan'
  })()

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <nav className={`bg-white border-b border-gray-300 ${lexend.className}`}>
      <div className="relative mx-auto flex h-12 items-center justify-between pl-0 pr-4 sm:pr-6 lg:pr-8">
        
        {/* Logo and Dropdown Menu */}
        <div className="relative flex items-center h-12" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="flex items-center space-x-2 h-full focus:outline-none"
          >
            <div className="relative group h-full w-12">
  <Image
    src="/logo.png"
    alt="logo"
    fill
    className="object-contain"
  />
  <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-20 transition-opacity rounded-sm" />
</div>
            <span className="text-lg font-semibold text-gray-900">{project?.name}</span>
          </button>

{menuOpen && (
  <div className="absolute top-12 left-2 w-56 bg-gray-50 border border-gray-200 shadow-xl rounded-md z-50">
    <ul className="py-1 text-sm text-gray-700">
      <li>
        <Link
          href="/protected/projects"
          className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-700 transition-colors"
          onClick={() => { setMenuOpen(false)}}
        >
          All Projects
        </Link>
      </li>
      <li>
        <Link
          href={`/protected/projects/${id}`}
          className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-700 transition-colors"
          onClick={() => { setMenuOpen(false)}}
        >
          Project Details
        </Link>
      </li>
      <li>
        <Link
          href={`/protected/projects/${id}/categories`}
          className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-700 transition-colors"
          onClick={() => { setMenuOpen(false)}}
        >
          Task Categories Manager
        </Link>
      </li>
      <li>
        <Link
          href={`/protected/projects/${id}/status`}
          className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-700 transition-colors"
          onClick={() => { setMenuOpen(false)}}
        >
          Status Manager
        </Link>
      </li>
    </ul>
  </div>
)}

        </div>

        {/* Center Navigation Tabs */}
        <div className="absolute left-1/2 flex -translate-x-1/2 space-x-4">
          {tabs.map(tab => {
            const path = tab === 'Plan'
              ? `/protected/projects/${id}`
              : `/protected/projects/${id}/${tab.toLowerCase()}`
            return (
              <Link key={tab} href={path}>
                <button
                  className={clsx(
                    'px-3 py-2  transition text-sm ',
                    currentTab === tab
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'border-b-2 border-transparent text-gray-500 hover:border-blue-500 hover:text-blue-500'
                  )}
                  onClick={() => setCurrentTab(tab)}
                >
                  {tab}
                </button>
              </Link>
            )
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          <BellIcon className="h-6 w-6 text-gray-500 hover:text-blue-600" />
          <div className="flex items-center space-x-1 rounded-full bg-gray-100 px-2 py-1 text-sm text-gray-800">
            <UserGroupIcon className="h-4 w-4 text-gray-600" />
            <span>Members</span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() || 'M'}
          </div>
        </div>
      </div>
    </nav>
  )
}
