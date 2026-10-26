# Buildreel - Master Build Spec

Owner: Tejas Thange (GitHub: TejasThange3)
Event: No Hands: The Wispr Challenge (WeMakeDevs x Wispr Flow), Builders track
Deadline: Saturday 31 October 2026, 11:59 pm IST. Target to submit: Saturday afternoon.
Companion file: ARCHITECTURE.md (system design, diagrams, data model, budgets). Read it first.

---

## 0. How to use this file

1. Tejas reviews ARCHITECTURE.md and approves or edits it.
2. Tejas pastes the Master Prompt (section 12) into Claude Code, by dictating through Wispr Flow where possible.
3. The agent copies sections 5 and 6 into `CLAUDE.md` in the first commits so every session follows them.
4. Work proceeds phase by phase (section 9). Each phase ends with tests green, a short demo to Tejas, and commits.

---

## 1. The hackathon (source: wemakedevs.org/wispr, /judges, /ideas)

### 1.1 Facts
- Organisers: WeMakeDevs and Wispr Flow. Online, open to anyone in India, students welcome.
- Runs 16 to 31 October 2026. Solo only: one person, one project, one track.
- Track 1 Builders: a working software product that solves a problem in your own work. Dictate requirements and follow-ups into your coding tools and let them do the coding.
- Any editor, AI assistant or builder is allowed. Wispr Flow is how you talk to them.
- Keyboard is allowed for shortcuts and small fixes. Voice for prompts, docs, messages, commit notes. Judges look at how much of your writing went through Flow.
- You own what you build. WeMakeDevs and Wispr may feature the project and demo video.

### 1.2 Steps
1. Register and set up Wispr Flow. The first Flow should state the problem and what the tool should do.
2. Build with Flow.
3. Share every week: upload the Wispr usage card and post progress.
4. Submit on the website by 31 October, 11:59 pm IST.

### 1.3 What to submit
1. A link to the working project. Judges must open and use it without paying or asking for access. If it needs sign-in, give a test login and sample input. (Buildreel: no sign-in, sample loads on first visit.)
2. A demo video, up to two minutes.
3. Wispr usage card: screenshot from Insights in the desktop app.
4. A few lines on the problem, who it is for, and how Wispr was used.

### 1.4 Judging (weights fixed before the event; values were not visible when fetched)
1. Does it solve a real problem in your work? Specific problem, clear user, a tool that person would keep using.
2. Was Wispr used meaningfully? Flow is part of the build and the workflow; demo and usage card show it.
3. Does it work? A live link judges can open and use.
4. Is the demo clear? A two-minute video anyone can follow.

Every project gets scores from multiple judges (average), public scores and written comments. Judges: Kunal Kushwaha, Aayush Sharma, Sachin Sharma (WeMakeDevs), Rohan Kochhar (Wispr Flow India growth).

### 1.5 Dates
- 31 Oct 11:59 pm IST: submissions close (also the cutoff for the 10 x $100 random draw).
- Wed 4 Nov: scores published.
- Until end of Thu 5 Nov: raise questions about scores.
- Fri 6 Nov: winners announced, prize money sent.

### 1.6 Prizes
- Rs 1,00,000 each: Builders winner, No-Code winner, rank 1 on Wispr usage leaderboard.
- $100 each to 10 random submitted projects.
- Bonus rankings: Most Wispr usage (words dictated), Social (#NoHandsChallenge, tag WeMakeDevs and Wispr Flow, link in weekly check-in).

### 1.7 How Buildreel maps to each criterion
| Criterion | Buildreel's answer |
|-----------|--------------------|
| Real problem | Tejas loses hours hand-editing demo videos for every hackathon and build-in-public post. User: developers building with AI coding agents who need to show how they built it. |
| Wispr meaningful | The reel's captions are the prompts Tejas dictated through Flow. The SteerBox is a text field Flow types into. The whole project was built by dictation. |
| Works | buildreel.vercel.app, no sign-in, sample project plays within seconds, import your own files. |
| Demo clear | The demo video is Buildreel's own making-of reel, cut by Buildreel. |

---

## 2. Product

### 2.1 Problem
Building with AI agents is now mostly talking to them. Showing that work is still painful: hours of screen recording where 80 percent is the agent thinking, and no record on screen of what you asked for. Editing that into a 90 second demo takes hours.

### 2.2 Who it is for
Developers who build with Claude Code and need a demo video, a hackathon submission or a build-in-public post.

### 2.3 What it does
Drop in your screen recording and the Claude Code session log. Buildreel lines them up, finds each prompt you gave, fast-forwards the agent's work, keeps the moments where you check the result, and captions every step with your actual prompt. Say what to change ("make it a minute, keep the part where export worked") and the cut updates. Export an mp4, captions and a post draft.

### 2.4 The demo story
"This video was cut by the tool you are about to see, from hours of me building it by voice."

---

## 3. Scope

Everything below is in scope. Tiers set the order, not what gets cut. Tier 1 must be done and deployed before Tier 2 starts; Tier 2 before Tier 3.

### Tier 1 (the reel works end to end, live)
- Import mp4 + one or more .jsonl; parse, redact, probe, activity, align (auto + manual sync), steps.
- Planner with target duration and fit; intro and outro cards.
- Preview with canvas overlay: prompt cards, tool chips, titles.
- Step list with keep/drop toggles, timeline strip.
- SteerBox -> /api/steer -> ops -> replan; undo/redo.
- Export mp4 (with audio for real-time parts).
- Sample project from the real build session, deployed on Vercel.

### Tier 2
- LLM step titles (/api/titles) with fallback.
- Outro stats card (steps, prompts, words dictated, raw -> reel duration).
- SRT export, post.txt draft for X/LinkedIn.
- Prompt review panel: edit or hide any prompt text before export.
- Save/load project.json.

### Tier 3
- Optional mic transcript (Groq Whisper via /api/transcribe) to keep spoken reactions like "it works".
- Vertical 9:16 export.
- Auto zoom on the active screen region (from frame-diff bounding box).
- Keyboard shortcuts.

---

## 4. Tech stack

| Area | Choice | Reason |
|------|--------|--------|
| App | Next.js (App Router) + React + TypeScript (strict) | frontend and API routes in one project, one deploy; editor page is a client component |
| Backend | Next.js route handlers in TypeScript (`src/app/api/*`) | only 2-3 small routes that hold the LLM key; no video ever reaches the server, so no Python/Java service is needed |
| State | zustand | small, no boilerplate |
| Validation | zod (shared by client and route handlers) | one schema, both sides |
| Media | Mediabunny (WebCodecs), loaded client-only | demux, decode, encode, mux in browser without COOP/COEP; fallback ffmpeg.wasm |
| LLM | OpenAI-compatible HTTP via fetch (Groq or Gemini) | no SDK, swap by env vars |
| Rate limit | Upstash Redis free tier (Vercel marketplace) | Vercel has no built-in KV; protects the free LLM tier during judging |
| Tests | vitest | pure functions only |
| Hosting | Vercel (Hobby) | native Next.js host, preview deploy per push |

No other dependency without a one-line justification in the commit body.

---

## 5. Hard rules (copy into CLAUDE.md)

### 5.1 Code size and slop
1. Write only the code the task needs. If a file needs 100 lines, it gets about 100 lines, not 300.
2. Respect the size budgets in ARCHITECTURE.md section 8. If a file will exceed its budget, stop and explain why before writing it.
3. No speculative abstractions: no factories, base classes, generic wrappers, config systems or plugin points that nothing uses yet.
4. No unused exports, parameters, types, files or dependencies. Delete dead code in the same commit that makes it dead.
5. No placeholder code: no TODO stubs, no mock data in production paths, no "example" functions.
6. No comments that restate the code. Comment only the non-obvious why (a browser quirk, a format detail, a threshold choice).
7. No defensive noise: no try/catch around code that cannot throw, no null checks on values the types guarantee, no catch-and-ignore.
8. No `any`, no `as` casts to silence the compiler, no `@ts-ignore`. Parse unknown input with zod.
9. No console.log left in committed code.
10. No emojis anywhere: code, UI copy, docs, commit messages.

### 5.2 Clean code
1. One responsibility per file. Pure logic in `src/lib` and `src/shared`, UI in `src/ui`, server-only code in `src/server`, `src/app` holds only routes and page shells. No logic in components beyond wiring.
2. Functions short and named for what they return or do. Prefer early returns over nesting.
3. Pure, deterministic functions for parse, align, steps, plan, fit, remap, applyOps. They take data and return data.
4. Names match the domain words in ARCHITECTURE.md (Step, Segment, EDL, Constraints, PatchOp).
5. Errors that the user can act on get a clear UI message. Everything else fails loudly in development.

### 5.3 Working method
1. Read before writing. Read the relevant files and ARCHITECTURE.md before changing anything.
2. Source-driven: for Next.js (current version), Vercel, Upstash, Mediabunny, Groq and Gemini APIs, read the current docs before coding. Never code third-party APIs from memory.
3. Small steps. One logical change, run typecheck, lint and tests, then commit.
4. When something in ARCHITECTURE.md turns out wrong, stop, propose the change to Tejas, update the doc in its own commit, then continue.
5. Never add a feature that is not in this spec without asking.
6. Never use browser speech recognition. Wispr Flow is the voice layer; the app only accepts typed text.
7. Tests cover the pure functions with small fixtures from real data. No snapshot tests of UI, no tests of third-party libraries.

---

## 6. Git and commit rules (copy into CLAUDE.md)

### 6.1 Authorship: every commit is Tejas's
1. In the repo, before the first commit:
   ```
   git config user.name "Tejas Thange"
   git config user.email "tejasankushthange3@gmail.com"
   ```
   Verify with `git config user.name` and `git config user.email`.
2. The remote must be the personal account: `github.com/TejasThange3/buildreel`. Some repos on this laptop push through the company account Tejasmimic; confirm the credential used for this remote is TejasThange3 before the first push.
3. No `Co-Authored-By` trailers, no "Generated with Claude Code" lines, no agent signatures in commit messages or PR bodies. Disable attribution in `.claude/settings.json` for this project (`"includeCoAuthoredBy": false`, or the current equivalent attribution setting; check the Claude Code docs for your version).
4. Before every push, run `git log --format='%an <%ae>%n%b' -5` and confirm author and no trailers.

### 6.2 Cadence: many commits, all real
1. One logical change per commit. Target 80 to 110 commits across the build. The plan in 6.4 lists about 80; real fixes and refactors found during the work add the rest.
2. Every commit builds, passes typecheck, lint and tests.
3. Never: empty commits, whitespace-only churn, splitting one change into fake pieces, "wip", "update", "fix stuff", reverting and re-applying to inflate count, backdating.
4. Do commit separately: a type definition, the function that uses it, its tests, the UI that shows it, a doc update. These are real separate steps.
5. Commit as soon as a step is green. Do not batch a day of work into one commit.
6. Push at least at the end of every phase.

### 6.3 Message format (Conventional Commits)
```
<type>(<scope>): <imperative summary, lowercase, max 72 chars>

<optional body: why, not what; one-line dependency justification if any>
```
Types: feat, fix, refactor, perf, test, docs, chore, style (UI styling only).
Scopes: log, media, timeline, plan, render, ui, state, api, shared, deploy.

### 6.4 Commit plan (guide, not a script; follow the real work)

Phase 0 - setup
1. chore: init next.js app router project with typescript
2. chore: enable strict typescript and path aliases
3. chore: add eslint and prettier config
4. chore: add vitest
5. docs: add architecture and build spec
6. docs: add CLAUDE.md with project rules
7. chore(deploy): add security headers in next config and env example

Phase 1 - log parsing
8. feat(shared): define build event and step types
9. feat(log): read jsonl lines and count malformed ones
10. feat(log): extract user prompts, skip tool results and meta lines
11. feat(log): filter slash command and system noise
12. feat(log): extract tool events with file and command labels
13. feat(log): mark turn ends and interruptions
14. feat(log): merge multiple session files by timestamp
15. feat(log): redact keys, tokens and emails
16. test(log): cover parser with trimmed real session fixture
17. test(log): cover redaction patterns

Phase 2 - media
18. feat(media): probe duration and resolution
19. feat(media): infer recording start from filename timestamp
20. feat(media): fall back to last-modified minus duration
21. test(media): cover filename timestamp parsing
22. feat(media): sample downscaled frames in a worker
23. feat(media): compute smoothed activity score per half second

Phase 3 - alignment and steps
24. feat(timeline): map log timestamps to video time
25. feat(timeline): drop events outside the recording
26. feat(timeline): group events into prompt, work and review phases
27. feat(timeline): attach activity to review phases
28. test(timeline): cover alignment and step grouping

Phase 4 - planner
29. feat(shared): add segment, edl and constraint schemas
30. feat(plan): build default segments per step
31. feat(plan): compress agent work into timed fast-forward
32. feat(plan): pick best review window by activity
33. feat(plan): fit plan to target duration by step importance
34. feat(plan): add intro and outro cards
35. feat(plan): map output time to source time
36. test(plan): cover duration fitting
37. test(plan): cover time remap

Phase 5 - UI and preview
38. feat(state): add project store with derived edl
39. feat(ui): app shell with import, sync, edit and export stages
40. feat(ui): drop zone for recording and log files
41. feat(ui): sync panel to confirm prompt one position
42. feat(render): draw prompt card overlay
43. feat(render): draw tool chips and step title
44. feat(ui): preview player with cut skipping and speed ramps
45. feat(ui): sync canvas overlay to preview time
46. feat(ui): step list with keep and drop toggles
47. feat(ui): timeline strip coloured by segment mode
48. style(ui): base layout, type scale and colour tokens

Phase 6 - steering
49. feat(api): add openai-compatible llm helper
50. feat(api): add per-ip and daily rate limits with upstash
51. feat(shared): add steer request and patch op schemas
52. feat(api): add steer route with validated ops and one retry
53. feat(plan): apply patch ops to constraints
54. test(plan): cover patch ops and invalid step indexes
55. feat(state): undo and redo over constraint history
56. feat(ui): steer box with applied-ops summary

Phase 7 - export
57. feat(render): encode remapped frames to mp4
58. feat(render): carry source audio for real-time segments
59. feat(render): burn overlays into exported frames
60. feat(ui): export panel with progress and cancel
61. fix(ui): show capability message on unsupported browsers

Phase 8 - deploy and sample
62. chore(deploy): connect repo to vercel
63. chore(deploy): add llm and upstash env vars
64. feat: add redacted sample project from real build session
65. feat(ui): load sample project on first visit
66. docs: readme with live link, how it works and local setup

Phase 9 - tier 2
67. feat(api): titles route with short step titles
68. feat(plan): fall back to first sentence when titles fail
69. feat(plan): outro stats card with words dictated
70. feat(render): srt export from overlay timings
71. feat(render): post draft for x and linkedin
72. feat(ui): prompt review panel to edit or hide text
73. feat(state): save and load project json

Phase 10 - tier 3
74. feat(api): transcribe route for chunked mic audio
75. feat(plan): keep spoken reaction moments
76. feat(render): vertical 9:16 export
77. feat(render): auto zoom on active screen region
78. feat(ui): keyboard shortcuts for playback and undo

Phase 11 - finish
79. fix(ui): empty, loading and error states
80. fix(ui): labels and focus states for accessibility
81. perf(ui): lazy load export pipeline
82. chore: remove unused code and dependencies
83. docs: add demo video and submission write-up

---

## 7. Wispr protocol (how voice is used)

1. Every prompt to Claude Code is dictated with Wispr Flow. Keyboard only for shortcuts, file paths and small fixes.
2. README story sections, the submission write-up, weekly check-ins and X posts are dictated by Tejas, then tidied by the agent. The agent never invents the narrative.
3. Daily: one #NoHandsChallenge post tagging WeMakeDevs and Wispr Flow, ideally with a Buildreel reel of that day's work.
4. Weekly: upload the Wispr usage card and post link in the check-in.
5. Screenshot the Insights usage card on Saturday before submitting.

---

## 8. Agent workflow and gates

```
Gate A  Phase 0 done + Day 1 spikes answered (ARCHITECTURE.md section 13) -> report to Tejas
Gate B  Tier 1 pipeline works locally on a real recording -> short demo to Tejas
Gate C  Tier 1 deployed, sample loads on the live link in a fresh browser -> Tejas checks on phone/laptop
Gate D  Tier 2 done -> demo
Gate E  Tier 3 attempted, final polish, submission package ready
```
At each gate the agent reports: what works, what does not, what changed in the architecture, commit count since last gate. No moving past a gate without Tejas's go-ahead.

---

## 9. Phase plan

Tejas works at Mimic in the afternoon to evening; build blocks are mornings and nights.

| Day | Phases | Done when |
|-----|--------|-----------|
| Mon 26 (night) | 0, spikes, 1 | parser returns correct prompts and tool events for a real log; tests green |
| Tue 27 | 2, 3, 4 | steps and EDL printed for a real recording, fit hits target within 1 s |
| Wed 28 | 5, 6 | preview plays the reel; steering changes it; undo works |
| Thu 29 | 7, 8 | export mp4 plays in VLC; live link works in a fresh browser with the sample |
| Fri 30 | 9, 10, record final source session | Tier 2 complete, Tier 3 attempted; demo reel cut |
| Sat 31 | 11, submission | submitted by afternoon; buffer for issues |

Acceptance checks per phase
- Phase 1: on Tejas's real log, prompt count matches what he remembers; no tool_result text appears as a prompt; secrets redacted.
- Phase 2: start time from filename within 1 s; activity spikes when the screen changes.
- Phase 3: each step's promptT lands within 2 s of the visible submit in the recording.
- Phase 4: same inputs give identical EDL; total within 1 s of target; pinned steps never dropped.
- Phase 5: no visible stutter at 1x; overlay matches export.
- Phase 6: 10 varied spoken instructions produce sensible ops; invalid step numbers rejected.
- Phase 7: exported duration equals EDL total; audio in sync for real segments.
- Phase 8: fresh incognito Chrome, live link, Play visible within 10 s, no sign-in.

---

## 10. Testing and verification

- `npm run typecheck && npm run lint && npm test` before every commit.
- Fixtures come from Tejas's real logs, trimmed and redacted. Never synthetic logs as the only fixture.
- Manual check list before submission: Chrome and Edge, a 10-minute and a 60-minute recording, mp4 and mkv, LLM key removed (fallbacks work), rate limit hit (clear message), phone view of the live link (preview plays).
- A separate review pass (a fresh agent that has not seen the code being written) reads the diff of each phase against sections 5 and 6 and lists violations.

---

## 11. Submission package

### 11.1 Recording the source session (start today)
- Record every build session with OBS: 1080p or 1440p, 30 fps, MP4 (or MKV then File > Remux Recordings), default timestamp filename, mic on (Tier 3 uses it).
- Keep the Claude Code window visible when dictating so the prompt is on screen.
- Claude Code deletes old logs after 30 days by default; raise `cleanupPeriodDays` in settings if needed.
- Copy the session `.jsonl` files from `%USERPROFILE%\.claude\projects\<encoded-cwd>\` after each session.

### 11.2 Demo video script (max 2:00)
```
0:00-0:10  Hook: "This video was cut by the tool you're about to see, from <X> hours of me building it by voice."
0:10-0:25  Problem: every hackathon wants a demo; hours of agent-thinking footage; editing takes hours.
0:25-1:00  Live link: sample loads, play the reel; drop my own recording + log; auto sync; plan appears.
1:00-1:25  Hold the Wispr key: "make it a minute and keep the part where export finally worked" -> cut updates.
1:25-1:40  Export: mp4, captions, post draft.
1:40-2:00  Real result: the reels I posted each day this week; Wispr usage card; link.
```
Upload unlisted on YouTube.

### 11.3 Write-up template (Tejas dictates the final text)
```
Problem: I build with Claude Code by voice and every hackathon or build-in-public post needs a demo video. My recordings are hours long and mostly the agent working, so editing took me 2-3 hours each time.
Who it is for: developers who build with AI coding agents and need to show how they built it.
What it does: drop in a screen recording and the Claude Code log; Buildreel aligns them, captions each step with the prompt you spoke, fast-forwards agent work, and lets you steer the cut by voice. Export mp4, captions and a post.
How I used Wispr: every prompt, the docs and my posts were dictated with Flow (<N> words). The captions in every reel are my dictated prompts, and the editing box is designed for Flow.
Real result: <reels posted, time saved>.
Live link: https://buildreel.vercel.app   Repo: https://github.com/TejasThange3/buildreel
```

### 11.4 Final checklist
- [ ] Live link opens without sign-in, sample plays.
- [ ] Demo video under 2:00, unlisted link works logged-out.
- [ ] Wispr Insights usage card screenshot.
- [ ] Write-up dictated and pasted.
- [ ] All commits authored by Tejas Thange <tejasankushthange3@gmail.com>, no trailers.
- [ ] README has live link, demo link, how it works, setup.
- [ ] Weekly check-ins done, posts tagged #NoHandsChallenge.
- [ ] Submitted before Saturday evening.

---

## 12. Master prompt (paste into Claude Code at the repo root)

```
You are building Buildreel with me, Tejas, for the No Hands Wispr Challenge (Builders track).
Deadline: Saturday 31 October 2026, 11:59 pm IST.

Read BUILDREEL.md and ARCHITECTURE.md fully before doing anything.

Your rules are sections 5 (hard rules) and 6 (git and commit rules) of BUILDREEL.md.
They are not suggestions. In particular:
- Write only necessary code. Respect the size budgets in ARCHITECTURE.md section 8.
  If a file would exceed its budget, stop and tell me why first.
- No speculative abstractions, no dead code, no placeholder stubs, no comments that restate code,
  no any, no console.log, no emojis.
- Stack is Next.js (App Router) + TypeScript on Vercel; the backend is only route handlers in src/app/api.
- Read current docs for Next.js, Vercel, Upstash, Mediabunny and the LLM provider before using them.
- Every commit is authored by me: user.name "Tejas Thange", user.email "tejasankushthange3@gmail.com".
  No Co-Authored-By trailers, no generated-by lines. Disable attribution in .claude/settings.json.
- One logical change per commit, every commit green, Conventional Commits format.
  Aim for 80-110 real commits over the build. Never pad.

Start now with Phase 0 only:
1. Set git identity and confirm it. Confirm the remote will use my personal account TejasThange3.
2. Scaffold the project per ARCHITECTURE.md section 8 and the stack in BUILDREEL.md section 4.
3. Create CLAUDE.md containing BUILDREEL.md sections 5 and 6 verbatim plus a pointer to both docs.
4. Run the Day 1 spikes in ARCHITECTURE.md section 13. For the log spike, read my real
   Claude Code .jsonl files under %USERPROFILE%\.claude\projects\ and report the exact field
   shapes you found, quoting a few redacted lines.
5. Stop at Gate A and report: what you set up, spike findings, any changes you propose to
   ARCHITECTURE.md, and the commit list so far. Do not start Phase 1 until I say go.
```

---

## 13. Risks to watch

| Risk | Mitigation |
|------|------------|
| Mediabunny API differs from the plan | Day 1 spike; ffmpeg.wasm fallback |
| Log shape differs (desktop vs CLI, versions) | parser tolerant per line, fixtures from real files |
| Export slow on long fast-forwards | record at 30 fps; sequential decode; progress + cancel |
| LLM free-tier limits during judging | cached titles in sample; rate limits; full fallback path |
| Sample video slow to load | 720p, under ~20 MB, else Vercel Blob |
| Mediabunny or worker breaks under SSR | client-only dynamic import, verified in the Day 1 spike |
| Running out of time | gates force Tier 1 live by Thursday; submission Saturday afternoon, not at night |
