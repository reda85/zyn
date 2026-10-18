import { useEffect, useState, useRef } from 'react'
import { Listbox, Transition, Portal } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { supabase } from '@/utils/supabase/client'
import { useProjectData } from '@/providers/ProjectProvider'
import { usePinsCache } from '@/hooks/usePins'
import { categoriesIcons } from '@/utils/categories'
import clsx from 'clsx'
import { useUserData } from '@/hooks/useUserData'
import { CheckIcon } from 'lucide-react'

export default function CategoryComboBox({ pin, organization_id }) {
  const { categories } = useProjectData()
  const [selected, setSelected] = useState(null)
  const { patchPin } = usePinsCache()
  const { profile } = useUserData(organization_id)

  const isGuest = profile?.role === 'guest'

  const buttonRef = useRef(null)
  const [buttonRect, setButtonRect] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  // Sync display value when the opened pin or categories list changes — no DB write
  useEffect(() => {
    if (categories?.length > 0) {
      setSelected(
        categories.find(c => c.id === pin.category_id) || categories[0] || null
      )
    }
  }, [categories, pin.id, pin.category_id])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect())
    }
  }, [isOpen])

  // DB write — called directly on user selection, never via useEffect
  const handleUpdateCategory = async (category) => {
    if (!category?.name || isGuest) return

    const { error } = await supabase
      .from('pdf_pins')
      .update({ category_id: category.id, updated_by: profile?.id || null, updated_at: new Date().toISOString() })
      .eq('id', pin.id)

    if (error) {
      console.error('update category failed', error)
      return
    }
    patchPin(pin.id, { category_id: category.id, categories: { name: category.name } })
  }

  return (
    <div className="w-48 relative">
      <Listbox
        value={selected}
        onChange={value => {
          if (!isGuest) {
            setSelected(value)
            setIsOpen(false)
            handleUpdateCategory(value)
          }
        }}
        disabled={isGuest}
      >
        <div>
          <Listbox.Button
            ref={buttonRef}
            onClick={() => { if (!isGuest) setIsOpen(prev => !prev) }}
            disabled={isGuest}
            className={clsx(
              'group relative w-full text-[13px] rounded-[6px] h-8 pl-1.5 pr-8 text-left border transition-all focus:outline-none',
              isGuest
                ? 'bg-survol border-filet text-mine-clair cursor-not-allowed'
                : isOpen
                  ? 'bg-white border-tirage ring-2 ring-tirage-clair text-encre cursor-pointer'
                  : 'bg-white border-filet-fort text-encre cursor-pointer shadow-[0_1px_1px_rgba(11,15,23,0.04)] hover:border-tirage hover:bg-tirage-pale'
            )}
          >
            <span className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-[5px] bg-voile text-mine flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-tirage transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-current">
                {selected?.icon && categoriesIcons[selected.icon]}
              </span>
              <span className="block truncate text-[13px] font-medium">{selected?.name}</span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className={clsx('h-4 w-4 transition-colors', isGuest ? 'text-trait' : 'text-mine-clair group-hover:text-tirage')}
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>

          {!isGuest && (
            <Transition
              show={isOpen}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              afterLeave={() => setIsOpen(false)}
            >
              {buttonRect && (
                <Portal>
                  <Listbox.Options
                    static
                    className="absolute z-[1100] max-h-60 overflow-auto rounded-[4px] bg-white py-1 text-[13px] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] border border-filet focus:outline-none"
                    style={{
                      top: buttonRect.bottom + window.scrollY + 4,
                      left: buttonRect.left + window.scrollX,
                      width: buttonRect.width,
                    }}
                  >
                    {categories.map((cat, idx) => (
                      <Listbox.Option
                        key={cat.id || idx}
                        className={({ active }) =>
                          clsx(
                            'relative cursor-pointer select-none py-2.5 pl-3 pr-4 transition-colors',
                            active ? 'bg-survol text-encre' : 'text-encre'
                          )
                        }
                        value={cat}
                      >
                        {({ selected: isSelected }) => (
                          <span className={clsx('flex gap-2 items-center truncate', isSelected ? 'font-medium' : 'font-normal')}>
                            {cat.icon && categoriesIcons[cat.icon]}
                            <span className="text-[13px]">{cat.name}</span>
                            {isSelected && <CheckIcon className="ml-auto h-4 w-4 text-tirage" />}
                          </span>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Portal>
              )}
            </Transition>
          )}
        </div>
      </Listbox>
    </div>
  )
}