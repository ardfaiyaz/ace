import { describe, expect, it } from 'vitest';
import { buildBrief, checkRequest, EMPTY_REQUEST, score, type AceRequest, type CheckId } from './check';
import { GOOD_SAMPLE, VAGUE_SAMPLE } from './samples';

const base: AceRequest = {
  type: 'bug',
  whatToChange: 'Show an error under the password field on the /login page',
  current: 'A wrong password reloads the page silently and clears the email.',
  expected: 'Red "Wrong email or password" text appears and the email stays filled in.',
  repro: '1. Open /login\n2. Enter a wrong password\n3. Press Sign in',
  dontTouch: 'The signup flow and auth.ts',
  doneWhen: 'The message shows and focus moves to the password field.',
};

const blank: AceRequest = { ...EMPTY_REQUEST };

const get = (req: AceRequest, id: CheckId) => checkRequest(req).find((r) => r.id === id)!;

describe('checkRequest', () => {
  it('returns six results in fixed order', () => {
    expect(checkRequest(base).map((r) => r.id)).toEqual(['repro', 'doneWhen', 'vague', 'area', 'constraints', 'expected']);
  });

  it('base request scores 6', () => {
    expect(score(checkRequest(base))).toBe(6);
  });

  it('bug without repro fails', () => {
    expect(get({ ...base, repro: '' }, 'repro').passed).toBe(false);
  });

  it('feature makes repro n/a', () => {
    const r = get({ ...base, type: 'feature', repro: '' }, 'repro');
    expect(r.applicable).toBe(false);
    expect(r.passed).toBe(true);
    expect(r.label).toBe('Repro steps: n/a for features');
  });

  it('missing done-when fails', () => {
    expect(get({ ...base, doneWhen: '' }, 'doneWhen').passed).toBe(false);
  });

  it('vague word without specifics fails', () => {
    expect(get({ ...base, whatToChange: 'fix it', current: '' }, 'vague').passed).toBe(false);
    expect(get({ ...base, whatToChange: 'fix it' }, 'vague').passed).toBe(true);
  });

  it('vague matches whole words only', () => {
    expect(get({ ...base, whatToChange: 'add a prefix and fixture improvement', current: '' }, 'vague').passed).toBe(true);
    expect(get({ ...base, whatToChange: 'FIX the page', current: '' }, 'vague').passed).toBe(false);
    expect(get({ ...base, whatToChange: 'clean up the header', current: '' }, 'vague').passed).toBe(false);
  });

  it('area detects file, route, area word', () => {
    expect(get({ ...blank, whatToChange: 'edit Login.tsx' }, 'area').passed).toBe(true);
    expect(get({ ...blank, whatToChange: 'the /settings route' }, 'area').passed).toBe(true);
    expect(get({ ...blank, whatToChange: 'the checkout' }, 'area').passed).toBe(true);
    expect(get({ ...blank, whatToChange: 'make it nicer' }, 'area').passed).toBe(false);
  });

  it('missing constraints fails', () => {
    expect(get({ ...base, dontTouch: '' }, 'constraints').passed).toBe(false);
  });

  it('expected empty or repeating fails', () => {
    expect(get({ ...base, expected: '' }, 'expected').passed).toBe(false);
    const what = 'show an error on wrong password';
    expect(get({ ...base, whatToChange: what, expected: what }, 'expected').passed).toBe(false);
    expect(
      get({ ...base, whatToChange: what, expected: 'red "Wrong password" text under the field, focus moves to it' }, 'expected').passed,
    ).toBe(true);
  });

  it('whitespace counts as empty', () => {
    expect(get({ ...base, repro: '   ' }, 'repro').passed).toBe(false);
  });

  it('every failing result has a label and a question ending in ?', () => {
    const failed = checkRequest(EMPTY_REQUEST).filter((r) => !r.passed);
    expect(failed.length).toBeGreaterThan(0);
    for (const r of failed) {
      expect(r.label).not.toBe('');
      expect(r.question.endsWith('?')).toBe(true);
    }
  });

  it('uses the prototype copy for labels', () => {
    expect(get(VAGUE_SAMPLE, 'repro').label).toBe('No repro steps');
    expect(get(GOOD_SAMPLE, 'repro').label).toBe('Repro steps given');
    expect(get(VAGUE_SAMPLE, 'repro').question).toBe('What exact steps make the bug happen?');
  });
});

describe('samples', () => {
  it('samples score 2 and 6', () => {
    expect(score(checkRequest(VAGUE_SAMPLE))).toBe(2);
    expect(score(checkRequest(GOOD_SAMPLE))).toBe(6);
  });

  it('vague sample text', () => {
    expect(VAGUE_SAMPLE).toEqual({
      type: 'bug',
      whatToChange: "fix the login page, it's broken",
      dontTouch: 'signup',
      current: '',
      expected: '',
      repro: '',
      doneWhen: '',
    });
  });
});

describe('buildBrief', () => {
  it('brief has every section and None specified', () => {
    const brief = buildBrief(VAGUE_SAMPLE);
    for (const s of ['## What to change', '## Current behavior', '## Expected behavior', '## Repro steps', "## Don't touch", '## Done when', 'None specified']) {
      expect(brief).toContain(s);
    }
    expect(brief.startsWith('# Task brief (bug)')).toBe(true);
    expect(brief.endsWith('Before writing code, restate the expected result for each "Done when" item.')).toBe(true);
    const feature = buildBrief({ ...VAGUE_SAMPLE, type: 'feature' });
    expect(feature.startsWith('# Task brief (feature)')).toBe(true);
    expect(feature).not.toContain('## Repro steps');
  });
});
