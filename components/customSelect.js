'use client';

import { useState, useRef, useEffect } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

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
              className="relative w-full flex items-center gap-2 cursor-pointer rounded-[4px] bg-white hover:bg-[#f5f5f4] py-[7px] pl-3 pr-8 text-left border border-[#e5e5e2] focus:outline-none focus:border-[#0d0d0c] transition-colors"
            >
              <Square3Stack3DIcon className="h-4 w-4 text-[#8a8a84]" aria-hidden="true" />
              <span className="block truncate text-[13px] font-medium text-[#0d0d0c]">
                {selected.name}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                <ChevronDownIcon className="h-3.5 w-3.5 text-[#8a8a84]" aria-hidden="true" />
              </span>
            </ListboxButton>
            <ListboxOptions
              className="fixed z-50 mt-1 max-h-60 w-max overflow-auto rounded-[4px] bg-white border border-[#e5e5e2] py-1 shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] focus:outline-none"
              style={
                buttonRect
                  ? {
                      top: `${buttonRect.bottom + 4}px`,
                      left: `${buttonRect.left}px`,
                      minWidth: `${buttonRect.width}px`,
                    }
                  : {}
              }
            >
              {options.map((option) => (
                <ListboxOption
                  key={option.id}
                  value={option}
                  className={({ active }) =>
                    clsx(
                      'relative cursor-pointer select-none py-2 pl-8 pr-4 transition-colors whitespace-nowrap text-[13px]',
                      active ? 'bg-[#f5f5f4]' : ''
                    )
                  }
                >
                  {({ selected: isSelected }) => (
                    <>
                      <span
                        className={clsx(
                          'block truncate',
                          isSelected
                            ? 'font-medium text-[#0d0d0c]'
                            : 'font-normal text-[#4a4a46]'
                        )}
                      >
                        {option.name}
                      </span>
                      {isSelected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                          <CheckIcon className="h-3.5 w-3.5 text-[#2f5ee0]" aria-hidden="true" />
                        </span>
                      )}
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