import { NextRequest, NextResponse } from 'next/server'
import { Configuration, FrontendApi } from '@ory/client'

const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.ORY_SDK_URL || 'http://localhost:4433',
  })
)

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip middleware for API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next()
  }

  // Protected routes
  const protectedRoutes = ['/dashboard', '/settings']
  const authRoutes = ['/login', '/registration', '/recovery', '/verification']

  try {
    const session = await ory.toSession({
      cookie: req.headers.get('cookie') || '',
    })

    // User is authenticated
    if (authRoutes.includes(pathname)) {
      // Redirect to dashboard if already logged in
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Allow access to protected routes
    if (protectedRoutes.includes(pathname)) {
      return NextResponse.next()
    }

    return NextResponse.next()
  } catch (error) {
    // User is not authenticated
    if (protectedRoutes.includes(pathname)) {
      // Redirect to login
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Allow access to auth routes
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
