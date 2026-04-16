'use client';

import { Switch } from '@headlessui/react';
import clsx from 'clsx';
import { ArchiveIcon } from 'lucide-react';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'], display: 'swap' });

export default function ShowArchivedFilter({
  active,
  onToggle,
  archivedCount = 0,
  label = "Afficher les archivés",
}) {
  return (
    <div className={clsx('px-4 mb-4', outfit.className)}>
      <div className="flex flex-col overflow-visible gap-2 bg-neutral-100 border border-border/50 p-3 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArchiveIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground text-sm">{label}</span>
            {archivedCount > 0 && (
              <span className="text-[11px] rounded-full px-1.5 py-0.5 font-medium bg-neutral-200 text-neutral-500">
                {archivedCount}
              </span>
            )}
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
      </div>
    </div>
  );
}