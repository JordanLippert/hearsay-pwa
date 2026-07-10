import { test, expect } from "bun:test";
import { CommandMatcher } from "./CommandMatcher";

const matcher = new CommandMatcher([
  { intent: "add_item", patterns: ["adicionar {item}", "add {item}"] },
  { intent: "remove_item", patterns: ["remover {item}"] },
  { intent: "confirm", patterns: ["confirmar", "confirm"] },
]);

test("matches a pattern with a captured param", () => {
  const result = matcher.match("adicionar três maçãs");
  expect(result).toEqual({
    status: "matched",
    text: "adicionar três maçãs",
    intent: "add_item",
    params: { item: "três maçãs" },
  });
});

test("is case-insensitive and trims whitespace", () => {
  const result = matcher.match("  ADICIONAR Pão  ");
  expect(result).toEqual({
    status: "matched",
    text: "  ADICIONAR Pão  ",
    intent: "add_item",
    params: { item: "Pão" },
  });
});

test("matches a pattern with no placeholder", () => {
  const result = matcher.match("confirmar");
  expect(result).toEqual({
    status: "matched",
    text: "confirmar",
    intent: "confirm",
    params: {},
  });
});

test("returns no_match when nothing fits", () => {
  const result = matcher.match("que horas são");
  expect(result).toEqual({ status: "no_match", text: "que horas são" });
});

test("returns no_speech for empty text", () => {
  expect(matcher.match("")).toEqual({ status: "no_speech" });
  expect(matcher.match("   ")).toEqual({ status: "no_speech" });
});
