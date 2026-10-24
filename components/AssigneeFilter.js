'use client';

import { useState } from 'react';
import { Switch, Listbox } from '@headlessui/react';
import clsx from 'clsx';
import { UserCheck, ChevronDown } from 'lucide-react';
import { outfit } from '@/lib/fonts';

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
      <div className="flex flex-col overflow-visible gap-2 bg-survol border border-filet p-3 rounded-[8px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-mine-clair" />
            <span className="text-[14px] text-encre">{label}</span>
          </div>

          <Switch
            checked={active}
            onChange={onToggle}
            className={clsx(
              active ? 'bg-encre' : 'bg-filet-fort',
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              'focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,94,224,0.22)]'
            )}
          >
            <span
              className={clsx(
                active ? 'translate-x-[18px]' : 'translate-x-[3px]',
                'inline-block h-3.5 w-3.5 transform bg-white rounded-full transition-transform shadow-[0_1px_2px_rgba(15,15,15,0.08)]'
              )}
            />
          </Switch>
        </div>

        {/* Dropdown pour sélectionner le membre, actif seulement si switch activé */}
        {active && (
          <Listbox value={selectedMember?.id || ''} onChange={onSelectMember}>
            <div className="relative mt-2">
              <Listbox.Button className="relative w-full cursor-pointer rounded-[8px] bg-white border border-filet py-2 pl-3 pr-9 text-left text-[14px] hover:bg-survol transition-colors focus:outline-none focus:border-encre">
                <span className="block truncate text-encre">
                  {selectedMember ? selectedMember.name : 'Choisir un membre'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                  <ChevronDown className="w-4 h-4 text-mine-clair" />
                </span>
              </Listbox.Button>

              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-[8px] bg-white border border-filet py-1 text-[14px] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] focus:outline-none z-10">
                {members.map((member) => (
                  <Listbox.Option
                    key={member.id}
                    value={member.id}
                    className={({ active }) =>
                      clsx(
                        active ? 'bg-survol text-encre' : 'text-encre',
                        'cursor-pointer select-none relative py-2 pl-3 pr-9'
                      )
                    }
                  >
                    {({ selected }) => (
                      <span className={clsx(selected ? 'font-medium' : 'font-normal', 'block truncate')}>
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