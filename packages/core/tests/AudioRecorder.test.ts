// packages/core/tests/AudioRecorder.test.ts
import { test, expect, beforeEach, afterAll, spyOn } from "bun:test";
import { MicPermissionError } from "../src/types";

// Bun runs all test files in one process, so globalThis mutations below would
// otherwise leak into files that run after this one (e.g. React component
// tests that rely on happy-dom's real `navigator`/`window`). Snapshot
// whatever was there before we start faking, and put it back in afterAll.
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalMediaRecorder = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");
const originalAudioContext = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
const originalRaf = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
const originalCaf = Object.getOwnPropertyDescriptor(globalThis, "cancelAnimationFrame");

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

class FakeAnalyserNode {
  frequencyBinCount = 4;
  getByteTimeDomainData(arr: Uint8Array) {
    arr.fill(200); // consistently off-center -> predictable non-zero level
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  closed = false;
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  createMediaStreamSource(_stream: unknown) {
    return { connect: () => {} };
  }
  createAnalyser() {
    return new FakeAnalyserNode();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

function installFakes(getUserMediaImpl: () => Promise<unknown>) {
  FakeMediaRecorder.instances = [];
  FakeAudioContext.instances = [];
  (globalThis as any).MediaRecorder = FakeMediaRecorder;
  (globalThis as any).AudioContext = FakeAudioContext;
  // requestAnimationFrame via a real (tiny) setTimeout so the recursive scheduling
  // in AudioRecorder's level-monitoring loop doesn't recurse synchronously.
  (globalThis as any).requestAnimationFrame = (cb: (t: number) => void) =>
    setTimeout(() => cb(0), 0) as unknown as number;
  (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
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
  if (originalAudioContext) {
    Object.defineProperty(globalThis, "AudioContext", originalAudioContext);
  } else {
    delete (globalThis as any).AudioContext;
  }
  if (originalRaf) {
    Object.defineProperty(globalThis, "requestAnimationFrame", originalRaf);
  } else {
    delete (globalThis as any).requestAnimationFrame;
  }
  if (originalCaf) {
    Object.defineProperty(globalThis, "cancelAnimationFrame", originalCaf);
  } else {
    delete (globalThis as any).cancelAnimationFrame;
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

test("onLevel is called with amplitude values while recording", async () => {
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  const levels: number[] = [];
  await recorder.start((level: number) => levels.push(level));

  // Let a couple of the fake-rAF-driven ticks fire.
  await new Promise((resolve) => setTimeout(resolve, 20));
  await recorder.stop();

  expect(levels.length).toBeGreaterThan(0);
  expect(levels[0]).toBeGreaterThan(0);
});

test("a level-monitoring setup failure logs a warning and does not prevent start()", async () => {
  const workingAudioContext = (globalThis as any).AudioContext;
  (globalThis as any).AudioContext = class {
    constructor() {
      throw new Error("Web Audio API unavailable");
    }
  };
  const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start(() => {});

  expect(FakeMediaRecorder.instances[0].state).toBe("recording");
  expect(warnSpy).toHaveBeenCalled();

  warnSpy.mockRestore();
  (globalThis as any).AudioContext = workingAudioContext;
});

test("a failure after the AudioContext is constructed still closes it immediately", async () => {
  class PartiallyBrokenAudioContext extends FakeAudioContext {
    createAnalyser(): never {
      throw new Error("createAnalyser unsupported");
    }
  }
  (globalThis as any).AudioContext = PartiallyBrokenAudioContext;
  const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start(() => {});

  expect(FakeMediaRecorder.instances[0].state).toBe("recording");
  expect(warnSpy).toHaveBeenCalled();
  expect(FakeAudioContext.instances[0].closed).toBe(true);

  warnSpy.mockRestore();
});
