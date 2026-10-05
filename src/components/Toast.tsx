"use client";

import { useEffect, useState } from "react";

import { subscribeToast, type ToastIcon } from "@/lib/toast";

import { CheckCircle, type Icon, MapPin, Siren } from "./icons";

const ICONS: Record<ToastIcon, { icon: Icon; color: string }> = {
  check: { icon: CheckCircle, color: "text-good" },
  pin: { icon: MapPin, color: "text-[#7CC4F8]" },
  siren: { icon: Siren, color: "text-[#FF8A87]" },
};

const DURATION_MS = 2200;

export function Toaster() {
  const [message, setMessage] = useState<{
    id: number;
    text: string;
    icon?: ToastIcon;
  } | null>(null);

  useEffect(
    () =>
      subscribeToast((text, icon) =>
        setMessage({ id: Date.now(), text, icon }),
      ),
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
          className="flex animate-[toast-in_.2s_ease-out] items-center gap-1.5 rounded-full bg-ink px-5 py-3.25 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(23,50,74,.25)]"
        >
          {message.icon && <ToastIconView icon={message.icon} />}
          {message.text}
        </div>
      )}
    </div>
  );
}

function ToastIconView({ icon }: { icon: ToastIcon }) {
  const { icon: IconView, color } = ICONS[icon];
  return <IconView size={20} weight="fill" className={color} aria-hidden />;
}
