import { categoriesAtom, selectedPinAtom, statusesAtom } from "@/store/atoms";
import { useAtom } from "jotai";
import {
    Calendar1Icon,
    CheckIcon,
    DropletsIcon,
    FireExtinguisherIcon,
    GripIcon,
    PaintRoller,
    User,
    UserCircleIcon,
    ZapIcon
} from "lucide-react";
import { formatDate } from 'date-fns'
import clsx from "clsx";

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const categoriesIcons = {
  'Non assigné' : <CheckIcon className="text-white h-4 w-4" />,
  'zap': <ZapIcon className="text-white h-4 w-4" />,
  'droplets': <DropletsIcon className="text-white h-4 w-4" />,
  'paint': <PaintRoller className="text-white h-4 w-4" />,
  'carrelage': <GripIcon className="text-white h-4 w-4" />,
  'fire-extinguisher': <FireExtinguisherIcon className="text-white h-4 w-4" />,
}


const statusColors = {
    'En cours': 'bg-green-600',
    'A valider': 'bg-blue-600',
    'Termine': 'bg-red-600',
};

export default function MapPin({ pin }) {
    const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)
    const [categories, setCategories] = useAtom(categoriesAtom)
     const [statuses] = useAtom(statusesAtom)
        console.log('statuses', statuses)
        const statusColor = statuses.find(status => status.id === pin?.status_id)?.color || '#ccc';
    let isOverDue = false;
    if(pin?.due_date) {
        const dueDate = new Date(pin?.due_date);
        const now = new Date();
        isOverDue = dueDate < now;
    }
   // console.log('isOverDue', isOverDue)
    return (
        <div className="relative group flex flex-col items-center">
            {/* Popover */}
          {/* Popover */}
<div className="absolute bottom-full mb-2 w-max max-w-xs min-w-52 p-4 text-xs text-white 
  bg-gray-800 rounded-lg 
  opacity-0 group-hover:opacity-100 group-hover:visible 
  transition-all duration-200 whitespace-nowrap
  z-50 pointer-events-none">


              <div className=" rounded-full py-1 px-2 text-white w-fit " style={{ backgroundColor: statusColor }}>  {statuses.find(status => status?.id === pin.status_id)?.name || 'Non assigné'}</div>
              <p className="mt-4 text-base text-stone-300">{pin.name || 'Pin sans nom'}</p>
              <hr className="mt-2 border-t-1 border-stone-700" />
              <div className="flex flex-row items-center mt-4 ">
                <UserCircleIcon className="w-5 h-5 mr-2 text-stone-400" />
                <div className="flex flex-col">
                    <p className="text-xs text-stone-400">Assigné à</p>
                <div className="text-sm text-stone-300 mt-1">{pin.assigned_to?.name || 'Aucun'}</div>
                </div>
                
              </div>
               <hr className="mt-2 border-t-1 border-stone-700" />
              <div className="flex flex-row items-center mt-4 ">
                <Calendar1Icon className={clsx("w-5 h-5 mr-2 text-stone-400", isOverDue && "text-red-700")} />
                <div className="flex flex-col">
                    <p className="text-xs text-stone-400">Echeance</p>
                <div className={clsx("text-sm text-stone-300 mt-1", isOverDue && "text-red-700")}>{pin?.due_date ? formatDate(pin?.due_date,'dd/MM/yyyy') :  'Aucune'}</div>
                </div>
                
              </div>
              
            </div>

            {/* Pin container */}
            <div className="relative flex flex-col items-center hover:cursor-pointer ">
                {/* Tail */}
                {selectedPin?.id === pin.id && (
                    <div className="w-0 h-2 border-l-[1px] border-white opacity-80" />
                )}

                {/* Pin circle */}
                <div
                    className={classNames(
                        "rounded-full transition-all duration-200 ",
                        selectedPin?.id === pin.id ? "p-2 scale-150" : "p-1",
                        
                    )}
                    style={{ backgroundColor: statusColor }}
                >
                    {categoriesIcons[categories.find(c => c.id === pin.category_id)?.icon || 'Non assigné']}
                </div>
                 {/* Triangle Tail */}
                {selectedPin?.id === pin.id  && (
                    <div
                        className={classNames(
                            "mt-1 w-px h-6 rounded-sm",
                            statusColors[pin.status]
                        )}
                    />
                )}
            </div>
        </div>
    );
}
