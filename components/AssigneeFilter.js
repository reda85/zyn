'use client';

import { useState } from 'react';
import { Switch, Listbox } from '@headlessui/react';
import clsx from 'clsx';
import { UserCheck, ChevronDown } from 'lucide-react';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'], display: 'swap' });





export default function AssignedToMemberFilter({
  active,
  onToggle,
  members,
  selectedMemberId,
  onSelectMember,
  label = "Assigné à un membre",
}) {
  const selectedMember = members.find(m => m.id === selectedMemberId) || null;

  return (
    <div className={clsx('px-4 mb-4', outfit.className)}>
      <div className="flex flex-col overflow-visible gap-2 bg-neutral-100 border border-border/50 p-3 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground text-sm">{label}</span>
          </div>

          <Switch
            checked={active}
            onChange={onToggle}
            className={clsx(
              active ? 'bg-primary' : 'bg-muted',
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2'
            )}
          >
            <span
              className={clsx(
                active ? 'translate-x-6' : 'translate-x-1',
                'inline-block h-4 w-4 transform bg-white rounded-full transition-transform shadow-sm'
              )}
            />
          </Switch>
        </div>

        {/* Dropdown pour sélectionner le membre, actif seulement si switch activé */}
        {active && (
          <Listbox value={selectedMember?.id || ''} onChange={onSelectMember}>
            <div className="relative mt-2">
              <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm">
                <span className="block truncate">
                  {selectedMember ? selectedMember.name : 'Choisir un membre'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </span>
              </Listbox.Button>

              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                {members.map((member) => (
                  <Listbox.Option
                    key={member.id}
                    value={member.id}
                    className={({ active }) =>
                      clsx(
                        active ? 'bg-primary/20 text-primary' : 'text-gray-900',
                        'cursor-pointer select-none relative py-2 pl-3 pr-9'
                      )
                    }
                  >
                    {({ selected }) => (
                      <span className={clsx(selected ? 'font-semibold' : 'font-normal', 'block truncate')}>
                        {member.name}
                      </span>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        )}
      </div>
    </div>
  );
}
