'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ListFilterIcon } from 'lucide-react';
import { useAtom } from 'jotai';
import { pinsAtom } from '@/store/atoms';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

import CategoryFilter from './CategoryFilter';
import CreatedByMeFilter from './CreatedByMeFilter';  
import DateFilter from './DateFilter';
import StatusFilter from './StatusFilter';
import OverdueFilter from './OverdueFilter';

dayjs.extend(isToday);
dayjs.extend(isSameOrAfter);

export default function ListFilterPanel({ pins, setPins }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  
  const [allPins] = useState(pins);
  const [statusTags, setStatusTags] = useState([]);


  const [filters, setFilters] = useState({
    me: false,
    category: false,
    date: false,
    overdue: false,
  });

  const [categoryTags, setCategoryTags] = useState([]);
  const [dateTags, setDateTags] = useState([]);

  const applyFilters = () => {
    let filtered = [...allPins];

    if (filters.me) {
      filtered = filtered.filter((pin) => pin.created_by === 'me'); // Replace 'me' with actual user logic
    }

    if (filters.category && categoryTags.length > 0) {
      filtered = filtered.filter((pin) => categoryTags.includes(pin.category));
    }

    if (filters.date && dateTags.length > 0) {
      filtered = filtered.filter((pin) => {
        const date = dayjs(pin.created_at);
        return dateTags.some((tag) => {
          if (tag === 'Aujourd’hui') return date.isToday();
          if (tag === 'Cette semaine') return date.isSameOrAfter(dayjs().startOf('week'));
          if (tag === 'Ce mois-ci') return date.isSameOrAfter(dayjs().startOf('month'));
          return false;
        });
      });
    }
    if (statusTags.length > 0) {
      console.log('statusTags', statusTags);
      console.log('filtered', filtered);
  filtered = filtered.filter((pin) => statusTags.includes(pin.status_id));
}

if (filters.overdue) {
  filtered = filtered.filter((pin) => {
    return pin.due_date && dayjs(pin.due_date).isBefore(dayjs(), 'day');
  });
}
    setPins(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, categoryTags, dateTags, statusTags]);

  useEffect(() => {
  if (open && buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    const panelWidth = 384; // w-96 = 384px

    const left = Math.min(
      rect.left + window.scrollX,
      window.innerWidth - panelWidth - 16 // prevent going off screen (16px padding)
    );

    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left,
    });
  }
}, [open]);


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-2 bg-stone-100 rounded-md shadow hover:bg-stone-200 border border-gray-300"
      >
        <div className="flex flex-row items-center gap-2">
        <ListFilterIcon className="h-5 w-5" />
        <span className="text-xs font-semibold">Filtres</span>
        </div>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: position.top, left: position.left }}
           className="absolute z-50 w-[24rem] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 shadow-lg py-4 rounded-md"
          >
            <div className="flex justify-between items-center mb-3 px-4">
              <h3 className="text-sm font-semibold">Filtres</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <CreatedByMeFilter
              active={filters.me}
              onToggle={(value) =>
                setFilters((prev) => ({ ...prev, me: value }))
              }
            />

            <CategoryFilter
              active={filters.category}
              onToggle={(value) =>
                setFilters((prev) => ({ ...prev, category: value }))
              }
              tags={categoryTags}
              setTags={setCategoryTags}
            />

            <DateFilter
              active={filters.date}
              onToggle={(value) =>
                setFilters((prev) => ({ ...prev, date: value }))
              }
              tags={dateTags}
              setTags={setDateTags}
            />
            <StatusFilter
  activeStatuses={statusTags}
  setActiveStatuses={setStatusTags}
/>
<OverdueFilter
  active={filters.overdue}
  onToggle={(value) =>
    setFilters((prev) => ({ ...prev, overdue: value }))
  }
/>

          </div>,
          document.body
        )}
    </>
  );
}
