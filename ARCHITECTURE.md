# Buildreel - System Architecture (v0, for review)

Status: DRAFT for Tejas to verify. No application code is written until this document is approved.
Companion file: BUILDREEL.md (master spec, hackathon rules, hard rules, commit rules, agent prompt).

---

## 1. One line

Buildreel takes a screen recording of you building with Claude Code plus the Claude Code session log, lines them up, and auto-cuts a short "how I built it" reel where every step is captioned with the prompt you actually dictated, the agent's working time is fast-forwarded, and you steer the edit by speaking into a text box with Wispr Flow.

---

## 2. Inputs and outputs

```
INPUTS (all stay in the browser)              OUTPUTS (all generated in the browser)
--------------------------------              --------------------------------------
1. Screen recording   .mp4 (.mkv/.webm if     1. reel.mp4      H.264 + AAC, 1080p/720p, 30 fps
   the demuxer supports it)                   2. reel.srt      captions with output timings
2. Claude Code log(s) .jsonl (1..n sessions)  3. post.txt      X / LinkedIn post draft
3. Spoken instructions (typed into the        4. project.json  sync offset + constraints (re-open later)
   SteerBox by Wispr Flow)
```

Only short, redacted text (step titles, prompt excerpts, the instruction) ever leaves the browser, and only to our own `/api/*` routes.

---

## 3. System context

```
+=============================== USER'S BROWSER (Chrome / Edge) ================================+
|                                                                                               |
|   recording.mp4 ----+                                                                         |
|                     |                                                                         |
|   session.jsonl ----+--> [1 IMPORT] --> [2 PARSE + REDACT] --> BuildEvent[]                   |
|                     |         |                                    |                         |
|                     |         +--> [3 PROBE] --> duration, size,    |                         |
|                     |                 |          recording start   |                         |
|                     |                 v                            v                         |
|                     |        [4 ACTIVITY]                   [5 ALIGN] <-- manual nudge (SyncPanel)
|                     |          packet sizes @ 2/s                  |                         |
|                     |                 |                            v                         |
|                     |                 +----------------------> [6 STEPS]                     |
|                     |                                              |                         |
|                     |                         Constraints -------> [7 PLANNER] --> EDL        |
|                     |                              ^                               |         |
|                     |                              |                    +----------+------+  |
|                     |                       [9 APPLY OPS]               v                 v  |
|                     |                              ^              [8 PREVIEW]      [10 EXPORT]
|                     |                              |               video + canvas    WebCodecs
|                     |                         PatchOp[]            overlay           -> mp4/srt/txt
|                     |                              |                                         |
|   SteerBox  <--- Wispr Flow types here             |                                         |
|      | instruction (+ compact step list)           |                                         |
+======|=============================================|=========================================+
       |  POST /api/steer                            |  200 { ops }
       v                                             |
+======== NEXT.JS ROUTE HANDLERS on VERCEL (TypeScript) ====+===================+
|  [rate limit per IP, Upstash] -> [zod validate input] -> [LLM call, JSON mode]|
|  -> [zod validate output, 1 retry with error] -> response                     |
|  routes: /api/steer   /api/titles   /api/transcribe (Tier 3)                  |
+============================|==================================================+
                             v
              LLM provider via OpenAI-compatible HTTP
              (Groq openai/gpt-oss-20b, strict json_schema; key held as a Vercel environment variable)
```

One Next.js (App Router) project holds both sides. `/` is a static landing page whose hero glass carries a frosted reel track with a moving playhead (HTML, no video, no Mediabunny) and links to `/editor`. The editor page is a client component; Mediabunny is loaded client-only (dynamic import, no SSR). The only server code is the route handlers under `src/app/api/*`. The server never receives video.

Design principle: the deterministic pipeline (stages 1-8, 10) produces a complete reel with zero network calls. The LLM only improves titles and turns spoken instructions into structured ops. If the LLM is down, the app still works.

---

## 4. Pipeline stages

| # | Stage | Input | Output | Module |
|---|-------|-------|--------|--------|
| 1 | Import | dropped files | `File` refs, type-checked | `ui/DropZone.tsx` |
| 2 | Parse + redact | `.jsonl` text | `BuildEvent[]` sorted by wall-clock | `lib/log/parseClaudeLog.ts`, `lib/log/redact.ts` |
| 3 | Probe | video `File` | `{durationS, width, height, startedAt}` | `lib/media/probe.ts`, `lib/media/startTime.ts` |
| 4 | Activity | video `File` | `ActivityTrack` (score per 0.5 s) | `lib/media/activity.ts` |
| 5 | Align | events, startedAt, offset | events with `videoT` (seconds) | `lib/timeline/align.ts` |
| 6 | Steps | aligned events, activity | `Step[]` (prompt, work, review phases) | `lib/timeline/steps.ts` |
| 7 | Plan | steps, activity, `Constraints` | `EDL` (ordered segments) | `lib/plan/autoPlan.ts`, `lib/plan/fit.ts` |
| 8 | Preview | EDL, video | live playback + overlay | `ui/Player.tsx`, `lib/render/drawOverlay.ts` |
| 9 | Apply ops | `PatchOp[]`, Constraints | new Constraints (+ history) | `lib/plan/applyOps.ts`, `state/store.ts` |
| 10 | Export | EDL, video | mp4, srt, txt | `lib/render/exportMp4.ts`, `srt.ts`, `postDraft.ts` |

---

## 5. Data model (shared types)

```ts
// shared/types.ts  (sketch, final names may differ)

type BuildEvent =
  | { kind: 'prompt';    at: number; text: string; sessionId: string }     // at = epoch ms
  | { kind: 'tool';      at: number; tool: string; label: string }         // "Edited plan/fit.ts"
  | { kind: 'reply';     at: number }                                      // assistant text block
  | { kind: 'turnEnd';   at: number }
  | { kind: 'interrupt'; at: number };

type AlignedEvent = BuildEvent & { t: number };   // seconds on the video timeline

type Step = {
  index: number;            // 1-based, shown to the user and to the LLM
  prompt: string;           // redacted full prompt
  title: string;            // short title (LLM or first sentence)
  promptT: number;          // video time the prompt was submitted
  workEnd: number;          // video time the agent finished the turn
  reviewEnd: number;        // next prompt time or recording end
  tools: { t: number; label: string }[];
  reviewActivity: number;   // 0..1 mean activity during review
};

type SegmentMode = 'card' | 'hold' | 'real' | 'fast' | 'cut';

type Segment = {
  id: string;
  step?: number;            // owning step, absent for intro/outro
  mode: SegmentMode;
  src?: [number, number];   // source range in seconds (real/fast), single t for hold
  speed?: number;           // fast only
  outDur: number;           // seconds in the output
  overlay?: { kind: 'prompt' | 'tools' | 'title' | 'stats'; text: string };
};

type EDL = { segments: Segment[]; totalS: number };

type Constraints = {
  targetS: number;                          // default 90
  pinned: number[];                         // steps that must stay
  dropped: number[];                        // steps that must go
  emphasis: Record<number, number>;         // step -> extra real-time seconds
  speed: Record<number, number>;            // step -> forced fast-forward factor
  titles: Record<number, string>;           // step -> user/LLM title override
  intro?: string; outro?: string;
};

type PatchOp =
  | { op: 'setTarget'; seconds: number }
  | { op: 'keep'; steps: number[] }
  | { op: 'drop'; steps: number[] }
  | { op: 'emphasize'; step: number; seconds: number }
  | { op: 'setSpeed'; step: number; factor: number }
  | { op: 'setTitle'; step: number; text: string }
  | { op: 'setIntro'; text: string }
  | { op: 'setOutro'; text: string };
```

Why Constraints and not direct EDL edits: steering changes intent ("keep step 4", "60 seconds"), the planner recomputes the EDL. Every edit stays consistent with the duration target, and undo is just a stack of Constraints.

---

## 6. Key algorithms

### 6.1 Claude Code log parsing

Location: `<config>\projects\<encoded-cwd>\<sessionId>.jsonl`, where `<config>` is `CLAUDE_CONFIG_DIR` if set (Tejas: `D:\ClaudeData`), else `%USERPROFILE%\.claude`. encoded-cwd replaces every non-alphanumeric character with `-`, e.g. `D--Hackathon-Buildreel---WemakeDevs`. The user picks the files; the app never guesses the path.

Verified on Day 1 against claude-desktop v2.1.308:
- Each line is a JSON object. Only `type: 'user'` and `type: 'assistant'` matter. Many other types exist (`attachment`, `queue-operation`, `api-request-blob`, `file-history-snapshot`, `custom-title`, ...) and are ignored. `api-request-blob` repeats message content, so it must never be read as a prompt.
- Fields used: `type`, `timestamp` (ISO, UTC), `uuid`, `sessionId`, `isSidechain`, `isMeta`, `origin`, `message { role, content, stop_reason }`.
- The desktop app writes a new file per turn that repeats the whole conversation with original `uuid`s and timestamps; side questions create short branch files. Files overlap heavily.
- Subagent reports and task notifications are stored as `queue-operation` and `attachment` records, never as `user` prompts.
- `system` records with `subtype: 'stop_hook_summary'` are written when a turn ends.

```
for each line:
  skip if JSON.parse fails (count it, show "N lines skipped")
  skip unless type is 'user' or 'assistant'
  skip if isMeta or isSidechain
  type 'user':
     content array has tool_result blocks    -> skip (it is tool output, not you)
     origin present                          -> prompt only if origin.kind == 'human'
     origin absent (older/CLI logs)          -> content string or text blocks -> prompt
     text == "[Request interrupted by user]" -> interrupt
     noise filter: starts with "<command-name>", "<command-message>", "<local-command-stdout>",
                   "<local-command-caveat>" -> skip
     cleanup: unwrap <pasted_content ...> tags, @"C:\path\file.md" -> @file.md
  type 'assistant':
     tool_use blocks -> tool events, label by tool:
        Edit/Write/MultiEdit -> "Edited <basename(file_path)>"
        Bash                 -> "Ran <description || first 40 chars of command>"
        Read/Grep/Glob       -> aggregated per turn: "Read 6 files"
        Task/Agent           -> "Started a subagent"
        others               -> tool name (mcp__server__tool -> tool)
     text blocks -> reply event
  turnEnd = last assistant record before the next prompt or interrupt
     (interrupted turns write no end_turn; turns resumed by a subagent report run past it)
merge all files: dedupe by uuid (first seen wins), sort by `at`
  files sharing any uuid are one conversation: their sessionIds merge into one (smallest id),
  because the desktop app rewrites sessionId in each copy and a turn must not split across ids
  (cost: a side question in a branch file closes the main turn on the same clock)
```

Redaction runs on every prompt and label before display or network: API key shapes (`sk-...`, `gsk_...`, `AIza...`, `ghp_...`, long hex/base64 tokens), emails, `.env`-style `KEY=value` lines. Replaced with `[redacted]`.

### 6.2 Recording start time

```
1. filename regex  /(\d{4})-(\d{2})-(\d{2})[ _T](\d{2})-(\d{2})-(\d{2})/  (OBS, Game Bar default)
   -> interpret as LOCAL time -> epoch ms
2. else  file.lastModified - durationS*1000    (file is finalised when recording stops)
3. user nudge in SyncPanel always wins: scrub to the frame where prompt 1 was submitted,
   click "Prompt 1 is here" -> offset = frameT - (prompt1.at - startedAt)/1000
```
Sample project ships a precomputed offset in `project.json`, so timezones never matter for judges.

### 6.3 Activity track (encoded packet sizes)

```
read video packet metadata only (Mediabunny EncodedPacketSink, metadataOnly: no decode)
bin[i] = sum of byteLength of non-key packets with timestamp in [i*0.5, (i+1)*0.5)
smooth with a 3-sample moving average
score = clamp((bin - p10) / (p99 - p10), 0, 1)   p10 = static-screen floor, p99 = busy ceiling
```
Why packets and not pixels: OBS writes a keyframe only every ~8.3 s, so sampling decoded frames every 0.5 s decodes nearly every frame (about 3.4 min for a 1 h 1080p recording). The Day 1 spike on a real OBS recording: packet scan of 16 min took 0.1 s; against a pixel-diff score, Pearson 0.82, Spearman 0.83, and the top 24 active bins agreed 24/24. Key packets are skipped because their size reflects the GOP boundary, not screen change. Risk: a strict CBR encoder with filler data would flatten the signal; the pixel method then becomes the fallback.

Used to (a) trim static review time, (b) rank steps by "something visibly happened". The Tier 3 zoom box needs pixels and uses a decoding worker (`lib/media/zoom.worker.ts`), sampled only inside the chosen real segments.

### 6.4 Step building

```
step k = prompt k
  prompt phase : [promptT - 2s, promptT]          the prompt landing on screen
  work phase   : [promptT, workEnd]               agent working (tool events inside)
  review phase : [workEnd, next promptT or end]   you checking the result
```
Steps whose prompt lands outside `[0, durationS]` after alignment are dropped and counted (the log covers more than the recording). Events are kept until steps are built, so a turn still running when recording stopped ends at `durationS` instead of losing its end. A step with no turn end before the next prompt ends its work at its last tool event.

Day 1 check against two real recordings: the auto start time put prompts 0.3 s and 2.4 s from the visible submit. The error varies per recording (recorder start-up, log write delay), so the SyncPanel nudge stays the way to get under 2 s.

### 6.5 Planner and duration fit

Default per-step segments:
```
hold   : freeze at promptT, overlay = prompt card     outDur = clamp(words / 3.5, 2.0, 5.0)
fast   : work phase, overlay = tool chips             outDur = clamp(workLen / 20, 1.5, 3.0)
real   : best review window (highest activity)        outDur = min(reviewLen, 6.0), cut if activity ~ 0
```
Plus `card` intro (2.5 s, title) and outro (3 s, stats: steps, prompts, words dictated, raw duration -> reel duration).

Fit to `targetS`:
```
total = intro + outro + sum(steps)
while total > targetS:
    shrink reals toward 3s, then fast toward 1.5s, then holds toward 2s (in that order)
    if still over: drop the lowest-importance unpinned step
importance = reviewActivity * 0.5 + toolCount_norm * 0.3 + promptLength_norm * 0.2
           + pinned ? inf : 0, emphasis adds its seconds after fitting
while total < targetS (rare): extend real windows up to their source length
```
Pure function, unit tested. Same input always yields the same EDL.

### 6.6 Time remap (shared by preview and export)

```
outT -> segment s (prefix sums of outDur) -> local = outT - s.start
  card : no source frame (draw card)
  hold : srcT = s.src[0]
  real : srcT = s.src[0] + local
  fast : srcT = s.src[0] + local * s.speed
```

### 6.7 Steering

```
SteerBox text --> POST /api/steer { instruction, targetS, steps: [{index, title, excerpt(120), outDur, kept}] }
server: system prompt lists the op schema and the step list, JSON mode,
        zod-validate, reject step indexes outside 1..N, 1 retry with the validation error
client: applyOps(constraints, ops) -> push history -> replan -> show "Applied: dropped step 3, target 60s"
```
Never uses the browser's own speech recognition. Wispr Flow is the voice layer.

### 6.8 Preview

`<video>` element + a `<canvas>` overlay drawn by the same `drawOverlay` used in export (no DOM/export drift).
```
real : play at 1x
fast : playbackRate = min(speed, 16); if speed > 16, play 16x in hops (seek ahead each 250 ms)
hold : pause on frame, timer for outDur
card : hide video, draw card
cut  : never reached (not in EDL output order)
```

### 6.9 Export

```
for each output frame at 30 fps:
    srtT = remap(outT)
    frame = decoded source frame at srcT  (sequential timestamps, decoder reused)
    draw frame -> draw overlay -> encode (H.264 via WebCodecs)
audio: copy source audio only for 'real' segments, re-timestamped to output time; silence elsewhere
mux to MP4 in memory -> Blob -> download
```
Library: Mediabunny (WebCodecs-based demux/decode/encode/mux). Fallback if a Day 1 spike fails: ffmpeg.wasm (needs COOP/COEP headers, set in `next.config.ts` headers for the editor route only).

---

## 7. Sequences

### 7.1 Judge opens the live link
```
Judge        App                     /public/sample            /api/titles
  | open URL  |                            |                        |
  |---------->| fetch project.json, mp4,   |                        |
  |           | jsonl ---------------------->                       |
  |           |<---------------------------| files                 |
  |           | parse, probe, activity, align (stored offset), steps, plan
  |           |----------------------------------------------------->| titles (cached in project.json, so usually skipped)
  |<----------| reel ready, Play button visible within ~10 s        |
```

### 7.2 User imports their own build
```
User drops mp4 + jsonl -> parse+redact -> probe -> activity (packet scan, under 1 s)
-> auto start time -> SyncPanel shows prompt 1 marker -> user confirms or nudges
-> steps -> plan(targetS 90) -> preview
```

### 7.3 Voice steer
```
User holds Wispr key: "make it a minute and keep the part where export finally worked"
Wispr types the sentence into SteerBox -> Enter
-> /api/steer -> ops [setTarget 60, keep [7]] -> applyOps -> replan -> preview jumps to step 7
-> "Undo" restores previous Constraints
```

### 7.4 Export
```
Export -> worker-free main-thread loop with progress + cancel (yield every N frames)
-> reel.mp4 + reel.srt + post.txt download
```

---

## 8. Folder structure and size budgets

Line counts are estimates of what each file needs, not caps: the rule is no unnecessary code.

```
buildreel/
  CLAUDE.md                      rules for the agent (copied from BUILDREEL.md section 5-6)
  ARCHITECTURE.md
  BUILDREEL.md
  README.md
  package.json  tsconfig.json  next.config.ts  eslint.config.mjs  vitest.config.ts
  .env.example                   LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
  public/
    sample/project.json          offset, cached titles, targetS
    sample/session.jsonl         redacted, trimmed real log
    sample/recording.mp4         720p, under ~20 MB; else Vercel Blob
    sample/reel.mp4              the sample cut, exported by Buildreel, linked from the README
  src/
    app/
      layout.tsx        ~25      fonts, metadata
      page.tsx          ~60      landing: hero, how it works, steering, privacy, footer
      editor/page.tsx   ~20      renders <Editor/> (client-only)
      globals.css
      api/steer/route.ts       ~70
      api/titles/route.ts      ~50
      api/transcribe/route.ts  ~60   Tier 3
    server/
      llm.ts            ~50      OpenAI-compatible fetch, JSON mode, timeout
      rateLimit.ts      ~40      per-IP hourly cap + global daily cap (Upstash)
    shared/
      types.ts          ~70      BuildEvent, Step, Segment, EDL, Constraints, PatchOp
      schema.ts         ~80      zod schemas used by client and route handlers
    ui/Editor.tsx       ~80      'use client'; stage switch: import / sync / edit / export
    state/store.ts      ~120     zustand: project, constraints history, derived EDL
    lib/log/readLogLines.ts    ~80   zod line schema, read + dedupe files, merge session ids
    lib/log/parseClaudeLog.ts  ~105  lines -> BuildEvent[], turn state per session
    lib/log/toolLabel.ts       ~30
    lib/log/redact.ts          ~85   credential shapes, secret fields, token vs path rules
    lib/media/probe.ts         ~50
    lib/media/startTime.ts     ~40
    lib/media/activity.ts      ~50   packet-size activity, no decode
    lib/timeline/align.ts      ~50
    lib/timeline/steps.ts      ~100
    lib/plan/autoPlan.ts       ~130
    lib/plan/fit.ts            ~80
    lib/plan/remap.ts          ~50
    lib/plan/applyOps.ts       ~80
    lib/render/drawOverlay.ts  ~100
    lib/render/exportMp4.ts    ~150
    lib/render/srt.ts          ~30
    lib/render/postDraft.ts    ~40
    ui/DropZone.tsx  ui/SyncPanel.tsx  ui/Player.tsx  ui/Timeline.tsx
    ui/StepList.tsx  ui/SteerBox.tsx   ui/ExportPanel.tsx      each ~60-150
    ui/landing/Hero.tsx  ui/landing/HowItWorks.tsx            each ~80
  tests/
    fixtures/  (trimmed real jsonl, tiny filenames list)
    parseClaudeLog.test.ts  redact.test.ts  startTime.test.ts
    align.test.ts  steps.test.ts  fit.test.ts  remap.test.ts  applyOps.test.ts
```
Estimated total: 2,500-3,200 lines including tests.

### 8.1 Visual system (agreed with Tejas, 27 Oct)

The landing page and the editor are both built in Phase 5 and share one system.
- Dark only: the brand is a lit glass object on a near-black stage, so there is no light theme.
- Colour: monochrome surfaces and text; the only colour is light passing through glass. One accent, coral, is reserved for voice: it marks where Wispr Flow types (the SteerBox). The WeMakeDevs and Wispr palette is otherwise not used, so Buildreel reads as its own product.
- Type: Geist and Geist Mono (numbers, times, tool labels).
- Glass: the landing hero is one custom WebGL fragment shader (refraction, dispersion, pointer response), no 3D library. Small glass controls use CSS (layered borders, highlights, backdrop blur) with a solid fallback. The editor links are liquid metal pills: Paper Shaders `LiquidMetal` on a 2.5 px rim, over a CSS metal gradient for browsers without WebGL2. A logo mark (a cut B: coral prompt bar, two segment pills) heads the nav, footer and editor. The footer ends on the word Buildreel in the same liquid metal, flowing inside the glyphs. The hero canvas pauses off-screen and in hidden tabs and falls back to a still image for reduced motion or a missing WebGL context.
- Motion: transform and opacity only, native scroll, no scroll hijacking, every animation explains a change. The one exception is hover feedback: colour, border and background may fade over 300 ms or less, since a short paint on one element costs next to nothing.
- Banned: icon-and-arrow card grids, gradient blobs, glow on every element, stock marketing phrases, emoji, em dashes in copy.

---

## 9. API contracts

```
POST /api/steer
  req  { instruction: string(<=500), targetS: number, steps: {index, title, excerpt, outDur, kept}[] (<=80) }
  200  { ops: PatchOp[], note?: string }
  422  { error: "could not map instruction", detail }
  429  { error: "rate limited", retryAfterS }

POST /api/titles
  req  { steps: {index, prompt(<=600)}[] }
  200  { titles: {index, title(<=48 chars)}[] }

POST /api/transcribe   (Tier 3)
  req  audio/wav (16 kHz mono), client sends chunks under 4 MB each
       (Vercel caps function request bodies at about 4.5 MB), with chunk offset
  200  { words: {w, start, end}[] }   times already shifted by the chunk offset
```

---

## 10. Deployment

```
GitHub (TejasThange3/buildreel)  --push-->  Vercel (Next.js preset, Hobby plan)
                                            preview deploy per push, production on main
                                            env vars: LLM_API_KEY, LLM_BASE_URL, LLM_MODEL,
                                                      UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
                                            Upstash Redis (free tier, via Vercel marketplace)
live: https://buildreel.vercel.app  (no sign-in; landing plays the sample reel, /editor opens the sample project)
```

---

## 11. Security and privacy

- Video and log never leave the browser.
- Redaction before any display, caption, export or network call. User can review and edit any prompt text before export.
- Route handlers accept only small JSON, validated, length-capped. No user content logged server-side.
- API key only in Vercel environment variables, never in `NEXT_PUBLIC_*`. Rate limits protect the free tier during judging.

---

## 12. Failure modes and fallbacks

| Failure | Behaviour |
|---------|-----------|
| LLM down / rate limited | titles fall back to first sentence; steer shows the error, manual toggles still work |
| Start time unknown | SyncPanel opens with prompt 1 marker for manual sync |
| Log covers more than the recording | out-of-range steps dropped, count shown |
| Browser lacks WebCodecs encode | clear message: use Chrome or Edge; preview still works |
| Container not decodable (.mkv) | message: remux in OBS (File > Remux Recordings) |
| Very long recording (> 60 min) | packet scan stays fast; export shows progress and cancel |

---

## 13. Day 1 spikes (verify before building on them)

1. Real Claude Code `.jsonl` on Tejas's machine: field names, where tool_result lives, timestamps format, desktop-app Code tab writes the same logs.
2. Mediabunny: read OBS mp4 (and mkv), random + sequential frame access speed, H.264 encode, audio passthrough. Read current docs; do not code from memory.
3. Current LLM model IDs and free-tier limits (Groq / Gemini OpenAI-compatible endpoints, JSON mode).
4. Next.js + Vercel: client-only loading of Mediabunny and the worker under the current Next.js version, route handler body limit, Upstash rate-limit setup, sample asset size and load time.

Results (26 Oct, Gate A):
1. Log shape: see 6.1.
2. Mediabunny 1.62.1 on a live OBS hybrid MP4 (1080p30 H.264, AAC 48 kHz): probe 103 ms; activity via packets, see 6.3; H.264 export with overlay 18.6 fps at 1080p; audio packets copied for one segment only give a valid MP4 with an audio gap (ffprobe/ffmpeg decode clean). VLC playback still to check in Phase 7.
3. Groq `openai/gpt-oss-20b` supports strict `json_schema`; listed limits 30 RPM, 1K RPD, 8K TPM (confirm in the Groq console). Fallback `llama-3.3-70b-versatile` with `json_object`. Gemini free tier trains on inputs, so not the default.
4. Next.js 16.4: `ssr: false` only inside a client component; `next lint` removed (use `eslint`). Vercel Hobby: 4.5 MB function body, 300 s duration, 100 GB/month transfer, so a 20 MB sample in `/public` is fine. Upstash `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_*`; the Vercel integration may inject `KV_REST_API_*`, check after connecting.

---

## 14. Out of scope

- Accounts, databases, server-side video processing.
- Cursor logs (no timestamps in its JSONL), other agents. Mention as future work.
- Browser speech recognition of any kind.
- Music, transitions library, timeline drag-editing. Steering and toggles are the editing surface.
