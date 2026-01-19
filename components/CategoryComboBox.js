import { useEffect, useState, useRef } from 'react'
import { Listbox, Transition, Portal } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { categoriesAtom, pinsAtom, selectedPinAtom } from '@/store/atoms'
import { ZapIcon, DropletsIcon, PaintRoller, GripIcon, FireExtinguisherIcon, CheckIcon, DoorClosedIcon, SnowflakeIcon } from 'lucide-react'
import {categoriesIcons} from '@/utils/categories'
import clsx from 'clsx'

/*const categoriesIcons = {
  'unassigned': <CheckIcon className="text-muted-foreground h-4 w-4" />,
  'zap': <ZapIcon className="text-muted-foreground h-4 w-4" />,
  'droplets': <DropletsIcon className="text-muted-foreground h-4 w-4" />,
  'paint': <PaintRoller className="text-muted-foreground h-4 w-4" />,
  'carrelage': <GripIcon className="text-muted-foreground h-4 w-4" />,
  'fire-extinguisher': <FireExtinguisherIcon className="text-muted-foreground h-4 w-4" />,
  'doors': <DoorClosedIcon className="text-muted-foreground h-4 w-4" />,
  'snowflake': <SnowflakeIcon className="text-muted-foreground h-4 w-4" />,
}
*/

export default function CategoryComboBox({ pin }) {
  const [categories] = useAtom(categoriesAtom)
  const [selected, setSelected] = useState(null)
  const [pins, setPins] = useAtom(pinsAtom)
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)

  const buttonRef = useRef(null)
  const [buttonRect, setButtonRect] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

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
        console.log('setPins5')
        setPins((prevPins) => {
    if (!prevPins || prevPins.length === 0) return prevPins; // don't overwrite empty array
    return prevPins.map((p) =>
        p.id === pin.id ? { ...p, category_id: data.category_id } : p
    );
});

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
            className="relative w-full text-sm font-medium cursor-pointer rounded-xl bg-secondary/50 py-2.5 pl-3 pr-10 text-left text-foreground border border-border/50 hover:bg-secondary/80 hover:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          >
            <span className="flex items-center gap-2">
              {selected?.icon && categoriesIcons[selected.icon]}
              <span className="block truncate text-sm">{selected?.name}</span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
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
                  className="absolute z-[1100] max-h-60 overflow-auto rounded-xl bg-card py-1 text-base shadow-xl border border-border/50 ring-1 ring-black/5 focus:outline-none sm:text-sm backdrop-blur-sm"
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
                          active ? 'bg-primary/10 text-foreground' : 'text-foreground'
                        )
                      }
                      value={cat}
                    >
                      {({ selected: isSelected }) => (
                        <span
                          className={clsx(
                            'flex gap-2 items-center truncate',
                            isSelected ? 'font-semibold' : 'font-normal'
                          )}
                        >
                          {cat.icon && categoriesIcons[cat.icon]}
                          <span className="text-sm">{cat.name}</span>
                          {isSelected && (
                            <CheckIcon className="ml-auto h-4 w-4 text-primary" />
                          )}
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