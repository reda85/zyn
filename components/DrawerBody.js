import { Textarea } from '@headlessui/react';
import StatusSelect from './StatusSelect';
import IntervenantDatePicker from './IntervenantDatePicker';
import { useAtom } from 'jotai';
import { pinsAtom, selectedPinAtom } from '@/store/atoms';
import { useEffect, useState } from 'react';
import Pin from './Pin';
import CategoryComboBox from './CategoryComboBox';
import { Tag } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import Timeline from './Timeline';
import TagEditor from './TagEditor';




export default function DrawerBody({ pin, newComment, photoUploadTrigger }) {
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)
  const [pins, setPins] = useAtom(pinsAtom)
  const [name, setName] = useState(pin.name)
  const [note, setNote] = useState(pin.note)
  const [tags, setTags] = useState(pin.tags || []);
  const [dueDate, setDueDate] = useState(pin.due_date ? new Date(pin.due_date) : null);
  const [intervenant, setIntervenant] = useState(pin.assigned_to || null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (photoUploadTrigger > 0) {
      console.log('photoUploadTrigger changed:', photoUploadTrigger);
      setRefreshKey(prev => prev + 1);
    }
  }, [photoUploadTrigger]);

  const handleUpdateTags = async (updatedTags) => {
    setTags(updatedTags);
    const { data } = await supabase
      .from('pdf_pins')
      .update({ tags: updatedTags })
      .eq('id', pin.id)
      .select('*')
      .single();

    if (data) {
      setSelectedPin({ ...selectedPin, tags: data.tags });
      console.log('setPins6')
      setPins(pins.map((p) => (p.id === pin.id ? { ...p, tags: data.tags } : p)));
    }
  };

  useEffect(() => {
    setName(pin.name)
    setNote(pin.note)
    setTags(pin.tags || []);
    setDueDate(pin.due_date ? new Date(pin.due_date) : null);
    setIntervenant(pin.assigned_to || null);
  }, [pin])

  const handleUpdateName = async () => {
    if (!name) return

    const { data } = await supabase.from('pdf_pins').update({ name }).eq('id', pin.id).select('*').single()
    if (data) {
      setName(data.name);
      setSelectedPin({...selectedPin, name: name});
      console.log('setPins7')
      setPins(pins.map((p) => p.id === selectedPin.id ? {...p, name:name} : p))
    }
  }

  const handleUpdateNote = async () => {
    if (!note) return

    const { data } = await supabase.from('pdf_pins').update({ note }).eq('id', pin.id).select('*').single()
    if (data) {
      setNote(data.note);
      setSelectedPin({...selectedPin, note: note});
      console.log('setPins8')
      setPins(pins.map((p) => p.id === selectedPin.id ? {...p, note:note} : p))
    }
  }

  // Function to refresh timeline
  const handlePhotoUploaded = () => {
    setRefreshKey(prev => prev + 1);
  }
   
  return (
    <div className="flex flex-col h-full gap-3 overflow-visible ">
      <div className='flex flex-col gap-3 px-5 py-4 '>
        <div className='flex flex-row gap-2 items-center'>
          <Pin pin={pin} />
          <div className="text-base">{pin && <StatusSelect pin={pin} />}</div>
        </div>
        <div className="text-sm text-stone-500">ID: {pin?.projects?.project_number}-{pin.pin_number}</div>
        <div className="text-base">
          <input 
            onBlur={handleUpdateName} 
            placeholder='Ajouter le nom ici ...' 
            value={name || ''} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full resize-none text-lg focus:outline-none placeholder:text-lg" 
          />
        </div>
        <div className="text-xs">
          <Textarea 
            value={note || ''} 
            placeholder='Ajouter une description ici ...' 
            onBlur={handleUpdateNote} 
            onChange={(e) => setNote(e.target.value)} 
            className="w-full resize-none text-sm placeholder:text-sm focus:outline-none" 
          />
        </div>
        <TagEditor tags={tags} onChange={handleUpdateTags} />
        <div className='flex flex-row gap-2 items-center'> 
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