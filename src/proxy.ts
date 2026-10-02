import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // 세션 쿠키 갱신 (@supabase/ssr 권장 패턴)
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const res = NextResponse.redirect(url);
    // 갱신된 세션 쿠키를 리다이렉트 응답에도 실어 보낸다
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  // R1: 비로그인 → /login
  if (!userId) {
    if (isPublic) return response;
    if (isApi) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요해요" } },
        { status: 401 },
      );
    }
    return redirectTo("/login");
  }

  // API 는 각 핸들러가 권한을 검사한다 (온보딩 중에도 호출해야 하므로)
  if (isApi || pathname.startsWith("/auth/")) return response;

  // R2: 프로필 없으면 /onboarding, 있으면 /login·/onboarding 접근 시 메인으로
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return pathname === "/onboarding" ? response : redirectTo("/onboarding");
  }
  if (pathname === "/login" || pathname === "/onboarding") {
    return redirectTo("/");
  }
  return response;
}

export const config = {
  matcher: [
    // 정적 파일·이미지 제외
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
