import { Textarea } from '@headlessui/react';
import StatusSelect from './StatusSelect';
import IntervenantDatePicker from './IntervenantDatePicker';
import { usePinsCache } from '@/hooks/usePins';
import { useEffect, useState } from 'react';
import Pin from './Pin';
import CategoryComboBox from './CategoryComboBox';
import { supabase } from '@/utils/supabase/client';
import Timeline from './Timeline';
import TagEditor from './TagEditor';
import { useUserData } from '@/hooks/useUserData';
import { GeistMono } from 'geist/font/mono';
import clsx from 'clsx';

export default function DrawerBody({ pin, newComment, photoUploadTrigger, organization_id }) {
  const { patchPin } = usePinsCache();
  const [name, setName] = useState(pin.name);
  const [note, setNote] = useState(pin.note);
  const [refreshKey, setRefreshKey] = useState(0);
  const { profile } = useUserData(organization_id);

  const isGuest = profile?.role === 'guest';

  useEffect(() => {
    if (photoUploadTrigger > 0) {
      setRefreshKey(prev => prev + 1);
    }
  }, [photoUploadTrigger]);

  // Resynchronise les champs quand on change de pin ou que sa valeur change ailleurs.
  useEffect(() => {
    setName(pin.name);
    setNote(pin.note);
  }, [pin.id, pin.name, pin.note]);

  const saveField = async (field, value) => {
    if (!value || isGuest || value === pin[field]) return;
    const { error } = await supabase
      .from('pdf_pins')
      .update({ [field]: value, updated_by: profile?.id || null, updated_at: new Date().toISOString() })
      .eq('id', pin.id);
    if (error) {
      console.error(`update ${field} failed`, error);
      return;
    }
    patchPin(pin.id, { [field]: value });
  };

  const handleUpdateName = () => saveField('name', name);
  const handleUpdateNote = () => saveField('note', note);

  // TagEditor persiste lui-même ; on répercute seulement dans le cache.
  const handleTagsChange = (updatedTags) => {
    patchPin(pin.id, { pin_tags: updatedTags.map((t) => ({ tag_id: t.id, tags: t })) });
  };

  return (
    <div className="flex flex-col h-full gap-3 overflow-visible">
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-row gap-2 items-center">
          <Pin pin={pin} />
          <div className="text-base">{pin && <StatusSelect pin={pin} />}</div>
        </div>
        <div className={clsx('text-[12px] text-[#8a8a84]', GeistMono.className)}>
          ID: {pin?.projects?.project_number}-{pin.pin_number}
        </div>
        <div className="text-base">
          <input
            onBlur={handleUpdateName}
            placeholder="Ajouter le nom ici ..."
            value={name || ''}
            onChange={(e) => setName(e.target.value)}
            disabled={isGuest}
            className="w-full resize-none text-lg text-[#0d0d0c] placeholder:text-lg placeholder:text-[#b8b8b3] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#f5f5f4]"
          />
        </div>
        <div className="text-xs">
          <Textarea
            value={note || ''}
            placeholder="Ajouter une description ici ..."
            onBlur={handleUpdateNote}
            onChange={(e) => setNote(e.target.value)}
            disabled={isGuest}
            className="w-full resize-none text-[13px] text-[#4a4a46] placeholder:text-[13px] placeholder:text-[#b8b8b3] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#f5f5f4]"
          />
        </div>
        <TagEditor pin={pin} onChange={handleTagsChange} disabled={isGuest} />
        <div className="flex flex-row gap-2 items-center">
          {pin && <IntervenantDatePicker pin={pin} />}
        </div>
      </div>
      <Timeline
        pin={pin}
        newComment={newComment}
        refreshKey={refreshKey}
      />
    </div>
  );
}