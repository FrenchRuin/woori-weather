const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** KST 기준 자정 이후 일수 (날짜 비교용) */
const kstDay = (ms: number) => Math.floor((ms + KST_OFFSET_MS) / DAY_MS);

/** "방금 / N분 전 / N시간 전 / 어제 / M월 D일" (KST) */
export function relativeTime(iso: string, now: Date = new Date()) {
  const t = new Date(iso).getTime();
  const minutes = Math.floor((now.getTime() - t) / 60_000);

  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  if (kstDay(now.getTime()) - kstDay(t) === 1) return "어제";

  const wall = new Date(t + KST_OFFSET_MS);
  return `${wall.getUTCMonth() + 1}월 ${wall.getUTCDate()}일`;
}
