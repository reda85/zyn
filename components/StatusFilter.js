'use client';
import { useEffect, useState } from 'react';
import { Switch } from '@headlessui/react';
import { supabase } from '@/utils/supabase/client';
import { useAtom } from 'jotai';
import { statusesAtom } from '@/store/atoms';
import { CheckCircle2 } from 'lucide-react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import clsx from 'clsx';

export default function StatusFilter({ activeStatuses, setActiveStatuses }) {
  const [statuses] = useAtom(statusesAtom);

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
    <div className={clsx("px-4 mb-4", GeistSans.className)}>
      <div className="bg-[#f5f5f4] border border-[#e5e5e2] rounded-[4px] overflow-hidden">

        {/* Header avec "Tout sélectionner" */}
        <div className="flex items-center justify-between bg-[#eeeeec] border-b border-[#e5e5e2] p-3">
          <span className="text-[13px] text-[#0d0d0c]">
            Filtrer par statut
          </span>
          <button
            onClick={toggleAll}
            className="text-[12px] font-medium text-[#2f5ee0] hover:text-[#264dc2] transition-colors flex items-center gap-1"
          >
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        </div>

        {/* Liste des statuts */}
        <div className="divide-y divide-[#e5e5e2]">
          {statuses.length === 0 ? (
            <div className="p-4 text-center text-[13px] text-[#8a8a84]">
              Aucun statut disponible
            </div>
          ) : (
            statuses.map((status) => {
              const isActive = activeStatuses.includes(status.id);

              return (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-3 hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Indicateur de couleur */}
                    <div
                      className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-[0_1px_2px_rgba(15,15,15,0.08)]"
                      style={{ backgroundColor: status.color || '#8a8a84' }}
                    />

                    {/* Nom du statut */}
                    <span className="text-[13px] font-medium text-[#0d0d0c]">
                      {status.name}
                    </span>

                    {/* Badge si actif */}
                    {isActive && (
                      <CheckCircle2 className="w-4 h-4 text-[#2f5ee0]" />
                    )}
                  </div>

                  {/* Switch */}
                  <Switch
                    checked={isActive}
                    onChange={() => toggleStatus(status.id)}
                    className={clsx(
                      isActive ? 'bg-[#0d0d0c]' : 'bg-[#d6d6d2]',
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,94,224,0.22)]'
                    )}
                  >
                    <span
                      className={clsx(
                        isActive ? 'translate-x-[18px]' : 'translate-x-[3px]',
                        'inline-block h-3.5 w-3.5 transform bg-white rounded-full transition-transform shadow-[0_1px_2px_rgba(15,15,15,0.08)]'
                      )}
                    />
                  </Switch>
                </div>
              );
            })
          )}
        </div>

        {/* Footer avec compteur */}
        {statuses.length > 0 && activeStatuses.length > 0 && (
          <div className={clsx('bg-[#eeeeec] border-t border-[#e5e5e2] px-3 py-2 text-[11px] text-[#8a8a84] text-center', GeistMono.className)}>
            {activeStatuses.length} statut{activeStatuses.length > 1 ? 's' : ''} sélectionné{activeStatuses.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}