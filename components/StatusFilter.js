'use client';
import { Switch } from '@headlessui/react';
import { useProjectData } from '@/providers/ProjectProvider';
import { CheckCircle2 } from 'lucide-react';
import { outfit } from '@/lib/fonts';
import clsx from 'clsx';

export default function StatusFilter({ activeStatuses, setActiveStatuses }) {
  const { statuses } = useProjectData();

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
    <div className={clsx("px-4 mb-4", outfit.className)}>
      <div className="bg-survol border border-filet rounded-[8px] overflow-hidden">

        {/* Header avec "Tout sélectionner" */}
        <div className="flex items-center justify-between bg-voile border-b border-filet p-3">
          <span className="text-[14px] text-encre">
            Filtrer par statut
          </span>
          <button
            onClick={toggleAll}
            className="text-[13px] font-medium text-tirage hover:text-tirage-fonce transition-colors flex items-center gap-1"
          >
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        </div>

        {/* Liste des statuts */}
        <div className="divide-y divide-filet">
          {statuses.length === 0 ? (
            <div className="p-4 text-center text-[14px] text-mine-clair">
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
                    <span className="text-[14px] font-medium text-encre">
                      {status.name}
                    </span>

                    {/* Badge si actif */}
                    {isActive && (
                      <CheckCircle2 className="w-4 h-4 text-tirage" />
                    )}
                  </div>

                  {/* Switch */}
                  <Switch
                    checked={isActive}
                    onChange={() => toggleStatus(status.id)}
                    className={clsx(
                      isActive ? 'bg-encre' : 'bg-filet-fort',
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
          <div className={clsx('bg-voile border-t border-filet px-3 py-2 text-[12px] text-mine-clair text-center', 'tabular-nums')}>
            {activeStatuses.length} statut{activeStatuses.length > 1 ? 's' : ''} sélectionné{activeStatuses.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}