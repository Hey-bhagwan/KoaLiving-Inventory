import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/logout', '/api/auth/register'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public auth endpoints
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith('/api/auth/'))) {
    // If user is already authenticated and visits /login or /register, redirect to /dashboard
    if (pathname === '/login' || pathname === '/register') {
      const token = req.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        const session = await verifySessionToken(token);
        if (session?.user) {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
      }
    }
    return NextResponse.next();
  }

  // 2. Check session token for protected routes
  const token = req.cookies.get(COOKIE_NAME)?.value;
  let sessionUser = null;

  if (token) {
    const session = await verifySessionToken(token);
    if (session?.user) {
      sessionUser = session.user;
    }
  }

  // 3. Handle unauthenticated access
  if (!sessionUser) {
    // Return 401 for protected API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Redirect to login for pages
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/' && pathname !== '/dashboard') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. Admin-only route guard
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (sessionUser.role !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden. Administrator access required.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
