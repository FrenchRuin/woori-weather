import Image, { type StaticImageData } from "next/image";

import clearDay from "@/assets/weather/clear-day.svg";
import clearNight from "@/assets/weather/clear-night.svg";
import cloudy from "@/assets/weather/cloudy.svg";
import fog from "@/assets/weather/fog.svg";
import partlyCloudyDayRain from "@/assets/weather/partly-cloudy-day-rain.svg";
import partlyCloudyDay from "@/assets/weather/partly-cloudy-day.svg";
import partlyCloudyNightRain from "@/assets/weather/partly-cloudy-night-rain.svg";
import partlyCloudyNight from "@/assets/weather/partly-cloudy-night.svg";
import rain from "@/assets/weather/rain.svg";
import sleet from "@/assets/weather/sleet.svg";
import snow from "@/assets/weather/snow.svg";
import clearDayStatic from "@/assets/weather/static/clear-day.svg";
import clearNightStatic from "@/assets/weather/static/clear-night.svg";
import cloudyStatic from "@/assets/weather/static/cloudy.svg";
import fogStatic from "@/assets/weather/static/fog.svg";
import partlyCloudyDayRainStatic from "@/assets/weather/static/partly-cloudy-day-rain.svg";
import partlyCloudyDayStatic from "@/assets/weather/static/partly-cloudy-day.svg";
import partlyCloudyNightRainStatic from "@/assets/weather/static/partly-cloudy-night-rain.svg";
import partlyCloudyNightStatic from "@/assets/weather/static/partly-cloudy-night.svg";
import rainStatic from "@/assets/weather/static/rain.svg";
import sleetStatic from "@/assets/weather/static/sleet.svg";
import snowStatic from "@/assets/weather/static/snow.svg";
import type { WeatherIconName } from "@/lib/weatherIcon";

type Icons = Record<WeatherIconName, StaticImageData>;

/** Meteocons (MIT, src/assets/weather/LICENSE) */
const ANIMATED: Icons = {
  "clear-day": clearDay,
  "clear-night": clearNight,
  "partly-cloudy-day": partlyCloudyDay,
  "partly-cloudy-night": partlyCloudyNight,
  cloudy,
  rain,
  "partly-cloudy-day-rain": partlyCloudyDayRain,
  "partly-cloudy-night-rain": partlyCloudyNightRain,
  snow,
  sleet,
  fog,
};

const STATIC: Icons = {
  "clear-day": clearDayStatic,
  "clear-night": clearNightStatic,
  "partly-cloudy-day": partlyCloudyDayStatic,
  "partly-cloudy-night": partlyCloudyNightStatic,
  cloudy: cloudyStatic,
  rain: rainStatic,
  "partly-cloudy-day-rain": partlyCloudyDayRainStatic,
  "partly-cloudy-night-rain": partlyCloudyNightRainStatic,
  snow: snowStatic,
  sleet: sleetStatic,
  fog: fogStatic,
};

type Props = {
  name: WeatherIconName;
  size: number;
  animated?: boolean; // 한 화면에 여러 개 나오는 곳은 정지 버전
  className?: string;
  preload?: boolean;
};

/** 장식용 날씨 그림 (의미는 옆 텍스트가 전달) */
export function WeatherIcon({
  name,
  size,
  animated,
  className,
  preload,
}: Props) {
  return (
    <Image
      src={(animated ? ANIMATED : STATIC)[name]}
      alt=""
      width={size}
      height={size}
      className={className}
      preload={preload}
    />
  );
}
