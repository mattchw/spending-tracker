import { auth } from "@/auth";
import { ensureUser } from "@/lib/db";

/**
 * Resolve the signed-in user's id for a request handler, upserting their record
 * (and claiming any legacy data) on the way. Returns null when unauthenticated
 * so callers can respond 401. Middleware already blocks anonymous requests, but
 * routes guard again in case they're hit directly.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  const user = session?.user as
    | { id?: string; email?: string | null; name?: string | null; image?: string | null }
    | undefined;
  if (!user?.id) return null;
  await ensureUser({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  });
  return user.id;
}
