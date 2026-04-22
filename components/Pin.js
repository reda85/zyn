import { categoriesAtom, statusesAtom } from "@/store/atoms";
import { useAtom } from "jotai";
import { CheckIcon, DropletsIcon, DoorClosedIcon, FireExtinguisherIcon, GripIcon, PaintRoller, ZapIcon, SnowflakeIcon, FolderIcon, AirVentIcon, AlarmSmokeIcon, CheckCircleIcon, PackageIcon, BrickWallIcon, BrushIcon, ConstructionIcon, DropletOffIcon, DoorOpenIcon, TrendingUpIcon, FlameIcon, TrendingDownIcon, WifiIcon, ArchiveIcon,
    AccessibilityIcon,
    AsteriskIcon,
    BadgeIcon,
    BanIcon,
    BlocksIcon,
    BoltIcon,    
    BoxIcon,
    BoxesIcon,
    CarIcon,
    CctvIcon,
 } from "lucide-react";

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
  'accessibility': <AccessibilityIcon className="text-white h-4 w-4" />,
  'asterisk': <AsteriskIcon className="text-white h-4 w-4" />,
  'badge': <BadgeIcon className="text-white h-4 w-4" />,
  'ban': <BanIcon className="text-white h-4 w-4" />,
  'blocks': <BlocksIcon className="text-white h-4 w-4" />,
  'bolt': <BoltIcon className="text-white h-4 w-4" />,
  'box': <BoxIcon className="text-white h-4 w-4" />,
  'boxes': <BoxesIcon className="text-white h-4 w-4" />,
  'car': <CarIcon className="text-white h-4 w-4" />,
  'cctv': <CctvIcon className="text-white h-4 w-4" />,
}

export default function Pin({ pin }) {
    const [statuses] = useAtom(statusesAtom)
    const [categories] = useAtom(categoriesAtom)

    const isArchived = pin?.isArchived ?? false;
    const statusColor = isArchived
        ? "#4b5563"
        : statuses?.find(status => status?.id === pin?.status_id)?.color || '#ccc';

    const catIconKey = categories?.find(c => c.id === pin.category_id)?.icon || 'unassigned';

    return (
        <div className={classNames("relative rounded-full p-1", isArchived && "opacity-50 grayscale")}
            style={{ backgroundColor: statusColor }}
        >
            {categoriesIcons[catIconKey]}

            {isArchived && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-stone-800 border border-stone-600 rounded-full flex items-center justify-center">
                    <ArchiveIcon className="w-2 h-2 text-stone-300" />
                </div>
            )}
        </div>
    )
}