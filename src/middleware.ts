// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PUBLIC_FILE = /\.(?:.*)$/i;
const PUBLIC_PREFIXES = ['/_next', '/favicon', '/.well-known'];

// Selalu publik (tanpa auth)
function isAlwaysPublic(pathname: string) {
  if (
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth') // callback dsb
  ) return true;
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true;
  if (PUBLIC_FILE.test(pathname)) return true;
  return false;
}

type SupaCookieMethods = {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
  remove: (name: string, options?: CookieOptions) => void;
};

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 0) allow file/statik/route publik
  if (isAlwaysPublic(pathname)) return NextResponse.next();

  const res = NextResponse.next();

  // 1) ENV guard (⚠️ penting: jangan lempar error dari edge)
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Fail-open supaya /login tetap bisa render
    console.warn('Supabase env missing in middleware; allow request');
    return res;
  }

  const cookiesAdapter: SupaCookieMethods = {
    get: (name) => req.cookies.get(name)?.value,
    set: (name, value, options) => { res.cookies.set({ name, value, ...options }); },
    remove: (name, options) => { res.cookies.set({ name, value: '', maxAge: 0, ...options }); },
  };

  // 2) Cek sesi user (fail-open kalau error)
  let user: any = null;
  try {
    const supabase = createServerClient(url, anon, { cookies: cookiesAdapter });
    const { data, error } = await supabase.auth.getUser();
    user = error ? null : data?.user ?? null;
  } catch (e) {
    console.error('middleware supabase error:', e);
    return res; // biarkan lewat daripada 500
  }

  // 3) /login & /register
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (user) {
      const dash = req.nextUrl.clone();
      dash.pathname = '/dashboard/overview';
      dash.search = '';
      return NextResponse.redirect(dash);
    }
    return res; // belum login → biarkan halaman login render
  }

  // 4) Route lain → wajib login
  if (!user) {
    const login = req.nextUrl.clone();
    login.pathname = '/login';

    // Anti-loop: hanya set ?next jika target bukan login/register/auth
    const target = pathname + search;
    if (
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/register') &&
      !pathname.startsWith('/auth')
    ) {
      login.search = '';
      login.searchParams.set('next', target);
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
