import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-dev'
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  // Define route rules
  const isAuthRoute = pathname.startsWith('/login');
  const isApiRoute = pathname.startsWith('/api/');

  // Skip middleware/proxy for static assets/next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Allow API auth endpoints to be requested freely
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Allow developer seed route in development mode only
  if (pathname.startsWith('/api/debug/')) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Debug endpoints are disabled in production' },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  let user = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      user = payload as any;
    } catch (e) {
      // Invalid or expired token
    }
  }

  // 1. Not logged in
  if (!user) {
    if (isAuthRoute) return NextResponse.next();
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Logged in, trying to access /login
  if (isAuthRoute) {
    return NextResponse.redirect(new URL(getDefaultRoute(user.role), request.url));
  }

  // 3. RBAC checks for UI routes
  if (!isApiRoute) {
    const authorized = checkRoleAccess(pathname, user.role);
    if (!authorized) {
      // Redirect to default home page if role is not authorized for path
      return NextResponse.redirect(new URL(getDefaultRoute(user.role), request.url));
    }
  }

  return NextResponse.next();
}

// Export as default for next.js proxy support
export default proxy;

function getDefaultRoute(role: string): string {
  switch (role) {
    case 'store-hand':
      return '/inventory';
    case 'supervisor':
      return '/escalations';
    case 'manager':
    case 'quality-assurance':
    case 'superadmin':
      return '/dashboard';
    default:
      return '/login';
  }
}

function checkRoleAccess(pathname: string, role: string): boolean {
  if (pathname === '/') return true;

  if (pathname.startsWith('/inventory')) {
    return ['store-hand', 'supervisor', 'manager', 'quality-assurance', 'superadmin'].includes(role);
  }
  if (pathname.startsWith('/escalations')) {
    return ['supervisor', 'manager', 'quality-assurance', 'superadmin'].includes(role);
  }
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings/thresholds') ||
    pathname.startsWith('/settings/notifications')
  ) {
    return ['manager', 'quality-assurance', 'superadmin'].includes(role);
  }
  if (pathname.startsWith('/settings/users')) {
    return role === 'superadmin';
  }
  return true;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
