'use client';
import { Switch } from '@headlessui/react';
import { User } from 'lucide-react';

export default function CreatedByMeFilter({ active, onToggle }) {
  
  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between bg-secondary/30 border border-border/50 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground text-sm font-semibold">
            Créés par moi
          </span>
        </div>
        <Switch
          checked={active}
          onChange={onToggle}
          className={`${
            active ? 'bg-primary' : 'bg-muted'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2`}
        >
          <span
            className={`${
              active ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform bg-white rounded-full transition-transform shadow-sm`}
          />
        </Switch>
      </div>
    </div>
  );
}