// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// -- helper: file publik / path publik
const PUBLIC_FILE = /\.(?:.*)$/i;
const PUBLIC_PREFIXES = ['/_next', '/favicon', '/.well-known'];

function isPublicPath(pathname: string) {
  if (
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth')
  ) return true;
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true;
  if (PUBLIC_FILE.test(pathname)) return true;
  return false;
}

// 🔧 Definisikan adapter cookies kita sendiri (stabil antar versi)
type SupaCookieMethods = {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
  remove: (name: string, options?: CookieOptions) => void;
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login/register TIDAK kita anggap publik, supaya bisa auto-redirect ke dashboard jika sudah login
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return res; // fail-open kalau env belum ada

  const cookiesAdapter: SupaCookieMethods = {
    get(name) {
      return req.cookies.get(name)?.value;
    },
    set(name, value, options) {
      res.cookies.set({ name, value, ...options });
    },
    remove(name, options) {
      res.cookies.set({ name, value: '', maxAge: 0, ...options });
    },
  };

  const supabase = createServerClient(url, anon, { cookies: cookiesAdapter });

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data?.user ?? null;

  // Belum login → redirect ke /login dengan ?next=
  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Sudah login tapi akses /login atau /register → dorong ke dashboard
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    const dash = req.nextUrl.clone();
    dash.pathname = '/dashboard/overview';
    return NextResponse.redirect(dash);
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
