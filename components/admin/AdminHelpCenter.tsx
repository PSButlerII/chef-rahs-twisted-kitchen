"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminHelpSection } from "@/data/admin-help";

export function AdminHelpCenter({ sections, isOwner }: { sections: readonly AdminHelpSection[]; isOwner:boolean }) {
  const [query,setQuery]=useState(""); const normalized=query.trim().toLowerCase();
  const filtered=useMemo(()=>sections.map(s=>({...s,topics:s.topics.filter(t=>!normalized||[s.title,t.title,t.summary,...t.keywords,...(t.steps??[])].join(" ").toLowerCase().includes(normalized))})).filter(s=>s.topics.length),[sections,normalized]);
  const count=filtered.reduce((n,s)=>n+s.topics.length,0);
  return <>
    <div className="admin-card mb-8 p-5"><label htmlFor="admin-help-search" className="block text-sm font-bold">Search help topics</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input id="admin-help-search" value={query} onChange={e=>setQuery(e.target.value)} className="admin-input flex-1" placeholder="Try payments, weekly capacity, or gallery order"/>{query&&<button type="button" onClick={()=>setQuery("")} className="brand-button-secondary px-4 py-2">Clear Search</button>}</div><p className="mt-2 text-sm text-[#6b5a50]" aria-live="polite">{count} {count===1?"topic":"topics"} shown</p></div>
    {!count?<div className="admin-card p-6"><h2 className="text-xl font-black">No help topics found</h2><p className="mt-2 text-[#6b5a50]">Try a broader word, or clear the search to browse all sections.</p></div>:<div className="space-y-10">{filtered.map(s=><section key={s.id} id={s.id} className="scroll-mt-6"><h2 className="text-2xl font-black">{s.title}</h2><p className="mt-1 text-[#6b5a50]">{s.description}</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{s.topics.map(t=><article key={t.id} id={t.id} className="admin-card scroll-mt-6 p-5"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">{t.title}</h3>{t.ownerOnly&&<span className="admin-badge admin-badge-info">Owner Only</span>}</div><p className="mt-2 text-sm leading-relaxed text-[#5d4b42]">{t.summary}</p>{t.steps&&<ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{t.steps.map(x=><li key={x}>{x}</li>)}</ol>}{t.caution&&<p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold">Important: {t.caution}</p>}{t.action&&(!t.ownerOnly||isOwner)&&<Link href={t.action.href} className="mt-4 inline-block font-bold text-[#8e3b24] underline">{t.action.label}</Link>}{t.ownerOnly&&!isOwner&&<p className="mt-3 text-sm font-bold">Contact the Owner when a role change is needed.</p>}</article>)}</div></section>)}</div>}
  </>;
}
