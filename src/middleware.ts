// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_FILE = /\.(.*)$/i;

function isPublicPath(pathname: string) {
  // halaman/asset publik yang boleh tanpa login
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth')|| // kalau pakai callback route
        pathname.startsWith('/forgot-password') ||   // ✅ tambahkan ini
    pathname.startsWith('/reset-password') ||    // ✅ dan ini
    pathname.startsWith('/auth')                 // callback route, kalau ada
  ) return true;

  // file statis Next
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    PUBLIC_FILE.test(pathname)
  ) return true;

  return false;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Supabase client di middleware: penting set/get cookies dari req/res
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  const { pathname } = req.nextUrl;
  const onPublic = isPublicPath(pathname);

  // belum login & bukan public page -> redirect ke /login?next=...
  if (!user && !onPublic) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // sudah login tapi sedang di halaman login/register -> lempar ke dashboard
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    const dash = req.nextUrl.clone();
    dash.pathname = '/dashboard/overview'; // ubah default target sesuai app kamu
    return NextResponse.redirect(dash);
  }

  return res;
}

export const config = {
  // jalankan middleware untuk semua path kecuali file statis
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
