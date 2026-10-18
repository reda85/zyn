'use client';

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { MapPinIcon, User, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { photoThumbUrl } from '@/lib/images';

export default function GroupedMediaGallery({ media, selectedIds, setSelectedIds }) {
  if (!media || media.length === 0) {
    return null; // Empty state géré par la page parent
  }

  // Regroupe par jour. `media` arrive trié du plus récent au plus ancien :
  // l'ordre d'apparition des jours est donc déjà le bon (trier des libellés
  // comme « 06 septembre 2026 » avec `new Date()` ne fonctionne pas).
  const grouped = {};
  const sortedDates = [];
  for (const item of media) {
    const date = new Date(item.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    if (!grouped[date]) {
      grouped[date] = [];
      sortedDates.push(date);
    }
    grouped[date].push(item);
  }

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

  return (
    <div className={clsx("space-y-10", GeistSans.className)}>
      {sortedDates.map((date) => {
        const items = grouped[date];
        const allSelected = items.every((item) => selectedIds.has(item.id));

        return (
          <div key={date}>
            {/* Date Header with Group Checkbox */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleAllInGroup(items)}
                className={clsx(
                  "w-4 h-4 rounded-[2px] border flex items-center justify-center transition-colors",
                  allSelected
                    ? 'bg-[#2f5ee0] border-[#2f5ee0]'
                    : 'border-[#d6d6d2] hover:border-[#2f5ee0]'
                )}
                title={allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              >
                {allSelected && <CheckCircleIcon className="text-white w-3 h-3" />}
              </button>

              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-medium text-[#050505]">
                  {date}
                </h3>
                <span className={clsx('text-[12px] text-[#8a8a84]', GeistMono.className)}>
                  · {items.length} photo{items.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {items.map((item) => {
                const selected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={clsx(
                      "relative group bg-white border rounded-[4px] overflow-hidden flex flex-col transition-all hover:shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)]",
                      selected
                        ? "border-[#2f5ee0] shadow-[0_0_0_3px_rgba(47,94,224,0.15)]"
                        : "border-[#e5e5e2] hover:border-[#d6d6d2]"
                    )}
                  >
                    {/* Header with user and time */}
                    <div className="px-3 py-2 bg-[#f5f5f4] border-b border-[#e5e5e2]">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3 h-3 text-[#8a8a84]" />
                        <p className="text-[12px] font-medium text-[#0d0d0c] truncate">
                          {item.pdf_pins?.assigned_to?.name || 'Non assigné'}
                        </p>
                      </div>
                      <p className={clsx('text-[12px] text-[#8a8a84]', GeistMono.className)}>
                        {new Date(item.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {/* Media image */}
                    <div className="relative h-48">
                      <img
                        src={photoThumbUrl(item, { width: 640 })}
                        alt="media"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />

                      {/* Overlay gradient on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Checkbox */}
                      <button
                        onClick={() => toggleMedia(item.id)}
                        className={clsx(
                          "absolute top-2 right-2 w-6 h-6 rounded-full border flex items-center justify-center transition-all shadow-[0_1px_2px_rgba(15,15,15,0.08)]",
                          selected
                            ? 'bg-[#2f5ee0] border-[#2f5ee0] opacity-100 scale-110'
                            : 'border-white bg-white/30 backdrop-blur-sm opacity-0 group-hover:opacity-100'
                        )}
                      >
                        {selected && <CheckCircleIcon className="text-white w-4 h-4" />}
                      </button>
                    </div>

                    {/* Footer with pin name */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border-t border-[#e5e5e2] mt-auto">
                      <MapPinIcon className="h-4 w-4 text-[#8a8a84] flex-shrink-0" />
                      <span className="text-[13px] text-[#0d0d0c] font-medium truncate">
                        {item.pdf_pins?.name || 'Sans nom'}
                      </span>
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