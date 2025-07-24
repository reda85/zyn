import { CheckCheckIcon, DropletsIcon, FireExtinguisherIcon, GripIcon, PaintRoller, ZapIcon } from "lucide-react";

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}
function CategoryIcon(category,status) {
    switch (category) {
        case 'Electricite':
            return <ZapIcon className=" text-white h-4 w-4" />
        case 'Plomberie':
            return <DropletsIcon className=" text-white h-4 w-4" />
        case 'Peinture':
            return <PaintRoller className="text-white h-4 w-4" />
        case 'Carrelage':
            return <GripIcon className="text-white h-4 w-4" />
        case 'Extincteur':
            return <FireExtinguisherIcon className="text-white h-4 w-4" />
        default:
            return <CheckCheckIcon className="text-white h-4 w-4" />
    }
}

const statusColors = {
    'En cours': 'bg-green-600',
    'A valider': 'bg-blue-600',
    'Termine': 'bg-red-600',
}

export default function Pin({ pin }) {
    return (
        <div className={classNames(" rounded-full p-1 ", statusColors[pin.status])}>
            {CategoryIcon(pin.category,pin.status)}
        </div>
    )
}