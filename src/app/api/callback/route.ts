import { NextResponse, after } from "next/server";
import crypto from "node:crypto";
import { exchangeCode, listAccounts, listCards } from "@/lib/truelayer";
import {
  deleteAuthState,
  getAuthState,
  upsertAccount,
  upsertConnection,
} from "@/lib/db";
import { syncAll } from "@/lib/sync";

export const dynamic = "force-dynamic";
// The deep history backfill runs via after() once the redirect is sent, but it
// still counts against the function's execution budget on Vercel — give it room.
export const maxDuration = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${base}/?error=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${base}/?error=missing_code`);
  }
  const authState = await getAuthState(state);
  if (!authState) {
    return NextResponse.redirect(`${base}/?error=unknown_state`);
  }
  await deleteAuthState(state);
  const userId = authState.user_id;
  if (!userId) {
    return NextResponse.redirect(`${base}/?error=unknown_user`);
  }

  try {
    const tokens = await exchangeCode(code, `${base}/api/callback`);
    const [accounts, cards] = await Promise.all([
      listAccounts(tokens.access_token),
      listCards(tokens.access_token),
    ]);
    const all = [...accounts, ...cards];
    const provider = all[0]?.provider || "Bank";

    const connectionId = crypto.randomUUID();
    await upsertConnection({
      id: connectionId,
      user_id: userId,
      provider,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      connected_at: Date.now(),
    });

    for (const acc of all) {
      await upsertAccount({
        uid: acc.uid,
        user_id: userId,
        bank: acc.provider,
        name: acc.name,
        iban: acc.iban,
        currency: acc.currency,
        kind: acc.kind,
        logo: acc.logo,
        connection_id: connectionId,
        connected_at: Date.now(),
      });
    }

    // Pull as much history as the bank allows right now — while *this*
    // connection's consent session is fresh, banks return up to ~23 months
    // (vs. 90 days in the background). Scope the deep pull to the connection we
    // just authenticated; other (stale) connections would 403 on old history.
    // Override the window with TRUELAYER_HISTORY_DAYS if needed.
    //
    // The backfill can take a while, so it must not block the redirect (a
    // serverless request that stays open long enough to finish would time out
    // and leave the user staring at a spinner). Persist the connection/accounts
    // synchronously above, redirect immediately, and run the deep pull
    // out-of-band via after() — it keeps executing after the response is sent.
    const historyDays = Number(process.env.TRUELAYER_HISTORY_DAYS) || 730;
    after(async () => {
      try {
        await syncAll(userId, { days: historyDays, connectionId });
      } catch (err) {
        console.error("callback deep sync failed", err);
      }
    });
    return NextResponse.redirect(
      `${base}/?connected=${encodeURIComponent(provider)}&syncing=1`,
    );
  } catch (e: any) {
    return NextResponse.redirect(
      `${base}/?error=${encodeURIComponent(e.message)}`,
    );
  }
}
