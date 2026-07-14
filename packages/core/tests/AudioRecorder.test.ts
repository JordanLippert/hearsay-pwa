// packages/core/src/AudioRecorder.test.ts
import { test, expect, beforeEach, afterAll } from "bun:test";
import { MicPermissionError } from "../src/types";

// Bun runs all test files in one process, so globalThis mutations below would
// otherwise leak into files that run after this one (e.g. React component
// tests that rely on happy-dom's real `navigator`/`window`). Snapshot
// whatever was there before we start faking, and put it back in afterAll.
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalMediaRecorder = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state: "inactive" | "recording" = "inactive";

  constructor(public stream: unknown) {
    FakeMediaRecorder.instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["fake-audio"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

function installFakes(getUserMediaImpl: () => Promise<unknown>) {
  FakeMediaRecorder.instances = [];
  (globalThis as any).MediaRecorder = FakeMediaRecorder;
  // Use defineProperty instead of direct assignment: once happy-dom's global
  // preload (packages/react/happydom.setup.ts, wired via the root bunfig.toml
  // for React component tests) registers a getter-only `navigator` on
  // globalThis, a plain `globalThis.navigator = ...` throws
  // "Attempted to assign to readonly property". defineProperty with
  // configurable:true works whether or not that preload ran.
  Object.defineProperty(globalThis, "navigator", {
    value: { mediaDevices: { getUserMedia: getUserMediaImpl } },
    configurable: true,
    writable: true,
  });
}

afterAll(() => {
  if (originalNavigator) {
    Object.defineProperty(globalThis, "navigator", originalNavigator);
  } else {
    delete (globalThis as any).navigator;
  }
  if (originalMediaRecorder) {
    Object.defineProperty(globalThis, "MediaRecorder", originalMediaRecorder);
  } else {
    delete (globalThis as any).MediaRecorder;
  }
});

beforeEach(() => {
  installFakes(async () => ({ id: "fake-stream", getTracks: () => [] }));
});

test("start() requests mic and begins recording", async () => {
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  expect(FakeMediaRecorder.instances[0].state).toBe("recording");
});

test("stop() returns the recorded audio blob", async () => {
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  const blob = await recorder.stop();
  expect(blob).toBeInstanceOf(Blob);
});

test("start() throws MicPermissionError when getUserMedia rejects", async () => {
  installFakes(async () => {
    throw new DOMException("denied", "NotAllowedError");
  });
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await expect(recorder.start()).rejects.toBeInstanceOf(MicPermissionError);
});

test("cancel() discards the recording without returning a blob", async () => {
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  recorder.cancel();
  expect(FakeMediaRecorder.instances[0].state).toBe("inactive");
});

test("start() throws when called again while already recording", async () => {
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  await expect(recorder.start()).rejects.toThrow(
    "AudioRecorder.start() called while already recording",
  );
});
