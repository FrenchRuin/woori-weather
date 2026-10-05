"use client";

// 루트 레이아웃까지 실패했을 때. 전역 스타일이 없으므로 인라인 스타일만 쓴다.
import { WeatherIcon } from "@/components/WeatherIcon";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "#F3F9FE",
          color: "#17324A",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <title>우리동네 날씨</title>
        <WeatherIcon name="rain" size={112} animated />
        <b style={{ fontSize: 20 }}>잠깐 문제가 생겼어요</b>
        <span style={{ fontSize: 15, color: "#3B5A75" }}>
          잠시 후 다시 시도해주세요
        </span>
        <button
          type="button"
          onClick={retry}
          style={{
            marginTop: 16,
            height: 52,
            width: 240,
            border: 0,
            borderRadius: 14,
            background: "#2B95E9",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
