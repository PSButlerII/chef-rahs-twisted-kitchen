import { readFile } from "node:fs/promises";
import path from "node:path";
import { ADMIN_HELP_LAST_UPDATED, ADMIN_HELP_SECTIONS, ADMIN_HELP_TIPS, ADMIN_HELP_VERSION, ADMIN_PAGE_HELP } from "../data/admin-help";
const ADMIN_HELP_DOCUMENTS = {
  handbook: "Chef-Rahs-Twisted-Kitchen-Admin-Handbook-v1.0.pdf",
  "quick-reference": "Chef-Rahs-Twisted-Kitchen-Admin-Quick-Reference-v1.0.pdf",
} as const;
const isAdminHelpDocumentSlug=(value:string)=>Object.hasOwn(ADMIN_HELP_DOCUMENTS,value);
const check=(ok:unknown,message:string)=>{if(!ok)throw new Error(message)};
const unique=(values:string[],label:string)=>check(new Set(values).size===values.length,`${label} must be unique`);
unique(ADMIN_HELP_SECTIONS.map(s=>s.id),"section IDs"); unique(ADMIN_HELP_SECTIONS.flatMap(s=>s.topics.map(t=>t.id)),"topic IDs"); unique(ADMIN_HELP_TIPS.map(t=>t.id),"tip IDs");
const sections=new Set(ADMIN_HELP_SECTIONS.map(s=>s.id)); for(const tip of ADMIN_HELP_TIPS)check(sections.has(tip.helpSection),`bad tip section ${tip.id}`); for(const value of Object.values(ADMIN_PAGE_HELP))check(sections.has(value),`bad page mapping ${value}`);
const text=JSON.stringify(ADMIN_HELP_SECTIONS); for(const bad of ["PAYMENT_DUE","AWAITING_APPROVAL","localhost","DATABASE_URL","npm run","```","C:\\\\"])check(!text.includes(bad),`forbidden help text: ${bad}`);
for(const t of ADMIN_HELP_SECTIONS.flatMap(s=>s.topics)){check(t.title&&t.summary&&t.keywords.length,`search text missing: ${t.id}`); if(t.action)check(t.action.href.startsWith("/admin"),`unsafe action: ${t.id}`)}
check(ADMIN_HELP_VERSION==="1.0"&&ADMIN_HELP_LAST_UPDATED==="September 2026","version mismatch"); check(!isAdminHelpDocumentSlug("../secret")&&!isAdminHelpDocumentSlug("unknown"),"unknown slug accepted");
async function main(){for(const [slug,file] of Object.entries(ADMIN_HELP_DOCUMENTS)){const bytes=await readFile(path.resolve("handoff/client-admin-guide",file)); check(bytes.subarray(0,5).toString()==="%PDF-",`${slug} is not PDF`)}
check(text.includes("Do not issue a second refund")&&text.includes("Do not repeatedly send payment requests"),"payment warnings missing"); console.log("Admin help QA passed.");}
main().catch(error=>{console.error(error);process.exitCode=1});
