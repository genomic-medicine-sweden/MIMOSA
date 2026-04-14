import { NextResponse } from "next/server";

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const basePath = process.env.MIMOSA_RELATIVE_URL_BASE || "";
  const token = request.cookies.get("access_token")?.value;

  if (pathname.startsWith(`${basePath}/dashboard`) && !token) {
    return NextResponse.redirect(new URL(`${basePath}/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
