import { useEffect, useState, useRef } from 'react';
import { Combobox } from '@headlessui/react';
import { XIcon, User2Icon, CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { supabase } from '@/utils/supabase/client';
import { useAtom } from 'jotai';
import { pinsAtom, selectedPinAtom } from '@/store/atoms';
import clsx from 'clsx';
import { useUserData } from '@/hooks/useUserData';

export default function IntervenantDatePicker({ pin }) {
  const [selectedIntervenant, setSelectedIntervenant] = useState(
    pin?.assigned_to || null
  );
  const [query, setQuery]               = useState('');
  const [isEditing, setIsEditing]       = useState(false);
  const [isPickingDate, setIsPickingDate] = useState(false);
  const [allOptions, setAllOptions]     = useState([{ id: 0, name: 'Aucun intervenant', email: '' }]);
  const [, setPins]                     = useAtom(pinsAtom);
  const [selectedPin, setSelectedPin]   = useAtom(selectedPinAtom);
  const { user, profile }               = useUserData();

  const [selectedDate, setSelectedDate] = useState(
    pin?.due_date ? new Date(pin.due_date) : null
  );

  // Track previous pin id to detect actual pin switches (not field updates)
  const prevPinIdRef             = useRef(pin?.id);
  const previousIntervenantIdRef = useRef(pin?.assigned_to?.id ?? null);
  const isFirstMountRef          = useRef(true);
  const isInitializingRef        = useRef(false);

  const isOverDue = selectedDate ? selectedDate < new Date() : false;
  const isGuest   = profile?.role === 'guest';

  useEffect(() => {
    if (pin?.project_id) getAllIntervenants();
  }, [pin?.project_id]);

  // Only reset local state when the pin ID actually changes (drawer switches to another pin)
  // NOT when fields like assigned_to or due_date update — those are handled optimistically below
  useEffect(() => {
    if (pin?.id === prevPinIdRef.current) return;  // same pin, skip
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
      .update({ assigned_to: intervenant?.id ?? null })
      .eq('id', selectedPin.id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (data) {
      try {
        await fetch('/api/send-task-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deepLink: `https://zaynspace.com/task/${selectedPin.id}`,
            taskId: selectedPin.id, projectId: selectedPin.project_id,
            assignedBy: user.name, assignedUserEmail: intervenant.email,
            assignedUserName: intervenant.name, dueDate: selectedPin.due_date,
            taskName: selectedPin?.name || 'Sans nom',
          }),
        });
      } catch (e) { console.error('email notif error', e); }

      try {
        await fetch('https://zaynbackend-production.up.railway.app/api/pins/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deepLink: `https://zaynspace.com/task/${selectedPin.id}`,
            pinId: selectedPin.id, projectId: selectedPin.project_id,
            assignedByName: user?.name || 'user',
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
        : { id: intervenant.id, name: intervenant.name };

      // Update pinsAtom — no setSelectedPin to avoid re-render cascade
      setPins(prev => prev.map(p =>
        p.id === selectedPin.id ? { ...p, assigned_to: assignedObj } : p
      ));
    }
    if (error) console.error('updateAssignedIntervenant error:', error);
  };

  // Fire only on real user-driven intervenant changes
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
      .update({ due_date: date })
      .eq('id', selectedPin.id)
      .select('*')
      .single();

    if (data) {
      setSelectedDate(date);
      // Update pinsAtom only — no setSelectedPin to avoid re-render cascade
      setPins(prev => prev.map(p =>
        p.id === selectedPin.id ? { ...p, due_date: date } : p
      ));
    }
    if (error) console.error('updateDueDate error:', error);
  };

  const displayText = selectedIntervenant?.name || 'Assigner intervenant';

  const IconCircle = ({ children }) => (
    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm">
      {children}
    </div>
  );

  return (
    <div className="flex flex-row text-sm gap-4 items-center">
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
                      className="w-full border border-border/50 rounded-lg px-3 py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-muted hover:bg-muted/80 text-gray-800 placeholder:text-muted-foreground transition-all"
                      onChange={e => setQuery(e.target.value)}
                      onFocus={() => setQuery('')}
                      displayValue={() => query || selectedIntervenant?.name || ''}
                      placeholder="Ajouter un intervenant..."
                    />
                    <div className="absolute left-2 top-1/2 -translate-y-1/2">
                      <IconCircle><User2Icon size={14} className="text-gray-800" /></IconCircle>
                    </div>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-800 transition-colors"
                      onClick={() => { setSelectedIntervenant(null); setQuery(''); setIsEditing(false); }}
                    >
                      <IconCircle><XIcon size={14} className="text-gray-800" /></IconCircle>
                    </button>
                  </div>
                  {open && (
                    <Combobox.Options className="absolute mt-2 w-full bg-card shadow-lg rounded-lg max-h-60 overflow-auto z-10 border border-border/50 py-1">
                      {filteredIntervenants.map(person => (
                        <Combobox.Option
                          key={person.id}
                          value={person}
                          className={({ active }) =>
                            `flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${active ? 'bg-secondary/50' : ''}`
                          }
                        >
                          {person.id === 0 ? (
                            <span className="text-muted-foreground italic text-sm">Aucun intervenant</span>
                          ) : (
                            <>
                              <div className="w-8 h-8 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                                {getInitials(person.name)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800 text-sm">{person.name}</span>
                                <span className="text-muted-foreground text-xs">{person.email}</span>
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
                    'w-full border border-border/50 rounded-lg px-3 py-2 pl-10 text-left transition-all relative text-sm font-medium',
                    isGuest
                      ? 'bg-muted/70 cursor-not-allowed opacity-80 text-muted-foreground'
                      : 'bg-muted hover:bg-muted/80 text-gray-800 cursor-pointer'
                  )}
                  onClick={() => { if (!isGuest) { setIsEditing(true); setTimeout(() => setQuery(''), 0); } }}
                >
                  {displayText}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-800">
                    <IconCircle><User2Icon size={14} className="text-gray-800" /></IconCircle>
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
            className="w-full border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-muted hover:bg-muted/80 text-gray-800"
            dateFormat="dd/MM/yyyy"
            placeholderText="Sélectionner une date"
          />
        ) : (
          <div className="relative w-full">
            <button
              type="button"
              disabled={isGuest}
              className={clsx(
                'w-full border rounded-lg px-3 py-2 pl-10 text-left relative transition-all text-sm font-medium',
                isGuest
                  ? 'bg-muted/70 cursor-not-allowed opacity-80 border-border/50 text-muted-foreground'
                  : isOverDue
                    ? 'border-destructive text-destructive bg-red-50 hover:bg-red-50/80 cursor-pointer'
                    : 'border-border/50 text-gray-800 bg-muted hover:bg-muted/80 cursor-pointer'
              )}
              onClick={() => { if (!isGuest) setIsPickingDate(true); }}
            >
              {selectedDate ? selectedDate.toLocaleDateString('fr-FR') : 'Ajouter échéance'}
              <div className={clsx('absolute left-2 top-1/2 -translate-y-1/2', isOverDue ? 'text-destructive' : 'text-gray-800')}>
                <IconCircle><CalendarIcon size={14} className="text-gray-800" /></IconCircle>
              </div>
            </button>

            {selectedDate && !isGuest && (
              <button
                type="button"
                className={clsx(
                  'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                  isOverDue ? 'text-destructive hover:text-destructive/80 bg-red-50' : 'text-muted-foreground hover:text-destructive'
                )}
                onClick={e => { e.stopPropagation(); updateDueDate(null); }}
              >
                <IconCircle><XIcon size={14} className="text-gray-800" /></IconCircle>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}