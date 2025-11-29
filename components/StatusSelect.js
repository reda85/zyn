import { useUserData } from '@/hooks/useUserData';
import { pinsAtom, selectedPinAtom, selectedProfileAtom, statusAtom, statusesAtom } from '@/store/atoms';
import { supabase } from '@/utils/supabase/client';
import { CheckIcon } from '@heroicons/react/24/outline';
import { useAtom } from 'jotai';
import { ChevronDownIcon } from 'lucide-react';
import { Lexend } from 'next/font/google';
import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const ITEM_HEIGHT = 36;
const PADDING_X = 8;
const PADDING_Y = 8;
const GAP_SIZE = 8; // Tailwind's gap-2
const inter = Lexend({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export default function StatusSelect({ pin }) {
  const [statuses] = useAtom(statusesAtom);
  const { profile } = useUserData();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPin, setPin] = useAtom(selectedPinAtom);
  const [pins, setPins] = useAtom(pinsAtom);
  const [selected, setSelected] = useState(
    statuses[statuses.findIndex((s) => s.id === pin.status_id)]
  );
  const [buttonRect, setButtonRect] = useState({ top: 0, left: 0, width: 0 });

  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  //
  // Compute allowedStatuses based on profile.role (guests only allowed "A valider")
  //
  const isGuest = profile?.role === 'guest';
  const allowedStatuses = isGuest
    ? statuses.filter((s) => s.name === 'A valider')
    : statuses;

  //
  // Ensure the current selected status is always present in the dropdown (safeStatuses)
  //
  const safeStatuses = [
    ...allowedStatuses,
    ...(selected && !allowedStatuses.some((s) => s.id === selected.id) ? [selected] : []),
  ];

  useEffect(() => {
    // initialize selected from safeStatuses (handles the case where the current pin status
    // isn't part of allowedStatuses but must still be kept visible)
    const idx = safeStatuses.findIndex((s) => s.id === pin.status_id);
    if (idx !== -1) {
      setSelected(safeStatuses[idx]);
    } else {
      // fallback - try find in full statuses
      const fallback = statuses.find((s) => s.id === pin.status_id);
      if (fallback) setSelected(fallback);
    }
    // re-run when pin, statuses or profile changes
  }, [pin, statuses, profile]); // safeStatuses derives from statuses/profile/selected

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isOutsideContainer = !containerRef.current?.contains(e.target);
      const isOutsideDropdown = !e.target.closest('[data-dropdown-portal]');
      if (isOutsideContainer && isOutsideDropdown) setIsOpen(false);
    };

    const handleScroll = () => isOpen && setIsOpen(false);

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    } else {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleUpdateStatus = async (status_id) => {
    // If guest and attempting to set a status other than "A valider", block
    if (isGuest) {
      const statusObj = statuses.find((s) => s.id === status_id);
      if (statusObj?.name !== 'A valider') return;
    }

    const { data } = await supabase
      .from('pdf_pins')
      .update({ status_id })
      .eq('id', pin.id)
      .select('*')
      .single();

    if (data) {
      const newSelected = safeStatuses.find((s) => s.id === status_id) || statuses.find((s) => s.id === status_id);
      setSelected(newSelected);
      setPin({ ...pin, status_id });
      setPins(pins.map((p) => (p.id === pin.id ? { ...p, status_id: status_id } : p)));
    }
  };

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect({ top: rect.top, left: rect.left, width: rect.width });
    }
    setIsOpen((prev) => !prev);
  };

  const selectedIndex = safeStatuses.findIndex((s) => s.id === selected?.id);

  const totalHeight =
    ITEM_HEIGHT * safeStatuses.length +
    PADDING_Y * 2 +
    GAP_SIZE * (safeStatuses.length - 1);

  const offsetY = -(selectedIndex * (ITEM_HEIGHT + GAP_SIZE) + PADDING_Y);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${isOpen ? 'z-[1003]' : 'z-[10]'}`}
    >
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        style={{ height: `${ITEM_HEIGHT}px`, backgroundColor: selected?.color }}
        className={`w-fit p-2 z-10 flex flex-row justify-center items-center text-sm border rounded-full text-white  text-left shadow-sm`}
        onClick={handleToggle}
      >
        {selected?.name || 'Select Status'}
        <ChevronDownIcon className="ml-2 h-4 w-4" />
      </button>

      {/* Portal Dropdown */}
      {isOpen &&
        ReactDOM.createPortal(
          <div
            data-dropdown-portal
            className={`fixed ${inter.className} bg-blue-50 shadow-lg border rounded-md z-[1003] overflow-hidden flex flex-col gap-2`}
            style={{
              top: buttonRect.top + offsetY,
              left: buttonRect.left - PADDING_X,
              padding: `${PADDING_Y}px ${PADDING_X}px`,
              minWidth: Math.max(buttonRect.width, 120),
              height: `${totalHeight}px`,
            }}
          >
            {safeStatuses.map((status) => {
              // visually disable non-allowed statuses for guest (if you want to hide them instead,
              // we already ensure they won't be present except for the current status)
              const disabledForGuest = isGuest && status.name !== 'A valider';

              return (
                <button
                  key={status.id}
                  className={`flex flex-row p-2 justify-center items-center rounded-full cursor-pointer text-sm text-white text-left w-fit hover:opacity-90 transition-opacity ${disabledForGuest ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  style={{
                    height: `${ITEM_HEIGHT}px`,
                    whiteSpace: 'nowrap',
                    backgroundColor: status?.color,
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (disabledForGuest) return;

                    setSelected(status);
                    handleUpdateStatus(status.id);
                    setIsOpen(false);
                  }}
                >
                  {status.name}
                  {status.name === selected?.name && <CheckIcon className="ml-2 h-4 w-4" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
