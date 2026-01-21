'use client';
import { Switch } from '@headlessui/react';
import { useState } from 'react';
import { useAtom } from 'jotai';
import { projectPlansAtom } from '@/store/atoms';

export default function ProjectPlanFilter({ active, onToggle, selectedPlans, setSelectedPlans }) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [projectPlans,setProjectPlans] = useAtom(projectPlansAtom);

  const addPlan = (plan) => {
    if (!selectedPlans.includes(plan)) setSelectedPlans([...selectedPlans, plan]);
    setInput('');
    setShowDropdown(false);
  };

  const removePlan = (plan) => {
    setSelectedPlans(selectedPlans.filter((p) => p !== plan));
  };

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between bg-neutral-100 border border-border/50 p-3 rounded-xl">
        <span className="text-foreground text-sm">
          Filtrer par plan de projet
        </span>
        <Switch
          checked={active}
          onChange={onToggle}
          className={`${
            active ? 'bg-primary' : 'bg-muted'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2`}
        >
          <span
            className={`${
              active ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform bg-white rounded-full transition-transform shadow-sm`}
          />
        </Switch>
      </div>

      {active && (
        <div className="mt-3 relative">
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedPlans.map((plan, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full border border-primary/20 font-medium"
              >
                {plan}
                <button 
                  onClick={() => removePlan(plan)} 
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
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
                if (e.key === 'Enter' && input.trim()) {
                  addPlan(input.trim());
                }
              }}
              placeholder="Ajouter un plan de projet..."
              className="border border-border/50 bg-secondary/30 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>

          {showDropdown && projectPlans && projectPlans.length > 0 && (
            <div className="absolute z-40 mt-1 bg-card border border-border/50 rounded-xl shadow-xl w-60 max-h-48 overflow-y-auto">
              {projectPlans
                .filter((p) => p.name.toLowerCase().includes(input.toLowerCase()) && !selectedPlans.includes(p.name))
                .map((p) => (
                  <div
                    key={p.id}
                    className="px-4 py-2.5 hover:bg-secondary/50 cursor-pointer text-sm text-foreground font-medium transition-colors first:rounded-t-xl last:rounded-b-xl"
                    onMouseDown={() => addPlan(p.name)}
                  >
                    {p.name}
                  </div>
                ))}
              {projectPlans.filter((p) => p.name.toLowerCase().includes(input.toLowerCase()) && !selectedPlans.includes(p.name)).length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
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