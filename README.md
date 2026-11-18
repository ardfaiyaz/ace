# Ace

Catch vague coding requests before your AI codes them.

**Live:** [LIVE LINK — add after deploy]

## What Ace does

In Stack Overflow's 2025 Developer Survey, 66% of developers said their top AI frustration is code that's "almost right, but not quite." A big cause you can fix yourself is the request: it says what to build, but not how to tell when it's right.

Ace is a one-page checklist for your request. Pick **Bug** or **Feature**, fill in six short fields, and Ace checks them against six rules:

1. A bug has repro steps
2. There is a "done when"
3. Vague words ("fix", "better", "clean up", "improve") come with specifics
4. A file, page or area is named
5. There is a "don't touch" list
6. The expected behavior says something new, not just the request again

You get a live clarity score out of 6, and each gap comes with the question that fills it in. Then Ace builds a Markdown task brief you can edit and copy into Claude, Cursor or ChatGPT. You can view the results three ways: Checklist, Guided (one gap at a time) or Annotated (notes beside the brief).

Ace is a checklist, not a judge. The rules check for keywords and empty fields, so they're fast, predictable and private.

## Run it

Needs Node 22.12 or newer (Vitest's minimum).

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # Vitest: the gap rules, brief and samples
```

`npm run build` makes a production build in `dist/`.

## What I left out, on purpose

- **No AI.** No API calls, login, API keys, backend or analytics. Nothing leaves your browser, and it's free and instant.
- **No saved drafts, history or sharing.** Refresh and the form is empty again.
- **Keyword rules, not language understanding.** A request can pass every check and still be unclear. The score tells you what's missing, not whether the idea is good.
- **English only.**

## Stack

Vite, React 19, TypeScript and Vitest. The rules are plain functions in `src/lib/check.ts`, and the UI is in `src/App.tsx`.
