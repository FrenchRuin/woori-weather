import "server-only";

import type { Base } from "./baseTime";

const BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

export type KmaOperation =
  "getUltraSrtNcst" | "getUltraSrtFcst" | "getVilageFcst";

export type KmaItem = {
  category: string;
  fcstDate?: string;
  fcstTime?: string;
  fcstValue?: string;
  obsrValue?: string;
};

export class KmaError extends Error {}

/** Encoding 키를 넣어도 동작하도록 한 번 디코딩한다 (URLSearchParams 가 다시 인코딩) */
function serviceKey() {
  const raw = process.env.KMA_SERVICE_KEY ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

type KmaResponse = {
  response?: {
    header: { resultCode: string; resultMsg: string };
    body?: { items?: { item?: KmaItem[] } };
  };
};

export async function kmaFetch(
  operation: KmaOperation,
  base: Base,
  grid: { nx: number; ny: number },
  numOfRows: number,
): Promise<KmaItem[]> {
  const params = new URLSearchParams({
    serviceKey: serviceKey(),
    dataType: "JSON",
    pageNo: "1",
    numOfRows: String(numOfRows),
    base_date: base.baseDate,
    base_time: base.baseTime,
    nx: String(grid.nx),
    ny: String(grid.ny),
  });

  const res = await fetch(`${BASE_URL}/${operation}?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const text = await res.text();

  let json: KmaResponse;
  try {
    json = JSON.parse(text) as KmaResponse;
  } catch {
    throw new KmaError(`${operation} ${res.status}: ${text.slice(0, 200)}`);
  }
  const header = json.response?.header;
  if (!header) {
    // 인증키 오류 등은 OpenAPI_ServiceResponse 형태로 온다
    throw new KmaError(`${operation} ${res.status}: ${text.slice(0, 200)}`);
  }
  if (header.resultCode !== "00") {
    throw new KmaError(
      `${operation} ${base.baseDate} ${base.baseTime}: ${header.resultCode} ${header.resultMsg}`,
    );
  }
  return json.response?.body?.items?.item ?? [];
}
