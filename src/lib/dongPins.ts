/** 지도에 찍을 동네 하나 */
export type DongPin = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  count: number; // 최근 6시간 이야기 수
  mine: boolean;
};

export type DongRow = { code: string; name: string; lat: number; lng: number };

/** 글의 동네 코드 목록 → 동네별 개수 */
export function countByDong(dongCodes: string[]) {
  const counts = new Map<string, number>();
  for (const code of dongCodes) counts.set(code, (counts.get(code) ?? 0) + 1);
  return counts;
}

/** 개수가 있는 동네 + 내 동네(0개여도 항상) */
export function toDongPins(
  counts: Map<string, number>,
  dongs: DongRow[],
  myDongCode: string,
): DongPin[] {
  return dongs
    .filter((d) => d.code === myDongCode || (counts.get(d.code) ?? 0) > 0)
    .map((d) => ({
      code: d.code,
      name: d.name,
      lat: d.lat,
      lng: d.lng,
      count: counts.get(d.code) ?? 0,
      mine: d.code === myDongCode,
    }));
}
