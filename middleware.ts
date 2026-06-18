import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/auth/login', '/auth/register']

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(pathname)
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('arb-access-token')?.value

  if (pathname.startsWith('/auth') && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isPublicPath(pathname) && !accessToken) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.webp).*)'],
}