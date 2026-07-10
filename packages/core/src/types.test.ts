import { test, expect } from "bun:test";
import { MicPermissionError, ModelLoadError } from "./types";

test("MicPermissionError is an Error with the right name", () => {
  const err = new MicPermissionError("mic denied");
  expect(err).toBeInstanceOf(Error);
  expect(err).toBeInstanceOf(MicPermissionError);
  expect(err.name).toBe("MicPermissionError");
  expect(err.message).toBe("mic denied");
});

test("ModelLoadError is an Error with the right name", () => {
  const err = new ModelLoadError("download failed");
  expect(err).toBeInstanceOf(Error);
  expect(err).toBeInstanceOf(ModelLoadError);
  expect(err.name).toBe("ModelLoadError");
  expect(err.message).toBe("download failed");
});
