# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

منشی (Manshi) — a Persian/RTL Chrome extension (Manifest V3) for meeting minutes, task
management, and daily planning. Local-first by design: **no backend, no telemetry, no build
step**. Plain JavaScript loaded directly by the browser. All data lives in `chrome.storage.local`;
AI calls are bring-your-own-key, made directly from the client to whatever provider the user
configured.

## Commands

```bash
node tests/run.js                        # run the full test suite (~588 tests, zero deps)
sh .github/scripts/security-check.sh     # pre-push secret/privacy scan (staged diff + full git history)
git config core.hooksPath .githooks      # one-time per clone: run the security check automatically on push
```

There is no build/lint/typecheck step — this is unbundled JS loaded via `<script>` tags /
MV3 content script and service worker entries declared in `manifest.json`. To manually load the
extension: `chrome://extensions` → Developer mode → Load unpacked → project folder.

`tests/run.js` is a single self-contained file (no test runner dependency) that requires
`core/jalali.js`, `core/date-parser.js`, `core/ics.js`, etc., and asserts against them directly.
When adding logic to any `core/*.js` module, add corresponding `t('...', () => {...})` cases in
`tests/run.js` — this is the only safety net (no CI type-checking).

CI (`.github/workflows/release.yml`) runs `node tests/run.js` on every push/PR to `main`; on a
push to `main` where tests pass, it reads `version` from `manifest.json`, and if a release for
that version tag doesn't already exist, cuts `v<version>` with notes pulled from the matching
section of `CHANGELOG.md` (`.github/scripts/release-notes.js`). Releasing a new version is just:
bump `manifest.json` version, add a section to the top of `CHANGELOG.md`, push to main.

## Architecture

**No framework, no bundler.** `core/*.js` files define global objects (e.g. `Jalali`, `Store`,
`Agenda`, `MeetSearch`) via IIFEs that branch on `typeof chrome !== 'undefined'` vs. Node's
`require` — this lets the exact same file run unmodified in the browser (as a `<script>` global)
and under `node tests/run.js` (as a CommonJS module). Preserve this dual-mode pattern when editing
or adding `core/` modules.

Top-level pieces:

- `app.html` / `app.css` / `app.js` — the app shell: sidebar navigation, client-side routing,
  design system. `app.js` is a single large IIFE that pulls in the `core/*` globals and wires up
  the UI. Security convention enforced throughout: **user- or model-provided text is only ever
  inserted via `textContent`; `innerHTML` is reserved for static inline SVG icons.**
- `background.js` — MV3 service worker: alarms (morning reminder, end-of-day summary), omnibox,
  calendar refresh.
- `content.js` / `content.css` + `core/transcript-cleaner.js` — injected into
  `meet.google.com`; captures live captions only after the user explicitly starts recording, then
  cleans/splits transcript turns.
- `core/store.js` — the data layer over `chrome.storage.local` (falls back to `localStorage`
  outside the extension, e.g. under Node, so the UI/tests can run standalone). Owns tasks, people,
  meetings, settings, backup/restore. `SECRET_KEYS` (`icsUrl`, `aiKey`) are treated like passwords
  and are deliberately excluded from backups/exports by default — keep that exclusion in mind
  before adding new sensitive settings fields.
- `core/mom-core.js` — meeting-minutes generation: templates (9 of them), transcript chunking,
  prompt construction.
- `core/ai-client.js` — multi-provider BYOK client (OpenAI, Gemini, Grok, DeepSeek, OpenRouter,
  GapGPT, any OpenAI-compatible endpoint, or a `localhost` model). No keys or requests ever
  originate from this codebase's own infra — everything goes straight from the browser to the
  provider the user picked.
- `core/jalali.js` / `core/date-parser.js` — Jalali (Persian) calendar conversion and natural
  Persian date/recurrence parsing. High test coverage; treat as load-bearing pure logic.
- `core/ics.js` — iCal parsing/generation (RRULE expansion, cancellations, moved instances).
  Only accepts `https` URLs (plus `localhost` for local models) — never relax this.
- `core/agenda.js` — pure scheduling/agenda logic (free-time gaps, meeting series detection,
  calendar matching, search normalization) — kept dependency-free and heavily unit tested.
- `core/snapshot.js` — "Ask AI" bridge: prepared prompts for pasting into any external chatbot,
  and a `snapshot.json` file written only to local disk. This path intentionally has **no network
  I/O and opens no port** — don't add any.
- `core/inbox.js` — receives meeting minutes written back by the external MCP server; treat this
  input as **untrusted** (it comes from outside the extension's own control).
- `core/mcp-tools.js` — single source of truth for the MCP tool definitions, shared by
  `mcp/manshi-mcp.js` and its docs.
- `mcp/manshi-mcp.js` — the actual MCP server (Node, no dependencies). Reads
  `manshi-data/snapshot.json` (written by the extension) and writes `manshi-data/inbox.json`
  (read back into the extension with user confirmation before anything is applied). No network
  requests, no open ports — purely local file exchange. See `mcp/README.md` for client setup
  (Claude Code/Desktop, Codex CLI, Cursor, VS Code).
- `core/kiosk.js`, `core/market.js`, `core/bourse.js`, `core/funds.js` — the "kiosk" panel
  (calendar/events, prayer times, quote of the day, currency/gold, stock index, funds). All
  offline/computed except news and market price fetches, which are optional and **off by
  default**.
- `core/update.js` — the one always-on network call: a daily unauthenticated `GET` against
  GitHub to check for a newer release (the extension isn't distributed via the Chrome Web Store,
  so it can't auto-update itself). User-toggleable.

## Privacy invariants (treat as hard constraints, not style preferences)

These are the project's core promise and are actively enforced by
`.github/scripts/security-check.sh` (scans both the staged diff and full git history before
push):

- No server, no telemetry. Nothing leaves `chrome.storage.local` except calls the user explicitly
  configured and triggered (their own AI key to their own chosen provider; optional news/market/AI
  bridge features that default off).
- `icsUrl` and `aiKey` are handled like passwords: never logged, never in exports/backups by
  default, never printed.
- Only `https://` URLs are accepted for remote endpoints, except `localhost` for local model
  inference.
- The MCP bridge (`core/snapshot.js`, `mcp/`) is local-file-only: no ports, no outbound requests.
- Before any push, run `sh .github/scripts/security-check.sh` (or install it via
  `git config core.hooksPath .githooks`) — it blocks secrets, real iCal URLs, non-example emails,
  `eval` in product code, and stray `.env`/`.pem`/backup files from ever reaching the remote.
