'use client';
import { Switch } from '@headlessui/react';
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, X } from 'lucide-react';

const suggestions = ['Aujourd\'hui', 'Cette semaine', 'Ce mois-ci'];

export default function DateFilter({ active, onToggle, tags, setTags }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const addTag = (tag) => {
    if (!tags.includes(tag)) setTags([...tags, tag]);
    setShowDropdown(false);
  };

  const addCustomDateRange = () => {
    if (startDate) {
      const dateStr = endDate 
        ? `${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`
        : startDate.toLocaleDateString('fr-FR');
      
      if (!tags.includes(dateStr)) {
        setTags([...tags, dateStr]);
      }
      setStartDate(null);
      setEndDate(null);
      setShowDatePicker(false);
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between bg-neutral-100 border border-border/50 p-3 rounded-xl">
        <span className="text-foreground text-sm font-semibold">
          Filtrer par date
        </span>
        <Switch
          checked={active}
          onChange={onToggle}
          className={`${
            active ? 'bg-primary' : 'bg-muted'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2`}
        >
          <span
            className={`${
              active ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform bg-white rounded-full transition-transform shadow-sm`}
          />
        </Switch>
      </div>

      {active && (
        <div className="mt-3 space-y-3">
          {/* Tags affichés */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full border border-primary/20 font-medium"
                >
                  {tag}
                  <button 
                    onClick={() => removeTag(tag)} 
                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Boutons de sélection */}
          <div className="flex flex-wrap gap-2">
            {/* Suggestions rapides */}
            {suggestions
              .filter((s) => !tags.includes(s))
              .map((s) => (
                <button
                  key={s}
                  onClick={() => addTag(s)}
                  className="px-3 py-1.5 text-sm bg-secondary/50 text-foreground rounded-lg border border-border/50 hover:bg-secondary/80 hover:border-primary/20 transition-all font-medium"
                >
                  {s}
                </button>
              ))}

            {/* Bouton date personnalisée */}
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-3 py-1.5 text-sm bg-secondary/50 text-foreground rounded-lg border border-border/50 hover:bg-secondary/80 hover:border-primary/20 transition-all font-medium flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Date personnalisée
            </button>
          </div>

          {/* Date Picker */}
          {showDatePicker && (
            <div className="p-4 bg-card border border-border/50 rounded-xl shadow-sm">
              <p className="text-sm font-medium text-foreground mb-3">
                Sélectionner une période
              </p>
              
              <div className="space-y-3">
                <DatePicker
                  selectsRange
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => {
                    const [start, end] = update;
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  inline
                  dateFormat="dd/MM/yyyy"
                  locale="fr"
                  className="w-full"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setStartDate(null);
                      setEndDate(null);
                      setShowDatePicker(false);
                    }}
                    className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={addCustomDateRange}
                    disabled={!startDate}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}