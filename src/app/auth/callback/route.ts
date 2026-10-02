import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Supabase OAuth(PKCE) 콜백: code → 세션. 이후 라우팅(온보딩/메인)은 proxy 가 결정한다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  const fail = (reason: string) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", reason);
    return NextResponse.redirect(url);
  };

  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) return fail(providerError);
  if (!code) return fail("missing_code");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

  return NextResponse.redirect(new URL("/", origin));
}
