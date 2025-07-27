'use client';
import { useEffect, useState } from 'react';
import { Switch } from '@headlessui/react';
import { supabase } from '@/utils/supabase/client';

export default function StatusFilter({ activeStatuses, setActiveStatuses }) {
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    const fetchStatuses = async () => {
      const { data, error } = await supabase.from('Status').select('*');
      if (error) console.error('Erreur de récupération des statuts', error);
      else setStatuses(data);
    };
    fetchStatuses();
  }, []);

  const toggleStatus = (statusId) => {
    setActiveStatuses((prev) =>
      prev.includes(statusId)
        ? prev.filter((id) => id !== statusId)
        : [...prev, statusId]
    );
  };

  return (
    <div className="px-4 mb-4">
       <div className="space-y-2 bg-stone-100 border border-gray-300 p-2 rounded">
       
        {statuses.map((status) => (
          <div
            key={status.id}
            className="flex items-center justify-between bg-stone-100  w-full"
          >
            <span className="text-xs text-gray-700 font-semibold capitalize">{status.name}</span>
            <Switch
              checked={activeStatuses.includes(status.id)}
              onChange={() => toggleStatus(status.id)}
              className={`${
                activeStatuses.includes(status.id) ? 'bg-blue-600' : 'bg-gray-300'
              } relative inline-flex h-5 w-9 items-center rounded-full transition`}
            >
              <span
                className={`${
                  activeStatuses.includes(status.id) ? 'translate-x-5' : 'translate-x-1'
                } inline-block h-3 w-3 transform bg-white rounded-full transition`}
              />
            </Switch>
          </div>
        ))}
      </div>
    </div>
   
  );
}
