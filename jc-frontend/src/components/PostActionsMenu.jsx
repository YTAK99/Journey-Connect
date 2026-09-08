import { useEffect, useRef, useState } from "react";
import { MoreVertical, PenLine, Trash2 } from "lucide-react";

export default function PostActionsMenu({ onEdit, onDelete, labels }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const runAction = (action) => {
    setIsOpen(false);
    action();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label={labels.more}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreVertical size={19} />
      </button>

      {isOpen && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onEdit)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <PenLine size={15} />
            {labels.edit}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onDelete)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Trash2 size={15} />
            {labels.delete}
          </button>
        </div>
      )}
    </div>
  );
}
