"use client";
import Link from "next/link";
import { CircleHelp, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { AdminHelpSectionId } from "@/data/admin-help";

export function AdminHelpPopover({ title, summary, section }: { title:string; summary:string; section:AdminHelpSectionId }) {
  const [open,setOpen]=useState(false); const id=useId(); const root=useRef<HTMLSpanElement>(null); const trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{ if(!open)return; const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)}; const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(false);trigger.current?.focus()}}; document.addEventListener("pointerdown",outside); document.addEventListener("keydown",key); return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",key)} },[open]);
  return <span ref={root} className="relative inline-flex align-middle">
    <button ref={trigger} type="button" aria-label={`Help: ${title}`} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)} className="ml-1 inline-flex rounded-full text-[#8e3b24] focus-visible:outline-2 focus-visible:outline-offset-2"><CircleHelp size={17}/></button>
    {open&&<span id={id} role="region" aria-label={`${title} help`} className="absolute left-0 top-7 z-50 w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-[#d8c8b8] bg-white p-4 text-left text-sm font-normal text-[#392820] shadow-xl">
      <span className="flex items-start justify-between gap-3"><strong>{title}</strong><button type="button" aria-label="Close help" onClick={()=>{setOpen(false);trigger.current?.focus()}} className="rounded focus-visible:outline-2"><X size={16}/></button></span>
      <span className="mt-2 block leading-relaxed">{summary}</span><Link href={`/admin/help#${section}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-bold text-[#8e3b24] underline">Read full help<span className="sr-only"> (opens in a new tab)</span></Link>
    </span>}
  </span>;
}
