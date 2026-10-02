// 기상청 단기예보 격자 변환 (Lambert Conformal Conic, 기상청 제공 공식)
const RE = 6371.00877; // 지구 반경 (km)
const GRID = 5.0; // 격자 간격 (km)
const SLAT1 = 30.0; // 표준위도 1
const SLAT2 = 60.0; // 표준위도 2
const OLON = 126.0; // 기준점 경도
const OLAT = 38.0; // 기준점 위도
const XO = 43; // 기준점 X 격자
const YO = 136; // 기준점 Y 격자

const DEGRAD = Math.PI / 180;

const re = RE / GRID;
const slat1 = SLAT1 * DEGRAD;
const slat2 = SLAT2 * DEGRAD;
const olon = OLON * DEGRAD;
const olat = OLAT * DEGRAD;

const sn =
  Math.log(Math.cos(slat1) / Math.cos(slat2)) /
  Math.log(
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
      Math.tan(Math.PI * 0.25 + slat1 * 0.5),
  );
const sf =
  (Math.pow(Math.tan(Math.PI * 0.25 + slat1 * 0.5), sn) * Math.cos(slat1)) / sn;
const ro = (re * sf) / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);

export function toGrid(lat: number, lng: number): { nx: number; ny: number } {
  const ra =
    (re * sf) / Math.pow(Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5), sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}
