'use client';
import { Switch } from '@headlessui/react';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';

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
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between bg-neutral-100 border border-border/50 p-3 rounded-xl">
        <span className="text-foreground text-sm">Filtrer par tag</span>
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
            {tags.map((tagId) => (
              <span
                key={tagId}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full border border-primary/20 font-medium"
              >
                {getTagName(tagId)}
                <button
                  onClick={() => removeTag(tagId)}
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
              placeholder="Ajouter un tag..."
              className="border border-border/50 bg-secondary/30 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>

          {showDropdown && (
            <div className="absolute z-40 mt-1 bg-card border border-border/50 rounded-xl shadow-xl w-60 max-h-48 overflow-y-auto">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((tag) => (
                  <div
                    key={tag.id}
                    className="px-4 py-2.5 hover:bg-secondary/50 cursor-pointer text-sm text-foreground font-medium transition-colors first:rounded-t-xl last:rounded-b-xl"
                    onMouseDown={() => addTag(tag.id)}
                  >
                    {tag.name}
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
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