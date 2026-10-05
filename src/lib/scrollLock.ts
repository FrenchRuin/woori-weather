/**
 * 바텀 시트용 스크롤 잠금. 시트가 겹쳐 열리고 어떤 순서로 닫혀도
 * 마지막 시트가 닫힐 때 원래 값으로 돌아가도록 열린 개수를 센다.
 */
export function createScrollLock(style: { overflow: string }) {
  let count = 0;
  let saved = "";

  return function lock() {
    if (count === 0) {
      saved = style.overflow;
      style.overflow = "hidden";
    }
    count += 1;

    let released = false;
    return function unlock() {
      if (released) return;
      released = true;
      count -= 1;
      if (count === 0) style.overflow = saved;
    };
  };
}

let bodyLock: (() => () => void) | null = null;

/** document.body 스크롤 잠금. 반환값을 불러 해제한다 */
export function lockBodyScroll() {
  bodyLock ??= createScrollLock(document.body.style);
  return bodyLock();
}
