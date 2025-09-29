'use client';

import { Fragment, useState } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon, ChevronUpDownIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export default function CustomSelect({ options, selected, projectId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const onChange = (option) => {
    setOpen(false);
    router.push(`/protected/projects/${projectId}/${option.id}`);
  };
  return (
    <div className="w-56 ">
      <Listbox value={selected} onChange={onChange}>
        <div className="relative mt-1">
          <ListboxButton className="relative w-full flex flex-row items-center gap-2 cursor-default rounded-lg bg-stone-100 hover:bg-stone-300 py-2 pl-3 pr-10 text-left  border border-gray-300 focus:outline-none ">
            <Square3Stack3DIcon className="h-5 w-5 " aria-hidden="true" />
            <span className="block truncate text-sm font-semibold">{selected.name}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </ListboxButton>
          <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {options.map((option) => (
              <ListboxOption
                key={option.id}
                value={option}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {option.name}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
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
