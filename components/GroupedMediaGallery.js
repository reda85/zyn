'use client';

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { GeistSans } from 'geist/font/sans';
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
                    ? 'bg-tirage border-tirage'
                    : 'border-filet-fort hover:border-tirage'
                )}
                title={allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              >
                {allSelected && <CheckCircleIcon className="text-white w-3 h-3" />}
              </button>

              <div className="flex items-baseline gap-2.5">
                <h3 className="text-[14px] font-semibold text-encre first-letter:uppercase">
                  {date}
                </h3>
                <span className="text-[12px] text-mine-clair tabular-nums">
                  {items.length} photo{items.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((item) => {
                const selected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={clsx(
                      "relative group bg-white border rounded-[6px] overflow-hidden flex flex-col transition-colors",
                      selected ? "border-tirage ring-1 ring-tirage" : "border-filet hover:border-filet-fort"
                    )}
                  >
                    <div className="relative aspect-[4/3] bg-voile">
                      <img
                        src={photoThumbUrl(item, { width: 640 })}
                        alt={item.pdf_pins?.name || 'Photo de chantier'}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => toggleMedia(item.id)}
                        aria-pressed={selected}
                        aria-label={selected ? 'Retirer de la sélection' : 'Sélectionner la photo'}
                        className={clsx(
                          "absolute top-2 right-2 w-6 h-6 rounded-full border flex items-center justify-center transition-opacity",
                          selected
                            ? 'bg-tirage border-tirage opacity-100'
                            : 'border-white bg-black/20 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                        )}
                      >
                        {selected && <CheckCircleIcon className="text-white w-4 h-4" />}
                      </button>
                    </div>

                    <div className="px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[13px] text-encre font-medium truncate">
                        <MapPinIcon className="h-3.5 w-3.5 text-mine-clair flex-shrink-0" />
                        <span className="truncate">{item.pdf_pins?.name || 'Réserve sans titre'}</span>
                      </p>
                      <p className="mt-0.5 ml-5 flex items-center gap-2 text-[12px] text-mine-clair">
                        <span className="truncate">{item.pdf_pins?.assigned_to?.name || 'Non assigné'}</span>
                        <span className="ml-auto tabular-nums">
                          {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
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