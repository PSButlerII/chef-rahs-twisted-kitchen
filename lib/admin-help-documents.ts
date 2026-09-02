import "server-only";
import path from "node:path";
import { readFile } from "node:fs/promises";

const HELP_ROOT = path.resolve(process.cwd(), "handoff", "client-admin-guide");
export const ADMIN_HELP_DOCUMENTS = {
  handbook: { file:"Chef-Rahs-Twisted-Kitchen-Admin-Handbook-v1.0.pdf", download:"Chef-Rahs-Twisted-Kitchen-Admin-Handbook-v1.0.pdf" },
  "quick-reference": { file:"Chef-Rahs-Twisted-Kitchen-Admin-Quick-Reference-v1.0.pdf", download:"Chef-Rahs-Twisted-Kitchen-Admin-Quick-Reference-v1.0.pdf" },
} as const;
export type AdminHelpDocumentSlug = keyof typeof ADMIN_HELP_DOCUMENTS;
export function isAdminHelpDocumentSlug(value:string): value is AdminHelpDocumentSlug { return Object.hasOwn(ADMIN_HELP_DOCUMENTS,value); }
export async function readAdminHelpDocument(slug:AdminHelpDocumentSlug) {
  const item=ADMIN_HELP_DOCUMENTS[slug]; const resolved=path.resolve(HELP_ROOT,item.file);
  if(path.dirname(resolved)!==HELP_ROOT) throw new Error("Invalid help document mapping");
  return { bytes:await readFile(resolved), filename:item.download };
}
