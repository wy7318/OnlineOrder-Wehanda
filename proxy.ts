import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log('[proxy] →', request.method, pathname)

  try {
    // Use plain NextResponse.next() — do NOT pass { request } (breaking change in Next.js 16)
    const response = NextResponse.next()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Write refreshed tokens into the outgoing response only
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    console.log('[proxy] user:', user?.id ?? 'none', '| authError:', error?.message ?? 'none')

    // Dashboard routes that require authentication
    const isDashboardRoute =
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/orders') ||
      pathname.startsWith('/customers') ||
      pathname.startsWith('/reservations') ||
      pathname.startsWith('/menu') ||
      pathname.startsWith('/setup') ||
      pathname.startsWith('/select-restaurant') ||
      pathname.startsWith('/admin')

    if (isDashboardRoute && !user) {
      console.log('[proxy] protected route, no user → redirecting to /login')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Already logged-in users don't need to see auth pages
    const isAuthRoute = pathname === '/login' || pathname === '/register'
    if (isAuthRoute && user) {
      console.log('[proxy] auth route, user present → redirecting to /dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  } catch (err) {
    console.error('[proxy] UNCAUGHT ERROR:', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|restaurant/|api/auth/callback).*)',
  ],
}
