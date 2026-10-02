import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { MyPost, Post, PostScope, PostSort, PostTag } from "@/types";

const HOUR_MS = 60 * 60 * 1000;
export const RECENT_HOURS = 6; // R10: 최근 글
const MAX_HOURS = 24; // R10: 지난 글은 24시간까지

const FEED_COLUMNS =
  "id, nickname, content, tag, like_count, liked_by_me, is_mine, created_at";

type FeedRow = {
  id: string | null;
  nickname: string | null;
  content: string | null;
  tag: string | null;
  like_count: number | null;
  liked_by_me: boolean | null;
  is_mine: boolean | null;
  created_at: string | null;
};

export function toPost(row: FeedRow): Post {
  return {
    id: row.id!,
    nickname: row.nickname ?? "",
    content: row.content ?? "",
    tag: (row.tag as PostTag | null) ?? null,
    likeCount: row.like_count ?? 0,
    likedByMe: row.liked_by_me ?? false,
    isMine: row.is_mine ?? false,
    createdAt: row.created_at!,
  };
}

export type ListOptions = {
  dongCode: string;
  sort: PostSort;
  scope: PostScope;
  tag?: PostTag;
  limit: number;
};

/** 동네 한마디 목록 (숨김 글 제외) + 조건에 맞는 전체 개수 */
export async function listPosts(
  supabase: SupabaseClient<Database>,
  { dongCode, sort, scope, tag, limit }: ListOptions,
): Promise<{ posts: Post[]; total: number }> {
  const now = Date.now();
  const recentFrom = new Date(now - RECENT_HOURS * HOUR_MS).toISOString();

  let query = supabase
    .from("post_feed")
    .select(FEED_COLUMNS, { count: "exact" })
    .eq("dong_code", dongCode)
    .eq("is_hidden", false);

  query =
    scope === "recent"
      ? query.gt("created_at", recentFrom)
      : query
          .lte("created_at", recentFrom)
          .gt("created_at", new Date(now - MAX_HOURS * HOUR_MS).toISOString());

  if (tag) query = query.eq("tag", tag);

  query =
    sort === "like"
      ? query
          .order("like_count", { ascending: false })
          .order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });

  const { data, count, error } = await query.limit(limit);
  if (error) throw error;
  return { posts: (data ?? []).map(toPost), total: count ?? 0 };
}

export async function getPost(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase
    .from("post_feed")
    .select(FEED_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toPost(data) : null;
}

const MY_POSTS_LIMIT = 100;

/** 내가 쓴 글: 기간 제한 없이, 신고로 숨겨진 글 포함 */
export async function listMyPosts(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<MyPost[]> {
  const { data, error } = await supabase
    .from("post_feed")
    .select(`${FEED_COLUMNS}, is_hidden`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MY_POSTS_LIMIT);
  if (error) throw error;
  return data.map((row) => ({ ...toPost(row), isHidden: !!row.is_hidden }));
}
