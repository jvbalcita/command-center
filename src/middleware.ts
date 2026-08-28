import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware that protects API routes with optional token auth.
 *
 * Security model:
 * 1. If API_SECRET env var is set → require `Authorization: Bearer ***` header
 * 2. If API_SECRET is NOT set → allow all access (local and remote)
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
  }

  // No API_SECRET configured — allow all access
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
