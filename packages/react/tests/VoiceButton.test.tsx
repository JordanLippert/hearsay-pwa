import { test, expect, mock, afterEach } from "bun:test";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { VoiceButton } from "../src/VoiceButton";

afterEach(() => {
  cleanup();
});

test("press-release mode calls onStart on pointer down and onStop on pointer up", () => {
  const onStart = mock(() => {});
  const onStop = mock(() => {});
  const { getByRole } = render(
    <VoiceButton mode="press-release" onStart={onStart} onStop={onStop}>
      Hold to talk
    </VoiceButton>,
  );
  const button = getByRole("button");

  fireEvent.pointerDown(button);
  expect(onStart).toHaveBeenCalledTimes(1);

  fireEvent.pointerUp(button);
  expect(onStop).toHaveBeenCalledTimes(1);
});

test("press-drag-lock mode fires onLockChange(true) past the lock threshold", () => {
  const onStart = mock(() => {});
  const onStop = mock(() => {});
  const onLockChange = mock(() => {});
  const { getByRole } = render(
    <VoiceButton
      mode="press-drag-lock"
      lockThreshold={50}
      onStart={onStart}
      onStop={onStop}
      onLockChange={onLockChange}
    >
      Hold to talk
    </VoiceButton>,
  );
  const button = getByRole("button");

  fireEvent.pointerDown(button, { clientY: 100 });
  fireEvent.pointerMove(button, { clientY: 30 }); // moved 70px up, past threshold of 50
  expect(onLockChange).toHaveBeenCalledWith(true);

  fireEvent.pointerUp(button);
  // locked: releasing the pointer must NOT stop the recording
  expect(onStop).not.toHaveBeenCalled();
});

test("press-drag-lock mode behaves like press-release when movement stays under the threshold", () => {
  const onStart = mock(() => {});
  const onStop = mock(() => {});
  const onLockChange = mock(() => {});
  const { getByRole } = render(
    <VoiceButton
      mode="press-drag-lock"
      lockThreshold={50}
      onStart={onStart}
      onStop={onStop}
      onLockChange={onLockChange}
    >
      Hold to talk
    </VoiceButton>,
  );
  const button = getByRole("button");

  fireEvent.pointerDown(button, { clientY: 100 });
  fireEvent.pointerMove(button, { clientY: 70 }); // moved 30px up, under threshold of 50
  expect(onLockChange).not.toHaveBeenCalled();

  fireEvent.pointerUp(button);
  expect(onStop).toHaveBeenCalledTimes(1);
});
