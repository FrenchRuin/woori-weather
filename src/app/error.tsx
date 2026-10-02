"use client";

import Link from "next/link";
import { useEffect } from "react";

import {
  primaryButton,
  secondaryButton,
  StatusScreen,
} from "@/components/StatusScreen";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      emoji="🌧️"
      title="잠깐 문제가 생겼어요"
      description="잠시 후 다시 시도해주세요. 계속 안 되면 앱을 새로 열어주세요"
    >
      <button type="button" onClick={retry} className={primaryButton}>
        다시 시도
      </button>
      <Link href="/" className={secondaryButton}>
        처음으로
      </Link>
    </StatusScreen>
  );
}
