// components/TagEditor.tsx
import { useEffect, useState } from 'react';
import { X, Tag } from 'lucide-react';

import { useAtom } from 'jotai';
import { selectedPinAtom } from '@/store/atoms';

export default function TagEditor({ tags = [], onChange }) {
  const [input, setInput] = useState('');
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)
  const [currentTags, setCurrentTags] = useState(selectedPin.tags);

  const handleAddTag = (e) => {
    console.log('handleAddTag', e)
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const newTags = currentTags?.length > 0 ? [...currentTags, input.trim()] : [input.trim()];
      setCurrentTags(newTags);
      onChange(newTags);
      setInput('');
    }
  };

  
  useEffect(() => {
    setCurrentTags(selectedPin.tags || []);
  }, [selectedPin]);

  const removeTag = (tag) => {
    const newTags = currentTags.filter((t) => t !== tag);
    setCurrentTags(newTags);
    onChange(newTags);
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        <div className="flex items-center w-fit px-3 py-1 bg-gray-100 border border-gray-300 rounded-full text-sm text-gray-500">
          <Tag className="h-4 w-4 mr-2 text-gray-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Ajouter Tag"
            className="bg-transparent outline-none w-24 placeholder:text-gray-400"
          />
        </div>
        {currentTags?.map((tag, idx) => (
          <span key={idx} className="flex items-center px-3 py-1 text-sm bg-gray-200 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-gray-500 hover:text-gray-700">
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      
    </div>
  );
}
