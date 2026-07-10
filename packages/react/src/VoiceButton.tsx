import { useRef, useState, type ReactNode } from "react";

export type VoiceButtonMode = "press-release" | "press-drag-lock";

export interface VoiceButtonProps {
  mode: VoiceButtonMode;
  lockThreshold?: number;
  onStart: () => void;
  onStop: () => void;
  onLockChange?: (locked: boolean) => void;
  className?: string;
  children?: ReactNode;
}

export function VoiceButton({
  mode,
  lockThreshold = 80,
  onStart,
  onStop,
  onLockChange,
  className,
  children,
}: VoiceButtonProps) {
  const startYRef = useRef<number | null>(null);
  const [locked, setLocked] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    setLocked(false);
    onStart();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode !== "press-drag-lock" || startYRef.current === null || locked) return;
    const delta = startYRef.current - e.clientY;
    if (delta > lockThreshold) {
      setLocked(true);
      onLockChange?.(true);
    }
  };

  const handlePointerUp = () => {
    startYRef.current = null;
    if (mode === "press-drag-lock" && locked) return;
    onStop();
  };

  return (
    <button
      type="button"
      className={className}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}
    </button>
  );
}
