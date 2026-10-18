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
              'relative w-full text-[13px] font-medium rounded-[4px] py-2 pl-3 pr-9 text-left border transition-colors focus:outline-none',
              isGuest
                ? 'bg-stone-100 border-stone-100 text-stone-500 cursor-not-allowed opacity-60'
                : 'bg-white border-stone-300 text-stone-950 cursor-pointer shadow-sm hover:bg-stone-50 hover:border-stone-400 focus:border-stone-950 focus:ring-2 focus:ring-stone-200'
            )}
          >
            <span className="flex items-center gap-2">
              {selected?.icon && categoriesIcons[selected.icon]}
              <span className="block truncate text-[13px]">{selected?.name}</span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
              <ChevronUpDownIcon
                className={clsx('h-4 w-4', isGuest ? 'text-stone-400' : 'text-stone-500')}
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
                    className="absolute z-[1100] max-h-60 overflow-auto rounded-[4px] bg-white py-1 text-[13px] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] border border-stone-200 focus:outline-none"
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
                            active ? 'bg-stone-100 text-stone-950' : 'text-stone-950'
                          )
                        }
                        value={cat}
                      >
                        {({ selected: isSelected }) => (
                          <span className={clsx('flex gap-2 items-center truncate', isSelected ? 'font-medium' : 'font-normal')}>
                            {cat.icon && categoriesIcons[cat.icon]}
                            <span className="text-[13px]">{cat.name}</span>
                            {isSelected && <CheckIcon className="ml-auto h-4 w-4 text-blue-600" />}
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