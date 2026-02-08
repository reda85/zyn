'use client';

import { Fragment, useState, useRef, useEffect } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon, ChevronUpDownIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline';

export default function CustomSelect({ options, selected, onChange }) {
  const [buttonRect, setButtonRect] = useState(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (buttonRef.current) {
      const updatePosition = () => {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonRect(rect);
      };
      
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, []);

  if (!selected) return null;
  
  return (
    <div className="w-max min-w-56">
      <Listbox value={selected} onChange={onChange}>
        {({ open }) => (
          <div className="relative mt-1">
            <ListboxButton 
              ref={buttonRef}
              className="relative w-full flex flex-row items-center gap-2 cursor-pointer rounded-xl bg-neutral-100 hover:bg-neutral-200 py-2.5 pl-3 pr-10 text-left border border-border/50 hover:border-primary/20 focus:outline-none transition-all hover:shadow-md backdrop-blur-sm"
            >
              <Square3Stack3DIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className="block truncate text-sm font-semibold font-heading text-foreground">{selected.name}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDownIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </span>
            </ListboxButton>
            <ListboxOptions 
              className="fixed z-50 mt-1 max-h-60 w-max overflow-auto rounded-xl bg-card border border-border/50 py-1 text-base shadow-xl ring-1 ring-black/5 focus:outline-none sm:text-sm backdrop-blur-sm"
              style={buttonRect ? {
                top: `${buttonRect.bottom + 4}px`,
                left: `${buttonRect.left}px`,
                minWidth: `${buttonRect.width}px`,
              } : {}}
            >
              {options.map((option) => (
                <ListboxOption
                  key={option.id}
                  value={option}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors whitespace-nowrap ${
                      active ? 'bg-primary/10 text-foreground' : 'text-foreground'
                    }`
                  }
                >
                  {({ selected : isSelected }) => (
                    <>
                      <span className={`block ${isSelected ? 'font-semibold font-heading' : 'font-normal'}`}>
                        {option.name}
                      </span>
                      {isSelected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        )}
      </Listbox>
    </div>
  );
}