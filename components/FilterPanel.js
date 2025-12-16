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
import { a } from '@react-spring/web';

dayjs.extend(isToday);
dayjs.extend(isSameOrAfter);

export default function FilterPanel({user}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const [pins, setPins] = useAtom(pinsAtom);
  const [filteredPins, setFilteredPins] = useState(pins);
  const [allPins, setAllPins] = useState([]);
  console.log('filtered 0', pins)

  const [statusTags, setStatusTags] = useState([]);

  useEffect(() => {
    if (pins && allPins.length === 0) {
      console.log('filtered 1', pins)
      setAllPins(pins);
    }
  }, [pins]);
  
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
    console.log('filtered1', filtered);

    if (filters.me) {
      filtered = filtered.filter((pin) => pin.created_by === user.id ); // Replace 'me' with actual user logic
    }

    if (filters.category && categoryTags.length > 0) {
      filtered = filtered.filter((pin) => categoryTags.includes(pin.categories?.name));
    }

    if (filters.date && dateTags.length > 0) {
      filtered = filtered.filter((pin) => {
        const date = dayjs(pin.created_at);
        return dateTags.some((tag) => {
          if (tag === 'Aujourd\'hui') return date.isToday();
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
    
    console.log('filtered2', filtered);
    setPins(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, categoryTags, dateTags, statusTags]);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
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
        className="flex items-center gap-2 px-3 py-2.5 bg-neutral-100 rounded-xl hover:bg-neutral-200 border border-border/50 hover:border-primary/20 transition-all hover:shadow-md backdrop-blur-sm"
      >
        <ListFilterIcon className="h-5 w-5 text-muted-foreground" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: position.top, left: position.left }}
            className="absolute z-50 w-96 bg-card border border-border/50 shadow-2xl py-4 rounded-xl backdrop-blur-sm"
          >
            <div className="flex justify-between items-center mb-4 px-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Filtres</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
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