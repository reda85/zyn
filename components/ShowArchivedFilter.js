'use client';

import { Switch } from '@headlessui/react';
import clsx from 'clsx';
import { ArchiveIcon } from 'lucide-react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export default function ShowArchivedFilter({
  active,
  onToggle,
  archivedCount = 0,
  label = "Afficher les archivés",
}) {
  return (
    <div className={clsx('px-4 mb-4', GeistSans.className)}>
      <div className="flex flex-col overflow-visible gap-2 bg-stone-100 border border-stone-200 p-3 rounded-[4px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArchiveIcon className="w-4 h-4 text-stone-500" />
            <span className="text-[13px] text-stone-950">{label}</span>
            {archivedCount > 0 && (
              <span className={clsx('text-[11px] rounded-[3px] px-1.5 py-0.5 font-medium bg-stone-100 text-stone-500', GeistMono.className)}>
                {archivedCount}
              </span>
            )}
          </div>

          <Switch
            checked={active}
            onChange={onToggle}
            className={clsx(
              active ? 'bg-stone-950' : 'bg-stone-300',
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
      </div>
    </div>
  );
}