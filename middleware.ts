import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = "martenbooks.com";

/** Legacy Vercel project hostnames — send traffic to the public domain. */
function isLegacyProjectHost(host: string): boolean {
  const h = host.toLowerCase();
  return h.includes("busi-snapspend") || h.includes("busi_snapspend");
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] || "";

  if (isLegacyProjectHost(host) && host !== CANONICAL_HOST && host !== `www.${CANONICAL_HOST}`) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js).*)"],
};
