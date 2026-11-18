# Ace: design

## Intent
Ace is a one-page, browser-only tool that catches vague coding requests before you send them to an AI.
In Stack Overflow's 2025 survey, 66% of developers named "almost right, but not quite" AI code as their top frustration.
The cause you can fix is the request: it says what to build but not how to tell it's right.
Ace checks a request against 6 rules, shows a score out of 6, asks the question that fills each gap,
and builds a Markdown task brief to paste into Claude, Cursor or ChatGPT.

## Goals
- Run a live gap check while you type, with a score out of 6.
- Each warning says what's missing and asks the question that fixes it.
- Generate an editable Markdown brief, with a Copy button and a "Copied!" confirmation.
- Provide two samples, vague (2/6) and good (6/6), so a first-time visitor can try it instantly.

## Non-goals
- No AI calls, backend, login, API keys or analytics. Nothing leaves the browser.
- No draft persistence, history or sharing.
- No "Type selected" or "Request written" checks. The score is the 6 gap rules only.

## Anti-goals
- Ace must not present itself as a judge. The rules are keyword and empty-field checks, and the UI calls Ace a checklist.
- Color must never be the only signal (icon + text: ⚠ / ✓).

## Constraints
- Vite + React + TypeScript, with Vitest. Pure logic goes in `src/lib/check.ts` and the UI in `src/App.tsx`.
- Google Sans via a Google Fonts `<link>` (preconnect, `display=swap`), loading only the weights used.
  Use `--fw-title` 700, `--fw-heading` 600, `--fw-label` 500 and `--fw-body` 400, with no ad-hoc weights.
  Fallback stack: `"Google Sans", system-ui, -apple-system, "Segoe UI", sans-serif`. Monospace is used only in the brief preview.
- Colors are CSS variables only: `--purple #6C3BAA`, `--white #FFFFFF`, `--purple-dark #57308A`,
  `--purple-ink #1E1033`, `--purple-tint #F3EEFA` and `--purple-border #E2D8F0`. No other hues and no gradients. All text meets WCAG AA.
- Every interactive element has a visible `--purple` focus ring. The UI has accessible labels and is keyboard usable.
- Layout: the form is on the left and the live result on the right, stacked on mobile.

## Approaches
1. **Vite + React + TS + Vitest (picked by the user in the kickoff).** It has a clean split between pure logic and UI, which fits TDD and two parallel agents.
2. A single static HTML file. It's lighter, but it gives no test runner and no clean file split for parallel work.
3. Next.js. It's overkill for a static single page with no server.

## Data shape (shared contract)
```ts
type RequestType = 'bug' | 'feature';
interface AceRequest {
  type: RequestType;
  whatToChange: string;
  current: string;
  expected: string;
  repro: string;
  dontTouch: string;
  doneWhen: string;
}
interface CheckResult {
  id: 'repro' | 'doneWhen' | 'vague' | 'area' | 'constraints' | 'expected';
  passed: boolean;      // n/a counts as passed
  applicable: boolean;  // false only for repro on features
  label: string;        // short, e.g. "No repro steps"
  question: string;     // the question that fixes it
}
checkRequest(req: AceRequest): CheckResult[]   // always 6 results, fixed order
score(results: CheckResult[]): number          // count of passed, 0–6
buildBrief(req: AceRequest): string            // Markdown
```

## Gap rules (all trimmed and case-insensitive)
1. **repro:** for a bug, it fails if `repro` is empty. For a feature it is not applicable and counts as passed ("n/a for features").
2. **doneWhen:** it fails if `doneWhen` is empty.
3. **vague:** it fails if `whatToChange` contains a whole-word "fix", "better", "clean up" or "improve",
   and `current` or `expected` is empty. Filling both counts as giving specifics.
4. **area:** it passes if any text field names a file (`name.ext`), a route (`/path`),
   or an area word (page, screen, component, button, form, modal, endpoint, api, route, login, signup,
   checkout, header, footer, nav, menu, settings, dashboard, profile, cart, search, table, list).
5. **constraints:** it fails if `dontTouch` is empty.
6. **expected:** it fails if `expected` is empty, or if it only repeats the request.
   "Repeats" means at least 80% of its meaningful words (with stopwords removed) also appear in `whatToChange`.

## Samples
- **Vague (2/6):** bug, `whatToChange` "fix the login page, it's broken", `dontTouch` "signup", everything else empty.
  It passes area and constraints and fails repro, doneWhen, vague and expected.
- **Good (6/6):** a bug with every field filled specifically, e.g. a login error on `/login` with
  steps, expected message and a done-when.

## Brief
`buildBrief` gives a Markdown document with a heading per field, "None specified" for empty optional fields,
and a closing line asking the AI to confirm the expected result for each acceptance item before coding.
The brief textarea follows the form until the user edits it. It then shows "Edited · Reset", and Reset regenerates it from the form.

## Left to the builder
- The exact wording of warnings, questions and helper text
- The results-panel layout (the winner of /prototype)
- The good sample's exact text
