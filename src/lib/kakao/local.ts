import "server-only";

const BASE = "https://dapi.kakao.com/v2/local";

export type HDong = {
  code: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
};

export type Point = { lat: number; lng: number };

export class KakaoError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`Kakao Local API ${status}: ${body.slice(0, 200)}`);
  }
}

async function call<T>(path: string, params: Record<string, string>) {
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    cache: "no-store",
  });
  if (!res.ok) throw new KakaoError(res.status, await res.text());
  return (await res.json()) as T;
}

type RegionDoc = {
  region_type: "B" | "H";
  code: string;
  address_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  x: number;
  y: number;
};

/** 좌표 → 행정동 (region_type H) */
export async function coordToHDong({ lat, lng }: Point): Promise<HDong | null> {
  const { documents } = await call<{ documents: RegionDoc[] }>(
    "/geo/coord2regioncode.json",
    { x: String(lng), y: String(lat) },
  );
  const h = documents.find((d) => d.region_type === "H");
  if (!h) return null;
  return {
    code: h.code,
    name: h.region_3depth_name || h.region_2depth_name,
    fullName: h.address_name,
    lat: Number(h.y),
    lng: Number(h.x),
  };
}

/** 주소(동 이름) 검색 결과 좌표 */
export async function searchAddressPoints(query: string): Promise<Point[]> {
  const { documents } = await call<{ documents: { x: string; y: string }[] }>(
    "/search/address.json",
    { query, size: "10" },
  );
  return documents.map((d) => ({ lat: Number(d.y), lng: Number(d.x) }));
}

/** 장소(역, 건물 등) 검색 결과 좌표 */
export async function searchKeywordPoints(query: string): Promise<Point[]> {
  const { documents } = await call<{ documents: { x: string; y: string }[] }>(
    "/search/keyword.json",
    { query, size: "5" },
  );
  return documents.map((d) => ({ lat: Number(d.y), lng: Number(d.x) }));
}
