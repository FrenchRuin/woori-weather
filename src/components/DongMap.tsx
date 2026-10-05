"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { clusterPins, type PinCluster } from "@/lib/clusterPins";
import type { DongPin } from "@/lib/dongPins";
import { loadKakaoMaps } from "@/lib/kakaoMaps";

import { DongPostsSheet } from "./DongPostsSheet";
import { Crosshair } from "./icons";

const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const LEVEL = 6; // 동네 이름이 겹치지 않고 주변 동네가 보이는 정도
const FALLBACK = { lat: 37.5665, lng: 126.978 }; // 내 동네 좌표가 없을 때(서울시청)

type Props = { pins: DongPin[] };

/** 이웃 동네 지도: 동네마다 최근 6시간 이야기 수 말풍선 */
export function DongMap({ pins }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const [maps, setMaps] = useState<typeof kakao.maps | null>(null);
  const [failed, setFailed] = useState(!KEY);
  const [selected, setSelected] = useState<DongPin | null>(null);

  const home = pins.find((p) => p.mine) ?? FALLBACK;
  const empty = pins.every((p) => p.count === 0);

  useEffect(() => {
    if (!KEY) return;
    let active = true;
    loadKakaoMaps().then(
      (loaded) => active && setMaps(() => loaded),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!maps || !container) return;
    const sdk = maps; // draw() 안에서도 null 이 아님을 유지

    const map = new maps.Map(container, {
      center: new maps.LatLng(home.lat, home.lng),
      level: LEVEL,
    });
    mapRef.current = map;
    let overlays: kakao.maps.CustomOverlay[] = [];

    /** 확대 수준이 바뀔 때마다 화면에서 겹치는 동네를 묶어 다시 그린다 */
    function draw() {
      overlays.forEach((o) => o.setMap(null));
      const projection = map.getProjection();
      const clusters = clusterPins(
        pins.map((pin) => {
          const point = projection.containerPointFromCoords(
            new sdk.LatLng(pin.lat, pin.lng),
          );
          return { pin, x: point.x, y: point.y };
        }),
      );
      overlays = clusters.map(
        (cluster) =>
          new sdk.CustomOverlay({
            position: new sdk.LatLng(cluster.lead.lat, cluster.lead.lng),
            content: clusterElement(cluster, () => {
              if (cluster.pins.length === 1) setSelected(cluster.lead);
              else map.setBounds(boundsOf(sdk, cluster.pins), 90, 40, 90, 40);
            }),
            yAnchor: 0.5,
            zIndex: cluster.mine ? 2 : 1,
            clickable: true,
            map,
          }),
      );
    }

    draw();
    maps.event.addListener(map, "zoom_changed", draw);
    return () => {
      maps.event.removeListener(map, "zoom_changed", draw);
      overlays.forEach((o) => o.setMap(null));
      mapRef.current = null;
      container.replaceChildren(); // 다시 그릴 때 지도 DOM 이 쌓이지 않게
    };
  }, [maps, pins, home.lat, home.lng]);

  function goHome() {
    if (maps) mapRef.current?.panTo(new maps.LatLng(home.lat, home.lng));
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-[#E3EEF6]">
      <div ref={containerRef} className="absolute inset-0" />

      <header className="absolute inset-x-3 top-3 z-10 flex items-center gap-1 rounded-2xl bg-white/95 py-1.5 pr-4 pl-1 shadow-[0_6px_16px_rgba(23,50,74,.12)]">
        <Link
          href="/"
          aria-label="뒤로"
          className="flex size-10 items-center justify-center text-[26px]"
        >
          ‹
        </Link>
        <div className="flex flex-col">
          <h1 className="text-[17px] font-bold">이웃 동네 이야기</h1>
          <span className="text-xs text-[#6B8299]">최근 6시간</span>
        </div>
      </header>

      {failed ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-canvas px-8 text-center">
          <p className="text-[15px] font-semibold text-[#3B5A75]">
            지도를 불러오지 못했어요
          </p>
          <Link
            href="/"
            className="flex h-12 w-full max-w-60 items-center justify-center rounded-[14px] bg-primary text-base font-bold text-white"
          >
            뒤로 가기
          </Link>
        </div>
      ) : (
        <>
          {empty && (
            <p className="absolute inset-x-3 top-20 z-10 rounded-xl bg-ink/85 px-4 py-2.5 text-center text-sm font-semibold text-white">
              아직 이야기가 있는 동네가 없어요
            </p>
          )}
          <button
            type="button"
            onClick={goHome}
            className="absolute right-4 bottom-[calc(24px+env(safe-area-inset-bottom))] z-10 flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-ink shadow-[0_6px_16px_rgba(23,50,74,.18)]"
          >
            <Crosshair
              size={18}
              weight="bold"
              className="text-primary"
              aria-hidden
            />
            내 동네로
          </button>
        </>
      )}

      <DongPostsSheet dong={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

function boundsOf(maps: typeof kakao.maps, pins: DongPin[]) {
  const bounds = new maps.LatLngBounds();
  pins.forEach((p) => bounds.extend(new maps.LatLng(p.lat, p.lng)));
  return bounds;
}

/**
 * 말풍선 DOM. 혼자면 "역삼1동 3", 묶이면 "신천동 외 3곳 19"(누르면 확대).
 * 동네 이름은 textContent 로만 넣는다 (HTML 해석 금지)
 */
function clusterElement(cluster: PinCluster, onClick: () => void) {
  const others = cluster.pins.length - 1;
  const label =
    others === 0 ? cluster.lead.name : `${cluster.lead.name} 외 ${others}곳`;

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(
    "aria-label",
    others === 0
      ? `${label} 이야기 ${cluster.total}개`
      : `${label} 이야기 ${cluster.total}개, 눌러서 확대`,
  );
  button.className = `flex items-center gap-1.5 rounded-full py-1.5 pr-1.5 pl-3 text-sm font-bold whitespace-nowrap shadow-[0_4px_12px_rgba(23,50,74,.18)] ${cluster.mine ? "bg-primary text-white" : "bg-white text-ink"}`;

  const name = document.createElement("span");
  name.textContent = label;
  const badge = document.createElement("span");
  badge.className = `min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-extrabold ${cluster.mine ? "bg-white text-primary-strong" : "bg-primary text-white"}`;
  badge.textContent = String(cluster.total);

  button.append(name, badge);
  button.addEventListener("click", onClick);
  return button;
}
