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

// Stub until Task 2: every check fails so the UI can be built against the real shape.
export function checkRequest(_req: AceRequest): CheckResult[] {
  return CHECK_IDS.map((id) => ({ id, passed: false, applicable: true, label: id, question: `${id}?` }));
}

export function score(results: CheckResult[]): number {
  return results.filter((r) => r.passed).length;
}

// Stub until Task 2.
export function buildBrief(_req: AceRequest): string {
  return '';
}
