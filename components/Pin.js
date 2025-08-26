import { categoriesAtom, statusesAtom } from "@/store/atoms";
import { useAtom } from "jotai";
import { CheckIcon, DropletsIcon, FireExtinguisherIcon, GripIcon, PaintRoller, ZapIcon } from "lucide-react";

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}
const categoriesIcons = {
  'unassigned' : <CheckIcon className="text-white h-4 w-4" />,
  'zap': <ZapIcon className="text-white h-4 w-4" />,
  'droplets': <DropletsIcon className="text-white h-4 w-4" />,
  'paint': <PaintRoller className="text-white h-4 w-4" />,
  'carrelage': <GripIcon className="text-white h-4 w-4" />,
  'fire-extinguisher': <FireExtinguisherIcon className="text-white h-4 w-4" />,
  
}



export default function Pin({ pin }) {
    const [statuses] = useAtom(statusesAtom)
    const [categories] = useAtom(categoriesAtom)
    console.log('statuses', statuses)
    const statusColor = statuses?.find(status => status?.id === pin?.status_id)?.color || '#ccc';
    return (
        <div className=" rounded-full p-1 " style={{ backgroundColor: statusColor }}>
             {categoriesIcons[categories?.find(c => c.id === pin.category_id)?.icon || 'Non assigné']}
        </div>
    )
}