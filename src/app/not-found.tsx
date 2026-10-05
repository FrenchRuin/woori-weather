import Link from "next/link";

import { Emoji } from "@/components/Emoji";
import { primaryButton, StatusScreen } from "@/components/StatusScreen";

export default function NotFound() {
  return (
    <StatusScreen
      icon={<Emoji name="compass" size={80} loading="eager" />}
      title="페이지를 찾을 수 없어요"
      description="주소가 바뀌었거나 없는 페이지예요"
    >
      <Link href="/" className={primaryButton}>
        우리 동네 날씨 보러 가기
      </Link>
    </StatusScreen>
  );
}
