// packages/react/src/useVoiceCommand.test.tsx
import { test, expect, mock, beforeEach, afterEach } from "bun:test";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

const startMock = mock(async () => {});
const stopMock = mock(async () => new Blob(["fake-audio"]));
const transcribeMock = mock(async () => "adicionar três maçãs");
const loadMock = mock(async () => {});

beforeEach(() => {
  startMock.mockClear();
  stopMock.mockClear();
  mock.module("@pwa-voice-interpreter/core", () => ({
    AudioRecorder: class {
      start = startMock;
      stop = stopMock;
      cancel = mock(() => {});
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
  }));
});

test("start() moves status to recording, stop() resolves to matched result", async () => {
  const { useVoiceCommand } = await import(`./useVoiceCommand?t=${Date.now()}`);
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
