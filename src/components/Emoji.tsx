import Image from "next/image";

import cold from "@/assets/emoji/cold.png";
import compass from "@/assets/emoji/compass.png";
import good from "@/assets/emoji/good.png";
import hot from "@/assets/emoji/hot.png";
import magnifier from "@/assets/emoji/magnifier.png";
import memo from "@/assets/emoji/memo.png";
import raisingHand from "@/assets/emoji/raising-hand.png";
import walking from "@/assets/emoji/walking.png";
import wave from "@/assets/emoji/wave.png";

/** Microsoft Fluent Emoji 3D (MIT, src/assets/emoji/LICENSE) */
const EMOJI = {
  cold,
  good,
  hot,
  compass,
  magnifier,
  memo,
  "raising-hand": raisingHand,
  walking,
  wave,
};

export type EmojiName = keyof typeof EMOJI;

type Props = {
  name: EmojiName;
  size: number;
  className?: string;
  loading?: "eager" | "lazy"; // 화면 가운데 큰 그림은 eager
};

/** 장식용 3D 이모지 (의미는 옆 텍스트가 전달) */
export function Emoji({ name, size, className, loading }: Props) {
  return (
    <Image
      src={EMOJI[name]}
      alt=""
      width={size}
      height={size}
      loading={loading}
      className={`inline-block shrink-0 ${className ?? ""}`}
    />
  );
}
