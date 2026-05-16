import { NextRequest, NextResponse } from 'next/server';

function decodeJwtPayload(token: string): { role?: string; exp?: number } | null {
  try {
    const [, payload] = token.split('.');
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/') + '==';
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const refreshToken = req.cookies.get('refreshToken')?.value;
  const authToken = req.cookies.get('auth_token')?.value;

  // No session at all → redirect to login
  if (!refreshToken && !authToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Has access token → check role and expiry
  if (authToken) {
    const payload = decodeJwtPayload(authToken);
    const isExpired = !payload?.exp || payload.exp * 1000 < Date.now();

    if (!isExpired && payload?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    // If expired but has refreshToken → allow through (client handles refresh + revalidation)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
