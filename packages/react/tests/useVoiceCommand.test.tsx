// packages/react/tests/useVoiceCommand.test.tsx
import { test, expect, mock, beforeEach, afterEach } from "bun:test";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

const startMock = mock(async (_onLevel?: (level: number) => void) => {});
const stopMock = mock(async () => new Blob(["fake-audio"]));
const transcribeMock = mock(async () => "adicionar três maçãs");
const loadMock = mock(async (_onProgress?: (p: unknown) => void) => {});
const cancelMock = mock(() => {});
const computeWaveformMock = mock(async (_blob: Blob, _barCount: number) => [0, 0, 0]);

beforeEach(() => {
  startMock.mockClear();
  stopMock.mockClear();
  transcribeMock.mockClear();
  cancelMock.mockClear();
  computeWaveformMock.mockClear();
  // Restore default (successful) implementations, since a prior test's
  // mockImplementationOnce override otherwise persists across tests.
  startMock.mockImplementation(async () => {});
  stopMock.mockImplementation(async () => new Blob(["fake-audio"]));
  transcribeMock.mockImplementation(async () => "adicionar três maçãs");
  computeWaveformMock.mockImplementation(async () => [0, 0, 0]);
  loadMock.mockClear();
  loadMock.mockImplementation(async (_onProgress?: (p: unknown) => void) => {});
  mock.module("@hearsay-pwa/core", () => ({
    AudioRecorder: class {
      start = startMock;
      stop = stopMock;
      cancel = cancelMock;
    },
    TranscriptionEngine: class {
      load = loadMock;
      transcribe = transcribeMock;
    },
    CommandMatcher: class {
      constructor(public intents: unknown[]) {}
      match(text: string) {
        return { status: "matched", intent: "add_item", text, params: { item: "três maçãs" } };
      }
    },
    computeWaveform: computeWaveformMock,
  }));
});

test("start() moves status to recording, stop() resolves to matched result", async () => {
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  expect(result.current.status).toBe("idle");

  await act(async () => {
    await result.current.start();
  });
  expect(result.current.status).toBe("recording");

  await act(async () => {
    await result.current.stop();
  });

  await waitFor(() => expect(result.current.status).toBe("done"));
  expect(result.current.result).toEqual({
    status: "matched",
    text: "adicionar três maçãs",
    intent: "add_item",
    params: { item: "três maçãs" },
  });
});

test("start() rejecting resets status to idle and surfaces the error", async () => {
  startMock.mockImplementation(async () => {
    throw new Error("mic permission denied");
  });
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    await result.current.start();
  });

  expect(result.current.status).toBe("idle");
  expect(result.current.error).toBeInstanceOf(Error);
  expect(result.current.error?.message).toBe("mic permission denied");
});

test("stop() rejecting resets status to idle and surfaces the error", async () => {
  transcribeMock.mockImplementation(async () => {
    throw new Error("model load failed");
  });
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    await result.current.start();
  });
  expect(result.current.status).toBe("recording");

  await act(async () => {
    await result.current.stop();
  });

  expect(result.current.status).toBe("idle");
  expect(result.current.error).toBeInstanceOf(Error);
  expect(result.current.error?.message).toBe("model load failed");
});

test("loadProgress updates as the engine's load() reports progress", async () => {
  loadMock.mockImplementation(async (onProgress?: (p: unknown) => void) => {
    onProgress?.({ status: "progress", progress: 42 });
  });
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  expect(result.current.loadProgress).toBeNull();

  await act(async () => {
    await result.current.start();
  });

  expect(result.current.loadProgress).toEqual({ status: "progress", progress: 42 });
});

test("a rapid second start() call while already recording is a no-op", async () => {
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    // Fire both without awaiting the first before starting the second, to simulate
    // a rapid double-press.
    const first = result.current.start();
    const second = result.current.start();
    await Promise.all([first, second]);
  });

  expect(startMock).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe("recording");
});

test("level updates as the recorder's onLevel callback fires during start()", async () => {
  startMock.mockImplementation(async (onLevel?: (level: number) => void) => {
    onLevel?.(0.75);
  });
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  expect(result.current.level).toBe(0);

  await act(async () => {
    await result.current.start();
  });

  expect(result.current.level).toBe(0.75);
});

test("stop() populates waveform and audioBlob from the recorded audio", async () => {
  computeWaveformMock.mockImplementation(async () => [0.1, 0.2, 0.3]);
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    await result.current.start();
  });
  await act(async () => {
    await result.current.stop();
  });

  await waitFor(() => expect(result.current.status).toBe("done"));
  expect(result.current.waveform).toEqual([0.1, 0.2, 0.3]);
  expect(result.current.audioBlob).toBeInstanceOf(Blob);
});

test("a computeWaveform failure does not block transcribe() from completing", async () => {
  computeWaveformMock.mockImplementation(async () => {
    throw new Error("decode failed");
  });
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    await result.current.start();
  });
  await act(async () => {
    await result.current.stop();
  });

  await waitFor(() => expect(result.current.status).toBe("done"));
  expect(result.current.waveform).toBeNull();
  expect(result.current.result).toEqual({
    status: "matched",
    text: "adicionar três maçãs",
    intent: "add_item",
    params: { item: "três maçãs" },
  });
});

test("unmounting the component releases the recorder instead of leaking the mic/AudioContext", async () => {
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result, unmount } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    await result.current.start();
  });
  expect(result.current.status).toBe("recording");

  unmount();

  expect(cancelMock).toHaveBeenCalledTimes(1);
});
