import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { authUrl, isConfigured } from "@/lib/truelayer";
import { saveAuthState } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "TrueLayer credentials are not configured" },
      { status: 400 },
    );
  }
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const state = crypto.randomUUID();
  await saveAuthState(state, userId, Date.now());

  const url = authUrl(`${base}/api/callback`, state);
  return NextResponse.json({ url });
}
