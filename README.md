# AI Resume Reviewer

A full-stack GenAI application that gives structured, honest, ATS-calibrated
feedback on a resume for a target engineering role — with streaming output,
input validation, anti-hallucination prompt design, and request-level
observability.

Built as Week 1 of a 2-month GenAI engineering roadmap, focused on
understanding LLM APIs deeply before reaching for frameworks.

## Problem

Generic resume feedback tools either give vague, one-size-fits-all advice or
require a human reviewer. Engineers switching roles or levels need fast,
specific, honest feedback calibrated to their actual experience and target
role — not a canned checklist.

## Features

- Paste resume text, pick a target role (Backend / Frontend / Full Stack / AI
  Engineer), and enter years of experience.
- Structured feedback: summary, strengths, gaps, missing ATS keywords,
  actionable suggestions, and an honest 1-10 overall score.
- Streaming response over Server-Sent Events (SSE) — feedback appears
  progressively instead of a single multi-second wait.
- A distinct "Analyzing…" / "Finalizing…" loading state with a live elapsed
  timer, so the unavoidable model "thinking" delay feels intentional rather
  than broken.
- Full input validation with specific, actionable error messages (missing
  fields, invalid role, out-of-range experience, resume too short/long).
- Every request logged as a single structured JSON line with token usage,
  latency, and outcome — ready to forward to a real observability tool later
  without changing application code.

## Architecture

```text
User fills form (resume, role, years of experience)
  → POST /api/review-resume
  → Input validation (type checks, length bounds, role enum)
  → Gemini generateContentStream() with a role- and experience-aware
    system prompt (JSON schema + anti-hallucination rules)
  → Model "thinks" (hidden reasoning tokens, ~15-20s for this workload)
  → Model streams visible JSON tokens via SSE (data: <chunk>\n\n)
  → Backend forwards each chunk to the client as it arrives
  → On stream completion: backend sends a `meta` event (model, tokens,
    responseId) then `[DONE]`
  → Frontend accumulates chunks, shows a live "Analyzing…/Finalizing…"
    status card, then parses the completed text as JSON
  → Structured UI renders: score dial, strengths, gaps, suggestions,
    missing keywords, and a meta footer (model/tokens/response ID)
```

Every request — success or failure — is logged server-side as one structured
JSON line (`lib/logger.ts`) containing timestamp, role, years of experience,
resume length (not the resume content itself), model, token breakdown
(prompt/thinking/output/total), latency, and response ID.

## AI Design

- **Model:** `gemini-3.5-flash` (aliased via `gemini-2.5-flash` in the SDK
  call), chosen for low cost and strong "flash" tier latency/quality
  trade-off for a single-turn structured task.
- **Thinking budget:** `512` tokens, chosen deliberately after a real,
  measured trade-off — see Production Considerations below.
- **System prompt:** dynamically injects the target role and years of
  experience, embeds the exact JSON schema the model must return, and
  includes explicit field-level rules (item counts, tone, scoring
  calibration) plus an anti-hallucination section instructing the model to
  never invent skills or experience not literally present in the resume
  text, and to say "unclear" rather than guess.
- **Output contract:** a single JSON object matching a fixed schema
  (`summary`, `strengths[]`, `gaps[]`, `missingKeywords[]`,
  `suggestions[]`, `overallScore`), parsed with `JSON.parse()` once the
  full stream completes.
- **Structured output over prose:** the prompt explicitly forbids any
  text, markdown, or code fences before/after the JSON, since the
  frontend depends on the response being directly parseable.

## Production Considerations

- **Input validation before any model call.** Every field is type-checked
  and bounds-checked (resume 200-15,000 characters, years of experience
  0-50, role restricted to an explicit enum) before spending a single
  token on the LLM call — invalid requests cost nothing.
- **Structured error responses.** Every 400/500 returns
  `{ error, details }` with a specific, actionable message instead of a
  generic failure.
- **Thinking-latency trade-off, measured, not assumed.** Instrumented
  timing logs showed that with `thinkingBudget: 512`, ~95%+ of total
  latency (roughly 17-20s of a ~17.5-21.5s request) is spent in the
  model's hidden reasoning phase, which streams nothing visible. Disabling
  thinking (`thinkingBudget: 0`) cut total latency by ~40%, but produced
  visibly more generic feedback and missed subtler issues (e.g. a
  chronologically impossible employment date). Quality was prioritized:
  thinking stays enabled at `512`, and the UX compensates for the wait
  instead of sacrificing review quality.
- **Perceived-latency UX design.** Because the "thinking" phase is
  invisible by nature (no tokens to stream), a two-stage loading indicator
  ("Analyzing…" with a live elapsed-seconds counter, then
  "Finalizing…") gives users continuous feedback during the wait. A
  minimum-visible-duration guard (700ms) prevents the "Finalizing" stage
  from flickering faster than it can be perceived when the model's output
  burst is very fast.
- **Token/cost observability.** Every response includes a `meta` block
  with the model name, total tokens used, and response ID, both to the
  client (for transparency) and the server log (for cost tracking).
- **No resume content in logs.** Only resume *length* is logged, not the
  text itself — avoids storing personally identifiable information in
  logs by default.

## Demo

Run locally:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, paste a resume, pick a role and years of
experience, and submit.

## Limitations

- No rate limiting — a user (or script) can submit unlimited requests today.
- No persistence — reviews are not saved; refreshing the page loses the result.
- No retry/backoff on transient LLM failures (429/5xx) — a failed call
  surfaces directly as an error to the user.
- No automated tests (unit or integration) yet.
- Validation is manual (hand-written type/length checks) rather than
  schema-based (e.g. Zod) — planned for Week 2 of the roadmap.
- Logs go to stdout only; not yet wired to a real observability backend
  (Helicone/LangSmith/Datadog) — planned for Week 7.
- Single-turn only — no conversation history or follow-up questions about
  the review.
