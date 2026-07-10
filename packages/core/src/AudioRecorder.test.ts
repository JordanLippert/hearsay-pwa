// packages/core/src/AudioRecorder.test.ts
import { test, expect, beforeEach } from "bun:test";
import { MicPermissionError } from "./types";

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
  (globalThis as any).navigator = {
    mediaDevices: { getUserMedia: getUserMediaImpl },
  };
}

beforeEach(() => {
  installFakes(async () => ({ id: "fake-stream", getTracks: () => [] }));
});

test("start() requests mic and begins recording", async () => {
  const { AudioRecorder } = await import(`./AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  expect(FakeMediaRecorder.instances[0].state).toBe("recording");
});

test("stop() returns the recorded audio blob", async () => {
  const { AudioRecorder } = await import(`./AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  const blob = await recorder.stop();
  expect(blob).toBeInstanceOf(Blob);
});

test("start() throws MicPermissionError when getUserMedia rejects", async () => {
  installFakes(async () => {
    throw new DOMException("denied", "NotAllowedError");
  });
  const { AudioRecorder } = await import(`./AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await expect(recorder.start()).rejects.toBeInstanceOf(MicPermissionError);
});

test("cancel() discards the recording without returning a blob", async () => {
  const { AudioRecorder } = await import(`./AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  recorder.cancel();
  expect(FakeMediaRecorder.instances[0].state).toBe("inactive");
});
