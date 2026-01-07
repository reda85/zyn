'use client';

import { useState } from 'react';
import {
  Flame,
  Folder,
  Rocket,
  CheckCircle,
  Package,
  type LucideIcon,
  Zap,
  FireExtinguisher,
  Droplets,
  Snowflake,
  DoorClosed,
  PaintRoller,
  CheckIcon,
  GripIcon,
} from 'lucide-react';

interface IconOption {
  name: string;
  Icon: LucideIcon;
}

const iconOptions: IconOption[] = [
  { name: 'zap', Icon: Zap },
  { name: 'fire-extinguisher', Icon: FireExtinguisher },
  { name: 'droplets', Icon: Droplets },
  { name: 'snowflake', Icon: Snowflake },
  { name: 'doors', Icon: DoorClosed },
  { name: 'paint', Icon: PaintRoller },
  { name: 'unassigned', Icon: CheckIcon },
  { name: 'carrelage', Icon: GripIcon },
];

export function IconPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (iconName: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const SelectedIcon = iconOptions.find((i) => i.name === selected)?.Icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 border rounded hover:bg-gray-100 bg-white"
      >
        {SelectedIcon ? <SelectedIcon size={20} /> : '🎯'}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-[300px]  overflow-y-auto bg-white border rounded shadow p-2 grid grid-cols-6 gap-2">
          {iconOptions.map(({ name, Icon }) => (
           <button key={name} className='p-2 hover:bg-gray-200  rounded flex items-center justify-center' onClick={() => {
              onChange(name);
              setOpen(false);
            }}>
              <Icon   size={20}
                />
           </button>
          ))}
        </div>
      )}
    </div>
  );
}
