'use client';
import { useEffect, useState } from 'react';
import { Switch } from '@headlessui/react';
import { supabase } from '@/utils/supabase/client';
import { useAtom } from 'jotai';
import { statusesAtom } from '@/store/atoms';
import { CheckCircle2 } from 'lucide-react';

export default function StatusFilter({ activeStatuses, setActiveStatuses }) {
  const [statuses] = useAtom(statusesAtom); // ✅ Enlevé setStatuses

  const toggleStatus = (statusId) => {
    setActiveStatuses((prev) =>
      prev.includes(statusId)
        ? prev.filter((id) => id !== statusId)
        : [...prev, statusId]
    );
  };

  const allSelected = statuses.length > 0 && activeStatuses.length === statuses.length;
  const someSelected = activeStatuses.length > 0 && activeStatuses.length < statuses.length;

  const toggleAll = () => {
    if (allSelected) {
      setActiveStatuses([]);
    } else {
      setActiveStatuses(statuses.map(s => s.id));
    }
  };

  return (
    <div className="px-4 mb-4">
      <div className="bg-neutral-100 border border-border/50 rounded-xl overflow-hidden">
        
        {/* Header avec "Tout sélectionner" */}
        <div className="flex items-center justify-between bg-secondary/50 border-b border-border/50 p-3">
          <span className="text-foreground text-sm ">
            Filtrer par statut
          </span>
          <button
            onClick={toggleAll}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        </div>

        {/* Liste des statuts */}
        <div className="divide-y divide-border/50">
          {statuses.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun statut disponible
            </div>
          ) : (
            statuses.map((status) => {
              const isActive = activeStatuses.includes(status.id);
              
              return (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Indicateur de couleur */}
                    <div 
                      className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: status.color || '#94a3b8' }}
                    />
                    
                    {/* Nom du statut */}
                    <span className="text-sm font-medium text-foreground">
                      {status.name}
                    </span>

                    {/* Badge si actif */}
                    {isActive && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>

                  {/* Switch */}
                  <Switch
                    checked={isActive}
                    onChange={() => toggleStatus(status.id)}
                    className={`${
                      isActive ? 'bg-primary' : 'bg-muted'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        isActive ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform bg-white rounded-full transition-transform shadow-sm`}
                    />
                  </Switch>
                </div>
              );
            })
          )}
        </div>

        {/* Footer avec compteur */}
        {statuses.length > 0 && activeStatuses.length > 0 && (
          <div className="bg-secondary/50 border-t border-border/50 px-3 py-2 text-xs text-muted-foreground text-center">
            {activeStatuses.length} statut{activeStatuses.length > 1 ? 's' : ''} sélectionné{activeStatuses.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}