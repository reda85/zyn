'use client';

import { Switch } from '@headlessui/react';
import { AlertCircle } from 'lucide-react';
import { GeistSans } from 'geist/font/sans';
import clsx from 'clsx';

export default function OverdueFilter({ active, onToggle }) {
  return (
    <div className={clsx("px-4 mb-4", GeistSans.className)}>
      <div className="flex items-center justify-between bg-[#f5f5f4] border border-[#e5e5e2] p-3 rounded-[4px]">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#dc2626]" />
          <span className="text-[13px] text-[#0d0d0c]">
            Tâches en retard
          </span>
        </div>
        <Switch
          checked={active}
          onChange={onToggle}
          className={clsx(
            active ? 'bg-[#dc2626]' : 'bg-[#d6d6d2]',
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(220,38,38,0.22)]'
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
  );
}