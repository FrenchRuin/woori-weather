export type Dong = { code: string; name: string; fullName: string };

export type Profile = {
  id: string;
  nickname: string;
  dong: Dong;
  nicknameChangeableAt: string | null;
};

export type ApiErrorBody = { error: { code: string; message: string } };

export type Sky = "clear" | "partly" | "cloudy";
export type Pty = "none" | "rain" | "rainsnow" | "snow" | "shower";

export type Weather = {
  now: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    sky: Sky;
    pty: Pty;
    summary: string; // 예: "흐리고 비"
  };
  today: { max: number | null; min: number | null; pop: number };
  hourly: Array<{
    time: string;
    temp: number;
    sky: Sky;
    pty: Pty;
    pop: number;
  }>; // 12개, time 은 KST ISO
  fetchedAt: string;
};

export type Feel = "cold" | "good" | "hot";
export type ReactionTag = "rain" | "wind" | "clear";

export type ReactionSummary = {
  total: number;
  feel: Record<Feel, number>; // 개수
  percent: Record<Feel, number>; // 정수 %
  tags: Record<ReactionTag, number>;
  mine: { feel: Feel; tags: ReactionTag[]; editableUntil: string } | null;
};

export type PostTag = "rain" | "wind" | "temp" | "sun";
export type PostSort = "new" | "like";
export type PostScope = "recent" | "old";

export type Post = {
  id: string;
  nickname: string;
  content: string;
  tag: PostTag | null;
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
  createdAt: string;
};

/** 내 정보의 "내가 쓴 글" (숨김 글 포함) */
export type MyPost = Post & { isHidden: boolean };
