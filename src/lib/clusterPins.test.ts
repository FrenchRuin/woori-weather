import { describe, expect, it } from "vitest";

import { clusterPins } from "./clusterPins";
import type { DongPin } from "./dongPins";

const pin = (code: string, count: number, mine = false): DongPin => ({
  code,
  name: `${code}동`,
  lat: 37.5,
  lng: 127,
  count,
  mine,
});
const at = (p: DongPin, x: number, y: number) => ({ pin: p, x, y });
const GAP = { x: 120, y: 40 };

describe("clusterPins", () => {
  it("멀리 떨어진 동네는 각자 하나씩", () => {
    const clusters = clusterPins(
      [at(pin("A", 3), 0, 0), at(pin("B", 1), 300, 0), at(pin("C", 2), 0, 200)],
      GAP,
    );
    expect(clusters).toHaveLength(3);
    expect(clusters.every((c) => c.pins.length === 1)).toBe(true);
  });

  it("겹치는 동네는 이야기가 가장 많은 동네를 대표로 묶고 합계를 낸다", () => {
    const [cluster] = clusterPins(
      [
        at(pin("A", 2), 0, 0),
        at(pin("B", 7), 50, 10),
        at(pin("C", 1), 100, -20),
      ],
      GAP,
    );
    expect(cluster.lead.code).toBe("B");
    expect(cluster.pins.map((p) => p.code).sort()).toEqual(["A", "B", "C"]);
    expect(cluster.total).toBe(10);
  });

  it("겹침 판정은 대표 기준 가로·세로 간격 미만", () => {
    const clusters = clusterPins(
      [
        at(pin("LEAD", 5), 0, 0),
        at(pin("X_EDGE", 1), 120, 0), // 가로 간격과 같으면 따로
        at(pin("Y_EDGE", 1), 0, 40), // 세로 간격과 같으면 따로
        at(pin("IN", 1), 119, 39),
      ],
      GAP,
    );
    const lead = clusters.find((c) => c.lead.code === "LEAD");
    expect(lead?.pins.map((p) => p.code).sort()).toEqual(["IN", "LEAD"]);
    expect(clusters).toHaveLength(3);
  });

  it("내 동네가 묶이면 mine, 개수가 같으면 내 동네가 대표", () => {
    const [cluster] = clusterPins(
      [at(pin("A", 2), 0, 0), at(pin("ME", 2, true), 30, 0)],
      GAP,
    );
    expect(cluster.mine).toBe(true);
    expect(cluster.lead.code).toBe("ME");
  });

  it("다른 묶음에 들어간 동네는 다시 쓰지 않는다", () => {
    // B 는 A·C 둘 다와 겹치지만 대표가 먼저인 A 묶음에만 들어간다
    const clusters = clusterPins(
      [at(pin("A", 9), 0, 0), at(pin("B", 1), 100, 0), at(pin("C", 5), 200, 0)],
      GAP,
    );
    const codes = clusters.flatMap((c) => c.pins.map((p) => p.code)).sort();
    expect(codes).toEqual(["A", "B", "C"]);
    expect(clusters.find((c) => c.lead.code === "A")?.pins).toHaveLength(2);
    expect(clusters.find((c) => c.lead.code === "C")?.pins).toHaveLength(1);
  });

  it("빈 목록이면 빈 결과", () => {
    expect(clusterPins([], GAP)).toEqual([]);
  });
});
