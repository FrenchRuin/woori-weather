/**
 * 체감온도 (℃, 소수 1자리).
 * 겨울(11~3월)이고 기온 10℃ 이하, 풍속 1.3m/s 이상이면 기상청 겨울 체감온도(풍랭) 공식을 쓰고,
 * 그 외에는 기온 그대로.
 */
export function feelsLike(temp: number, windMs: number, month: number) {
  const winter = month >= 11 || month <= 3;
  if (!winter || temp > 10 || windMs < 1.3) return temp;

  const v = Math.pow(windMs * 3.6, 0.16); // km/h
  const value = 13.12 + 0.6215 * temp - 11.37 * v + 0.3965 * v * temp;
  return Math.round(value * 10) / 10;
}
