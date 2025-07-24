import { Paperclip, Scissors, X } from 'lucide-react';
import CategoryComboBox from './CategoryComboBox';
export default function DrawerHeader({ pin, onClose }) {
  return (
    <div className="div flex flex-row justify-between items-center">
      {/* Header content */}
    <div className="text-sm"><CategoryComboBox pin={pin} /></div>
      <div className='flex flex-row gap-2 items-center'>
        <Scissors size={20} className='text-pink-500' />
        <Paperclip size={20} className='text-gray-500' />
      <button className=" hover:bg-gray-100 hover:text-gray-800 rounded-full p-2 text-gray-500" onClick={onClose}>
       <X size={20} />
      </button>
      </div>
    </div>
  );
}