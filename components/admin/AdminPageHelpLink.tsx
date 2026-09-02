import Link from "next/link";
import { CircleHelp, ExternalLink } from "lucide-react";
import type { AdminHelpSectionId } from "@/data/admin-help";

export function AdminPageHelpLink({ section }: { section: AdminHelpSectionId }) {
  return <Link href={`/admin/help#${section}`} target="_blank" rel="noopener noreferrer" className="brand-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2">
    <CircleHelp aria-hidden="true" size={17}/> Help with this page <ExternalLink aria-hidden="true" size={14}/><span className="sr-only"> (opens in a new tab)</span>
  </Link>;
}
