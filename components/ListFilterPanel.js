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
import { GeistSans } from 'geist/font/sans';
import clsx from 'clsx';

import CategoryFilter from './CategoryFilter';
import CreatedByMeFilter from './CreatedByMeFilter';
import DateFilter from './DateFilter';
import StatusFilter from './StatusFilter';
import OverdueFilter from './OverdueFilter';
import ProjectPlanFilter from './ProjectPlanFilter';
import TagFilter from './TagFilter';
import ShowArchivedFilter from './ShowArchivedFilter';

dayjs.extend(isToday);
dayjs.extend(isSameOrAfter);

export default function ListFilterPanel({ pins, setPins, originalPins, setOriginalPins, user, projectId }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const [allPins] = useState(pins);
  const [statusTags, setStatusTags] = useState([]);
  const [tagIds, setTagIds] = useState([]);

  const [filters, setFilters] = useState({
    me: false,
    category: false,
    date: false,
    overdue: false,
    projectPlan: false,
    tag: false,
    showArchived: false,
  });

  const [categoryTags, setCategoryTags] = useState([]);
  const [dateTags, setDateTags] = useState([]);
  const [projectPlanTags, setProjectPlanTags] = useState([]);

  const applyFilters = () => {
    let filtered = [...originalPins];

    if (!filters.showArchived) {
      filtered = filtered.filter((pin) => !pin.isArchived);
    }

    if (filters.me) {
      filtered = filtered.filter((pin) => pin.created_by === user.id);
    }

    if (filters.category && categoryTags.length > 0) {
      filtered = filtered.filter((pin) => categoryTags.includes(pin.categories?.name));
    }

    if (filters.date && dateTags.length > 0) {
      filtered = filtered.filter((pin) => {
        const date = dayjs(pin.created_at);
        return dateTags.some((tag) => {
          if (tag === "Aujourd'hui") return date.isToday();
          if (tag === 'Cette semaine') return date.isSameOrAfter(dayjs().startOf('week'));
          if (tag === 'Ce mois-ci') return date.isSameOrAfter(dayjs().startOf('month'));
          return false;
        });
      });
    }

    if (statusTags.length > 0) {
      filtered = filtered.filter((pin) => statusTags.includes(pin.status_id));
    }

    if (filters.overdue) {
      filtered = filtered.filter((pin) => {
        return pin.due_date && dayjs(pin.due_date).isBefore(dayjs(), 'day');
      });
    }

    if (filters.projectPlan && projectPlanTags.length > 0) {
      filtered = filtered.filter((pin) => projectPlanTags.includes(pin.plans?.name));
    }

    if (filters.tag) {
      if (tagIds.length === 0) {
        filtered = [];
      } else {
        filtered = filtered.filter((pin) => {
          const pinTagIds = (pin.pin_tags ?? []).map((pt) =>
            typeof pt.tags === 'object' ? pt.tags?.id : pt.tag_id
          );
          return tagIds.some((id) => pinTagIds.includes(id));
        });
      }
    }

    setPins(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, categoryTags, dateTags, statusTags, projectPlanTags, tagIds]);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 384;
      const left = Math.min(
        rect.left + window.scrollX,
        window.innerWidth - panelWidth - 16
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

  const archivedCount = pins.filter((p) => p.isArchived).length;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-[7px] rounded-[4px] border transition-colors',
          GeistSans.className,
          'bg-white text-[#4a4a46] border-[#e5e5e2] hover:bg-[#f5f5f4]'
        )}
      >
        <ListFilterIcon className="h-4 w-4" />
        <span className="text-[13px] font-medium">Filtres</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: position.top, left: position.left }}
            className={clsx(
              'absolute z-50 w-[24rem] max-w-[calc(100vw-2rem)] bg-white border border-[#e5e5e2] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] py-4 rounded-[4px]',
              GeistSans.className
            )}
          >
            <div className="flex justify-between items-center mb-3 px-4">
              <h3 className="text-[13px] font-medium text-[#050505]">Filtres</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors"
              >
                <XMarkIcon className="h-4 w-4 text-[#8a8a84]" />
              </button>
            </div>

            <CreatedByMeFilter
              active={filters.me}
              onToggle={(value) => setFilters((prev) => ({ ...prev, me: value }))}
            />
            <CategoryFilter
              active={filters.category}
              onToggle={(value) => setFilters((prev) => ({ ...prev, category: value }))}
              tags={categoryTags}
              setTags={setCategoryTags}
            />
            <DateFilter
              active={filters.date}
              onToggle={(value) => setFilters((prev) => ({ ...prev, date: value }))}
              tags={dateTags}
              setTags={setDateTags}
            />
            <StatusFilter
              activeStatuses={statusTags}
              setActiveStatuses={setStatusTags}
            />
            <TagFilter
              active={filters.tag}
              onToggle={(value) => setFilters((prev) => ({ ...prev, tag: value }))}
              tags={tagIds}
              setTags={setTagIds}
              projectId={projectId}
            />
            <OverdueFilter
              active={filters.overdue}
              onToggle={(value) => setFilters((prev) => ({ ...prev, overdue: value }))}
            />
            <ShowArchivedFilter
              active={filters.showArchived}
              onToggle={(value) => setFilters((prev) => ({ ...prev, showArchived: value }))}
              archivedCount={archivedCount}
            />
            <ProjectPlanFilter
              active={filters.projectPlan}
              onToggle={(value) => setFilters((prev) => ({ ...prev, projectPlan: value }))}
              selectedPlans={projectPlanTags}
              setSelectedPlans={setProjectPlanTags}
            />
          </div>,
          document.body
        )}
    </>
  );
}