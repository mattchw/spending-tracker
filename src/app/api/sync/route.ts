import { NextResponse } from "next/server";
import { syncAll } from "@/lib/sync";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
// A full multi-account sync can exceed the default serverless limit.
export const maxDuration = 300;

export async function POST() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncAll(userId);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
