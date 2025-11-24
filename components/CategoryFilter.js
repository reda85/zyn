'use client';
import { Switch } from '@headlessui/react';
import { useState } from 'react';
import { useAtom } from 'jotai';
import { categoriesAtom } from '@/store/atoms';

export default function CategoryFilter({ active, onToggle, tags, setTags }) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [categories] = useAtom(categoriesAtom); // ✅ Enlevé setCategories

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
      <div className="flex items-center justify-between bg-secondary/30 border border-border/50 p-3 rounded-xl">
        <span className="text-foreground text-sm font-semibold">
          Filtrer par catégorie
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
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full border border-primary/20 font-medium"
              >
                {tag}
                <button 
                  onClick={() => removeTag(tag)} 
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
                  addTag(input.trim());
                }
              }}
              placeholder="Ajouter une catégorie..."
              className="border border-border/50 bg-secondary/30 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>

          {showDropdown && categories && categories.length > 0 && (
            <div className="absolute z-40 mt-1 bg-card border border-border/50 rounded-xl shadow-xl w-60 max-h-48 overflow-y-auto">
              {categories
                .filter((s) => s.name.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s.name))
                .map((s) => (
                  <div
                    key={s.id}
                    className="px-4 py-2.5 hover:bg-secondary/50 cursor-pointer text-sm text-foreground font-medium transition-colors first:rounded-t-xl last:rounded-b-xl"
                    onMouseDown={() => addTag(s.name)}
                  >
                    {s.name}
                  </div>
                ))}
              {categories.filter((s) => s.name.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s.name)).length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
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