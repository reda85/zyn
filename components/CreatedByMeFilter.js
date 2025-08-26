'use client';
import { Switch } from '@headlessui/react';

export default function CreatedByMeFilter({ active, onToggle }) {
  
  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between bg-stone-100 border border-gray-300 p-2 rounded">
        <span className="text-gray-700 text-xs font-semibold capitalize">
          Pins créés par moi
        </span>
        <Switch
          checked={active}
          onChange={onToggle}
          className={`${
            active ? 'bg-blue-600' : 'bg-gray-300'
          } relative inline-flex h-5 w-9 items-center rounded-full transition`}
        >
          <span
            className={`${
              active ? 'translate-x-5' : 'translate-x-1'
            } inline-block h-3 w-3 transform bg-white rounded-full transition`}
          />
        </Switch>
      </div>
    </div>
  );
}
