import { NextResponse } from "next/server";
import { syncAllUsers } from "@/lib/sync";

export const dynamic = "force-dynamic";
// Iterating every user's connections can take a while; give the run headroom.
export const maxDuration = 300;

/**
 * Scheduled background sync (see vercel.json crons). Refreshes each user's
 * rolling 90-day window and, as a side effect, rotates near-expiry access
 * tokens to keep bank consent alive between logins.
 *
 * Guarded by CRON_SECRET: Vercel Cron sends `Authorization: Bearer <secret>`.
 * Requests without the matching secret are rejected so the endpoint can't be
 * triggered by the public internet.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllUsers();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
