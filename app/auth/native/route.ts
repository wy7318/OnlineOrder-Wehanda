import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Called by the mobile WebView shell to exchange native Supabase tokens for
// a proper server-side session cookie, then redirect into the app.
// The mobile app loads: /auth/native?access_token=...&refresh_token=...&next=/select-restaurant
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const access_token = searchParams.get('access_token')
  const refresh_token = searchParams.get('refresh_token')

  // Only allow same-origin relative redirects to prevent open-redirect abuse
  const rawNext = searchParams.get('next') ?? '/select-restaurant'
  const next = rawNext.startsWith('/') ? rawNext : '/select-restaurant'

  if (!access_token || !refresh_token) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // setSession writes the auth cookie via the setAll callback above so that
  // the middleware on the redirect destination sees an authenticated request.
  const { error } = await supabase.auth.setSession({ access_token, refresh_token })

  if (error) {
    console.error('[auth/native] setSession failed:', error.message)
    return NextResponse.redirect(new URL('/login', origin))
  }

  return NextResponse.redirect(new URL(next, origin))
}
