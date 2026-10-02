export const REPORT_REASONS = [
  { key: "abuse", label: "욕설·혐오" },
  { key: "ad", label: "광고" },
  { key: "off_topic", label: "날씨와 무관" },
  { key: "etc", label: "기타" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["key"];
