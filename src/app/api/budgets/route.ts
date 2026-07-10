import { NextResponse } from "next/server";
import { listBudgets, setBudget } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ budgets: await listBudgets(userId) });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const category = String(body.category || "").trim();
    const limit = Number(body.limit);
    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }
    if (!Number.isFinite(limit)) {
      return NextResponse.json({ error: "limit must be a number" }, { status: 400 });
    }
    await setBudget(userId, category, limit);
    return NextResponse.json({ ok: true, budgets: await listBudgets(userId) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save budget" },
      { status: 500 },
    );
  }
}
