'use client';
import { Switch } from '@headlessui/react';
import { useState } from 'react';

const suggestions = ['Electricite', 'Peinture', 'Plomberie'];

export default function CategoryFilter({ active, onToggle, tags, setTags }) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

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
      <div className="flex items-center justify-between bg-stone-100 border border-gray-300 p-2 rounded">
        <span className="text-gray-700 text-xs font-semibold capitalize">
          Filtrer par catégorie
        </span>
        <Switch
          checked={active}
          onChange={onToggle}
          className={`${
            active ? 'bg-blue-600' : 'bg-gray-300'
          } relative inline-flex h-5 w-9 items-center rounded-full transition`}
        >
          <span
            className={`${
              active ? 'translate-x-5' : 'translate-x-1'
            } inline-block h-3 w-3 transform bg-white rounded-full transition`}
          />
        </Switch>
      </div>

      {active && (
        <div className="mt-2 relative">
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="flex items-center px-3 py-1 text-sm bg-gray-200 rounded-full"
              >
                {tag}
                <button onClick={() => removeTag(tag)} className="ml-1">✕</button>
              </span>
            ))}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addTag(input.trim());
                }
              }}
              placeholder="Ajouter"
              className="border border-gray-300 px-2 py-1 rounded text-sm"
            />
          </div>

          {showDropdown && (
            <div className="absolute z-40 mt-1 bg-white border border-gray-300 rounded-md shadow w-60 max-h-48 overflow-y-auto text-sm">
              {suggestions
                .filter((s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s))
                .map((s) => (
                  <div
                    key={s}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={() => addTag(s)}
                  >
                    {s}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
