import Link from "next/link";
import { BookOpen, Download } from "lucide-react";
import { requireAdminPage } from "@/lib/auth-guards";
import { ADMIN_HELP_LAST_UPDATED, ADMIN_HELP_SECTIONS, ADMIN_HELP_VERSION } from "@/data/admin-help";
import { AdminHelpCenter } from "@/components/admin/AdminHelpCenter";

export default async function AdminHelpPage(){ const session=await requireAdminPage(); const isOwner=session.user.role==="OWNER"; return <main className="admin-page"><div className="admin-container">
  <Link href="/admin" className="text-sm font-bold text-[#8e3b24] underline">&larr; Back to Dashboard</Link>
  <div className="mt-5"><p className="admin-eyebrow">Admin Help</p><h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Help &amp; Admin Guide</h1><p className="mt-3 max-w-3xl text-[#6b5a50]">Find instructions for common admin tasks, safety reminders, and troubleshooting.</p><p className="mt-2 text-sm font-bold">Version {ADMIN_HELP_VERSION} &middot; Updated {ADMIN_HELP_LAST_UPDATED}</p></div>
  <section className="my-8 grid gap-4 lg:grid-cols-2"><DocumentCard title="Admin Handbook" slug="handbook"/><DocumentCard title="Daily Quick Reference" slug="quick-reference"/></section>
  <nav aria-label="Help sections" className="admin-card mb-8 p-5"><h2 className="text-lg font-black">Browse sections</h2><div className="mt-3 flex flex-wrap gap-2">{ADMIN_HELP_SECTIONS.map(s=><a key={s.id} href={`#${s.id}`} className="rounded-full border border-[#d8c8b8] px-3 py-1.5 text-sm font-bold hover:bg-[#fff8f0]">{s.title}</a>)}</div></nav>
  <AdminHelpCenter sections={ADMIN_HELP_SECTIONS} isOwner={isOwner}/>
  <section className="mt-10 rounded-2xl border border-[#d8c8b8] bg-[#fff8f0] p-6"><h2 className="text-2xl font-black">Contact Support</h2><p className="mt-2">Contact Recon Dev LLC through your usual support channel.</p></section>
  </div></main> }
function DocumentCard({title,slug}:{title:string;slug:"handbook"|"quick-reference"}){return <div className="admin-card p-5"><BookOpen aria-hidden="true"/><h2 className="mt-3 text-xl font-black">{title}</h2><p className="mt-1 text-sm text-[#6b5a50]">PDF &middot; Version 1.0 &middot; September 2026</p><div className="mt-4 flex flex-wrap gap-2"><a href={`/api/admin/help/${slug}`} target="_blank" rel="noopener noreferrer" className="brand-button-primary px-4 py-2">Open {title}<span className="sr-only"> (opens in a new tab)</span></a><a href={`/api/admin/help/${slug}?download=1`} className="brand-button-secondary inline-flex items-center gap-2 px-4 py-2"><Download size={16}/>Download</a></div></div>}
