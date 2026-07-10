// packages/core/src/TranscriptionEngine.test.ts
import { test, expect, mock, beforeEach } from "bun:test";
import { ModelLoadError } from "./types";

const transcribeFn = mock(async (_audio: unknown) => ({ text: "adicionar três maçãs" }));
const pipelineFn = mock(async (_task: string, _model: string, opts: any) => {
  opts.progress_callback?.({ status: "progress", progress: 50 });
  return transcribeFn;
});

beforeEach(() => {
  pipelineFn.mockClear();
  transcribeFn.mockClear();
  // Restore the default (successful) implementation each test, since a prior
  // test's `mockImplementation`/`mockImplementationOnce` override otherwise
  // persists across tests (mockClear only clears call history, not behavior).
  pipelineFn.mockImplementation(async (_task: string, _model: string, opts: any) => {
    opts.progress_callback?.({ status: "progress", progress: 50 });
    return transcribeFn;
  });
  mock.module("@huggingface/transformers", () => ({ pipeline: pipelineFn }));
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

test("transcribe() returns trimmed text from the pipeline", async () => {
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  await engine.load(() => {});
  const text = await engine.transcribe(new Blob(["fake-audio"]));
  expect(text).toBe("adicionar três maçãs");
});
