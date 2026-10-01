"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { pageHelp } from "@/lib/page-help";
import type { AppPage } from "@/lib/types";

export function PageHelp({ page, label }: { page: AppPage; label: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = `page-help-${page}`;
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => { if (document.activeElement !== trigger.current) setOpen(false); }, 250); };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [open]);

  return <>
    <button ref={trigger} type="button" aria-label={`About ${label}`} aria-expanded={open} aria-controls={id} aria-describedby={open ? id : undefined}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onPointerEnter={event => { cancelClose(); if (event.pointerType === "mouse") setOpen(true); }}
      onPointerLeave={scheduleClose}
      onFocus={() => setOpen(true)} onBlur={event => { if (!panel.current?.contains(event.relatedTarget)) setOpen(false); }} onClick={() => setOpen(true)}>
      <Info size={17} aria-hidden="true" />
    </button>
    {open && <div ref={panel} id={id} role="tooltip" onPointerEnter={cancelClose} onPointerLeave={scheduleClose} className="absolute left-4 top-14 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border bg-card p-4 text-sm leading-relaxed text-foreground shadow-xl">
      <p className="mb-2 font-semibold">{label}</p><p>{pageHelp[page]}</p>
    </div>}
  </>;
}
