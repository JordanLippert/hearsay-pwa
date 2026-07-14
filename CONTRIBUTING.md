# Contributing

## Setup

```bash
bun install
```

## Running tests

```bash
bun test packages     # unit tests (fast, run in CI on every push/PR)
bun run test:e2e      # real Whisper model + real Chrome (slow, local-only — see below)
```

## Known limitation: E2E doesn't run reliably in CI

The `e2e` CI job downloads a real Whisper model from the Hugging Face Hub at
test time. Some of that model's files (the ONNX weights) are served through
Hugging Face's Xet storage backend (`cas-bridge.xethub.hf.co`), and that CDN
returns `403 Forbidden` when the request comes from a GitHub Actions runner —
confirmed by direct investigation (same test passes reliably from a local
machine, fails consistently from `ubuntu-latest` runners). This is an
external, third-party infrastructure restriction, not a bug in this repo.

Because of this, `e2e` is **not** a required status check for merging (only
`unit` is) — a failing `e2e` job in CI doesn't block a PR.

**If your PR touches the voice/transcription pipeline** (anything under
`packages/core/src/TranscriptionEngine.ts`, `packages/react/`, or
`e2e/demo/`), run `bun run test:e2e` locally before opening the PR, and note
the result in the PR description (pass/fail, and what you observed) — since
CI can't verify this for you reliably, that note is the actual verification
record.

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `style:`, `ci:`, ...) — semantic-release
reads these to compute the next version tag automatically on merge to `main`,
so the prefix matters:

- `fix:` → patch release
- `feat:` → minor release
- `feat!:` or a `BREAKING CHANGE:` footer → major release

## Branches and PRs

`main` is protected: changes land via pull request, and the `unit` status
check must pass before merging.
