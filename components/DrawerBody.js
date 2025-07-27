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




export default function DrawerBody( {pin} ) {
    const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)
    const [pins, setPins] = useAtom(pinsAtom)
    const [name, setName] = useState(pin.name)
    const [note, setNote] = useState(pin.note)
      const [tags, setTags] = useState(pin.tags || []);

  

  const handleUpdateTags = async (updatedTags) => {
    setTags(updatedTags);
    const { data } = await supabase
      .from('pdf_pins')
      .update({ tags: updatedTags }) // tags should be of type `text[]` in Supabase
      .eq('id', pin.id)
      .select('*')
      .single();

    if (data) {
      setSelectedPin({ ...selectedPin, tags: data.tags });
      setPins(pins.map((p) => (p.id === pin.id ? { ...p, tags: data.tags } : p)));
    }
  };

    useEffect(() => {
      setName(pin.name)
      setNote(pin.note)
      setTags(pin.tags || []);
    }, [pin])

     const handleUpdateName = async () => {
      if (!name) return

      const { data } = await supabase.from('pdf_pins').update({ name }).eq('id', pin.id).select('*').single()
      if (data) {
        setName(data.name);setSelectedPin({...selectedPin, name: name});
    setPins(pins.map((p) => p.id === selectedPin.id ? {...p, name:name} : p))
}
    }

    const handleUpdateNote = async () => {
      if (!note) return

      const { data } = await supabase.from('pdf_pins').update({ note }).eq('id', pin.id).select('*').single()
      if (data) {
        setNote(data.note);setSelectedPin({...selectedPin, note: note});
    setPins(pins.map((p) => p.id === selectedPin.id ? {...p, note:note} : p))
}
    }
   
  return (
    <div className="flex flex-col h-full gap-3 overflow-visible ">
      {/* Scrollable content goes here */}
     <div className='flex flex-col gap-3 px-5 py-4 '>
      <div className='flex flex-row gap-2 items-center'>
        <Pin pin={pin} />
      <div className="text-base">{pin && <StatusSelect  pin={pin} />}</div>
      </div>
      
      <div className="text-base"><input onBlur={handleUpdateName} placeholder='Ajouter le nom ici ...' value={name || ''} onChange={(e) => setName(e.target.value)} className="w-full resize-none text-lg focus:outline-none placeholder:text-lg  " /></div>
      <div className="text-xs"><Textarea value={note || ''} placeholder='Ajouter une description ici ...' onBlur={handleUpdateNote} onChange={(e) => setNote(e.target.value)} className="w-full resize-none text-sm placeholder:text-sm  focus:outline-none" /></div>
     
      {/*<TagList tags={pin.tags} /> */}
      <TagEditor tags={tags}  onChange={handleUpdateTags} />
      <div className='flex flex-row gap-2 items-center'> 
       <IntervenantDatePicker />
      </div>
      </div>
      <Timeline pin={selectedPin} />
    </div>
  );
}