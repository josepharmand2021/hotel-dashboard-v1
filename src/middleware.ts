import { NextResponse, type NextRequest } from 'next/server';
import {
  createServerClient,
  type CookieOptions,
} from '@supabase/ssr';

// infer the exact type for the `cookies` option from createServerClient
type CookiesAdapter = NonNullable<
  Parameters<typeof createServerClient>[2]
>['cookies'];

const PUBLIC_FILE = /\.(?:.*)$/i;
const PUBLIC_PREFIXES = ['/_next', '/favicon', '/.well-known'];

function isPublicPath(pathname: string) {
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth')
  ) return true;
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true;
  if (PUBLIC_FILE.test(pathname)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // public paths → skip Supabase
  if (isPublicPath(pathname)) return NextResponse.next();

  const res = NextResponse.next();

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return res; // fail-open if env missing

  const cookiesAdapter: CookiesAdapter = {
    get(name: string) {
      return req.cookies.get(name)?.value;
    },
    set(name: string, value: string, options?: CookieOptions) {
      res.cookies.set({ name, value, ...options });
    },
    remove(name: string, options?: CookieOptions) {
      res.cookies.set({ name, value: '', maxAge: 0, ...options });
    },
  };

  const supabase = createServerClient(url, anon, { cookies: cookiesAdapter });

  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

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
