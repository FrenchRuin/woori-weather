/** 메시지 앞에 붙는 아이콘 (Toaster 가 아이콘 컴포넌트로 바꾼다) */
export type ToastIcon = "check" | "pin" | "siren";

type Listener = (message: string, icon?: ToastIcon) => void;

const listeners = new Set<Listener>();

/** 화면 하단 토스트 띄우기 (Toaster 가 layout 에 있어야 한다) */
export function toast(message: string, icon?: ToastIcon) {
  listeners.forEach((listener) => listener(message, icon));
}

export function subscribeToast(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
