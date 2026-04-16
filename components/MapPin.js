import { categoriesAtom, selectedPinAtom, statusesAtom } from "@/store/atoms";
import { useAtom } from "jotai";
import {
  Calendar1Icon,
  UserCircleIcon,
  ArchiveIcon,
} from "lucide-react";
import { format as formatDate } from "date-fns";
import clsx from "clsx";
import { categoriesPinIcons } from "@/utils/categories";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const categoriesIcons = categoriesPinIcons;

export default function MapPin({ pin, dragging = false, hovered = false }) {
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
  const isArchived = pin?.isArchived ?? false;

  // Archived pins use a muted grey instead of their status color
  const pinColor = isArchived ? "#4b5563" : statusColor;

  return (
    <div className="relative flex flex-col items-center">
      {/* Popover: only when NOT selected and hovered */}
      {!isSelected && hovered && !dragging && (
        <div
          className="
            absolute bottom-full left-1/2 -translate-x-1/2
            mb-3 w-max max-w-xs min-w-52 p-4 text-xs text-white
            bg-gray-800 rounded-lg shadow-lg
            whitespace-nowrap pointer-events-none
            z-[1]
          "
        >
          <div className="flex flex-row items-center gap-2 flex-wrap">
            <div
              className="rounded-full py-1 px-2 text-white w-fit"
              style={{ backgroundColor: isArchived ? "#4b5563" : statusColor }}
            >
              {statuses.find((status) => status?.id === pin.status_id)?.name ||
                "Non assigné"}
            </div>

            {/* Archived badge inside popover */}
            {isArchived && (
              <div className="flex items-center gap-1 rounded-full py-1 px-2 bg-stone-700 text-stone-300 w-fit">
                <ArchiveIcon className="w-3 h-3" />
                <span>Archivé</span>
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-stone-500">
            ID: {pin?.projects?.project_number}-{pin.pin_number}
          </p>
          <p className={clsx("mt-4 text-base", isArchived ? "text-stone-500 line-through" : "text-stone-300")}>
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
                isOverDue && !isArchived ? "text-red-600" : "text-stone-400"
              )}
            />
            <div className="flex flex-col">
              <p
                className={clsx(
                  "text-xs",
                  isOverDue && !isArchived ? "text-red-600" : "text-stone-400"
                )}
              >
                Échéance
              </p>
              <div
                className={clsx(
                  "text-sm mt-1",
                  isOverDue && !isArchived ? "text-red-600" : "text-stone-300"
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

        {/* Outer wrapper for grayscale + opacity on archived */}
        <div className={clsx(isArchived && "opacity-50 grayscale")}>
          <div
            className={classNames(
              "rounded-full transition-all duration-200 relative",
              isSelected ? "p-2 scale-150" : "p-1"
            )}
            style={{ backgroundColor: pinColor }}
          >
            {/* Archive icon badge — top-right corner of the circle */}
            {isArchived && (
              <div
                className={classNames(
                  "absolute bg-stone-800 border border-stone-600 rounded-full flex items-center justify-center",
                  isSelected
                    ? "-top-1.5 -right-1.5 w-4 h-4"
                    : "-top-1 -right-1 w-3 h-3"
                )}
              >
                <ArchiveIcon
                  className={classNames(
                    "text-stone-300",
                    isSelected ? "w-2.5 h-2.5" : "w-2 h-2"
                  )}
                />
              </div>
            )}

            {/* Icon inside the pin */}
            {categoriesIcons[catIconKey]}
          </div>
        </div>

        {isSelected && (
          <div className="mt-1 w-px h-6 rounded-sm bg-stone-500" />
        )}
      </div>
    </div>
  );
}