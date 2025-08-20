// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PUBLIC_FILE = /\.(?:.*)$/i;
const PUBLIC_PREFIXES = ['/_next', '/favicon', '/.well-known'];

// route yang selalu publik (tanpa auth)
function isAlwaysPublic(pathname: string) {
  if (
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth')            // callback dll
  ) return true;
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true;
  if (PUBLIC_FILE.test(pathname)) return true;
  return false;
}

// adapter cookies stabil
type SupaCookieMethods = {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
  remove: (name: string, options?: CookieOptions) => void;
};

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) Selalu allow untuk file/statik/route publik tertentu
  if (isAlwaysPublic(pathname)) return NextResponse.next();

  const res = NextResponse.next();

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookiesAdapter: SupaCookieMethods = {
    get: (name) => req.cookies.get(name)?.value,
    set: (name, value, options) => { res.cookies.set({ name, value, ...options }); },
    remove: (name, options) => { res.cookies.set({ name, value: '', maxAge: 0, ...options }); },
  };

  const supabase = createServerClient(url, anon, { cookies: cookiesAdapter });
  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data?.user ?? null;

  // 2) Khusus /login & /register:
  //    - kalau SUDAH login → redirect ke dashboard
  //    - kalau BELUM login → biarkan (jangan redirect ke /login lagi!)
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (user) {
      const dash = req.nextUrl.clone();
      dash.pathname = '/dashboard/overview';
      dash.search = '';
      return NextResponse.redirect(dash);
    }
    return res; // allow
  }

  // 3) Semua route lain → wajib login
  if (!user) {
    const login = req.nextUrl.clone();
    login.pathname = '/login';
    // set ?next hanya sekali, jangan nest /login lagi
    if (!pathname.startsWith('/login')) {
      login.searchParams.set('next', pathname + search);
    } else {
      login.search = '';
    }
    return NextResponse.redirect(login);
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
