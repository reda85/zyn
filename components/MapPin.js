import { selectedPinAtom } from "@/store/atoms";
import { useAtom } from "jotai";
import {
    Calendar1Icon,
    CheckCheckIcon,
    DropletsIcon,
    FireExtinguisherIcon,
    GripIcon,
    PaintRoller,
    User,
    UserCircleIcon,
    ZapIcon
} from "lucide-react";
import { formatDate } from 'date-fns'

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

function CategoryIcon(category) {
    switch (category) {
        case 'Electricite':
            return <ZapIcon className="text-white h-4 w-4" />;
        case 'Plomberie':
            return <DropletsIcon className="text-white h-4 w-4" />;
        case 'Peinture':
            return <PaintRoller className="text-white h-4 w-4" />;
        case 'Carrelage':
            return <GripIcon className="text-white h-4 w-4" />;
        case 'Extincteur':
            return <FireExtinguisherIcon className="text-white h-4 w-4" />;
        default:
            return <CheckCheckIcon className="text-white h-4 w-4" />;
    }
}

const statusColors = {
    'En cours': 'bg-green-600',
    'A valider': 'bg-blue-600',
    'Termine': 'bg-red-600',
};

export default function MapPin({ pin }) {
    const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)
    return (
        <div className="relative group flex flex-col items-center">
            {/* Popover */}
          <div className="absolute min-w-52 z-9999 bottom-full mb-2 w-max max-w-xs p-4 text-xs text-white bg-gray-800 rounded-lg 
    invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200  whitespace-nowrap">

              <div className=" rounded-full py-1 px-2 bg-blue-600 text-white w-fit ">  {pin.status} </div>
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
                <Calendar1Icon className="w-5 h-5 mr-2 text-stone-400" />
                <div className="flex flex-col">
                    <p className="text-xs text-stone-400">Echeance</p>
                <div className="text-sm text-stone-300 mt-1">{pin?.due_date ? formatDate(pin?.due_date,'dd/MM/yyyy') :  'Aucune'}</div>
                </div>
                
              </div>
              
            </div>

            {/* Pin container */}
            <div className="relative flex flex-col items-center hover:cursor-pointer">
                {/* Tail */}
                {selectedPin?.id === pin.id && (
                    <div className="w-0 h-2 border-l-[1px] border-white opacity-80" />
                )}

                {/* Pin circle */}
                <div
                    className={classNames(
                        "rounded-full transition-all duration-200",
                        selectedPin?.id === pin.id ? "p-2 scale-150" : "p-1",
                        statusColors[pin.status]
                    )}
                >
                    {CategoryIcon(pin.category)}
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
