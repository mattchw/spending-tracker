import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Protect every route except the sign-in page and the Auth.js endpoints.
// Unauthenticated API calls get a 401 (so the client can react); page requests
// are redirected to the sign-in page.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  // /api/cron is machine-to-machine (Vercel Cron) and guards itself with
  // CRON_SECRET, so it must bypass the session-cookie check here.
  const isPublic =
    pathname.startsWith("/signin") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron");
  if (req.auth || isPublic) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL("/signin", req.nextUrl);
  url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
