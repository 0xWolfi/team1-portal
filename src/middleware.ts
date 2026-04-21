import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Server-side route protection middleware.
 *
 * Defense-in-depth: even though API routes check Bearer tokens and the
 * frontend has AuthGuard, this middleware ensures unauthenticated users
 * cannot reach protected pages at the edge/server level.
 */

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/apply',
  '/api/auth',          // NextAuth routes
  '/api/applications',  // Public application submission (POST)
  '/api/support',       // Public support form
  '/api/webhooks',      // Inbound webhooks (have their own auth)
  '/_next',             // Next.js internals
  '/favicon.ico',
  '/logos',
  '/images',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and static assets
  if (isPublicPath(pathname) || pathname === '/') {
    return NextResponse.next()
  }

  // Check for NextAuth session (JWT strategy)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Also check for our custom access token cookie (set by refresh/login endpoints)
  const accessToken = request.cookies.get('accessToken')?.value

  if (!token && !accessToken) {
    // Redirect to login for page requests, return 401 for API requests
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and _next internals
    '/((?!_next/static|_next/image|favicon.ico|logos|images).*)',
  ],
}
