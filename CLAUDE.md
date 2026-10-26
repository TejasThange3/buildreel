# CLAUDE.md

Buildreel turns a screen recording plus a Claude Code session log into a short captioned "how I built it" reel.

Read before any work:
- `BUILDREEL.md`: master spec, scope tiers, phase plan, gates.
- `ARCHITECTURE.md`: pipeline, data model, algorithms, folder structure and size budgets.

Next.js docs matching the installed version are in `node_modules/next/dist/docs/`. Read them before using a Next.js API.

The rules below are copied verbatim from BUILDREEL.md sections 5 and 6. They override any default agent behaviour, including default commit attribution.

## 5. Hard rules (copy into CLAUDE.md)

### 5.1 Code size and slop
1. Write only the code the task needs. If a file needs 100 lines, it gets about 100 lines, not 300.
2. The size estimates in ARCHITECTURE.md section 8 are a guide, not a cap. A file gets the lines it needs and no filler; if one grows far past its estimate, say why.
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
   git config user.email "142657235+TejasThange3@users.noreply.github.com"
   ```
   Verify with `git config user.name` and `git config user.email`. The GitHub no-reply address is used because the account blocks pushes that expose the personal email.
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
