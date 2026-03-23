import { Textarea } from '@headlessui/react';
import StatusSelect from './StatusSelect';
import IntervenantDatePicker from './IntervenantDatePicker';
import { useAtom } from 'jotai';
import { pinsAtom, selectedPinAtom } from '@/store/atoms';
import { useEffect, useState } from 'react';
import Pin from './Pin';
import CategoryComboBox from './CategoryComboBox';
import { supabase } from '@/utils/supabase/client';
import Timeline from './Timeline';
import TagEditor from './TagEditor';
import { useUserData } from '@/hooks/useUserData';

export default function DrawerBody({ pin, newComment, photoUploadTrigger }) {
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom);
  const [pins, setPins] = useAtom(pinsAtom);
  const [name, setName] = useState(pin.name);
  const [note, setNote] = useState(pin.note);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user, profile, organization } = useUserData();

  const isGuest = profile?.role === 'guest';

  useEffect(() => {
    if (photoUploadTrigger > 0) {
      setRefreshKey(prev => prev + 1);
    }
  }, [photoUploadTrigger]);

  useEffect(() => {
    setName(pin.name);
    setNote(pin.note);
    console.log('DrawerBody pin updated', pin);
  }, [pin]);

  const handleUpdateName = async () => {
    if (!name || isGuest) return;
    const { data } = await supabase
      .from('pdf_pins')
      .update({ name })
      .eq('id', pin.id)
      .select('*')
      .single();
    if (data) {
      setName(data.name);
      setSelectedPin({ ...selectedPin, name: data.name });
      setPins(pins.map((p) => p.id === pin.id ? { ...p, name: data.name } : p));
    }
  };

  const handleUpdateNote = async () => {
    if (!note || isGuest) return;
    const { data } = await supabase
      .from('pdf_pins')
      .update({ note })
      .eq('id', pin.id)
      .select('*')
      .single();
    if (data) {
      setNote(data.note);
      setSelectedPin({ ...selectedPin, note: data.note });
      setPins(pins.map((p) => p.id === pin.id ? { ...p, note: data.note } : p));
    }
  };

  // Sync atoms when tags change — TagEditor handles Supabase persistence itself
  const handleTagsChange = (updatedTags) => {
    const pinTags = updatedTags.map((t) => ({ tags: t }));
    setSelectedPin((prev) => ({ ...prev, pin_tags: pinTags, tags: updatedTags }));
    setPins((prev) =>
      prev.map((p) =>
        p.id === pin.id ? { ...p, pin_tags: pinTags, tags: updatedTags } : p
      )
    );
  };

  return (
    <div className="flex flex-col h-full gap-3 overflow-visible">
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-row gap-2 items-center">
          <Pin pin={pin} />
          <div className="text-base">{pin && <StatusSelect pin={pin} />}</div>
        </div>
        <div className="text-sm text-stone-500">
          ID: {pin?.projects?.project_number}-{pin.pin_number}
        </div>
        <div className="text-base">
          <input
            onBlur={handleUpdateName}
            placeholder="Ajouter le nom ici ..."
            value={name || ''}
            onChange={(e) => setName(e.target.value)}
            disabled={isGuest}
            className="w-full resize-none text-lg focus:outline-none placeholder:text-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted/50"
          />
        </div>
        <div className="text-xs">
          <Textarea
            value={note || ''}
            placeholder="Ajouter une description ici ..."
            onBlur={handleUpdateNote}
            onChange={(e) => setNote(e.target.value)}
            disabled={isGuest}
            className="w-full resize-none text-sm placeholder:text-sm focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted/50"
          />
        </div>
        <TagEditor onChange={handleTagsChange} disabled={isGuest} />
        <div className="flex flex-row gap-2 items-center">
          {pin && <IntervenantDatePicker pin={selectedPin} />}
        </div>
      </div>
      <Timeline
        pin={selectedPin}
        newComment={newComment}
        refreshKey={refreshKey}
      />
    </div>
  );
}