'use client';
import { Switch } from '@headlessui/react';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { GeistSans } from 'geist/font/sans';
import clsx from 'clsx';

export default function TagFilter({ active, onToggle, tags, setTags, projectId }) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    const fetchTags = async () => {
      if (!projectId) return;
      const { data } = await supabase
        .from('tags')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true });
      if (data) setAvailableTags(data);
    };
    fetchTags();
  }, [projectId]);

  const addTag = (tagId) => {
    if (!tags.includes(tagId)) setTags([...tags, tagId]);
    setInput('');
    setShowDropdown(false);
  };

  const removeTag = (tagId) => {
    setTags(tags.filter((t) => t !== tagId));
  };

  const getTagName = (tagId) =>
    availableTags.find((t) => t.id === tagId)?.name ?? tagId;

  const filteredSuggestions = availableTags.filter(
    (t) =>
      t.name.toLowerCase().includes(input.toLowerCase()) &&
      !tags.includes(t.id)
  );

  return (
    <div className={clsx("px-4 mb-4", GeistSans.className)}>
      <div className="flex items-center justify-between bg-[#f5f5f4] border border-[#e5e5e2] p-3 rounded-[4px]">
        <span className="text-[13px] text-[#0d0d0c]">Filtrer par tag</span>
        <Switch
          checked={active}
          onChange={onToggle}
          className={clsx(
            active ? 'bg-[#0d0d0c]' : 'bg-[#d6d6d2]',
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
            {tags.map((tagId) => (
              <span
                key={tagId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] bg-[#e6eeff] text-[#1e3a8a] rounded-[3px] border border-[#c5d6fb] font-medium"
              >
                {getTagName(tagId)}
                <button
                  onClick={() => removeTag(tagId)}
                  className="hover:bg-[#dbe7fe] rounded-[2px] p-0.5 transition-colors text-[#264dc2]"
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
              placeholder="Ajouter un tag..."
              className="border border-[#e5e5e2] bg-white px-3 py-1.5 rounded-[4px] text-[13px] text-[#0d0d0c] placeholder:text-[#b8b8b3] focus:outline-none focus:border-[#0d0d0c] transition-colors"
            />
          </div>

          {showDropdown && (
            <div className="absolute z-40 mt-1 bg-white border border-[#e5e5e2] rounded-[4px] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] w-60 max-h-48 overflow-y-auto">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((tag) => (
                  <div
                    key={tag.id}
                    className="px-3 py-2.5 hover:bg-[#f5f5f4] cursor-pointer text-[13px] text-[#0d0d0c] font-medium transition-colors first:rounded-t-[4px] last:rounded-b-[4px]"
                    onMouseDown={() => addTag(tag.id)}
                  >
                    {tag.name}
                  </div>
                ))
              ) : (
                <div className="px-3 py-3 text-[13px] text-[#8a8a84] text-center">
                  Aucun tag trouvé
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}