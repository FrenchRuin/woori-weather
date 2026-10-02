import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리동네 날씨",
  description: "예보 말고, 지금 우리 동네 사람들이 느끼는 진짜 날씨",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C6E6FB",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <div className="bg-canvas mx-auto min-h-dvh w-full max-w-[420px]">
          {children}
        </div>
      </body>
    </html>
  );
}
