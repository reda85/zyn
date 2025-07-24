import { Fragment, useEffect, useState, useRef } from 'react'
import { Listbox, Transition, Portal } from '@headlessui/react'
import { CheckCheckIcon, Droplet, FireExtinguisherIcon, GripIcon, PaintRoller, ZapIcon } from 'lucide-react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { pinsAtom, selectedPinAtom } from '@/store/atoms'

const options = [
  { name: 'Non assigné', value: 'Non assigné', icon: <CheckCheckIcon className="text-gray-500 h-4 w-4" /> },
  { name: 'Electricite', value: 'Electricite', icon: <ZapIcon className="text-gray-500 h-4 w-4" /> },
  { name: 'Plomberie', value: 'Plomberie', icon: <Droplet className="text-gray-500 h-4 w-4" /> },
  { name: 'Peinture', value: 'Peinture', icon: <PaintRoller className="text-gray-500 h-4 w-4" /> },
  { name: 'Carrelage', value: 'Carrelage', icon: <GripIcon className="text-gray-500 h-4 w-4" /> },
  { name: 'Extincteur', value: 'Extincteur', icon: <FireExtinguisherIcon className="text-gray-500 h-4 w-4" /> },
]

export default function CategoryComboBox({ pin }) {
  const [selected, setSelected] = useState(options.find(option => pin.category === option.value) || options[0])
  const [pins, setPins] = useAtom(pinsAtom)
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)

  const buttonRef = useRef(null)
  const [buttonRect, setButtonRect] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleUpdateCategory = async () => {
    if (!selected?.value) return
    const { data } = await supabase.from('pdf_pins').update({ category: selected.value }).eq('id', pin.id).select('*').single()
    if (data) {
      setSelectedPin({ ...selectedPin, category: data.category })
      setPins(pins.map(p => (p.id === selectedPin?.id ? { ...p, category: data.category } : p)))
    }
  }

  useEffect(() => {
    handleUpdateCategory()
  }, [selected])

  useEffect(() => {
    setSelected(options.find(option => pin.category === option.value) || options[0])
  }, [pin])

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
        onChange={value => {setSelected(value); setIsOpen(false);}}
      >
        <>
          <Listbox.Button
            ref={buttonRef}
            onClick={() => setIsOpen(prev => !prev)} // toggle open manually
            className="relative w-full text-sm font-semibold cursor-pointer rounded-lg bg-gray-100 py-2 pl-3 pr-10 text-left text-gray-500 border border-gray-300 focus:outline-none"
          >
            <span className="flex items-center gap-4">
              {selected?.icon}
              <span className="block truncate text-xs">{selected?.name}</span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            show={isOpen}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setIsOpen(false)} // reset state after closing animation
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
                  {options.map((option, idx) => (
                    <Listbox.Option
                      key={idx}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                          active ? 'text-gray-900' : 'text-gray-500'
                        }`
                      }
                      value={option}
                    >
                      {({ selected }) => (
                        <span
                          className={`flex gap-4 rounded-md font-semibold items-center truncate ${
                            selected ? 'font-medium bg-gray-200' : 'font-normal'
                          }`}
                        >
                          {option.icon}
                          {option.name}
                        </span>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Portal>
            )}
          </Transition>
        </>
      </Listbox>
    </div>
  )
}
