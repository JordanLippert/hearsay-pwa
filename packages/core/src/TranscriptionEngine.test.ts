// packages/core/src/TranscriptionEngine.test.ts
import { test, expect, mock, beforeEach } from "bun:test";
import { ModelLoadError } from "./types";

const transcribeFn = mock(async (_audio: unknown) => ({ text: "adicionar três maçãs" }));
const pipelineFn = mock(async (_task: string, _model: string, opts: any) => {
  opts.progress_callback?.({ status: "progress", progress: 50 });
  return transcribeFn;
});
const decodedSamples = new Float32Array([0.1, 0.2]);
const readAudioFn = mock(async (_url: string, _samplingRate: number) => decodedSamples);

beforeEach(() => {
  pipelineFn.mockClear();
  transcribeFn.mockClear();
  readAudioFn.mockClear();
  // Restore the default (successful) implementation each test, since a prior
  // test's `mockImplementation`/`mockImplementationOnce` override otherwise
  // persists across tests (mockClear only clears call history, not behavior).
  pipelineFn.mockImplementation(async (_task: string, _model: string, opts: any) => {
    opts.progress_callback?.({ status: "progress", progress: 50 });
    return transcribeFn;
  });
  mock.module("@huggingface/transformers", () => ({ pipeline: pipelineFn, read_audio: readAudioFn }));
});

test("load() tries webgpu first and reports progress", async () => {
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  const progress: number[] = [];
  await engine.load((p) => progress.push(p.progress ?? 0));
  expect(pipelineFn.mock.calls[0][2].device).toBe("webgpu");
  expect(progress).toContain(50);
});

test("load() falls back to wasm when webgpu pipeline creation fails", async () => {
  pipelineFn.mockImplementationOnce(async () => {
    throw new Error("webgpu unsupported");
  });
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  await engine.load(() => {});
  expect(pipelineFn.mock.calls[1][2].device).toBe("wasm");
});

test("load() throws ModelLoadError when both backends fail", async () => {
  pipelineFn.mockImplementation(async () => {
    throw new Error("network down");
  });
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  await expect(engine.load(() => {})).rejects.toBeInstanceOf(ModelLoadError);
});

test("load() preserves the underlying error as cause", async () => {
  const underlying = new Error("network down");
  pipelineFn.mockImplementation(async () => {
    throw underlying;
  });
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  try {
    await engine.load(() => {});
    expect.unreachable();
  } catch (err) {
    expect(err).toBeInstanceOf(ModelLoadError);
    expect((err as Error).cause).toBe(underlying);
  }
});

test("load() is idempotent: calling it twice only builds the pipeline once", async () => {
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  await engine.load(() => {});
  await engine.load(() => {});
  expect(pipelineFn).toHaveBeenCalledTimes(1);
});

test("transcribe() decodes the Blob to samples before passing it to the pipeline", async () => {
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  await engine.load(() => {});
  const text = await engine.transcribe(new Blob(["fake-audio"]));
  expect(text).toBe("adicionar três maçãs");
  expect(readAudioFn.mock.calls[0][1]).toBe(16_000);
  expect(transcribeFn.mock.calls[0][0]).toBe(decodedSamples);
});

test("transcribe() passes the configured language and task to the pipeline", async () => {
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine({ language: "portuguese" });
  await engine.load(() => {});
  await engine.transcribe(new Blob(["fake-audio"]));
  expect(transcribeFn.mock.calls[0][1]).toEqual({ language: "portuguese", task: "transcribe" });
});
