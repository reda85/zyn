import { selectedPinAtom } from "@/store/atoms";
import { useAtom } from "jotai";
import {
    CheckCheckIcon,
    DropletsIcon,
    FireExtinguisherIcon,
    GripIcon,
    PaintRoller,
    ZapIcon
} from "lucide-react";

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
            <div className="absolute bottom-full mb-2 w-max max-w-xs px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
              <p>  {pin.category} - {pin.status}</p>
              <p>  {pin.x} - {pin.y}</p>
            </div>

            {/* Pin container */}
            <div className="relative flex flex-col items-center">
                {/* Tail */}
                {selectedPin?.id === pin.id && (
                    <div className="w-0 h-2 border-l-[1px] border-white opacity-80" />
                )}

                {/* Pin circle */}
                <div
                    className={classNames(
                        "rounded-full transition-all duration-200",
                        selectedPin?.id === pin.id ? "p-2 scale-125" : "p-1",
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
