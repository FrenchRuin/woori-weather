/**
 * 개수 → 정수 % (합이 정확히 100이 되도록 최대 잔여 방식으로 반올림).
 * 전체가 0이면 모두 0.
 */
export function toPercents<K extends string>(
  counts: Record<K, number>,
): Record<K, number> {
  const keys = Object.keys(counts) as K[];
  const total = keys.reduce((sum, k) => sum + counts[k], 0);
  const result = {} as Record<K, number>;
  if (total === 0) {
    for (const k of keys) result[k] = 0;
    return result;
  }

  const raw = keys.map((k) => ({ k, exact: (counts[k] / total) * 100 }));
  for (const { k, exact } of raw) result[k] = Math.floor(exact);
  let remaining = 100 - keys.reduce((sum, k) => sum + result[k], 0);

  for (const { k } of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (remaining <= 0) break;
    result[k] += 1;
    remaining -= 1;
  }
  return result;
}
