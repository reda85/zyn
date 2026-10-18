'use client';
import { Switch } from '@headlessui/react';
import { useState } from 'react';
import { useProjectData } from '@/providers/ProjectProvider';
import clsx from 'clsx';

export default function CategoryFilter({ active, onToggle, tags, setTags }) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  // `tags` contient des identifiants de catégories.
  const { categories } = useProjectData();
  const nameOf = (id) => categories.find((c) => c.id === id)?.name ?? '…';
  const suggestions = categories.filter(
    (c) => c.name.toLowerCase().includes(input.toLowerCase()) && !tags.includes(c.id)
  );

  const addTag = (tag) => {
    if (!tags.includes(tag)) setTags([...tags, tag]);
    setInput('');
    setShowDropdown(false);
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between bg-stone-100 border border-stone-200 p-3 rounded-[4px]">
        <span className="text-[13px] text-stone-950">
          Filtrer par catégorie
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
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] bg-blue-50 text-blue-900 rounded-[3px] border border-blue-200 font-medium"
              >
                {nameOf(tag)}
                <button
                  onClick={() => removeTag(tag)}
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
                  addTag(suggestions[0].id);
                }
              }}
              placeholder="Ajouter une catégorie..."
              className="border border-stone-200 bg-white px-3 py-1.5 rounded-[4px] text-[13px] text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 transition-colors"
            />
          </div>

          {showDropdown && categories && categories.length > 0 && (
            <div className="absolute z-40 mt-1 bg-white border border-stone-200 rounded-[4px] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] w-60 max-h-48 overflow-y-auto">
              {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="px-3 py-2.5 hover:bg-stone-100 cursor-pointer text-[13px] text-stone-950 font-medium transition-colors first:rounded-t-[4px] last:rounded-b-[4px]"
                    onMouseDown={() => addTag(s.id)}
                  >
                    {s.name}
                  </div>
                ))}
              {suggestions.length === 0 && (
                <div className="px-3 py-3 text-[13px] text-stone-500 text-center">
                  Aucune catégorie trouvée
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}