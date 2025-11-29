'use client';

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Lexend } from 'next/font/google';
import { MapPinIcon, User, Calendar } from 'lucide-react';
import clsx from 'clsx';

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' });

export default function GroupedMediaGallery({ media, selectedIds, setSelectedIds }) {
  if (!media || media.length === 0) {
    return null; // Empty state géré par la page parent
  }

  // Group media by date
  const grouped = media.reduce((acc, item) => {
    const date = new Date(item.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
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

  return (
    <div className={clsx("space-y-10", lexend.variable)}>
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
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  allSelected 
                    ? 'bg-primary border-primary' 
                    : 'border-border/50 hover:border-primary/50'
                )}
                title={allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              >
                {allSelected && <CheckCircleIcon className="text-primary-foreground w-4 h-4" />}
              </button>
              
              <div className="flex items-center gap-2">
                
                <h3 className="font-semibold font-heading text-foreground">
                  {date}
                </h3>
                <span className="text-sm text-muted-foreground">
                  • {items.length} photo{items.length > 1 ? 's' : ''}
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
                      "relative group bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:-translate-y-1",
                      selected 
                        ? "border-primary/50 ring-2 ring-primary/20" 
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    {/* Header with user and time */}
                    <div className="px-3 py-2 bg-secondary/30 border-b border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs font-semibold text-foreground truncate">
                          {item.pdf_pins?.assigned_to?.name || 'Non assigné'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {/* Media image */}
                    <div className="relative h-48">
                      <img
                        src={item.public_url}
                        alt="media"
                        className="w-full h-full object-cover"
                      />

                      {/* Overlay gradient on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Checkbox */}
                      <button
                        onClick={() => toggleMedia(item.id)}
                        className={clsx(
                          "absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-lg",
                          selected 
                            ? 'bg-primary border-primary opacity-100 scale-110' 
                            : 'border-white bg-white/30 backdrop-blur-sm opacity-0 group-hover:opacity-100'
                        )}
                      >
                        {selected && <CheckCircleIcon className="text-primary-foreground w-5 h-5" />}
                      </button>
                    </div>

                    {/* Footer with pin name */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-background border-t border-border/50 mt-auto">
                      <MapPinIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground font-medium truncate">
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