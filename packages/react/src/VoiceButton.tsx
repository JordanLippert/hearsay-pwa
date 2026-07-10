import { useRef, useState, type ReactNode } from "react";

export type VoiceButtonMode = "press-release" | "press-drag-lock";

export interface VoiceButtonProps {
  mode: VoiceButtonMode;
  lockThreshold?: number;
  onStart: () => void;
  onStop: () => void;
  /** Only ever called with `true` — there is no built-in unlock path; the consumer's
   * lock-region UI is responsible for calling `stop()` directly to end a locked recording. */
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
    // Ignore a second simultaneous pointer (e.g. a second finger) while already tracking one.
    if (startYRef.current !== null) return;
    if (e.button !== 0) return;
    // Optional chaining: always present in evergreen browsers (this is a PWA target),
    // absent only in the test environment (happy-dom) and some legacy embedded WebViews.
    // If genuinely absent at runtime, the drag-lock gesture silently stops tracking once
    // the finger leaves the button's bounds — press-release mode is unaffected.
    e.currentTarget.setPointerCapture?.(e.pointerId);
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

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    startYRef.current = null;
    if (mode === "press-drag-lock" && locked) return;
    onStop();
  };

  const handlePointerCancel = () => {
    startYRef.current = null;
    setLocked(false);
    onStop();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === " " || e.key === "Enter") && startYRef.current === null) {
      e.preventDefault();
      startYRef.current = 0; // sentinel: keyboard-activated, not a real pointer position
      onStart();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      startYRef.current = null;
      onStop();
    }
  };

  return (
    <button
      type="button"
      className={className}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {children}
    </button>
  );
}
