import { NextResponse } from "next/server";
import { setCategoryForTransaction } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { id, category } = await req.json();
    if (!id || !category) {
      return NextResponse.json(
        { error: "id and category are required" },
        { status: 400 },
      );
    }
    const result = await setCategoryForTransaction(
      userId,
      String(id),
      String(category),
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
