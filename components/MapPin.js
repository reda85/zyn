import { categoriesAtom, selectedPinAtom, statusesAtom } from "@/store/atoms";
import { useAtom } from "jotai";
import {
  Calendar1Icon,
  CheckIcon,
  DropletsIcon,
  FireExtinguisherIcon,
  GripIcon,
  PaintRoller,
  SnowflakeIcon,
  UserCircleIcon,
  ZapIcon
} from "lucide-react";
import { format as formatDate } from "date-fns";
import clsx from "clsx";
import { Snowburst_One } from "next/font/google";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const categoriesIcons = {
  unassigned: <CheckIcon className="text-white h-4 w-4" />,
  zap: <ZapIcon className="text-white h-4 w-4" />,
  droplets: <DropletsIcon className="text-white h-4 w-4" />,
  paint: <PaintRoller className="text-white h-4 w-4" />,
  carrelage: <GripIcon className="text-white h-4 w-4" />,
  snowflake: <SnowflakeIcon className="text-white h-4 w-4" />,
  "fire-extinguisher": <FireExtinguisherIcon className="text-white h-4 w-4" />
};

const statusColors = {
  "En cours": "bg-green-600",
  "A valider": "bg-blue-600",
  Termine: "bg-red-600"
};

export default function MapPin({ pin, hovered = false }) {
  const [selectedPin] = useAtom(selectedPinAtom);
  const [categories] = useAtom(categoriesAtom);
  const [statuses] = useAtom(statusesAtom);

  const statusColor =
    statuses.find((status) => status.id === pin?.status_id)?.color || "#ccc";

  let isOverDue = false;
  if (pin?.due_date) {
    const dueDate = new Date(pin?.due_date);
    const now = new Date();
    isOverDue = dueDate < now;
  }

  const catIconKey =
    categories.find((c) => c.id === pin.category_id)?.icon || "unassigned";

  const isSelected = selectedPin?.id === pin.id;

  return (
    <div className="relative flex flex-col items-center">
      {/* Popover: only when NOT selected and hovered */}
      {!isSelected && hovered && (
        <div
          className="
            absolute bottom-full left-1/2 -translate-x-1/2
            mb-3 w-max max-w-xs min-w-52 p-4 text-xs text-white 
            bg-gray-800 rounded-lg shadow-lg
            whitespace-nowrap pointer-events-none
            z-[1]
          "
        >
          <div
            className="rounded-full py-1 px-2 text-white w-fit"
            style={{ backgroundColor: statusColor }}
          >
            {statuses.find((status) => status?.id === pin.status_id)?.name ||
              "Non assigné"}
          </div>

          <p className="mt-4 text-xs text-stone-500">
            ID: {pin?.projects?.project_number}-{pin.pin_number}
          </p>
          <p className="mt-4 text-base text-stone-300">
            {pin.name || "Pin sans nom"}
          </p>

          <hr className="mt-2 border-t border-stone-700" />

          <div className="flex flex-row items-center mt-4">
            <UserCircleIcon className="w-5 h-5 mr-2 text-stone-400" />
            <div className="flex flex-col">
              <p className="text-xs text-stone-400">Assigné à</p>
              <div className="text-sm text-stone-300 mt-1">
                {pin.assigned_to?.name || "Aucun"}
              </div>
            </div>
          </div>

          <hr className="mt-2 border-t border-stone-700" />

          <div className="flex flex-row items-center mt-4">
            <Calendar1Icon
              className={clsx(
                "w-5 h-5 mr-2",
                isOverDue ? "text-red-600" : "text-stone-400"
              )}
            />
            <div className="flex flex-col">
              <p
                className={clsx(
                  "text-xs",
                  isOverDue ? "text-red-600" : "text-stone-400"
                )}
              >
                Échéance
              </p>
              <div
                className={clsx(
                  "text-sm mt-1",
                  isOverDue ? "text-red-600" : "text-stone-300"
                )}
              >
                {pin?.due_date
                  ? formatDate(new Date(pin?.due_date), "dd/MM/yyyy")
                  : "Aucune"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pin circle + selection tail */}
      <div className="relative flex flex-col items-center hover:cursor-pointer">
        {isSelected && (
          <div className="w-0 h-2 border-l-[1px] border-white opacity-80" />
        )}

        <div
          className={classNames(
            "rounded-full transition-all duration-200",
            isSelected ? "p-2 scale-150" : "p-1"
          )}
          style={{ backgroundColor: statusColor }}
        >
          {categoriesIcons[catIconKey]}
        </div>

        {isSelected && (
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
