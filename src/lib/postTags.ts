import type { PostTag } from "@/types";

export const POST_TAGS: {
  key: PostTag;
  label: string;
  badge: string; // 배지 배경/글자색
}[] = [
  { key: "rain", label: "☔ 비", badge: "bg-[#E4F0FD] text-[#2F6FC0]" },
  { key: "wind", label: "💨 바람", badge: "bg-[#E6F6EF] text-[#1F8A57]" },
  { key: "temp", label: "🌡️ 기온", badge: "bg-[#FFF0E4] text-[#C25A12]" },
  { key: "sun", label: "🌤️ 맑음", badge: "bg-[#FFF7D6] text-[#93700A]" },
];

export const postTagMeta = (tag: PostTag) =>
  POST_TAGS.find((t) => t.key === tag)!;
