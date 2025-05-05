import { jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_SUPABASE_JWT_SECRET)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.warn('[Middleware Auth Error]:', err.message)
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
