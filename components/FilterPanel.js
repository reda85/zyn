'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ListFilterIcon } from 'lucide-react';
import { useAtom } from 'jotai';
import { filteredPinsAtom, pinsAtom, selectedProjectAtom } from '@/store/atoms';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

import CategoryFilter from './CategoryFilter';
import CreatedByMeFilter from './CreatedByMeFilter';
import DateFilter from './DateFilter';
import StatusFilter from './StatusFilter';
import OverdueFilter from './OverdueFilter';
import AssignedToMemberFilter from './AssigneeFilter';
import TagFilter from './TagFilter';
import { Outfit } from 'next/font/google';
import clsx from 'clsx';

const outfit = Outfit({ subsets: ['latin'], display: 'swap' });

dayjs.extend(isToday);
dayjs.extend(isSameOrAfter);

export default function FilterPanel({ user, projectId }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  const [pins] = useAtom(pinsAtom);
  const [, setFilteredPins] = useAtom(filteredPinsAtom);
  const [allPins, setAllPins] = useState([]);

  const [statusTags, setStatusTags] = useState([]);
  const [tagIds, setTagIds] = useState([]);

  useEffect(() => {
    if (pins && allPins.length === 0) {
      setAllPins(pins);
      setFilteredPins(pins);
    }
  }, [pins]);

  useEffect(() => {
    if (allPins && allPins.length > 0) {
      const uniqueMembersMap = {};
      allPins.forEach((pin) => {
        if (pin.assigned_to?.id && pin.assigned_to?.name) {
          uniqueMembersMap[pin.assigned_to.id] = {
            id: pin.assigned_to.id,
            name: pin.assigned_to.name,
          };
        }
      });
      const uniqueMembers = Object.values(uniqueMembersMap);
      uniqueMembers.unshift({ id: 'unassigned', name: 'Non assigné' });
      setMembers(uniqueMembers);
    }
  }, [allPins]);

  const [filters, setFilters] = useState({
    me: false,
    category: false,
    date: false,
    overdue: false,
    assignee: false,
    tag: false,
  });

  const [categoryTags, setCategoryTags] = useState([]);
  const [dateTags, setDateTags] = useState([]);

  const applyFilters = () => {
    let filtered = [...pins];

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

    if (filters.assignee) {
      if (selectedMemberId === 'unassigned') {
        filtered = filtered.filter((pin) => !pin.assigned_to);
      } else if (selectedMemberId) {
        filtered = filtered.filter((pin) => pin.assigned_to?.id === selectedMemberId);
      }
    }

    if (filters.overdue) {
      filtered = filtered.filter((pin) => {
        return pin.due_date && dayjs(pin.due_date).isBefore(dayjs(), 'day');
      });
    }

    // Tag filter — toggle ON + no tags = zero results
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

    setFilteredPins(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [pins, filters, categoryTags, dateTags, statusTags, selectedMemberId, tagIds]);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 6,
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

  const hasActiveFilters =
    filters.me ||
    filters.category ||
    filters.date ||
    filters.overdue ||
    filters.assignee ||
    filters.tag ||
    statusTags.length > 0;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg border transition-colors',
          hasActiveFilters
            ? 'bg-neutral-900 text-white border-neutral-900'
            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
        )}
      >
        <ListFilterIcon className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: position.top, left: position.left }}
            className={clsx(
              'absolute z-50 w-80 bg-white border border-neutral-200 shadow-lg rounded-lg',
              'max-h-[75vh] overflow-y-auto',
              outfit.className
            )}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-100">
              <h3 className="text-[13px] font-semibold text-neutral-900">Filtres</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-neutral-100 transition-colors"
              >
                <XMarkIcon className="h-4 w-4 text-neutral-400" />
              </button>
            </div>

            <div className="py-1">
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
  projectId={projectId}  // ← add this
/>
              <AssignedToMemberFilter
                active={filters.assignee}
                onToggle={(value) => setFilters((prev) => ({ ...prev, assignee: value }))}
                members={members}
                selectedMemberId={selectedMemberId}
                onSelectMember={setSelectedMemberId}
              />
              <OverdueFilter
                active={filters.overdue}
                onToggle={(value) => setFilters((prev) => ({ ...prev, overdue: value }))}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}