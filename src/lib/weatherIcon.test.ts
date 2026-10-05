import { describe, expect, it } from "vitest";

import { weatherIcon } from "./weatherIcon";

describe("weatherIcon", () => {
  it.each([
    ["clear", "none", false, "clear-day"],
    ["clear", "none", true, "clear-night"],
    ["partly", "none", false, "partly-cloudy-day"],
    ["partly", "none", true, "partly-cloudy-night"],
    ["cloudy", "none", false, "cloudy"],
    ["cloudy", "none", true, "cloudy"],
    ["cloudy", "rain", false, "rain"],
    ["partly", "rain", false, "partly-cloudy-day-rain"],
    ["partly", "rain", true, "partly-cloudy-night-rain"],
    ["clear", "shower", false, "partly-cloudy-day-rain"],
    ["cloudy", "shower", true, "partly-cloudy-night-rain"],
    ["cloudy", "snow", false, "snow"],
    ["cloudy", "rainsnow", false, "sleet"],
  ] as const)("%s + %s (밤 %s) → %s", (sky, pty, night, expected) => {
    expect(weatherIcon(sky, pty, night)).toBe(expected);
  });
});
