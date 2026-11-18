import { useEffect, useState, type ReactNode } from 'react';
import { EMPTY_REQUEST, buildBrief, checkRequest, score, type AceRequest, type CheckResult, type RequestType } from './lib/check';
import { GOOD_SAMPLE, VAGUE_SAMPLE } from './lib/samples';
import './App.css';

const svg = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const WarnIcon = () => (
  <svg {...svg} className="icon icon-warn"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
);
const CheckIcon = () => (
  <svg {...svg} className="icon icon-check"><path d="M20 6 9 17l-5-5" /></svg>
);
const CopyIcon = () => (
  <svg {...svg} className="icon"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);

type Field = Exclude<keyof AceRequest, 'type'>;
const FIELDS: { key: Field; label: string; help: string; rows: number }[] = [
  { key: 'whatToChange', label: 'What to change', help: 'Name the file, screen or component.', rows: 2 },
  { key: 'current', label: 'Current behavior', help: 'What happens now.', rows: 2 },
  { key: 'expected', label: 'Expected behavior', help: 'What should happen instead.', rows: 2 },
  { key: 'repro', label: 'Repro steps', help: 'Steps that make the bug show up.', rows: 3 },
  { key: 'dontTouch', label: 'Don’t touch', help: 'Files or behavior that must stay as they are.', rows: 2 },
  { key: 'doneWhen', label: 'Done when', help: 'How you will know it works.', rows: 2 },
];

type View = 'checklist' | 'guided' | 'annotated';
const VIEWS: { id: View; label: string }[] = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'guided', label: 'Guided' },
  { id: 'annotated', label: 'Annotated' },
];

// Which form field each check's note sits beside in the Annotated view.
const NOTE_CHECKS: Record<Field, CheckResult['id'][]> = {
  whatToChange: ['vague', 'area'],
  current: [],
  expected: ['expected'],
  repro: ['repro'],
  dontTouch: ['constraints'],
  doneWhen: ['doneWhen'],
};

const Meter = ({ value, className, children }: { value: number; className: string; children?: ReactNode }) => (
  <div className={className} role="meter" aria-label="Clarity score" aria-valuemin={0} aria-valuemax={6} aria-valuenow={value}>
    {children}
  </div>
);

function Checklist({ results, passed }: { results: CheckResult[]; passed: number }) {
  const ordered = [...results].sort((a, b) => Number(a.passed) - Number(b.passed));
  return (
    <>
      <header className="ledger-head">
        <h3 className="view-title">Clarity</h3>
        <p className="ledger-score" aria-hidden="true">
          <span className="score-num">{passed}</span> / 6 checks pass
        </p>
      </header>
      <Meter value={passed} className="segments">
        {results.map((r, i) => (
          <span key={r.id} className="seg" data-on={i < passed || undefined} style={{ transitionDelay: `${i * 40}ms` }} />
        ))}
      </Meter>
      <ul className="ledger-list">
        {ordered.map((r) => (
          <li key={r.id} className="ledger-row" data-passed={r.passed || undefined}>
            {r.passed ? <CheckIcon /> : <WarnIcon />}
            <div>
              <p className="row-label">{r.label}</p>
              {!r.passed && <p className="row-question">{r.question}</p>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Guided({ results, passed }: { results: CheckResult[]; passed: number }) {
  const gaps = results.filter((r) => !r.passed);
  const done = results.filter((r) => r.passed);
  const gapKey = gaps.map((g) => g.id).join();
  const [i, setI] = useState(0);
  const [prevKey, setPrevKey] = useState(gapKey);
  if (prevKey !== gapKey) {
    // The set of gaps changed: restart at the first one so the index never points past the end.
    setPrevKey(gapKey);
    setI(0);
  }
  const gap = gaps[i];

  return (
    <>
      <header className="coach-head">
        <h3 className="view-title">Clarity <span className="score-num">{passed}</span>/6</h3>
        <Meter value={passed} className="bar">
          <span className="bar-fill" style={{ transform: `scaleX(${passed / 6})` }} />
        </Meter>
      </header>

      {gap ? (
        <div className="coach-card">
          <p className="coach-count">Gap {i + 1} of {gaps.length} · {gap.label}</p>
          <p className="coach-question">{gap.question}</p>
          <div className="coach-nav">
            <button type="button" className="btn" onClick={() => setI((n) => (n - 1 + gaps.length) % gaps.length)} disabled={gaps.length < 2}>Previous gap</button>
            <button type="button" className="btn" onClick={() => setI((n) => (n + 1) % gaps.length)} disabled={gaps.length < 2}>Next gap</button>
          </div>
        </div>
      ) : (
        <div className="coach-card coach-ready">
          <CheckIcon />
          <p className="coach-question">Ready to send. Every check passes.</p>
        </div>
      )}

      {done.length > 0 && (
        <div className="coach-done">
          <h3>Covered</h3>
          <ul>
            {done.map((r) => (
              <li key={r.id}><CheckIcon />{r.label}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Annotated({ req, results }: { req: AceRequest; results: CheckResult[] }) {
  return (
    <ol className="doc">
      {FIELDS.filter((f) => f.key !== 'repro' || req.type === 'bug').map((f) => {
        const value = req[f.key].trim();
        const notes = results.filter((r) => NOTE_CHECKS[f.key].includes(r.id) && !r.passed);
        return (
          <li key={f.key} className="doc-section" data-missing={!value || undefined}>
            <div className="doc-body">
              <h3>{f.label}</h3>
              <p className="doc-text">{value || 'Not written yet'}</p>
            </div>
            {notes.length > 0 && (
              <aside className="doc-notes" aria-label={`${f.label} notes`}>
                {notes.map((n) => (
                  <p key={n.id} className="note"><WarnIcon /><span><strong>{n.label}.</strong> {n.question}</span></p>
                ))}
              </aside>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function App() {
  const [req, setReq] = useState<AceRequest>(EMPTY_REQUEST);
  const [editedBrief, setEditedBrief] = useState<string | null>(null);
  const [copy, setCopy] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [view, setView] = useState<View>('checklist');
  const [rawBrief, setRawBrief] = useState(false);

  const results = checkRequest(req);
  const passed = score(results);
  const brief = editedBrief ?? buildBrief(req);
  const showBriefText = view !== 'annotated' || rawBrief;

  useEffect(() => {
    if (copy === 'idle') return;
    const t = setTimeout(() => setCopy('idle'), 2000);
    return () => clearTimeout(t);
  }, [copy]);

  function load(sample: AceRequest) {
    setReq(sample);
    setEditedBrief(null);
  }

  async function copyBrief() {
    try {
      // Throws when the Clipboard API is missing (insecure context) or permission is denied.
      await navigator.clipboard.writeText(brief);
      setCopy('ok');
    } catch {
      setCopy('fail');
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Ace</h1>
          <p className="tagline">Catch vague requests before your AI codes them.</p>
        </div>
        <div className="sample-buttons">
          <button type="button" className="btn" onClick={() => load(VAGUE_SAMPLE)}>Load vague sample</button>
          <button type="button" className="btn" onClick={() => load(GOOD_SAMPLE)}>Load good sample</button>
        </div>
        <p className="disclaimer">Ace is a checklist, not a judge: it checks for empty fields and vague keywords.</p>
      </header>

      <main className="columns">
        <form className="request-form" aria-label="Request" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="type-group">
            <legend>Type</legend>
            {(['bug', 'feature'] as RequestType[]).map((t) => (
              <label key={t} className="radio">
                <input type="radio" name="type" value={t} checked={req.type === t} onChange={() => setReq({ ...req, type: t })} />
                {t === 'bug' ? 'Bug' : 'Feature'}
              </label>
            ))}
          </fieldset>

          {FIELDS.filter((f) => f.key !== 'repro' || req.type === 'bug').map((f) => (
            <div key={f.key} className="field">
              <label htmlFor={f.key}>{f.label}</label>
              <textarea
                id={f.key}
                rows={f.rows}
                aria-describedby={`${f.key}-help`}
                value={req[f.key]}
                onChange={(e) => setReq({ ...req, [f.key]: e.target.value })}
              />
              <p id={`${f.key}-help`} className="help">{f.help}</p>
            </div>
          ))}
        </form>

        <section className="panel results" aria-labelledby="results-title">
          <div className="results-top">
            <h2 id="results-title">Results</h2>
            <div className="switcher" role="radiogroup" aria-label="Results view">
              {VIEWS.map((v) => (
                <label key={v.id} className="switch-opt">
                  <input type="radio" name="view" className="visually-hidden" value={v.id} checked={view === v.id} onChange={() => setView(v.id)} />
                  {view === v.id && <CheckIcon />}
                  {v.label}
                </label>
              ))}
            </div>
          </div>
          <p className="visually-hidden" aria-live="polite">Clarity {passed} of 6</p>

          {view === 'checklist' && <Checklist results={results} passed={passed} />}
          {view === 'guided' && <Guided results={results} passed={passed} />}
          {view === 'annotated' && (
            <>
              <header className="margin-head">
                <Meter value={passed} className="margin-score">
                  <span className="score-num">{passed}</span>/6 clear · {passed === 6 ? 'nothing missing' : `${6 - passed} notes`}
                </Meter>
                <button type="button" className="btn" aria-pressed={rawBrief} onClick={() => setRawBrief(!rawBrief)}>Markdown view</button>
              </header>
              {!rawBrief && <Annotated req={req} results={results} />}
            </>
          )}

          {/* One brief and one Copy button shared by every view. */}
          <div className="ledger-brief">
            {showBriefText && (
              <>
                <div className="brief-head">
                  <label htmlFor="brief">Task brief</label>
                  {editedBrief !== null && (
                    <span className="edited">
                      Edited ·{' '}
                      <button type="button" className="link-btn" onClick={() => setEditedBrief(null)}>Reset</button>
                    </span>
                  )}
                </div>
                <textarea id="brief" className="brief" rows={12} spellCheck={false} value={brief} onChange={(e) => setEditedBrief(e.target.value)} />
              </>
            )}
            <div className="copy">
              <button type="button" className="btn btn-primary" onClick={copyBrief}>
                {copy === 'ok' ? <CheckIcon /> : <CopyIcon />}
                Copy brief
              </button>
              <span className="copy-status" role="status" aria-live="polite">
                {copy === 'ok' ? 'Copied!' : copy === 'fail' ? 'Copy failed. Select the brief and press Ctrl+C.' : ''}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
