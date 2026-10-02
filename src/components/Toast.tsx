"use client";

import { useEffect, useState } from "react";

import { subscribeToast } from "@/lib/toast";

const DURATION_MS = 2200;

export function Toaster() {
  const [message, setMessage] = useState<{ id: number; text: string } | null>(
    null,
  );

  useEffect(
    () => subscribeToast((text) => setMessage({ id: Date.now(), text })),
    [],
  );

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), DURATION_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4"
    >
      {message && (
        <div
          key={message.id}
          className="animate-[toast-in_.2s_ease-out] rounded-full bg-ink px-5 py-3.25 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(23,50,74,.25)]"
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
