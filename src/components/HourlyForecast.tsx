import { hourOf, isNight, kstHourNow, weatherIcon } from "@/lib/weatherIcon";
import type { Weather } from "@/types";

export function HourlyForecast({ hourly }: { hourly: Weather["hourly"] }) {
  if (hourly.length === 0) return null;
  const nowHour = kstHourNow();

  return (
    <section className="flex flex-col gap-2.5 rounded-[20px] bg-white pt-4 pb-3.5">
      <h2 className="px-4.5 text-sm font-bold text-[#3B5A75]">시간별 예보</h2>
      <ol className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-3">
        {hourly.map((h, i) => {
          const hour = hourOf(h.time);
          const isNow = i === 0 && hour === nowHour;
          return (
            <li
              key={h.time}
              className={`flex flex-[0_0_52px] flex-col items-center gap-1.5 rounded-[14px] py-2 ${isNow ? "bg-primary-soft" : ""}`}
            >
              <span className="text-xs font-semibold text-[#6B8299]">
                {isNow ? "지금" : `${hour}시`}
              </span>
              <span className="text-[22px]" aria-hidden>
                {weatherIcon(h.sky, h.pty, isNight(hour))}
              </span>
              <b className="text-[15px]">{Math.round(h.temp)}°</b>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
