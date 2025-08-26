import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export function PopoverPortal({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {children}
    </div>,
    document.body
  );
}
