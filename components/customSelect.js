'use client';

import { Fragment, useState } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon, ChevronUpDownIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline';

export default function CustomSelect({ options, selected, onChange }) {

  
  return (
    <div className="w-56">
      <Listbox value={selected} onChange={onChange}>
        <div className="relative mt-1">
          <ListboxButton className="relative w-full flex flex-row items-center gap-2 cursor-pointer rounded-xl bg-secondary/50 hover:bg-secondary/80 py-2.5 pl-3 pr-10 text-left border border-border/50 hover:border-primary/20 focus:outline-none transition-all hover:shadow-md backdrop-blur-sm">
            <Square3Stack3DIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span className="block truncate text-sm font-semibold font-heading text-foreground">{selected.name}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDownIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </span>
          </ListboxButton>
          <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-card border border-border/50 py-1 text-base shadow-xl ring-1 ring-black/5 focus:outline-none sm:text-sm backdrop-blur-sm">
            {options.map((option) => (
              <ListboxOption
                key={option.id}
                value={option}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors ${
                    active ? 'bg-primary/10 text-foreground' : 'text-foreground'
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-semibold font-heading' : 'font-normal'}`}>
                      {option.name}
                    </span>
                    {selected ? (
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
      </Listbox>
    </div>
  );
}