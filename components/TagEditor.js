import { useEffect, useRef, useState } from 'react';
import { X, Tag } from 'lucide-react';
import { useAtom } from 'jotai';
import { selectedPinAtom } from '@/store/atoms';
import { supabase } from '@/utils/supabase/client';

export default function TagEditor({ onChange, disabled = false }) {
  const [input, setInput] = useState('');
  const [selectedPin] = useAtom(selectedPinAtom);
  const [currentTags, setCurrentTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchTags = async () => {
      if (!selectedPin?.project_id) return;
      const { data } = await supabase
        .from('tags')
        .select('*')
        .eq('project_id', selectedPin.project_id)
        .order('order', { ascending: true });
      if (data) setAvailableTags(data);
    };
    fetchTags();
  }, [selectedPin?.project_id]);

  useEffect(() => {
    const flat = (selectedPin?.pin_tags ?? [])
      .map((pt) => pt.tags)
      .filter(Boolean);
    setCurrentTags(flat);
  }, [selectedPin?.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = availableTags.filter(
    (t) =>
      t.name.toLowerCase().includes(input.toLowerCase()) &&
      !currentTags.some((ct) => ct.id === t.id)
  );

  const addTag = async (tag) => {
    if (!selectedPin?.id || saving || disabled) return;
    if (currentTags.some((ct) => ct.id === tag.id)) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pin_tags')
        .insert({ pin_id: selectedPin.id, tag_id: tag.id });
      if (error) throw error;
      const updated = [...currentTags, tag];
      setCurrentTags(updated);
      onChange?.(updated);
    } catch (e) {
      console.error('TagEditor addTag error:', e);
    } finally {
      setSaving(false);
      setInput('');
      setShowDropdown(false);
      inputRef.current?.focus();
    }
  };

  const removeTag = async (tag) => {
    if (!selectedPin?.id || saving || disabled) return;
    setSaving(true);
    try {
      await supabase
        .from('pin_tags')
        .delete()
        .eq('pin_id', selectedPin.id)
        .eq('tag_id', tag.id);
      const updated = currentTags.filter((t) => t.id !== tag.id);
      setCurrentTags(updated);
      onChange?.(updated);
    } catch (e) {
      console.error('TagEditor removeTag error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndAdd = async () => {
    const trimmed = input.trim();
    if (!trimmed || !selectedPin?.project_id || saving || disabled) return;
    const existing = availableTags.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      await addTag(existing);
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          project_id: selectedPin.project_id,
          name: trimmed,
          order: availableTags.length,
        })
        .select()
        .single();
      if (error) throw error;
      setAvailableTags((prev) => [...prev, data]);
      await supabase
        .from('pin_tags')
        .insert({ pin_id: selectedPin.id, tag_id: data.id });
      const updated = [...currentTags, data];
      setCurrentTags(updated);
      onChange?.(updated);
      setInput('');
      setShowDropdown(false);
    } catch (e) {
      console.error('TagEditor create error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length === 1) {
        addTag(suggestions[0]);
      } else if (suggestions.length === 0 && input.trim()) {
        handleCreateAndAdd();
      }
    }
    if (e.key === 'Escape') setShowDropdown(false);
    if (e.key === 'Backspace' && input === '' && currentTags.length > 0) {
      removeTag(currentTags[currentTags.length - 1]);
    }
  };

  return (
    <div className="w-full relative">
      <div className="flex flex-wrap gap-2 mb-2">
        <div className={`flex items-center w-fit px-3 py-1 bg-gray-100 border border-gray-300 rounded-full text-sm text-gray-500 ${disabled ? 'opacity-50' : ''}`}>
          <Tag className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ajouter tag"
            disabled={saving || disabled}
            className="bg-transparent outline-none w-24 placeholder:text-gray-400 disabled:cursor-not-allowed"
          />
        </div>

        {currentTags.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center px-3 py-1 text-sm bg-violet-100 border border-violet-300 text-violet-700 rounded-full"
          >
            <Tag className="h-3 w-3 mr-1.5 shrink-0" />
            {tag.name}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={saving}
                className="ml-1.5 text-violet-400 hover:text-violet-700 disabled:opacity-50"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>

      {!disabled && showDropdown && (suggestions.length > 0 || input.trim()) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Tags disponibles
              </p>
              <ul>
                {suggestions.map((tag) => (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addTag(tag);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{tag.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {input.trim() &&
            !availableTags.some(
              (t) => t.name.toLowerCase() === input.trim().toLowerCase()
            ) && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCreateAndAdd();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-violet-600 hover:bg-violet-50 border-t border-gray-100 transition-colors"
              >
                <Tag className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Créer "{input.trim()}"</span>
              </button>
            )}
        </div>
      )}
    </div>
  );
}