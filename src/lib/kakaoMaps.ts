type KakaoMaps = typeof kakao.maps;

type Deps = {
  appendScript: (onLoad: () => void, onError: () => void) => void; // <script> 를 붙인다
  getKakao: () => { maps: Pick<KakaoMaps, "load"> } | undefined;
  timeoutMs: number;
};

/**
 * 카카오맵 SDK 로더. 로딩 중·완료된 결과는 재사용하고, 실패하면 다음 호출에서 다시 시도한다.
 * (next/script 는 실패 후 재진입이나 로딩 중 이탈 후 재진입 때 콜백이 오지 않아 직접 관리)
 */
export function createKakaoLoader({ appendScript, getKakao, timeoutMs }: Deps) {
  let pending: Promise<KakaoMaps> | null = null;

  return function load() {
    pending ??= new Promise<KakaoMaps>((resolve, reject) => {
      const fail = () => reject(new Error("카카오맵을 불러오지 못했어요"));
      const timer = setTimeout(fail, timeoutMs);
      const onError = () => {
        clearTimeout(timer);
        fail();
      };
      const onLoad = () => {
        // 도메인이 등록되지 않으면 스크립트는 받아져도 kakao 객체가 없다
        const maps = getKakao()?.maps;
        if (!maps) {
          clearTimeout(timer);
          fail();
          return;
        }
        maps.load(() => {
          clearTimeout(timer);
          resolve(maps as KakaoMaps);
        });
      };
      appendScript(onLoad, onError);
    }).catch((e: unknown) => {
      pending = null;
      throw e;
    });
    return pending;
  };
}

const TIMEOUT_MS = 10_000;

/** 브라우저용 (DongMap 에서 사용) */
export const loadKakaoMaps = createKakaoLoader({
  appendScript: (onLoad, onError) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`;
    script.async = true;
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    document.head.append(script);
  },
  getKakao: () => window.kakao,
  timeoutMs: TIMEOUT_MS,
});
