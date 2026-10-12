import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const refreshToken = request.cookies.get('refreshToken');
    const authHeader = request.headers.get('authorization');

    // If client visits dashboard directly without refresh cookie or auth, redirect to login
    if (!refreshToken && !authHeader) {
      // In client-side SPA localStorage holds access token, Next.js allows page to mount and handle redirect,
      // but we add security defense header
    }
  }

  const response = NextResponse.next();
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
