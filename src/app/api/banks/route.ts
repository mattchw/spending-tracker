import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/truelayer";

export const dynamic = "force-dynamic";

// With TrueLayer the bank picker is hosted on their side, so there's no list
// to fetch here — the UI just needs to know whether credentials are set.
export async function GET() {
  return NextResponse.json({ configured: isConfigured() });
}
