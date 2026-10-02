type Listener = (message: string) => void;

const listeners = new Set<Listener>();

/** 화면 하단 토스트 띄우기 (Toaster 가 layout 에 있어야 한다) */
export function toast(message: string) {
  listeners.forEach((listener) => listener(message));
}

export function subscribeToast(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
