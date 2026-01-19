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

const intervenants = [
  { id: 1, name: 'Alice Dupont', email: 'alice@example.com' },
  { id: 2, name: 'Jean Martin', email: 'jean@example.com' },
  { id: 3, name: 'Claire Bernard', email: 'claire@example.com' },
];

export default function IntervenantDatePicker({ pin }) {
  const [selectedIntervenant, setSelectedIntervenant] = useState(null);
  const [query, setQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isPickingDate, setIsPickingDate] = useState(false);
  const [allOptions, setAllOptions] = useState([{ id: 0, name: 'Aucun intervenant', email: '' }]);
  const [pins, setPins] = useAtom(pinsAtom);
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom);
  const {user, profile, organization} = useUserData();

  const [selectedDate, setSelectedDate] = useState(
    pin?.due_date ? new Date(pin?.due_date) : null
  );

  // Utiliser une ref pour suivre l'ID de l'intervenant précédent
  const previousIntervenantIdRef = useRef(pin?.assigned_to);

  console.log('pin props', selectedDate);
  
  const isOverDue = selectedDate
  ? selectedDate < new Date()
  : false;


  useEffect(() => {
    getAllIntervenants();
  }, []);

  useEffect(() => {
    setSelectedPin(pin);
    setSelectedIntervenant(pin.assigned_to || null);
    setSelectedDate(pin.due_date ? new Date(pin.due_date) : null);
    // Mettre à jour la ref avec l'ID actuel
    previousIntervenantIdRef.current = pin?.assigned_to;
  }, [pin]);

  useEffect(() => {
    if (selectedDate) {
      updateDueDate(selectedDate);
     
    }
  }, [selectedDate]);

  const getAllIntervenants = async () => {
    const { data, error } = await supabase.from('members').select('*');
    if (data) {
      console.log('getAllIntervenants', data);
      setAllOptions([{ id: 0, name: 'Aucun intervenant', email: '' }, ...data]);
    }
  };

  const filteredIntervenants =
    query === ''
      ? allOptions
      : allOptions.filter((i) =>
          i.name.toLowerCase().includes(query?.toLowerCase())
        );

  const getInitials = (name) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();

  const handleSelect = (value) => {
    if (value?.id === 0) {
      setSelectedIntervenant(null);
    } else {
      setSelectedIntervenant(value);
    }
    setIsEditing(false);
    setQuery('');
  };

  const updateAssignedIntervenant = async (intervenant) => {
    const { data, error } = await supabase
      .from('pdf_pins')
      .update({ assigned_to: intervenant?.id })
      .eq('id', selectedPin.id)
      .is('deleted_at', null)
      .select('*')
      .single();
    if (data) {
      
   
      console.log('updateAssignedIntervenant', data);
      const response = await fetch('/api/send-task-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deepLink: `https://zaynspace.com/task/${selectedPin.id}`,
          taskId: selectedPin.id,
          projectId: selectedPin.project_id,
          assignedBy: user.name,
          assignedUserEmail: intervenant.email,
          assignedUserName: intervenant.name,
           dueDate: selectedPin.due_date,
           taskName: selectedPin?.name || 'Sans nom',
        })
      })

      const result = await response.json()

       if (response.ok) {
      console.log('✅ Email sent successfully:', result);
      
    } else {
      console.error('❌ Error sending email:', result);
      
    }

    //notification
    console.log('notification');
     const response2 = await fetch('https://zaynbackend-production.up.railway.app/api/pins/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deepLink: `https://zaynspace.com/task/${selectedPin.id}`,
          pinId: selectedPin.id,
          projectId: selectedPin.project_id,
          assignedByName: user?.name || 'user',
          assignedUserEmail: intervenant.email,
          assignedUserName: intervenant.name,
          assignedToUserId: intervenant.auth_id,
           dueDate: selectedPin.due_date,
           taskName: selectedPin?.name || 'Sans nom',
        })
      })

      const result2 = await response2.json()

       if (response2.ok) {
      console.log('✅ notification sent successfully:', result2);
     
    } else {
      console.error('❌ Error sending notification:', result2);
      
    }


      setSelectedIntervenant(intervenant);
      console.log('setPins10')
     setPins(prevPins => {
  if (!prevPins?.length) return prevPins;

  return prevPins.map(p =>
    p.id === selectedPin.id
      ? { ...p, intervenant_id: intervenant.id }
      : p
  );
});

    }
    if (error) {
      console.log('updateAssignedIntervenant', error);
    }
  };

  useEffect(() => {
    console.log('selectedIntervenant', selectedIntervenant);
    
    // Vérifier si l'intervenant a réellement changé
    const hasIntervenantChanged = selectedIntervenant?.id !== previousIntervenantIdRef.current;
    
    if (hasIntervenantChanged && selectedIntervenant?.id !== 0 && selectedIntervenant?.id !== null) {
      updateAssignedIntervenant(selectedIntervenant);
      // Mettre à jour la ref après l'envoi de la notification
      previousIntervenantIdRef.current = selectedIntervenant.id;
    }
  }, [selectedIntervenant]);

  useEffect(() => {
    if (selectedDate) {
      updateDueDate(selectedDate);
    }
  }, [selectedDate]);

  const updateDueDate = async (date) => {
    const { data, error } = await supabase
      .from('pdf_pins')
      .update({ due_date: date })
      .eq('id', selectedPin.id)
      .select('*')
      .single();
    if (data) {
      console.log('updateDueDate', data);
      setSelectedDate(date);
      console.log('setPins11')
     setPins(prevPins => {
  if (!prevPins?.length) return prevPins;

  return prevPins.map(p =>
    p.id === selectedPin.id
      ? { ...p, due_date: date }
      : p
  );
});


    }
    if (error) {
      console.log('updateDueDate', error);
    }
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
        <Combobox value={selectedIntervenant} onChange={handleSelect}>
          {({ open }) => (
            <div className="relative w-full">
              {isEditing ? (
                <>
                  <div className="relative">
                    <Combobox.Input
                      autoFocus
                      className="w-full border border-border/50 rounded-lg px-3 py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-muted hover:bg-muted/80 text-foreground placeholder:text-muted-foreground transition-all"
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setQuery('')}
                      displayValue={() => query || selectedIntervenant?.name || ''}
                      placeholder="Ajouter un intervenant..."
                    />
                  <div className="absolute left-2  top-1/2 -translate-y-1/2">
  <IconCircle>
    <User2Icon size={14} className="text-foreground" />
  </IconCircle>
</div>
                    <button
                      type="button"
                      className="absolute right-2  top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        setSelectedIntervenant(null);
                        setQuery('');
                        setIsEditing(false);
                      }}
                    >
                      <IconCircle>
                      <XIcon size={14} className="text-foreground" />
                      </IconCircle>
                    </button>
                  </div>
                  {open && (
                    <Combobox.Options className="absolute mt-2 w-full bg-card shadow-lg rounded-lg max-h-60 overflow-auto z-10 border border-border/50 py-1">
                      {filteredIntervenants.map((person) => (
                        <Combobox.Option
                          key={person.id}
                          value={person}
                          className={({ active }) =>
                            `flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                              active ? 'bg-secondary/50' : ''
                            }`
                          }
                        >
                          {person.id === 0 ? (
                            <span className="text-muted-foreground italic text-sm">
                              Aucun intervenant
                            </span>
                          ) : (
                            <>
                              <div className="w-8 h-8 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                                {getInitials(person.name)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground text-sm">
                                  {person.name}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {person.email}
                                </span>
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
                  className="w-full border  border-border/50 rounded-lg px-3 py-2 pl-10 text-left bg-muted hover:bg-muted/80 transition-all relative text-sm font-medium text-foreground"
                  onClick={() => {
                    setIsEditing(true);
                    setTimeout(() => setQuery(''), 0);
                  }}
                >
                  {displayText}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2  text-foreground">
                  <IconCircle>
                    <User2Icon size={14} className="text-foreground " />
                  </IconCircle>
                  </div>
                </Combobox.Button>
              )}
            </div>
          )}
        </Combobox>
      </div>

      {/* DatePicker */}
      <div className="w-48 relative">
        {isPickingDate ? (
          <DatePicker
            selected={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              setIsPickingDate(false);
            }}
            onBlur={() => setIsPickingDate(false)}
            autoFocus
            className="w-full border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-muted hover:bg-muted/80 text-foreground"
            dateFormat="dd/MM/yyyy"
            placeholderText="Sélectionner une date"
          />
        ) : (
          <div className="relative w-full">
            <button
              type="button"
              className={clsx(
                'w-full border rounded-lg px-3 py-2 pl-10 text-left bg-muted hover:bg-muted/80 relative transition-all text-sm font-medium',
                isOverDue ? 'border-destructive text-destructive bg-red-50' : 'border-border/50 text-foreground '
              )}
              onClick={() => setIsPickingDate(true)}
            >
              {selectedDate
                ? selectedDate.toLocaleDateString('fr-FR')
                : 'Ajouter échéance'}

              <div
                className={clsx(
                  'absolute left-2 top-1/2 -translate-y-1/2',
                  isOverDue ? 'text-destructive' : 'text-foreground'
                )}
              >
                <IconCircle>
                  <CalendarIcon size={14} className="text-foreground" />
                </IconCircle>
              </div>
            </button>

            {selectedDate && (
              <button
                type="button"
                className={clsx(
                  'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                  isOverDue
                    ? 'text-destructive hover:text-destructive/80 bg-red-50'
                    : 'text-muted-foreground hover:text-destructive'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDate(null);
                  updateDueDate(null);
                }}
              >
                <IconCircle>
                  <XIcon size={14} className="text-foreground" />
                </IconCircle>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}