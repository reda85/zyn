'use client';
import { Switch } from '@headlessui/react';
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, X } from 'lucide-react';
import { GeistSans } from 'geist/font/sans';
import clsx from 'clsx';
import { DATE_PRESETS, dateRangeToken, dateTokenLabel } from '@/lib/data/pinFilters';

// `tags` contient des jetons : 'today' | 'week' | 'month' | 'AAAA-MM-JJ..AAAA-MM-JJ'.
const suggestions = Object.keys(DATE_PRESETS);

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
      const dateStr = dateRangeToken(startDate, endDate);

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
    <div className={clsx("px-4 mb-4", GeistSans.className)}>
      <div className="flex items-center justify-between bg-[#f5f5f4] border border-[#e5e5e2] p-3 rounded-[4px]">
        <span className="text-[13px] text-[#0d0d0c]">
          Filtrer par date
        </span>
        <Switch
          checked={active}
          onChange={onToggle}
          className={clsx(
            active ? 'bg-[#0d0d0c]' : 'bg-[#d6d6d2]',
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,94,224,0.22)]'
          )}
        >
          <span
            className={clsx(
              active ? 'translate-x-[18px]' : 'translate-x-[3px]',
              'inline-block h-3.5 w-3.5 transform bg-white rounded-full transition-transform shadow-[0_1px_2px_rgba(15,15,15,0.08)]'
            )}
          />
        </Switch>
      </div>

      {active && (
        <div className="mt-3 space-y-3">
          {/* Tags affichés */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] bg-[#e6eeff] text-[#1e3a8a] rounded-[3px] border border-[#c5d6fb] font-medium"
                >
                  {dateTokenLabel(tag)}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:bg-[#dbe7fe] rounded-[2px] p-0.5 transition-colors text-[#264dc2]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Boutons de sélection */}
          <div className="flex flex-wrap gap-1.5">
            {/* Suggestions rapides */}
            {suggestions
              .filter((s) => !tags.includes(s))
              .map((s) => (
                <button
                  key={s}
                  onClick={() => addTag(s)}
                  className="px-2.5 py-1.5 text-[13px] bg-white text-[#0d0d0c] rounded-[4px] border border-[#e5e5e2] hover:bg-[#f5f5f4] hover:border-[#d6d6d2] transition-colors font-medium"
                >
                  {DATE_PRESETS[s]}
                </button>
              ))}

            {/* Bouton date personnalisée */}
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-2.5 py-1.5 text-[13px] bg-white text-[#0d0d0c] rounded-[4px] border border-[#e5e5e2] hover:bg-[#f5f5f4] hover:border-[#d6d6d2] transition-colors font-medium flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Date personnalisée
            </button>
          </div>

          {/* Date Picker */}
          {showDatePicker && (
            <div className="p-4 bg-white border border-[#e5e5e2] rounded-[4px] shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
              <p className="text-[13px] font-medium text-[#0d0d0c] mb-3">
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
                    className="flex-1 px-4 py-2 bg-[#eeeeec] text-[#4a4a46] rounded-[4px] text-[13px] font-medium hover:bg-[#e5e5e2] transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={addCustomDateRange}
                    disabled={!startDate}
                    className="flex-1 px-4 py-2 bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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