# Fretmap Playable Shapes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ranked gallery of playable chord shapes under the neck, with click-to-highlight on the neck, without changing any existing behaviour.

**Architecture:** A pure voicing engine in `src/voicings/` (find → rank → describe) reads the v1 fretboard grid. A new `src/ui/shapes.js` renders chord boxes. Three existing files get small edits that do nothing until a shape is selected: `fretboard.js` takes an optional highlight, `main.js` holds the selection, and `index.html` gets a section and CSS.

**Tech Stack:** Vanilla JS ES modules, SVG, and the Node 24 standard-library test harness from v1. No dependencies.

**Spec:** `docs/superpowers/specs/2026-09-29-fretmap-voicing-finder-design.md`

**Repo:** `fretmap/`, branch `shapes` (create it from `main`). Run commands from the repo root. End every commit message with a blank line and then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Module rule (the build relies on it):** only `export function` / `export const` declarations, and only single-line `import { a, b } from './relative.js';` with single quotes.

**Line endings:** tracked files are CRLF in the working tree. Make edits with an exact-match editor that tolerates this (the Edit tool does), not with `sed` multi-line patterns.

**Baseline:** `node tests/run.mjs` prints `42 passed, 0 failed` before starting.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/voicings/find.js` | new | `findVoicings`, `fingering`, `droppableLabels`: every valid shape, unsorted |
| `src/voicings/rank.js` | new | `easeScore`, `rankVoicings(shapes, capo)` |
| `src/voicings/describe.js` | new | `describeVoicing(shape, chord, capo)` → `[bass, notes, position]` |
| `tests/voicings.test.mjs` | new | 14 checks for the engine |
| `tests/run.mjs` | edit | one import line |
| `src/ui/shapes.js` | new | the gallery: chord-box SVGs, Show all, selection buttons, Esc |
| `src/ui/fretboard.js` | edit | optional `highlight` argument; identical output without it |
| `src/main.js` | edit | `selectedShape`, `selectShape`/`clearShape` actions, mounts the gallery |
| `index.html` | edit | `<section id="shapes" hidden>` and gallery CSS |
| `README.md` | edit | a "Playable shapes" section |

---

### Task 1: Voicing engine (find, rank, describe)

**Files:**
- Create: `src/voicings/find.js`, `src/voicings/rank.js`, `src/voicings/describe.js`
- Test: `tests/voicings.test.mjs`
- Modify: `tests/run.mjs`

- [ ] **Step 1: Create the branch**

```bash
git checkout -b shapes
```

- [ ] **Step 2: Write the failing test**

`tests/voicings.test.mjs`:

```js
import { check, assert, assertEqual } from './harness.mjs';
import { findVoicings, fingering, droppableLabels } from '../src/voicings/find.js';
import { rankVoicings, easeScore } from '../src/voicings/rank.js';
import { describeVoicing } from '../src/voicings/describe.js';
import { parseChord } from '../src/theory/parse.js';
import { noteName } from '../src/theory/notes.js';

const STANDARD = [40, 45, 50, 55, 59, 64];
const DADGAD = [38, 45, 50, 55, 57, 62];
const x = null;

function shapesFor(symbol, { tuning = STANDARD, capo = 0, frets = 15 } = {}) {
  const chord = parseChord(symbol);
  return { chord, shapes: rankVoicings(findVoicings({ tuning, capo, frets, chord }), capo) };
}
const keyOf = (frets) => frets.map((f) => (f === null ? 'x' : f)).join(',');
const has = (shapes, frets) => shapes.some((s) => s.key === keyOf(frets));
const notesOf = (shape) => new Set(shape.tones.filter(Boolean).map((t) => noteName(t.note)));

check('voicings: textbook shapes in standard tuning', () => {
  assert(has(shapesFor('C').shapes, [x, 3, 2, 0, 1, 0]), 'open C');
  assert(has(shapesFor('C').shapes, [x, 3, 5, 5, 5, 3]), 'C barre at 3');
  assert(has(shapesFor('G').shapes, [3, 2, 0, 0, 0, 3]), 'open G');
  assert(has(shapesFor('Am').shapes, [x, 0, 2, 2, 1, 0]), 'open Am');
});

check('voicings: the best-known shape ranks first', () => {
  assertEqual(shapesFor('C').shapes[0].key, keyOf([x, 3, 2, 0, 1, 0]));
  assertEqual(shapesFor('Am').shapes[0].key, keyOf([x, 0, 2, 2, 1, 0]));
  assertEqual(shapesFor('Cmaj7').shapes[0].key, keyOf([x, 3, 2, 0, 0, 0]));
});

check('voicings: root in bass first, then complete before incomplete', () => {
  for (const symbol of ['C', 'Am7', 'C13', 'F#m7b5']) {
    const { shapes } = shapesFor(symbol);
    const rootFlags = shapes.map((s) => s.bassTone.role === 'root');
    assertEqual(rootFlags.indexOf(false) === -1 ? rootFlags.length : rootFlags.indexOf(false),
      rootFlags.lastIndexOf(true) + 1, `${symbol}: root-in-bass not all first`);
    const rooted = shapes.filter((s) => s.bassTone.role === 'root').map((s) => s.missing.length);
    assertEqual(rooted, rooted.slice().sort((a, b) => a - b), `${symbol}: missing not ascending`);
  }
});

check('voicings: slash chords always have the named bass lowest', () => {
  const { shapes } = shapesFor('C/E');
  assert(shapes.length > 0, 'no C/E shapes');
  assert(shapes.every((s) => noteName(s.bassTone.note) === 'E'), 'bass not E');
  assert(has(shapes, [0, 3, 2, 0, 1, 0]), 'C/E with open low E');
});

check('voicings: required tones are never dropped', () => {
  for (const s of shapesFor('Cmaj7').shapes) assert(notesOf(s).has('B'), 'Cmaj7 without B');
  for (const s of shapesFor('C13', { frets: 24 }).shapes) {
    assert(notesOf(s).has('A') && notesOf(s).has('Bb') && notesOf(s).has('E'), `C13 ${s.key}`);
  }
  for (const s of shapesFor('C5').shapes) assert(notesOf(s).has('G'), 'C5 without G');
  for (const s of shapesFor('Cdim').shapes) assert(notesOf(s).has('Gb'), 'Cdim without Gb');
  assertEqual([...droppableLabels(parseChord('C13'))].sort(), ['11', '5', '9']);
  assertEqual([...droppableLabels(parseChord('C5'))], []);
});

check('voicings: 7alt keeps 1, 3, b7 and at least two alterations', () => {
  const { shapes } = shapesFor('C7alt');
  assert(shapes.length > 0, 'no 7alt shapes');
  for (const s of shapes) {
    const n = notesOf(s);
    assert(n.has('C') && n.has('E') && n.has('Bb'), `7alt core ${s.key}`);
    assert(s.missing.length <= 2, `7alt missing ${s.missing}`);
  }
});

check('voicings: hand rules', () => {
  for (const symbol of ['C', 'G7', 'Cmaj9', 'Ebm11']) {
    for (const s of shapesFor(symbol, { frets: 24 }).shapes) {
      assert(s.sounding >= 3, `${symbol} ${s.key}: fewer than 3 strings`);
      assert(s.fingers <= 4 || (s.thumb && s.fingers === 5), `${symbol} ${s.key}: ${s.fingers} fingers`);
      if (s.lowFret !== null) assert(s.highFret - s.lowFret <= 3, `${symbol} ${s.key}: span`);
      if (s.thumb) assert(s.frets[0] === s.lowFret, `${symbol} ${s.key}: thumb not lowest`);
    }
  }
});

check('fingering: barre, open string under a barre, thumb', () => {
  assertEqual(fingering([x, 3, 5, 5, 5, 3], 0), { fingers: 4, barre: 3, thumb: false });
  assertEqual(fingering([x, 3, 2, 0, 1, 0], 0), { fingers: 3, barre: null, thumb: false });
  // An open G string between the two fret-1 notes: a barre would stop it, so each is a finger.
  assertEqual(fingering([x, 1, 3, 0, 1, x], 0), { fingers: 3, barre: null, thumb: false });
  assertEqual(fingering([1, 3, 3, 2, 4, 5], 0), null);
  assertEqual(fingering([3, 5, 5, 4, 6, x], 0), { fingers: 5, barre: null, thumb: true });
  assertEqual(fingering([3, 5, 5, 4, 6, 6], 0), null);       // thumb plus five more is too many
  assertEqual(fingering([5, 3, 4, 6, 3, x], 0).thumb, false); // string 6 isn't lowest: no thumb
});

check('voicings: fragments are dropped, easier subsets are kept', () => {
  const c = shapesFor('C').shapes;
  assert(!has(c, [x, 3, 2, 0, 1, x]), 'x3201x kept alongside x32010');
  const e = shapesFor('E', { capo: 2 }).shapes;
  assert(has(e, [x, x, 2, 4, 5, 4]), 'D shape at capo 2 missing');
});

check('voicings: capo', () => {
  const { chord, shapes } = shapesFor('E', { capo: 2 });
  assert(shapes.every((s) => s.frets.every((f) => f === null || f >= 2)), 'fret behind the capo');
  const d = shapes.find((s) => s.key === keyOf([x, x, 2, 4, 5, 4]));
  assertEqual(describeVoicing(d, chord, 2)[2], 'barre 2');
});

check('voicings: re-entrant tuning judges the bass by pitch', () => {
  const reentrant = [43, 48, 52, 57, 62, 55]; // G C E A D G, top string below the D string
  const { shapes } = shapesFor('C/G', { tuning: reentrant });
  assert(shapes.length > 0, 'no shapes');
  for (const s of shapes) {
    let low = null;
    s.frets.forEach((f, i) => { if (f !== null && (low === null || reentrant[i] + f < low)) low = reentrant[i] + f; });
    assertEqual(low % 12, 7, `${s.key}: lowest pitch is not G`);
  }
});

check('voicings: DADGAD D major favours open strings', () => {
  const top = shapesFor('D', { tuning: DADGAD }).shapes.slice(0, 5);
  assert(top.some((s) => s.openStrings >= 4), 'no open-string shape in the top 5');
});

check('describe: labels', () => {
  const { chord, shapes } = shapesFor('C');
  const open = shapes.find((s) => s.key === keyOf([x, 3, 2, 0, 1, 0]));
  assertEqual(describeVoicing(open, chord, 0), ['root in bass', 'all notes', 'frets 1–3']);
  const barre = shapes.find((s) => s.key === keyOf([x, 3, 5, 5, 5, 3]));
  assertEqual(describeVoicing(barre, chord, 0)[2], 'barre 3');
  const slash = shapesFor('C/E');
  assertEqual(describeVoicing(slash.shapes[0], slash.chord, 0)[0], 'bass E');
  const c13 = shapesFor('C13', { frets: 24 });
  const partial = c13.shapes.find((s) => s.missing.length);
  assert(/^no /.test(describeVoicing(partial, c13.chord, 0)[1]), 'missing label');
});

check('voicings: no chord, no shapes; score is deterministic', () => {
  assertEqual(findVoicings({ tuning: STANDARD, capo: 0, frets: 15, chord: null }), []);
  const { shapes } = shapesFor('G');
  assertEqual(easeScore(shapes[0], 0), easeScore({ ...shapes[0] }, 0));
});
```

Add to `tests/run.mjs`, directly after `import './build.test.mjs';`:

```js
import './voicings.test.mjs';
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `node tests/run.mjs`
Expected: it crashes with `ERR_MODULE_NOT_FOUND` for `src/voicings/find.js`.

- [ ] **Step 4: Implement `find.js`**

`src/voicings/find.js`:

```js
// Every playable shape for a chord. Slide a 4-fret window up the neck, let each string be
// muted, open or on a chord tone inside the window, and keep what a hand can actually play.
// Pure: reads the v1 fretboard grid, never changes it.
import { mapFretboard } from '../fretboard/map.js';

export const WINDOW = 4;       // frets one hand covers
export const MAX_FINGERS = 4;  // plus the thumb on string 6, see fingering()
export const MIN_SOUNDING = 3;
const ALTERATIONS = ['b9', '#9', '#11', 'b13'];

// Labels a shape may leave out: a plain 5th (not in a power chord), and the 9th/11th under a
// named 11th or 13th. A 7alt needs only two of its four alterations (see evaluate). Everything
// else defines the chord and is required.
export function droppableLabels(chord) {
  const labels = chord.tones.filter((t) => t.role !== 'bass').map((t) => t.label);
  const drop = new Set();
  if (chord.tones.some((t) => t.role === 'third')) drop.add('5');
  if (labels.includes('11') || labels.includes('13')) drop.add('9');
  if (labels.includes('13')) drop.add('11');
  if (chord.type.id === '7alt') for (const l of ALTERATIONS) drop.add(l);
  return drop;
}

// Fingers needed for the fretted notes on `strings`. Notes on the lowest fret count as one
// barre when there are 2+ of them and no open string rings between them.
function hand(strings, frets, capo) {
  if (!strings.length) return { fingers: 0, barre: null };
  const low = Math.min(...strings.map((s) => frets[s]));
  const atLow = strings.filter((s) => frets[s] === low);
  if (atLow.length >= 2) {
    let clear = true;
    for (let s = atLow[0]; s <= atLow[atLow.length - 1]; s++) if (frets[s] === capo) clear = false;
    if (clear) return { fingers: strings.length - atLow.length + 1, barre: low };
  }
  return { fingers: strings.length, barre: null };
}

// null when no hand can play it. The thumb may take string 6 (tuning index 0) when it is fretted
// at or behind every other fretted note and the other four fingers manage the rest.
export function fingering(frets, capo) {
  const fretted = [];
  frets.forEach((f, s) => { if (f !== null && f > capo) fretted.push(s); });
  const all = hand(fretted, frets, capo);
  if (all.fingers <= MAX_FINGERS) return { ...all, thumb: false };
  const rest = fretted.filter((s) => s !== 0);
  if (rest.length === fretted.length || rest.some((s) => frets[s] < frets[0])) return null;
  const others = hand(rest, frets, capo);
  if (others.fingers > MAX_FINGERS) return null;
  return { fingers: others.fingers + 1, barre: others.barre, thumb: true };
}

function evaluate(frets, cells, chord, drop, bassPc, capo) {
  const sounding = [];
  frets.forEach((f, s) => { if (f !== null) sounding.push(s); });
  if (sounding.length < MIN_SOUNDING) return null;

  // Lowest note by actual pitch, so re-entrant tunings are judged correctly.
  let lowest = sounding[0];
  for (const s of sounding) if (cells[s][frets[s]].midi < cells[lowest][frets[lowest]].midi) lowest = s;
  if (bassPc !== null && cells[lowest][frets[lowest]].pc !== bassPc) return null;

  const tones = frets.map((f, s) => (f === null ? null : cells[s][f].tone));
  const present = new Set(tones.filter(Boolean));
  const missing = [];
  for (const t of chord.tones) {
    if (present.has(t)) continue;
    if (t.isBass || !drop.has(t.label)) return null;
    missing.push(t.label);
  }
  if (chord.type.id === '7alt' && missing.filter((l) => ALTERATIONS.includes(l)).length > 2) return null;

  const grip = fingering(frets, capo);
  if (!grip) return null;

  const fretted = frets.filter((f) => f !== null && f > capo);
  const first = sounding[0];
  const last = sounding[sounding.length - 1];
  let middleMutes = 0;
  for (let s = first + 1; s < last; s++) if (frets[s] === null) middleMutes++;

  return {
    key: frets.map((f) => (f === null ? 'x' : f)).join(','),
    frets: frets.slice(),
    tones,
    bassTone: tones[lowest],
    bassPc: cells[lowest][frets[lowest]].pc,
    missing,
    fingers: grip.fingers,
    barre: grip.barre,
    thumb: grip.thumb,
    lowFret: fretted.length ? Math.min(...fretted) : null,
    highFret: fretted.length ? Math.max(...fretted) : null,
    span: fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0,
    sounding: sounding.length,
    openStrings: frets.filter((f) => f === capo).length,
    middleMutes,
  };
}

// B is a fragment of A when A plays the same thing on every string B sounds, sounds on more
// strings, has the same bass and the same number of missing tones, and is no harder to play.
// (So x3201x goes, but the D shape xx0232 survives next to a stretchier x50232.)
function isFragmentOf(b, a) {
  if (a.sounding <= b.sounding || a.bassPc !== b.bassPc || a.missing.length !== b.missing.length) return false;
  if (a.fingers > b.fingers || a.span > b.span || (a.thumb && !b.thumb)) return false;
  return b.frets.every((f, s) => f === null || a.frets[s] === f);
}

// Unsorted; see rank.js. Returns [] for no chord.
export function findVoicings({ tuning, capo, frets, chord }) {
  if (!chord) return [];
  const cells = mapFretboard({ tuning, capo, frets, chord });
  const drop = droppableLabels(chord);
  const bassPc = chord.bass ? cells.flat().find((c) => c.tone && c.tone.isBass).pc : null;
  const found = new Map();

  const lastStart = Math.max(capo + 1, frets - WINDOW + 1);
  for (let start = capo + 1; start <= lastStart; start++) {
    const end = Math.min(start + WINDOW - 1, frets);
    const options = cells.map((row) => {
      const opts = [null];
      if (row[capo].tone) opts.push(capo);
      for (let f = start; f <= end; f++) if (row[f].tone) opts.push(f);
      return opts;
    });
    const combo = new Array(6);
    const walk = (s) => {
      if (s === 6) {
        const key = combo.join(',');
        if (!found.has(key)) found.set(key, evaluate(combo, cells, chord, drop, bassPc, capo));
        return;
      }
      for (const f of options[s]) {
        combo[s] = f;
        walk(s + 1);
      }
    };
    walk(0);
  }

  const shapes = [...found.values()].filter(Boolean);
  return shapes.filter((b) => !shapes.some((a) => a !== b && isFragmentOf(b, a)));
}
```

How it works:
- `walk` is a plain recursive cartesian product over the per-string options, deduplicated across windows by `key`.
- `evaluate` rejects in order of cost: string count, bass, required tones, then fingering.
- Fragment removal runs last, over the survivors.

- [ ] **Step 5: Implement `rank.js`**

`src/voicings/rank.js`:

```js
// Orders shapes: root in the bass first, then fewest missing tones, then easiest to play.

// Lower is easier. Favours few fingers, small stretches, open strings and full, low shapes.
export function easeScore(shape, capo) {
  const height = shape.lowFret === null ? 0 : Math.max(0, shape.lowFret - capo);
  return 2 * shape.fingers + shape.span + 3 * shape.middleMutes + 0.25 * height -
    shape.openStrings - shape.sounding + (shape.thumb ? 2 : 0);
}

export function rankVoicings(shapes, capo) {
  const scored = shapes.map((shape) => ({ shape, score: easeScore(shape, capo) }));
  scored.sort((a, b) =>
    (Number(b.shape.bassTone.role === 'root') - Number(a.shape.bassTone.role === 'root')) ||
    (a.shape.missing.length - b.shape.missing.length) ||
    (a.score - b.score) ||
    ((a.shape.lowFret ?? capo) - (b.shape.lowFret ?? capo)) ||
    (a.shape.key < b.shape.key ? -1 : a.shape.key > b.shape.key ? 1 : 0));
  return scored.map((s) => s.shape);
}
```

- [ ] **Step 6: Implement `describe.js`**

`src/voicings/describe.js`:

```js
// Three short labels for a shape: what's in the bass, what's missing, where it sits.
import { noteName } from '../theory/notes.js';

const BASS_NAMES = { '1': 'root', 'b3': '3rd', '3': '3rd', 'b5': '5th', '5': '5th', '#5': '5th', 'bb7': '7th', 'b7': '7th', '7': '7th' };
const ORDINALS = { '5': '5th', '9': '9th', '11': '11th' }; // altered tones keep their own label

export function describeVoicing(shape, chord, capo) {
  const t = shape.bassTone;
  const bass = chord.bass || !BASS_NAMES[t.label] ? `bass ${noteName(t.note)}` : `${BASS_NAMES[t.label]} in bass`;

  const notes = shape.missing.length ? `no ${shape.missing.map((l) => ORDINALS[l] || l).join(', ')}` : 'all notes';

  // Positions count from the capo, so a D shape reads the same at any capo.
  let position;
  if (shape.lowFret === null) position = 'open';
  else if (shape.barre !== null) position = `barre ${shape.barre - capo}`;
  else if (shape.lowFret === shape.highFret) position = `fret ${shape.lowFret - capo}`;
  else position = `frets ${shape.lowFret - capo}–${shape.highFret - capo}`;
  if (shape.thumb) position += ' · thumb';

  return [bass, notes, position];
}
```

- [ ] **Step 7: Run the tests**

Run: `node tests/run.mjs`
Expected: `56 passed, 0 failed` (42 existing plus 14 new). The run takes about a second, because the tests search 24-fret necks for 13 and 7alt chords.

- [ ] **Step 8: Commit**

```bash
git add src/voicings tests/voicings.test.mjs tests/run.mjs
git commit -m "Add the playable-shapes engine: find, rank, describe"
```

---

### Task 2: Gallery UI and neck highlight

There are no unit tests for the UI (same as v1). Write the files, run the suite and the build, then run the browser checklist in Step 7.

**Files:**
- Create: `src/ui/shapes.js`
- Modify: `src/ui/fretboard.js`, `src/main.js`, `index.html`

- [ ] **Step 1: The gallery**

`src/ui/shapes.js`:

```js
// Playable-shapes gallery: one chord box per shape, best first. Clicking a box asks main.js to
// highlight it on the neck; clicking it again (or Esc) clears the highlight.
import { findVoicings } from '../voicings/find.js';
import { rankVoicings } from '../voicings/rank.js';
import { describeVoicing } from '../voicings/describe.js';
import { degreeLabel } from '../theory/degrees.js';
import { pitchClass } from '../theory/notes.js';

const FIRST = 24;                    // boxes shown before "Show all"
const ROWS = 4;                      // fret rows per box
const BOX = { left: 14, top: 22, gap: 13, row: 20 };
const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs, text) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

// A vertical chord diagram: string 6 on the left, frets counted from the capo.
function chordBox(shape, state) {
  const { capo, labels, key } = state;
  const rel = (f) => f - capo;
  const low = shape.lowFret === null ? 1 : rel(shape.lowFret);
  const high = shape.highFret === null ? 1 : rel(shape.highFret);
  const start = high <= ROWS ? 1 : low;
  const width = BOX.left * 2 + BOX.gap * 5 + 14;
  const height = BOX.top + BOX.row * ROWS + 6;
  const x = (s) => BOX.left + s * BOX.gap;
  const y = (f) => BOX.top + (f - start + 0.5) * BOX.row;

  const root = svg('svg', { width, height, viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' });
  for (let s = 0; s < 6; s++) {
    root.append(svg('line', { x1: x(s), x2: x(s), y1: BOX.top, y2: BOX.top + ROWS * BOX.row, stroke: 'currentColor', 'stroke-opacity': 0.5 }));
  }
  for (let r = 0; r <= ROWS; r++) {
    const nut = r === 0 && start === 1;
    root.append(svg('line', {
      x1: x(0), x2: x(5), y1: BOX.top + r * BOX.row, y2: BOX.top + r * BOX.row,
      stroke: 'currentColor', 'stroke-opacity': nut ? 1 : 0.5, 'stroke-width': nut ? 3 : 1,
    }));
  }
  if (start > 1) root.append(svg('text', { x: x(5) + 7, y: BOX.top + BOX.row * 0.7, 'font-size': 10, fill: 'currentColor' }, `${start}fr`));

  if (shape.barre !== null) {
    const on = shape.frets.map((f, s) => (f === shape.barre ? s : -1)).filter((s) => s >= 0 && !(shape.thumb && s === 0));
    root.append(svg('rect', {
      x: x(on[0]) - 7, y: y(rel(shape.barre)) - 7, width: x(on[on.length - 1]) - x(on[0]) + 14, height: 14,
      rx: 7, fill: 'currentColor', 'fill-opacity': 0.25,
    }));
  }

  shape.frets.forEach((f, s) => {
    if (f === null) {
      root.append(svg('text', { x: x(s), y: BOX.top - 7, 'text-anchor': 'middle', 'font-size': 11, fill: 'currentColor' }, '✕'));
      return;
    }
    if (f === capo) {
      root.append(svg('circle', { cx: x(s), cy: BOX.top - 10, r: 4, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 }));
      return;
    }
    const t = shape.tones[s];
    const cy = y(rel(f));
    root.append(svg('circle', { cx: x(s), cy, r: 7, fill: `var(--${t.role})` }));
    const text = labels === 'numbers' ? degreeLabel(pitchClass(t.note), key).label : t.label === '1' ? 'R' : t.label;
    root.append(svg('text', {
      x: x(s), y: cy + 3, 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 700,
      fill: t.role === 'extension' ? '#1c1917' : '#ffffff',
    }, text));
    if (shape.thumb && s === 0) root.append(svg('text', { x: x(s) - 11, y: cy + 3, 'text-anchor': 'middle', 'font-size': 9, fill: 'currentColor' }, 'T'));
  });
  return root;
}

export function mountShapes(el, actions) {
  let context = '';       // what the shape list was computed for
  let shapes = [];
  let expanded = false;

  // Esc clears a selected shape, except while typing in the chord search.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || (e.target.closest && e.target.closest('.search'))) return;
    actions.clearShape();
  });

  function update(state, selected) {
    if (!state.chord) {
      el.hidden = true;
      el.replaceChildren();
      context = '';
      return;
    }
    el.hidden = false;

    const next = [state.chord.symbol, state.tuning.join('.'), state.capo, state.frets].join('|');
    if (next !== context) {
      context = next;
      shapes = rankVoicings(findVoicings(state), state.capo);
      expanded = false;
    }

    const heading = document.createElement('h2');
    heading.textContent = `Shapes (${shapes.length})`;
    if (!shapes.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = `No playable shapes within frets ${state.capo}–${state.frets}. Try more frets (⚙) or a simpler chord.`;
      el.replaceChildren(heading, empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'shape-grid';
    const shown = expanded ? shapes : shapes.slice(0, FIRST);
    shown.forEach((shape, i) => {
      const lines = describeVoicing(shape, state.chord, state.capo);
      const box = document.createElement('button');
      box.type = 'button';
      box.className = 'shape-box';
      box.dataset.key = shape.key;
      box.setAttribute('aria-pressed', String(!!selected && selected.key === shape.key));
      box.setAttribute('aria-label', `${state.chord.symbol} shape ${i + 1}: ${lines.join(', ')}`);
      box.append(chordBox(shape, state));
      for (const line of lines) {
        const span = document.createElement('span');
        span.textContent = line;
        box.append(span);
      }
      box.addEventListener('click', () => actions.selectShape(shape));
      grid.append(box);
    });

    const parts = [heading, grid];
    if (!expanded && shapes.length > FIRST) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'more';
      more.textContent = `Show all (${shapes.length})`;
      more.addEventListener('click', () => {
        expanded = true;
        update(state, selected);
      });
      parts.push(more);
    }
    // Boxes are rebuilt on every update; keep keyboard focus on the same shape.
    const focused = document.activeElement && el.contains(document.activeElement) ? document.activeElement.dataset.key : undefined;
    el.replaceChildren(...parts);
    if (focused) {
      const again = grid.querySelector(`[data-key="${focused}"]`);
      if (again) again.focus();
    }
  }

  return { update };
}
```

- [ ] **Step 2: `src/ui/fretboard.js`, the optional highlight (3 edits)**

Edit 1. Replace:

```js
export function mountFretboard(el, actions) {
  let last = null;
  new ResizeObserver(() => last && render(last)).observe(el);

  function render(state) {
    last = state;
```

with:

```js
export function mountFretboard(el, actions) {
  let last = null;
  let lastHighlight = null;
  new ResizeObserver(() => last && render(last, lastHighlight)).observe(el);

  // `highlight` is an optional shape from the gallery. Without one, the neck draws exactly as v1.
  function render(state, highlight = null) {
    last = state;
    lastHighlight = highlight;
```

Edit 2. Replace:

```js
      const row = cells[5 - r]; // display row 0 is string 1
      for (const cell of row) {
        const g = svg('g', { opacity: cell.playable ? 1 : 0.25 });
```

with:

```js
      const row = cells[5 - r]; // display row 0 is string 1
      const shapeFret = highlight ? highlight.frets[5 - r] : undefined;
      for (const cell of row) {
        if (highlight && shapeFret === null && cell.fret === 0) {
          // A string the shape mutes: ✕ in the open column instead of its usual label.
          root.append(svg('text', { x: cx(0), y: cy(r) + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--text)' }, '✕'));
          continue;
        }
        const inShape = highlight && shapeFret === cell.fret;
        const g = svg('g', { opacity: cell.playable && (!highlight || inShape) ? 1 : 0.25 });
```

Edit 3. Replace:

```js
          if (t.isBass) g.append(svg('circle', { cx: x, cy: y, r: DOT_R + 3, fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }));
```

with:

```js
          if (t.isBass) g.append(svg('circle', { cx: x, cy: y, r: DOT_R + 3, fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }));
          if (inShape) g.append(svg('circle', { cx: x, cy: y, r: DOT_R + (t.isBass ? 7 : 4), fill: 'none', stroke: 'var(--text)', 'stroke-width': 2.5 }));
```

Why the output is identical without a highlight: `shapeFret` is `undefined`, the ✕ branch never runs, `inShape` is falsy so there's no extra ring, and the opacity expression reduces to `cell.playable ? 1 : 0.25`.

- [ ] **Step 3: `src/main.js`, the selection (5 edits)**

Edit 1. Replace `import { mountInfo } from './ui/info.js';` with:

```js
import { mountInfo } from './ui/info.js';
import { mountShapes } from './ui/shapes.js';
```

Edit 2. Replace:

```js
let state = hashToState(location.hash);

function commit(next) {
  state = next;
```

with:

```js
let state = hashToState(location.hash);
let selectedShape = null; // highlighted gallery shape; UI-only, never in the URL

// A shape only makes sense for the chord, tuning, capo and frets it was found for.
function shapeContext(s) {
  return [s.chord ? s.chord.symbol : '', s.tuning.join('.'), s.capo, s.frets].join('|');
}

function commit(next) {
  if (shapeContext(next) !== shapeContext(state)) selectedShape = null;
  state = next;
```

Edit 3. Replace:

```js
  deleteFavourite(name) {
    favourites.remove(name);
    render();
  },
};
```

with:

```js
  deleteFavourite(name) {
    favourites.remove(name);
    render();
  },
  selectShape(shape) {
    selectedShape = selectedShape && selectedShape.key === shape.key ? null : shape;
    render();
  },
  clearShape() {
    if (!selectedShape) return;
    selectedShape = null;
    render();
  },
};
```

Edit 4. Replace `const info = mountInfo(document.getElementById('info'));` with:

```js
const info = mountInfo(document.getElementById('info'));
const shapes = mountShapes(document.getElementById('shapes'), actions);
```

Edit 5. Replace:

```js
  board.update(state);
  info.update(state);
```

with:

```js
  board.update(state, selectedShape);
  info.update(state);
  shapes.update(state, selectedShape);
```

- [ ] **Step 4: `index.html` (2 edits)**

Edit 1. Replace `  .info .title b { font-size: 16px; }` with:

```css
  .info .title b { font-size: 16px; }

  .shapes { margin-top: 20px; }
  .shapes h2 { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--muted); }
  .shape-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .shape-box { display: flex; flex-direction: column; align-items: center; gap: 1px; width: 118px; padding: 8px 6px; font-size: 11px; line-height: 1.35; color: var(--muted); }
  .shape-box svg { display: block; color: var(--text); margin-bottom: 4px; }
  .shape-box[aria-pressed="true"] { background: var(--panel); color: var(--text); border-color: var(--focus); box-shadow: 0 0 0 2px var(--focus); }
  .shapes .more { margin-top: 12px; }
  .shapes .empty { margin: 0; color: var(--muted); }
```

Edit 2. Replace `  <div class="info" id="info"></div>` with:

```html
  <div class="info" id="info"></div>
  <section class="shapes" id="shapes" hidden></section>
```

`.shape-box[aria-pressed="true"]` beats v1's `button[aria-pressed="true"]` rule on specificity (0,2,0 against 0,1,1), so a selected box gets an outline, not an inverted fill.

- [ ] **Step 5: Tests and build**

Run: `node tests/run.mjs` → `56 passed, 0 failed`
Run: `node build.mjs` → `wrote dist/fretmap.html` (about 60 KB)
Run: `grep -cE "^(import|export) " dist/fretmap.html` → `0`

- [ ] **Step 6: Commit**

```bash
git add src/ui/shapes.js src/ui/fretboard.js src/main.js index.html
git commit -m "Add the shapes gallery with click-to-highlight on the neck"
```

- [ ] **Step 7: Browser checklist**

Run `node serve.mjs` and open http://localhost:8124. Check each item:

1. With no chord selected, `#shapes` is hidden and the page looks like v1.
2. Pick `C`. The neck SVG's `outerHTML` is identical before and after adding the feature with nothing selected. Compare against `git stash` of the Task 2 edits, or reason from Step 2's note and spot-check.
3. **Shapes (N)** appears with 24 boxes. The first is open C (`x32010`), labelled `root in bass / all notes / frets 1–3`.
4. Clicking box 1 rings its notes on the neck, fades the other dots, and shows ✕ on the low E. Clicking it again or pressing Esc clears it. Esc inside the chord search doesn't clear it.
5. Select a shape, then change the chord. The selection clears. Toggling Numbers keeps the selection, and the box labels switch to key degrees.
6. Capo 2 with `E`: the boxes are drawn relative to the capo, the D shape appears, and the neck highlight lands on absolute frets 2–5.
7. **Show all (N)** reveals every box. Picking a new chord collapses the list back to 24.
8. Empty result: Standard tuning, capo 9, ⚙ Frets 12, chord `C13#11` → *"No playable shapes within frets 9–12. Try more frets (⚙) or a simpler chord."*
9. Keyboard: Tab reaches the boxes, and Enter or Space toggles one. Focus stays on the same box after it re-renders.
10. Dark and light modes are both legible.
11. `node build.mjs`, then open `dist/fretmap.html` directly: the gallery works there too.

Fix anything that fails in a follow-up commit.

---

### Task 3: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a section**

Insert this directly before the `## Colours` heading:

```markdown
## Playable shapes

Pick a chord and the **Shapes** gallery under the neck lists every fingerable shape in the
current tuning and capo, best first: root in the bass, then all notes present, then easiest to
play (few fingers, small stretch, open strings). Click a shape to ring it on the neck; click it
again or press Esc to clear it. Chord boxes count frets from the capo.

A shape may drop a plain 5th, the 9th/11th under a named 11th or 13th, and up to two
alterations of a 7alt. A thumb over the top is allowed on string 6. The rules live in
`src/voicings/`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Document playable shapes in the README"
```
