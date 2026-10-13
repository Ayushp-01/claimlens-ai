import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('claimlens_token')?.value;
  const role = request.cookies.get('claimlens_role')?.value;

  // Static assets and API routes shouldn't be blocked
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Root path redirect if authenticated via cookie
  if (pathname === '/') {
    if (token) {
      if (role === 'patient') {
        return NextResponse.redirect(new URL('/patient/dashboard', request.url));
      } else if (role === 'investigator' || role === 'admin') {
        return NextResponse.redirect(new URL('/investigator/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // Auth pages: do not perform aggressive redirects to prevent any circular bounce loops.
  // Users on /login or /register can always view the login screen cleanly.
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.next();
  }

  // Protected patient portal routes:
  // If an investigator/admin tries to view patient portal, redirect to investigator dashboard
  if (pathname.startsWith('/patient')) {
    if (token && role && role !== 'patient') {
      return NextResponse.redirect(new URL('/investigator/dashboard', request.url));
    }
  }

  // Protected investigator portal routes:
  // If a patient tries to view investigator portal, redirect to patient dashboard
  if (pathname.startsWith('/investigator')) {
    if (token && role === 'patient') {
      return NextResponse.redirect(new URL('/patient/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
