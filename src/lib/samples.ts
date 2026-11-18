import type { AceRequest } from './check';

export const VAGUE_SAMPLE: AceRequest = {
  type: 'bug',
  whatToChange: "fix the login page, it's broken",
  current: '',
  expected: '',
  repro: '',
  dontTouch: 'signup',
  doneWhen: '',
};

export const GOOD_SAMPLE: AceRequest = {
  type: 'bug',
  whatToChange: 'Fix the error message on the /login page when the password is wrong',
  current: 'Submitting a wrong password reloads the page with no message, and the email field is cleared.',
  expected: 'The page stays put, keeps the email, and shows "Wrong email or password" under the password field.',
  repro: '1. Go to /login\n2. Enter a valid email and a wrong password\n3. Press Sign in',
  dontTouch: 'The signup flow and the session cookie logic in auth.ts',
  doneWhen: 'A wrong password shows the message, the email stays filled in, and focus moves to the password field.',
};
