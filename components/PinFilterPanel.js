'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ListFilterIcon } from 'lucide-react'
import { GeistSans } from 'geist/font/sans'
import clsx from 'clsx'

import CategoryFilter from './CategoryFilter'
import CreatedByMeFilter from './CreatedByMeFilter'
import DateFilter from './DateFilter'
import StatusFilter from './StatusFilter'
import OverdueFilter from './OverdueFilter'
import ProjectPlanFilter from './ProjectPlanFilter'
import TagFilter from './TagFilter'
import ShowArchivedFilter from './ShowArchivedFilter'
import AssignedToMemberFilter from './AssigneeFilter'
import { usePinFilters } from '@/hooks/usePinFilters'
import { countActiveFilters } from '@/lib/data/pinFilters'

const PANEL_WIDTH = { list: 384, plan: 320 }

/**
 * Panneau de filtres des pins, commun à la liste des tâches (`variant="list"`)
 * et à la vue plan (`variant="plan"`).
 *
 * Il ne filtre rien lui-même : il édite les filtres stockés dans l'URL
 * (`usePinFilters`). La page décide de les appliquer dans la requête ou en
 * mémoire. Il n'y a donc plus de liste « filtrée » à tenir synchronisée.
 *
 * @param pins  (vue plan) pins du plan, pour proposer les intervenants et
 *              compter les archivés
 */
export default function PinFilterPanel({ variant = 'list', projectId, pins = [] }) {
  const { filters, setFilters, resetFilters } = usePinFilters()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const panelRef = useRef(null)

  // Interrupteurs des filtres à valeurs : « ouvert » sans valeur ne filtre pas,
  // éteindre l'interrupteur efface les valeurs.
  const [expanded, setExpanded] = useState({})
  const isOn = (field) => expanded[field] ?? (Array.isArray(filters[field]) ? filters[field].length > 0 : Boolean(filters[field]))
  const toggle = (field, empty) => (value) => {
    setExpanded((prev) => ({ ...prev, [field]: value }))
    if (!value) setFilters({ [field]: empty })
  }
  const setList = (field) => (next) =>
    setFilters((current) => ({ [field]: typeof next === 'function' ? next(current[field]) : next }))

  const members = useMemo(() => {
    if (variant !== 'plan') return []
    const byId = new Map()
    for (const pin of pins) {
      if (pin.assigned_to?.id && pin.assigned_to?.name) byId.set(pin.assigned_to.id, pin.assigned_to.name)
    }
    return [
      { id: 'unassigned', name: 'Non assigné' },
      ...Array.from(byId, ([id, name]) => ({ id, name })),
    ]
  }, [variant, pins])

  const archivedCount = useMemo(() => pins.filter((p) => p.isArchived).length, [pins])
  const activeCount = countActiveFilters(filters)
  const width = PANEL_WIDTH[variant]

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left: Math.max(16, Math.min(rect.left + window.scrollX, window.innerWidth - width - 16)),
    })
  }, [open, width])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (panelRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return
      // Les sélecteurs de date et listes déroulantes sont rendus hors du panneau.
      if (e.target.closest?.('.react-datepicker, [data-headlessui-portal]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-[7px] rounded-[4px] border transition-colors',
          GeistSans.className,
          activeCount > 0
            ? 'bg-[#0d0d0c] text-white border-[#0d0d0c]'
            : 'bg-white text-[#4a4a46] border-[#e5e5e2] hover:bg-[#f5f5f4]'
        )}
      >
        <ListFilterIcon className="h-4 w-4" />
        {variant === 'list' && <span className="text-[13px] font-medium">Filtres</span>}
        {activeCount > 0 && <span className="text-[11px] font-medium tabular-nums">{activeCount}</span>}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: position.top, left: position.left, width }}
            className={clsx(
              'absolute z-50 max-w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto bg-white border border-[#e5e5e2] rounded-[4px]',
              'shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)]',
              GeistSans.className
            )}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-[#eeeeec]">
              <h3 className="text-[13px] font-medium text-[#050505]">Filtres</h3>
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <button
                    onClick={() => {
                      resetFilters()
                      setExpanded({})
                    }}
                    className="text-[12px] text-[#666660] hover:text-[#0d0d0c] transition-colors"
                  >
                    Réinitialiser
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors"
                >
                  <XMarkIcon className="h-4 w-4 text-[#8a8a84]" />
                </button>
              </div>
            </div>

            <div className="py-1">
              <CreatedByMeFilter active={filters.me} onToggle={(value) => setFilters({ me: value })} />
              <CategoryFilter
                active={isOn('categories')}
                onToggle={toggle('categories', [])}
                tags={filters.categories}
                setTags={setList('categories')}
              />
              <DateFilter
                active={isOn('dates')}
                onToggle={toggle('dates', [])}
                tags={filters.dates}
                setTags={setList('dates')}
              />
              <StatusFilter activeStatuses={filters.statuses} setActiveStatuses={setList('statuses')} />
              <TagFilter
                active={isOn('tags')}
                onToggle={toggle('tags', [])}
                tags={filters.tags}
                setTags={setList('tags')}
                projectId={projectId}
              />
              {variant === 'plan' && (
                <AssignedToMemberFilter
                  active={isOn('assignee')}
                  onToggle={toggle('assignee', null)}
                  members={members}
                  selectedMemberId={filters.assignee}
                  onSelectMember={(id) => setFilters({ assignee: id || null })}
                />
              )}
              <OverdueFilter active={filters.overdue} onToggle={(value) => setFilters({ overdue: value })} />
              <ShowArchivedFilter
                active={filters.archived}
                onToggle={(value) => setFilters({ archived: value })}
                archivedCount={variant === 'plan' ? archivedCount : 0}
              />
              {variant === 'list' && (
                <ProjectPlanFilter
                  active={isOn('plans')}
                  onToggle={toggle('plans', [])}
                  selectedPlans={filters.plans}
                  setSelectedPlans={setList('plans')}
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
