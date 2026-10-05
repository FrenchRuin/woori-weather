import { isNight, kstHourNow, weatherIcon } from "@/lib/weatherIcon";
import type { Weather } from "@/types";

import { Drop, Thermometer, Umbrella, Wind } from "./icons";
import { WeatherIcon } from "./WeatherIcon";

const round = (n: number) => Math.round(n);
const wind = (ms: number) => `${ms.toFixed(1).replace(/\.0$/, "")}m/s`;

export function WeatherHero({ weather }: { weather: Weather }) {
  const { now, today } = weather;
  const icon = weatherIcon(now.sky, now.pty, isNight(kstHourNow()));
  const maxMin =
    today.max === null && today.min === null
      ? "-"
      : `${today.max === null ? "-" : round(today.max)}°/${today.min === null ? "-" : round(today.min)}°`;

  const stats = [
    { icon: Umbrella, label: "강수확률", value: `${today.pop}%` },
    { icon: Drop, label: "습도", value: `${round(now.humidity)}%` },
    { icon: Wind, label: "바람", value: wind(now.windSpeed) },
    { icon: Thermometer, label: "최고·최저", value: maxMin },
  ];

  return (
    <section aria-label="현재 날씨">
      <div className="flex items-center justify-center gap-4 px-5 pt-5 pb-1">
        <WeatherIcon
          name={icon}
          size={104}
          animated
          preload
          className="-my-3 -ml-3 drop-shadow-[0_8px_16px_rgba(23,50,74,.12)]"
        />
        <span className="text-[84px] leading-none font-extrabold tracking-[-0.04em]">
          {round(now.temp)}°
        </span>
      </div>
      <div className="flex flex-col gap-1 pt-2.5 pb-3 text-center">
        <p className="text-[19px] font-bold">{now.summary}</p>
        <p className="text-[15px] text-sub">
          체감 {round(now.feelsLike)}° · 기상청 예보
        </p>
      </div>

      <dl className="mx-4 mt-2 grid grid-cols-4 rounded-[20px] bg-white px-1 py-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col items-center gap-1 ${i > 0 ? "border-l border-[#EEF4F9]" : ""}`}
          >
            <s.icon size={22} className="text-primary" aria-hidden />
            <dt className="text-xs text-[#6B8299]">{s.label}</dt>
            <dd className="text-[15px] font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
