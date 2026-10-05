import type { ReactNode } from "react";

type Props = {
  icon: ReactNode; // WeatherIcon 이나 Emoji
  title: string;
  description: string;
  children: ReactNode; // 버튼
};

/** 에러 / 없는 페이지 등 전체 화면 안내 */
export function StatusScreen({ icon, title, description, children }: Props) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
      {icon}
      <h1 className="mt-2 text-xl font-extrabold">{title}</h1>
      <p className="text-[15px] leading-normal break-keep text-[#3B5A75]">
        {description}
      </p>
      <div className="mt-4 flex w-full max-w-70 flex-col gap-2">{children}</div>
    </main>
  );
}

export const primaryButton =
  "flex h-13 items-center justify-center rounded-[14px] bg-primary text-base font-bold text-white";
export const secondaryButton =
  "flex h-13 items-center justify-center rounded-[14px] bg-field text-base font-bold text-sub";
