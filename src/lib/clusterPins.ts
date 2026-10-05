import type { DongPin } from "./dongPins";

/** 화면(px) 좌표가 붙은 동네 */
export type ScreenPin = { pin: DongPin; x: number; y: number };

/** 화면에서 겹쳐 하나로 묶인 동네들 (혼자면 pins 가 1개) */
export type PinCluster = {
  lead: DongPin; // 이야기가 가장 많은 동네. 묶음은 이 동네 자리에 그린다
  pins: DongPin[];
  total: number; // 이야기 수 합계
  mine: boolean; // 내 동네 포함
};

/** 말풍선 크기 정도. 대표와 이보다 가까우면 겹친다고 본다 */
export const CLUSTER_GAP = { x: 120, y: 40 };

const byLead = (a: ScreenPin, b: ScreenPin) =>
  b.pin.count - a.pin.count ||
  Number(b.pin.mine) - Number(a.pin.mine) ||
  a.pin.name.localeCompare(b.pin.name);

/** 이야기가 많은 동네부터 대표로 삼고, 대표와 겹치는 동네를 흡수한다 */
export function clusterPins(
  points: ScreenPin[],
  gap = CLUSTER_GAP,
): PinCluster[] {
  const left = [...points].sort(byLead);
  const clusters: PinCluster[] = [];

  while (left.length > 0) {
    const lead = left.shift()!;
    const members = [lead];
    for (let i = left.length - 1; i >= 0; i--) {
      const p = left[i];
      if (Math.abs(p.x - lead.x) < gap.x && Math.abs(p.y - lead.y) < gap.y) {
        members.push(p);
        left.splice(i, 1);
      }
    }
    const pins = members.map((m) => m.pin);
    clusters.push({
      lead: lead.pin,
      pins,
      total: pins.reduce((sum, p) => sum + p.count, 0),
      mine: pins.some((p) => p.mine),
    });
  }
  return clusters;
}
