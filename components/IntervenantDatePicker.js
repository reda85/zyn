import { useEffect, useState, useRef } from 'react';
import { Combobox } from '@headlessui/react';
import { XIcon, User2Icon, CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { supabase } from '@/utils/supabase/client';
import { usePinsCache } from '@/hooks/usePins';
import { backendFetch } from '@/lib/backend';
import clsx from 'clsx';
import { useUserData } from '@/hooks/useUserData';
import { GeistMono } from 'geist/font/mono';

export default function IntervenantDatePicker({ pin }) {
  const [selectedIntervenant, setSelectedIntervenant] = useState(
    pin?.assigned_to || null
  );
  const [query, setQuery]               = useState('');
  const [isEditing, setIsEditing]       = useState(false);
  const [isPickingDate, setIsPickingDate] = useState(false);
  const [allOptions, setAllOptions]     = useState([{ id: 0, name: 'Aucun intervenant', email: '' }]);
  const { patchPin }                    = usePinsCache();
  const selectedPin                     = pin;
  const { profile }                     = useUserData();

  const [selectedDate, setSelectedDate] = useState(
    pin?.due_date ? new Date(pin.due_date) : null
  );

  const prevPinIdRef             = useRef(pin?.id);
  const previousIntervenantIdRef = useRef(pin?.assigned_to?.id ?? null);
  const isFirstMountRef          = useRef(true);
  const isInitializingRef        = useRef(false);

  const isOverDue = selectedDate ? selectedDate < new Date() : false;
  const isGuest   = profile?.role === 'guest';

  useEffect(() => {
    if (pin?.project_id) getAllIntervenants();
  }, [pin?.project_id]);

  useEffect(() => {
    if (pin?.id === prevPinIdRef.current) return;
    prevPinIdRef.current = pin?.id;

    isInitializingRef.current = true;
    previousIntervenantIdRef.current = pin?.assigned_to?.id ?? null;
    setSelectedIntervenant(pin?.assigned_to || null);
    setSelectedDate(pin?.due_date ? new Date(pin.due_date) : null);
  }, [pin?.id]);

  const getAllIntervenants = async () => {
    const { data, error } = await supabase
      .from('members_projects')
      .select('members(*)')
      .eq('project_id', pin?.project_id);
    if (data) {
      const members = data.map(item => item.members).filter(Boolean);
      setAllOptions([{ id: 0, name: 'Aucun intervenant', email: '' }, ...members]);
    }
    if (error) console.error('Error fetching project members:', error);
  };

  const filteredIntervenants =
    query === ''
      ? allOptions
      : allOptions.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));

  const getInitials = name =>
    name.split(' ').map(part => part[0]).join('').toUpperCase();

  const handleSelect = (value) => {
    if (isGuest) return;
    setSelectedIntervenant(value?.id === 0 ? null : value);
    setIsEditing(false);
    setQuery('');
  };

  const updateAssignedIntervenant = async (intervenant) => {
    if (isGuest) return;
    const { data, error } = await supabase
      .from('pdf_pins')
      .update({ assigned_to: intervenant?.id ?? null , updated_by: profile?.id || null, updated_at: new Date().toISOString() })
      .eq('id', selectedPin.id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (data) {
      // Lien direct vers la tâche dans la liste des tâches du projet.
      const organizationId = selectedPin.projects?.organization_id;
      const taskLink = organizationId
        ? `${window.location.origin}/${organizationId}/projects/${selectedPin.project_id}/tasks#pin-${selectedPin.id}`
        : window.location.origin;

      try {
        await fetch('/api/send-task-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deepLink: taskLink,
            taskId: selectedPin.id, projectId: selectedPin.project_id,
            assignedBy: profile?.name, assignedUserEmail: intervenant.email,
            assignedUserName: intervenant.name, dueDate: selectedPin.due_date,
            taskName: selectedPin?.name || 'Sans nom',
          }),
        });
      } catch (e) { console.error('email notif error', e); }

      try {
        await backendFetch('/api/pins/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deepLink: taskLink,
            pinId: selectedPin.id, projectId: selectedPin.project_id,
            assignedByName: profile?.name || 'user',
            assignedUserEmail: intervenant.email,
            assignedUserName: intervenant.name,
            assignedToUserId: intervenant.auth_id,
            dueDate: selectedPin.due_date,
            taskName: selectedPin?.name || 'Sans nom',
          }),
        });
      } catch (e) { console.error('push notif error', e); }

      const assignedObj = intervenant?.id === 0
        ? null
        : { id: intervenant.id, name: intervenant.name, email: intervenant.email, auth_id: intervenant.auth_id };

      patchPin(selectedPin.id, { assigned_to: assignedObj });
    }
    if (error) console.error('updateAssignedIntervenant error:', error);
  };

  useEffect(() => {
    if (isFirstMountRef.current) { isFirstMountRef.current = false; return; }
    if (isInitializingRef.current) { isInitializingRef.current = false; return; }

    const currentId  = selectedIntervenant?.id ?? null;
    const hasChanged = currentId !== previousIntervenantIdRef.current;
    if (hasChanged && currentId !== 0 && currentId !== null) {
      updateAssignedIntervenant(selectedIntervenant);
      previousIntervenantIdRef.current = currentId;
    }
  }, [selectedIntervenant]);

  const updateDueDate = async (date) => {
    if (isGuest) return;
    const { data, error } = await supabase
      .from('pdf_pins')
      .update({ due_date: date, updated_by: profile?.id || null, updated_at: new Date().toISOString() })
      .eq('id', selectedPin.id)
      .select('*')
      .single();

    if (data) {
      setSelectedDate(date);
      patchPin(selectedPin.id, { due_date: data.due_date });
    }
    if (error) console.error('updateDueDate error:', error);
  };

  const displayText = selectedIntervenant?.name || 'Assigner intervenant';

  const IconCircle = ({ children }) => (
    <div className="w-6 h-6 rounded-full bg-white border border-[#e5e5e2] flex items-center justify-center">
      {children}
    </div>
  );

  return (
    <div className="flex flex-row text-[13px] gap-4 items-center">
      {/* Combobox */}
      <div className="w-56 relative">
        <Combobox value={selectedIntervenant} onChange={handleSelect} disabled={isGuest}>
          {({ open }) => (
            <div className="relative w-full">
              {isEditing && !isGuest ? (
                <>
                  <div className="relative">
                    <Combobox.Input
                      autoFocus
                      className="w-full border border-[#e5e5e2] rounded-[4px] px-3 py-2 pl-10 pr-10 focus:outline-none focus:border-[#0d0d0c] bg-[#f5f5f4] hover:bg-[#eeeeec] text-[#0d0d0c] placeholder:text-[#b8b8b3] transition-colors"
                      onChange={e => setQuery(e.target.value)}
                      onFocus={() => setQuery('')}
                      displayValue={() => query || selectedIntervenant?.name || ''}
                      placeholder="Ajouter un intervenant..."
                    />
                    <div className="absolute left-2 top-1/2 -translate-y-1/2">
                      <IconCircle><User2Icon size={13} className="text-[#4a4a46]" /></IconCircle>
                    </div>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8a8a84] hover:text-[#0d0d0c] transition-colors"
                      onClick={() => { setSelectedIntervenant(null); setQuery(''); setIsEditing(false); }}
                    >
                      <IconCircle><XIcon size={13} className="text-[#4a4a46]" /></IconCircle>
                    </button>
                  </div>
                  {open && (
                    <Combobox.Options className="absolute mt-2 w-full bg-white shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] rounded-[4px] max-h-60 overflow-auto z-10 border border-[#e5e5e2] py-1">
                      {filteredIntervenants.map(person => (
                        <Combobox.Option
                          key={person.id}
                          value={person}
                          className={({ active }) =>
                            clsx('flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors', active && 'bg-[#f5f5f4]')
                          }
                        >
                          {person.id === 0 ? (
                            <span className="text-[#8a8a84] italic text-[13px]">Aucun intervenant</span>
                          ) : (
                            <>
                              <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-[11px] font-medium text-[#0d0d0c]">
                                {getInitials(person.name)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-[#0d0d0c] text-[13px]">{person.name}</span>
                                <span className="text-[#8a8a84] text-[11px]">{person.email}</span>
                              </div>
                            </>
                          )}
                        </Combobox.Option>
                      ))}
                    </Combobox.Options>
                  )}
                </>
              ) : (
                <Combobox.Button
                  as="button"
                  disabled={isGuest}
                  className={clsx(
                    'w-full border border-[#e5e5e2] rounded-[4px] px-3 py-2 pl-10 text-left transition-colors relative text-[13px] font-medium',
                    isGuest
                      ? 'bg-[#f5f5f4] cursor-not-allowed opacity-70 text-[#8a8a84]'
                      : 'bg-[#f5f5f4] hover:bg-[#eeeeec] text-[#0d0d0c] cursor-pointer'
                  )}
                  onClick={() => { if (!isGuest) { setIsEditing(true); setTimeout(() => setQuery(''), 0); } }}
                >
                  {displayText}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2">
                    <IconCircle><User2Icon size={13} className="text-[#4a4a46]" /></IconCircle>
                  </div>
                </Combobox.Button>
              )}
            </div>
          )}
        </Combobox>
      </div>

      {/* DatePicker */}
      <div className="w-48 relative">
        {isPickingDate && !isGuest ? (
          <DatePicker
            selected={selectedDate}
            onChange={date => { setIsPickingDate(false); updateDueDate(date); }}
            onBlur={() => setIsPickingDate(false)}
            autoFocus
            className={clsx('w-full border border-[#e5e5e2] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#0d0d0c] bg-[#f5f5f4] hover:bg-[#eeeeec] text-[#0d0d0c]', GeistMono.className)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Sélectionner une date"
          />
        ) : (
          <div className="relative w-full">
            <button
              type="button"
              disabled={isGuest}
              className={clsx(
                'w-full border rounded-[4px] px-3 py-2 pl-10 text-left relative transition-colors text-[13px] font-medium',
                GeistMono.className,
                isGuest
                  ? 'bg-[#f5f5f4] cursor-not-allowed opacity-70 border-[#e5e5e2] text-[#8a8a84]'
                  : isOverDue
                    ? 'border-[#f5c6c6] text-[#9c1b1b] bg-[#fde8e8] hover:bg-[#fbdbdb] cursor-pointer'
                    : 'border-[#e5e5e2] text-[#0d0d0c] bg-[#f5f5f4] hover:bg-[#eeeeec] cursor-pointer'
              )}
              onClick={() => { if (!isGuest) setIsPickingDate(true); }}
            >
              {selectedDate ? selectedDate.toLocaleDateString('fr-FR') : 'Ajouter échéance'}
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
                <IconCircle><CalendarIcon size={13} className={isOverDue ? 'text-[#dc2626]' : 'text-[#4a4a46]'} /></IconCircle>
              </div>
            </button>

            {selectedDate && !isGuest && (
              <button
                type="button"
                className={clsx(
                  'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                  isOverDue ? 'text-[#dc2626] hover:text-[#9c1b1b]' : 'text-[#8a8a84] hover:text-[#dc2626]'
                )}
                onClick={e => { e.stopPropagation(); updateDueDate(null); }}
              >
                <IconCircle><XIcon size={13} className="text-[#4a4a46]" /></IconCircle>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}