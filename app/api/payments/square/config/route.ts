import { getSquarePublicConfig } from "@/lib/square";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSquarePublicConfig(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
