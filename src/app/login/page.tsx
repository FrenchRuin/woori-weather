import { Emoji, type EmojiName } from "@/components/Emoji";
import { WeatherIcon } from "@/components/WeatherIcon";

import { KakaoLoginButton } from "./KakaoLoginButton";

const FEELS: { emoji: EmojiName; label: string }[] = [
  { emoji: "cold", label: "추워요" },
  { emoji: "good", label: "딱 좋아요" },
  { emoji: "hot", label: "더워요" },
];

function errorMessage(error: string) {
  if (/email/i.test(error)) {
    return "카카오 계정의 이메일 제공 동의가 필요해요. 다시 시도해주세요.";
  }
  return "로그인에 실패했어요. 다시 시도해주세요.";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const errorText = typeof error === "string" ? error : null;

  return (
    <main className="flex min-h-dvh flex-col bg-linear-to-b from-[#BFE3FB] via-[#E6F4FD] via-55% to-[#F6FBFF] px-6 pb-10">
      <div className="flex flex-1 flex-col items-center justify-center gap-4.5 text-center">
        <div className="flex size-26 items-center justify-center rounded-[32px] bg-white shadow-[0_12px_30px_rgba(43,149,233,.22)]">
          <WeatherIcon name="partly-cloudy-day" size={96} animated preload />
        </div>
        <h1 className="mt-2 text-[34px] font-extrabold tracking-[-0.03em]">
          우리동네 날씨
        </h1>
        <p className="text-[17px] leading-[1.55] text-[#3B5A75]">
          예보 말고,
          <br />
          지금 우리 동네 사람들이 느끼는
          <br />
          <b className="text-ink">진짜 날씨</b>
        </p>
        <div className="mt-3.5 flex gap-2">
          {FEELS.map((f) => (
            <span
              key={f.emoji}
              className="flex items-center gap-1.5 rounded-full bg-white py-1.5 pr-3.5 pl-2.5 text-sm font-semibold"
            >
              <Emoji name={f.emoji} size={22} />
              {f.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3.5">
        {errorText && (
          <p
            role="alert"
            className="w-full rounded-xl bg-white/80 px-4 py-3 text-center text-sm font-semibold text-danger"
          >
            {errorMessage(errorText)}
          </p>
        )}
        <KakaoLoginButton />
        <p className="text-[13px] text-[#6B8299]">
          카카오 계정으로 간편하게 시작해요
        </p>
      </div>
    </main>
  );
}
