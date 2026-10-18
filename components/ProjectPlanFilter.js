'use client';
import { Switch } from '@headlessui/react';
import { useState } from 'react';
import { useProjectData } from '@/providers/ProjectProvider';
import { GeistSans } from 'geist/font/sans';
import clsx from 'clsx';

export default function ProjectPlanFilter({ active, onToggle, selectedPlans, setSelectedPlans }) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  // `selectedPlans` contient des identifiants de plans.
  const { plans: projectPlans } = useProjectData();
  const nameOf = (id) => projectPlans.find((p) => p.id === id)?.name ?? '…';
  const suggestions = projectPlans.filter(
    (p) => (p.name || '').toLowerCase().includes(input.toLowerCase()) && !selectedPlans.includes(p.id)
  );

  const addPlan = (plan) => {
    if (!selectedPlans.includes(plan)) setSelectedPlans([...selectedPlans, plan]);
    setInput('');
    setShowDropdown(false);
  };

  const removePlan = (plan) => {
    setSelectedPlans(selectedPlans.filter((p) => p !== plan));
  };

  return (
    <div className={clsx("px-4 mb-4", GeistSans.className)}>
      <div className="flex items-center justify-between bg-stone-100 border border-stone-200 p-3 rounded-[4px]">
        <span className="text-[13px] text-stone-950">
          Filtrer par plan de projet
        </span>
        <Switch
          checked={active}
          onChange={onToggle}
          className={clsx(
            active ? 'bg-stone-950' : 'bg-stone-300',
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,94,224,0.22)]'
          )}
        >
          <span
            className={clsx(
              active ? 'translate-x-[18px]' : 'translate-x-[3px]',
              'inline-block h-3.5 w-3.5 transform bg-white rounded-full transition-transform shadow-[0_1px_2px_rgba(15,15,15,0.08)]'
            )}
          />
        </Switch>
      </div>

      {active && (
        <div className="mt-3 relative">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedPlans.map((plan, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] bg-blue-50 text-blue-900 rounded-[3px] border border-blue-200 font-medium"
              >
                {nameOf(plan)}
                <button
                  onClick={() => removePlan(plan)}
                  className="hover:bg-blue-100 rounded-[2px] p-0.5 transition-colors text-blue-700"
                >
                  ✕
                </button>
              </span>
            ))}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim() && suggestions.length > 0) {
                  addPlan(suggestions[0].id);
                }
              }}
              placeholder="Ajouter un plan de projet..."
              className="border border-stone-200 bg-white px-3 py-1.5 rounded-[4px] text-[13px] text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 transition-colors"
            />
          </div>

          {showDropdown && projectPlans && projectPlans.length > 0 && (
            <div className="absolute z-40 mt-1 bg-white border border-stone-200 rounded-[4px] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] w-60 max-h-48 overflow-y-auto">
              {suggestions.map((p) => (
                  <div
                    key={p.id}
                    className="px-3 py-2.5 hover:bg-stone-100 cursor-pointer text-[13px] text-stone-950 font-medium transition-colors first:rounded-t-[4px] last:rounded-b-[4px]"
                    onMouseDown={() => addPlan(p.id)}
                  >
                    {p.name}
                  </div>
                ))}
              {suggestions.length === 0 && (
                <div className="px-3 py-3 text-[13px] text-stone-500 text-center">
                  Aucun plan de projet trouvé
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}