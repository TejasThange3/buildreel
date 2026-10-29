import type { Rnnoise } from "@shiguredo/rnnoise-wasm";

let loading: Promise<Rnnoise> | undefined;

// The model is a few megabytes of wasm, so it loads on first use (an export with clean voice,
// finding dictation, or a cleaned preview) and once per page.
export function loadRnnoise(): Promise<Rnnoise> {
  loading ??= import("@shiguredo/rnnoise-wasm").then(({ Rnnoise }) => Rnnoise.load());
  return loading;
}
