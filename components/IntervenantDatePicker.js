import { useEffect, useState } from 'react';
import { Combobox } from '@headlessui/react';
import { XIcon, User2Icon, CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { supabase } from '@/utils/supabase/client';
import { useAtom } from 'jotai';
import { pinsAtom, selectedPinAtom } from '@/store/atoms';

const intervenants = [
  { id: 1, name: 'Alice Dupont', email: 'alice@example.com' },
  { id: 2, name: 'Jean Martin', email: 'jean@example.com' },
  { id: 3, name: 'Claire Bernard', email: 'claire@example.com' },
];

export default function IntervenantDatePicker() {
  const [selectedIntervenant, setSelectedIntervenant] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [isPickingDate, setIsPickingDate] = useState(false);
  const [allOptions, setAllOptions] = useState([{ id: 0, name: 'Aucun intervenant', email: '' }]);
  const [pins, setPins] = useAtom(pinsAtom)
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)

  //const allOptions = [{ id: 0, name: 'Aucun intervenant', email: '' }, ...intervenants];

  useEffect(() => {
    getAllIntervenants()
  }, [])

  const getAllIntervenants = async () => {
    const { data,error } = await supabase.from('members').select('*')
    if (data) {
      console.log('getAllIntervenants', data)
      setAllOptions([{ id: 0, name: 'Aucun intervenant', email: '' }, ...data])
    }
  }

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
    const { data, error } = await supabase.from('pdf_pins').update({ assigned_to: intervenant?.id }).eq('id', selectedPin.id).select('*').single()
    if (data) {
      console.log('updateAssignedIntervenant', data)
      setSelectedIntervenant(intervenant);
      setPins(pins.map((p) => p.id === selectedPin.id ? {...p, intervenant_id: intervenant.id} : p))
    }
    if (error) {
      console.log('updateAssignedIntervenant', error)
    }
  }

  useEffect(() => {
    console.log('selectedIntervenant', selectedIntervenant)
    if (selectedIntervenant?.id !== 0 && selectedIntervenant?.id !== null) {updateAssignedIntervenant(selectedIntervenant)}
  }, [selectedIntervenant])

  useEffect(() => {
    if(selectedDate) {updateDueDate(selectedDate)}
  }, [selectedDate])

  const updateDueDate = async (date) => {
    const { data, error } = await supabase.from('pdf_pins').update({ due_date: date }).eq('id', selectedPin.id).select('*').single()
    if (data) {
      console.log('updateDueDate', data)
      setSelectedDate(date);
      setPins(pins.map((p) => p.id === selectedPin.id ? {...p, due_date: date} : p))
    }
    if (error) {
      console.log('updateDueDate', error)
    }
  }

  const displayText = selectedIntervenant?.name || 'Assigner intervenant';

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
                      className="w-full border rounded px-3 py-2 pl-10 pr-10 focus:outline-none bg-gray-100"
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setQuery('')} // Show all
                      displayValue={() =>
                        query || selectedIntervenant?.name || ''
                      }
                      placeholder="Ajouter un intervenant..."
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white text-gray-800 pointer-events-none">
                      <User2Icon size={16} />
                    </div>
                    <button
                      type="button"
                      className="absolute  right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        setSelectedIntervenant(null);
                        setQuery('');
                        setIsEditing(false);
                      }}
                    >
                      <XIcon size={16} />
                    </button>
                  </div>
                  {open && (
                    <Combobox.Options className="absolute mt-1 w-full bg-white shadow-lg max-h-60 overflow-auto z-10 border rounded text-sm">
                      {filteredIntervenants.map((person) => (
                        <Combobox.Option
                          key={person.id}
                          value={person}
                          className={({ active }) =>
                            `flex items-center gap-3 px-4 py-2 cursor-pointer ${
                              active ? 'bg-blue-100' : ''
                            }`
                          }
                        >
                          {person.id === 0 ? (
                            <span className="text-gray-600 italic">
                              Aucun intervenant
                            </span>
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-xs font-semibold text-blue-900">
                                {getInitials(person.name)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">
                                  {person.name}
                                </span>
                                <span className="text-gray-500 text-xs">
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
                  className="w-full border rounded px-3 py-2 pl-10 text-left bg-gray-100 hover:bg-blue-100 relative"
                  onClick={() => {
                    setIsEditing(true);
                    setTimeout(() => setQuery(''), 0);
                  }}
                >
                  {displayText}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-gray-800 rounded-full bg-white">
                    <User2Icon size={16} />
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
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
            dateFormat="dd/MM/yyyy"
            placeholderText="Sélectionner une date"
          />
        ) : (
          <button
            type="button"
            className="w-full border rounded px-3 py-2 pl-10 text-left border-gray-300 bg-gray-100 relative"
            onClick={() => setIsPickingDate(true)}
          >
            {selectedDate
              ? selectedDate.toLocaleDateString('fr-FR')
              : 'Ajouter échéance'}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800">
              <CalendarIcon size={16} />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
