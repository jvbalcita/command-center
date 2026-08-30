import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware that protects API routes with local-access or token auth.
 *
 * Security model (local-first app):
 * 1. If API_SECRET env var is set → require `Authorization: Bearer ***` header
 * 2. If API_SECRET is NOT set → allow localhost connections only (127.0.0.1 / ::1)
 *
 * Page routes (GET /) are NOT protected — only /api/* routes.
 */

const API_SECRET = process.env.API_SECRET;

export function middleware(request: NextRequest) {
  // Only protect API routes
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // If API_SECRET is configured, enforce bearer token
  if (API_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized — provide a valid Authorization header" },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  // No API_SECRET configured — fall back to localhost-only access
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "";

  const isLocal =
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip === "" || // local connections with no IP header
    ip === "localhost";

  if (!isLocal) {
    return NextResponse.json(
      {
        error: "Forbidden — API is local-only. Set API_SECRET to allow remote access.",
      },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
