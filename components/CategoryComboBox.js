import { useEffect, useState, useRef } from 'react'
import { Listbox, Transition, Portal } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { categoriesAtom, pinsAtom, selectedPinAtom } from '@/store/atoms'
import { ZapIcon, DropletsIcon, PaintRoller, GripIcon, FireExtinguisherIcon, CheckIcon } from 'lucide-react'

const categoriesIcons = {
  'unassigned' : <CheckIcon className="text-gray-500 h-4 w-4" />,
  'zap': <ZapIcon className="text-gray-500 h-4 w-4" />,
  'droplets': <DropletsIcon className="text-gray-500 h-4 w-4" />,
  'paint': <PaintRoller className="text-gray-500 h-4 w-4" />,
  'carrelage': <GripIcon className="text-gray-500 h-4 w-4" />,
  'fire-extinguisher': <FireExtinguisherIcon className="text-gray-500 h-4 w-4" />,
}


export default function CategoryComboBox({ pin }) {
  const [categories, setCategories] = useAtom(categoriesAtom)
  const [selected, setSelected] = useState(null)
  const [pins, setPins] = useAtom(pinsAtom)
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)

  const buttonRef = useRef(null)
  const [buttonRect, setButtonRect] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  // Load categories from Supabase
 {/* useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true })

      if (!error && data) {
        setCategories(data)
        setSelected(
          data.find(c => c.name === pin.category) || data[0] || null
        )
      }
    }

    loadCategories()
  }, [pin])
*/
  useEffect(() => {
    if (categories?.length > 0) {
      setSelected(
        categories?.find(c => c.id === pin.category_id) || categories[0] || null
      )
    }
  }, [categories, pin])
  // Update category in DB when selection changes
  useEffect(() => {
    const handleUpdateCategory = async () => {
      if (!selected?.name) return
      const { data } = await supabase
        .from('pdf_pins')
        .update({ category_id: selected.id })
        .eq('id', pin.id)
        .select('*')
        .single()

      if (data) {
        if (selectedPin) {
          setSelectedPin({ ...selectedPin, category_id: data.category_id })
        }
        setPins(pins.map(p => (p.id === pin.id ? { ...p, category_id: data.category_id } : p)))
      }
    }

    handleUpdateCategory()
  }, [selected])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonRect(rect)
    }
  }, [isOpen])

  return (
    <div className="w-48 relative">
      <Listbox
        value={selected}
        onChange={value => {
          setSelected(value)
          setIsOpen(false)
        }}
      >
        <div>
          <Listbox.Button
            ref={buttonRef}
            onClick={() => setIsOpen(prev => !prev)}
            className="relative w-full text-sm font-semibold cursor-pointer rounded-lg bg-gray-100 py-2 pl-3 pr-10 text-left text-gray-500 border border-gray-300 focus:outline-none"
          >
            <span className="flex items-center gap-2">
              {selected?.icon && (
                 categoriesIcons[selected.icon] 
              )}
              <span className="block truncate text-xs">{selected?.name}</span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
            </span>
          </Listbox.Button>

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
                  className="absolute z-[1100] max-h-60 overflow-auto rounded-md bg-white py-1 text-base shadow-lg border border-gray-300 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                  style={{
                    top: buttonRect.bottom + window.scrollY,
                    left: buttonRect.left + window.scrollX,
                    width: buttonRect.width,
                  }}
                >
                  {categories.map((cat, idx) => (
                    <Listbox.Option
                      key={cat.id || idx}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                          active ? 'text-gray-900' : 'text-gray-500'
                        }`
                      }
                      value={cat}
                    >
                      {({ selected }) => (
                        <span
                          className={`flex gap-2 rounded-md items-center truncate ${
                            selected ? 'font-medium bg-gray-200' : 'font-normal'
                          }`}
                        >
                          {cat.icon && (
                          categoriesIcons[cat.icon]
                          )}
                          {cat.name}
                        </span>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Portal>
            )}
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}
}