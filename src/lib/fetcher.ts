import type { ApiErrorBody } from "@/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** 클라이언트용 fetch. 실패하면 { error: { code, message } } 를 ApiError 로 던진다. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (e) {
    if (init?.signal?.aborted) throw e;
    throw new ApiError(0, "NETWORK", "인터넷 연결을 확인해주세요");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "UNKNOWN",
      err?.message ?? "잠시 후 다시 시도해주세요",
    );
  }
  return body as T;
}
