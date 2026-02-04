import { categoriesAtom, statusesAtom } from "@/store/atoms";
import { useAtom } from "jotai";
import { CheckIcon, DropletsIcon, DoorClosedIcon, FireExtinguisherIcon, GripIcon, PaintRoller, ZapIcon, SnowflakeIcon, FolderIcon, AirVentIcon, AlarmSmokeIcon, CheckCircleIcon, PackageIcon, BrickWallIcon, BrushIcon, ConstructionIcon, DropletOffIcon, DoorOpenIcon, TrendingUpIcon, FlameIcon, TrendingDownIcon, WifiIcon } from "lucide-react";

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
  'doors': <DoorClosedIcon className="text-white h-4 w-4" />,
  'snowflake': <SnowflakeIcon className="text-white h-4 w-4" />,
  'folder': <FolderIcon className="text-white h-4 w-4" />,
  'air-vent': <AirVentIcon className="text-white h-4 w-4" />,
  'alarm-smoke': <AlarmSmokeIcon className="text-white h-4 w-4" />,
  'check-circle': <CheckCircleIcon className="text-white h-4 w-4" />,
  'package': <PackageIcon className="text-white h-4 w-4" />,
  'brick-wall': <BrickWallIcon className="text-white h-4 w-4" />,
  'brush-cleaning': <BrushIcon className="text-white h-4 w-4" />,
  'construction': <ConstructionIcon className="text-white h-4 w-4" />,
  'droplet-off': <DropletOffIcon className="text-white h-4 w-4" />,
  'door-open': <DoorOpenIcon className="text-white h-4 w-4" />,
  'trending-up': <TrendingUpIcon className="text-white h-4 w-4" />,
  'flame': <FlameIcon className="text-white h-4 w-4" />,
  'trending-down': <TrendingDownIcon className="text-white h-4 w-4" />,
  'wifi': <WifiIcon className="text-white h-4 w-4" />,
  
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