import { requireAdminApi } from "@/lib/auth-guards";
import { isAdminHelpDocumentSlug, readAdminHelpDocument } from "@/lib/admin-help-documents";
export const runtime="nodejs";
const safeHeaders={"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"};
export async function GET(request:Request, context:RouteContext<"/api/admin/help/[document]">){
  const {response}=await requireAdminApi(); if(response)return response;
  const {document}=await context.params; if(!isAdminHelpDocumentSlug(document)) return Response.json({error:"Document not found"},{status:404,headers:safeHeaders});
  try { const {bytes,filename}=await readAdminHelpDocument(document); const download=new URL(request.url).searchParams.get("download")==="1"; return new Response(bytes,{headers:{...safeHeaders,"Content-Type":"application/pdf","Content-Disposition":`${download?"attachment":"inline"}; filename="${filename}"`}}); }
  catch { return Response.json({error:"The guide is temporarily unavailable."},{status:503,headers:safeHeaders}); }
}
