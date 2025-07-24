'use client';

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Lexend } from 'next/font/google';

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' });

export default function GroupedMediaGallery({ media, selectedIds, setSelectedIds }) {
  if (!media || media.length === 0) {
    return <div className="text-gray-500 text-center py-10">Aucun média disponible.</div>;
  }

  // Group media by date
  const grouped = media.reduce((acc, item) => {
    const date = new Date(item.created_at).toLocaleDateString('fr-FR', {
  day: '2-digit',
  month: 'long',
  year: '2-digit',
});

    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  const toggleMedia = (id) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const toggleAllInGroup = (mediaList) => {
    const allSelected = mediaList.every((item) => selectedIds.has(item.id));
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      mediaList.forEach((item) => {
        if (allSelected) newSet.delete(item.id);
        else newSet.add(item.id);
      });
      return newSet;
    });
  };
  function classNames(...classes) {
    return classes.filter(Boolean).join(' ');    
  }

  return (
    <div className={classNames("space-y-10", lexend.variable)}>
      {sortedDates.map((date) => {
        const items = grouped[date];
        const allSelected = items.every((item) => selectedIds.has(item.id));

        return (
          <div key={date}>
            {/* Date Header with Group Checkbox */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => toggleAllInGroup(items)}
                className={`w-5 h-5 rounded-full border-2 ${
                  allSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                } flex items-center justify-center transition`}
              >
                {allSelected && <CheckCircleIcon className="text-white w-4 h-4" />}
              </button>
              <h3 className=" font-semibold text-gray-700"> {date} — {items.length} média{items.length > 1 ? 's' : ''}</h3>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((item) => {
                const selected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="relative group bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                  >
<div
  key={item.id}
  className="relative group bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col"
>
  {/* Header with time */}
  <div className="text-xs text-gray-500 px-3 py-2 bg-gray-50">
    Ajouté à : {new Date(item.created_at).toLocaleTimeString('fr-FR')}
  </div>

  {/* Media image */}
  <div className="relative">
    <img
      src={item.public_url}
      alt="media"
      className="w-full h-48 object-cover"
    />

    {/* Hover / Selected checkbox */}
    <button
      onClick={() => toggleMedia(item.id)}
      className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 ${
        selected ? 'bg-blue-500 border-blue-500 opacity-100' : 'border-white opacity-0 group-hover:opacity-100'
      } flex items-center justify-center transition`}
    >
      {selected && <CheckCircleIcon className="text-white w-5 h-5" />}
    </button>
  </div>

  {/* Footer with pin name */}
  <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border-t border-gray-200 mt-auto">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-gray-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 00-8 0c0 1.657 2 6 4 6s4-4.343 4-6z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v-3" />
    </svg>
    <span className="truncate">
      {item.pdf_pins?.name ?? 'Sans nom'}
    </span>
  </div>
</div>

                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
