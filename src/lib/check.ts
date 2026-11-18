export type RequestType = 'bug' | 'feature';

export interface AceRequest {
  type: RequestType;
  whatToChange: string;
  current: string;
  expected: string;
  repro: string;
  dontTouch: string;
  doneWhen: string;
}

export type CheckId = 'repro' | 'doneWhen' | 'vague' | 'area' | 'constraints' | 'expected';

export interface CheckResult {
  id: CheckId;
  passed: boolean; // n/a counts as passed
  applicable: boolean; // false only for repro on features
  label: string;
  question: string;
}

export const CHECK_IDS: CheckId[] = ['repro', 'doneWhen', 'vague', 'area', 'constraints', 'expected'];

export const EMPTY_REQUEST: AceRequest = {
  type: 'bug',
  whatToChange: '',
  current: '',
  expected: '',
  repro: '',
  dontTouch: '',
  doneWhen: '',
};

const COPY: Record<CheckId, { fail: string; pass: string; question: string }> = {
  repro: { fail: 'No repro steps', pass: 'Repro steps given', question: 'What exact steps make the bug happen?' },
  doneWhen: { fail: 'No “done when”', pass: '“Done when” given', question: 'What must be true for you to call this finished?' },
  vague: { fail: '“fix” is vague', pass: 'Request is specific', question: 'What happens now, and what should happen instead?' },
  area: { fail: 'No file, page or area named', pass: 'Area named', question: 'Which file, page or part of the app is this about?' },
  constraints: { fail: 'No “don’t touch” list', pass: 'Don’t-touch list given', question: 'What must the AI leave alone?' },
  expected: { fail: 'No expected behavior', pass: 'Expected behavior is new information', question: 'What should the user see when it works?' },
};

const VAGUE = /\b(fix|better|clean\s+up|improve)\b/i;
const FILE = /\b[\w-]+\.[a-z]{2,4}\b/i;
const ROUTE = /(^|\s)\/[\w-]+/;
const AREA_WORD =
  /\b(page|screen|component|button|form|modal|endpoint|api|route|login|signup|checkout|header|footer|nav|menu|settings|dashboard|profile|cart|search|table|list)\b/i;
const STOPWORDS = new Set(
  'a an the and or but to of on in at for with by from is are was be it its this that these those i we you they he she my our your their should would will can when then so as up down there here not no'.split(' '),
);

const words = (s: string) => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];

function repeatsRequest(expected: string, whatToChange: string): boolean {
  const meaningful = words(expected).filter((w) => !STOPWORDS.has(w));
  const asked = new Set(words(whatToChange));
  // No meaningful words means nothing new was said.
  return meaningful.length === 0 || meaningful.filter((w) => asked.has(w)).length / meaningful.length >= 0.8;
}

export function checkRequest(req: AceRequest): CheckResult[] {
  const what = req.whatToChange.trim();
  const current = req.current.trim();
  const expected = req.expected.trim();
  const fields = [what, current, expected, req.repro.trim(), req.dontTouch.trim(), req.doneWhen.trim()];
  const isBug = req.type === 'bug';

  const passed: Record<CheckId, boolean> = {
    repro: !isBug || req.repro.trim() !== '',
    doneWhen: req.doneWhen.trim() !== '',
    vague: !VAGUE.test(what) || (current !== '' && expected !== ''),
    area: fields.some((f) => FILE.test(f) || ROUTE.test(f) || AREA_WORD.test(f)),
    constraints: req.dontTouch.trim() !== '',
    expected: expected !== '' && !repeatsRequest(expected, what),
  };

  return CHECK_IDS.map((id) => ({
    id,
    passed: passed[id],
    applicable: id !== 'repro' || isBug,
    label: id === 'repro' && !isBug ? 'Repro steps: n/a for features' : passed[id] ? COPY[id].pass : COPY[id].fail,
    question: COPY[id].question,
  }));
}

export function score(results: CheckResult[]): number {
  return results.filter((r) => r.passed).length;
}

export function buildBrief(req: AceRequest): string {
  const v = (s: string) => s.trim() || 'None specified';
  return [
    `# Task brief (${req.type})`,
    `## What to change\n${v(req.whatToChange)}`,
    `## Current behavior\n${v(req.current)}`,
    `## Expected behavior\n${v(req.expected)}`,
    ...(req.type === 'bug' ? [`## Repro steps\n${v(req.repro)}`] : []),
    `## Don't touch\n${v(req.dontTouch)}`,
    `## Done when\n${v(req.doneWhen)}`,
    'Before writing code, restate the expected result for each "Done when" item.',
  ].join('\n\n');
}
