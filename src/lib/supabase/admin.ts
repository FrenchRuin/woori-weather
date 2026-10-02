import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// service role: RLS 를 우회한다. weather_cache / dongs 쓰기에만 사용.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
