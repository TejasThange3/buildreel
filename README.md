# Buildreel

Buildreel turns a screen recording of a Claude Code session, plus that session's log, into a short captioned "how I built it" reel. You dictate the prompts with Wispr Flow, and you steer the edit by voice too.

**Live:** https://buildreel.vercel.app (no sign-in; the editor opens a sample build on first visit). New here? Read the [guide](https://buildreel.vercel.app/guide): record, find your two files, line them up, export.

**Sample reel:** [public/sample/reel.mp4](public/sample/reel.mp4). Buildreel cut it from a 17 minute recording of three of its own features being built: the X and LinkedIn post draft, project save and load, and the prompt review panel.

Built for No Hands: The Wispr Challenge (WeMakeDevs x Wispr Flow).

## What it does

1. **Import.** Drop one screen recording and the Claude Code `.jsonl` logs for that session. Logs live in `~/.claude/projects/<project folder>/`.
2. **Sync.** Buildreel reads the recording's start time from the OBS file name and lines the log up with the video. You confirm or nudge the first prompt once.
3. **Edit.** Each prompt you dictated becomes a step: a prompt card, the agent's work fast-forwarded with a chip for each tool call, then the most active few seconds of you checking the result in real time. The plan fits a target length (30, 60 or 90 s) by step importance.
4. **Steer by voice.** Hold your Wispr Flow key and say a change, such as "make it a minute and keep the part where export worked". A small model turns it into validated edit operations; undo and redo cover every change.
5. **Export.** An mp4 rendered in your browser, 16:9 or vertical 9:16, with the overlays burned in, each prompt card playing the prompt as you dictated it, and background noise removed from your voice. Plus SRT captions and a ready post for X and LinkedIn. Projects save to a small JSON file you can reopen later.

Keys in the editor: Space or K plays, the arrows move 5 s, Shift and an arrow jumps a step, Ctrl or Cmd Z undoes.

## Privacy

- The recording and the logs never leave your browser. Decoding, planning and encoding all run on your machine with WebCodecs.
- Keys, tokens, emails and passwords are redacted when the log is read, and again on anything typed or written by a model.
- Only short, redacted text reaches the server: your spoken instruction and step titles for steering, and prompt excerpts for step titles. Hidden prompts are never sent. Nothing is logged server-side.
- You can edit or hide any prompt card before you export.

## How it works

```
recording.mp4 --probe, keyframes, packet sizes--> activity per half second
session.jsonl --parse, redact------------------> prompts, tool calls, turn ends
                    align by wall clock -> steps -> plan (fit to target) -> EDL
                    EDL -> preview player and canvas overlays
                    EDL -> remap every output frame to its source frame -> mp4
voice instruction -> /api/steer -> patch ops -> constraints -> new EDL
```

The planner is deterministic: the whole reel is built with no network calls. The language model only names steps and maps spoken instructions to edits, and the app keeps working when it is down. Details are in [ARCHITECTURE.md](ARCHITECTURE.md).

## Run it locally

Requirements: Node 20 or newer, and a recent Chrome or Edge for export (WebCodecs).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Steering and step titles need `LLM_API_KEY` in `.env.local`; any OpenAI-compatible endpoint works, and the example uses Groq's free tier. Rate limits use Upstash Redis: without its variables the routes run unlimited under `npm run dev`, and a production build refuses model calls rather than spend without a cap. Everything else works with no keys at all.

```bash
npm test          # Vitest, pure functions with fixtures from real sessions
npm run typecheck
npm run lint
npm run build
```

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, zustand, zod, Mediabunny for demux, decode, encode and mux, RNNoise (WebAssembly) for voice cleanup, Groq for the two small model calls, Upstash for rate limits, Vercel for hosting.

## Limits

- One recording per project.
- Export needs WebCodecs, so it runs in Chrome or Edge; the preview works everywhere.
- The real-time review of a step can only be as long as the time you spent checking it on camera.
