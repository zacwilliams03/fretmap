# Ranking fix, string-count filter and Pages hosting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix shape ranking and small issues on `shapes` and merge it; add an opt-in "Strings: Any · 3 · 4 · 5 · 6" gallery filter; publish the built single-file app on GitHub Pages.

**Architecture:** Pure engine changes in `src/voicings/` (a `muddyBass` shape field, a new ease score, an optional `strings` argument to `findVoicings`), one new URL field in `src/state.js`, a filter control in `src/ui/shapes.js`, and a GitHub Actions workflow that tests, builds and deploys `dist/fretmap.html` as `index.html`.

**Tech Stack:** Plain ES modules, Node standard library test harness (`node tests/run.mjs`), no dependencies, GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-01-fretmap-ranking-strings-hosting-design.md`

---

## Ground rules for every task

- Repo: `fretmap/`. Run commands from there.
- Working-copy files use **CRLF** line endings (`core.autocrlf=true`). Use the Edit tool for edits; scripted string replacement must allow `\r?\n`.
- **Module rule (the build depends on it):** only `export function` / `export const` declarations and single-line relative named imports (`import { a, b } from './x.js';`). Nothing else.
- Test harness: `check(name, fn)`, `assert(cond, msg)`, `assertEqual(actual, expected, msg)` from `tests/harness.mjs` (`assertEqual` compares `JSON.stringify`). `node tests/run.mjs` prints `N passed, M failed`.
- Commit messages: a plain sentence in the imperative (no `feat:` prefix), then a blank line and
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Add-only:** in Part 2 and Part 3, do not change any existing test. Part 1 may change only the two tests named in Task 2.

## File map

| File | Part | Change |
|---|---|---|
| `src/voicings/find.js` | 1, 2 | `isMuddy` + `muddyBass` field; slash-bass guard; optional `strings` filter |
| `src/voicings/rank.js` | 1 | new ease score; drop the hard missing-tones key |
| `src/ui/shapes.js` | 1, 2 | 10px dot labels; filter control, filtered empty message, focus keeping |
| `index.html` | 1, 2 | selected-box style; filter header CSS |
| `src/state.js` | 2 | `strings` field, `n=` in the hash, `STRING_COUNTS` |
| `src/main.js` | 2 | `setStrings` action; `strings` in `shapeContext` |
| `tests/voicings.test.mjs` | 1, 2 | new tests; two replaced in Part 1 |
| `tests/state.test.mjs` | 2 | one new test |
| `.github/workflows/pages.yml` | 3 | new |
| `.gitignore` | 3 | add `_site/` |
| `README.md` | 1, 2, 3 | ranking text; filter; deploying; live link |
| `docs/superpowers/specs/2026-09-29-fretmap-voicing-finder-design.md` | 1 | sync with the new ranking |

---

# Part 1 — finish `shapes` (branch `shapes`)

Before starting: `git checkout shapes` and `node tests/run.mjs` → `57 passed, 0 failed`.

### Task 1: `muddyBass` shape field

**Files:**
- Modify: `src/voicings/find.js`
- Test: `tests/voicings.test.mjs`

- [ ] **Step 1: Write the failing test**

In `tests/voicings.test.mjs`, change the import line

```js
import { findVoicings, fingering, droppableLabels } from '../src/voicings/find.js';
```

to

```js
import { findVoicings, fingering, droppableLabels, isMuddy } from '../src/voicings/find.js';
```

and append at the end of the file:

```js
check('voicings: a close interval low in the bass is muddy', () => {
  assertEqual(isMuddy([47, 50, 59]), true);   // B2 under D3: minor 3rd below C3
  assertEqual(isMuddy([59, 50, 47]), true);   // order doesn't matter
  assertEqual(isMuddy([48, 51, 55]), false);  // C3–Eb3: at the limit, fine
  assertEqual(isMuddy([51, 52, 59]), true);   // semitone below E3
  assertEqual(isMuddy([43, 47, 50]), false);  // G2–B2: major 3rds are never muddy
  assertEqual(isMuddy([40, 40, 47]), false);  // unison
  const bm = findVoicings({ tuning: STANDARD, capo: 0, frets: 15, chord: parseChord('Bm') });
  assertEqual(bm.find((s) => s.key === keyOf([x, 2, 0, 4, 0, 2])).muddyBass, true);
  assertEqual(bm.find((s) => s.key === keyOf([x, 2, 4, 4, 3, 2])).muddyBass, false);
  const g = findVoicings({ tuning: STANDARD, capo: 0, frets: 15, chord: parseChord('G') });
  assertEqual(g.find((s) => s.key === keyOf([3, 2, 0, 0, 0, 3])).muddyBass, false);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tests/run.mjs`
Expected: crash with `SyntaxError: The requested module '../src/voicings/find.js' does not provide an export named 'isMuddy'`.

- [ ] **Step 3: Implement**

In `src/voicings/find.js`, directly after the line `const ALTERATIONS = ['b9', '#9', '#11', 'b13'];` add:

```js

// Low interval limits (MIDI): a semitone, whole tone or minor 3rd between the two lowest notes
// sounds muddy below E3, Eb3 and C3. Major 3rds are left alone, since open G (G2–B2) is idiomatic.
const LOW_LIMIT = { 1: 52, 2: 51, 3: 48 };

// True when the two lowest pitches form a close interval below its low limit.
export function isMuddy(pitches) {
  const [lo, hi] = pitches.slice().sort((a, b) => a - b);
  const limit = LOW_LIMIT[hi - lo];
  return limit !== undefined && lo < limit;
}
```

In `evaluate`, the returned object ends with `middleMutes,`. Add one property after it so the end reads:

```js
    middleMutes,
    muddyBass: isMuddy(sounding.map((s) => cells[s][frets[s]].midi)),
  };
```

- [ ] **Step 4: Run tests**

Run: `node tests/run.mjs`
Expected: `58 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add src/voicings/find.js tests/voicings.test.mjs
git commit -m "Flag shapes whose two lowest notes are a muddy close interval" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: New ranking

**Files:**
- Modify: `src/voicings/rank.js`
- Test: `tests/voicings.test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `tests/voicings.test.mjs`:

```js
check('voicings: textbook shapes rank near the top', () => {
  const top = (symbol, n) => shapesFor(symbol).shapes.slice(0, n).map((s) => s.key);
  assert(top('C7', 3).includes(keyOf([x, 3, 2, 3, 1, 0])), 'C7 x32310 not in the top 3');
  assert(top('Bm', 3).includes(keyOf([x, 2, 4, 4, 3, 2])), 'Bm x24432 not in the top 3');
  assert(top('Dsus4', 3).includes(keyOf([x, x, 0, 2, 3, 3])), 'Dsus4 xx0233 not in the top 3');
  assert(top('Bb', 3).includes(keyOf([x, 1, 3, 3, 3, 1])), 'Bb x13331 not in the top 3');
  assert(top('G', 2).includes(keyOf([3, 2, 0, 0, 0, 3])), 'G 320003 not in the top 2');
});

check('rank: what each penalty costs', () => {
  const base = shapesFor('C').shapes.find((s) => s.key === keyOf([x, 3, 2, 0, 1, 0]));
  const s0 = easeScore(base, 0);
  assertEqual(easeScore({ ...base, missing: ['5'] }, 0) - s0, 2, 'one missing tone');
  assertEqual(easeScore({ ...base, missing: ['9', '11'] }, 0) - s0, 4, 'two missing tones');
  assertEqual(easeScore({ ...base, muddyBass: true }, 0) - s0, 4, 'muddy bass');
  assertEqual(easeScore({ ...base, lowFret: base.lowFret + 3 }, 0) - s0, 3, 'three frets higher');
});
```

Replace the existing check `'voicings: root in bass first, then complete before incomplete'` (the whole `check(...)` block) with:

```js
check('voicings: root in bass first', () => {
  for (const symbol of ['C', 'Am7', 'C13', 'F#m7b5']) {
    const { shapes } = shapesFor(symbol);
    const rootFlags = shapes.map((s) => s.bassTone.role === 'root');
    assertEqual(rootFlags.indexOf(false) === -1 ? rootFlags.length : rootFlags.indexOf(false),
      rootFlags.lastIndexOf(true) + 1, `${symbol}: root-in-bass not all first`);
  }
});
```

Replace the existing check `'voicings: DADGAD D major favours open strings'` (the whole block) with:

```js
check('voicings: DADGAD D major favours open strings', () => {
  const best = shapesFor('D', { tuning: DADGAD }).shapes[0];
  assert(best.openStrings >= 4, `top shape ${best.key} has ${best.openStrings} open strings`);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node tests/run.mjs`
Expected: `FAIL voicings: textbook shapes rank near the top: C7 x32310 not in the top 3` and `FAIL rank: what each penalty costs: ...`; the other tests pass.

- [ ] **Step 3: Implement**

Replace the whole of `src/voicings/rank.js` with:

```js
// Orders shapes: root in the bass first, then easiest to play. Missing tones and a muddy low end
// count against ease rather than being a sort key, so a 7th chord without its 5th can still rank
// with the complete shapes.

// Lower is easier. Favours few fingers, small stretches, low positions, open strings and full,
// complete shapes with a clear bass.
export function easeScore(shape, capo) {
  const height = shape.lowFret === null ? 0 : Math.max(0, shape.lowFret - capo);
  return 2 * shape.fingers + shape.span + 3 * shape.middleMutes + height -
    shape.openStrings - 1.5 * shape.sounding + (shape.thumb ? 2 : 0) +
    2 * shape.missing.length + (shape.muddyBass ? 4 : 0);
}

export function rankVoicings(shapes, capo) {
  const scored = shapes.map((shape) => ({ shape, score: easeScore(shape, capo) }));
  scored.sort((a, b) =>
    (Number(b.shape.bassTone.role === 'root') - Number(a.shape.bassTone.role === 'root')) ||
    (a.score - b.score) ||
    ((a.shape.lowFret ?? capo) - (b.shape.lowFret ?? capo)) ||
    (a.shape.key < b.shape.key ? -1 : a.shape.key > b.shape.key ? 1 : 0));
  return scored.map((s) => s.shape);
}
```

- [ ] **Step 4: Run tests**

Run: `node tests/run.mjs`
Expected: `60 passed, 0 failed`. (Ranks with this formula: C7 `x32310` #2, Bm `x24432` #2, Dsus4 `xx0233` #3, Bb `x13331` #3, G `320003` #2, C `x32010` #1; DADGAD D top shape `000204`.)

- [ ] **Step 5: Commit**

```bash
git add src/voicings/rank.js tests/voicings.test.mjs
git commit -m "Rank by ease with missing tones, height and a muddy bass as costs" -m "Missing tones were a hard sort key and height cost 0.25 a fret, so textbook shapes like C7 x32310 ranked as low as #54. Pin C7, Bm, Dsus4 and Bb in their top 3." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: `findVoicings` never throws on an unreachable slash bass

**Files:**
- Modify: `src/voicings/find.js`
- Test: `tests/voicings.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/voicings.test.mjs`:

```js
check('voicings: a slash bass that is nowhere on the neck gives no shapes', () => {
  const unison = [40, 40, 40, 40, 40, 40]; // every string E2: frets 0–3 only reach E F F# G
  assertEqual(findVoicings({ tuning: unison, capo: 0, frets: 3, chord: parseChord('C/D') }), []);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tests/run.mjs`
Expected: `FAIL voicings: a slash bass that is nowhere on the neck gives no shapes: Cannot read properties of undefined (reading 'pc')`.

- [ ] **Step 3: Implement**

In `findVoicings` in `src/voicings/find.js`, replace

```js
  const bassPc = chord.bass ? cells.flat().find((c) => c.tone && c.tone.isBass).pc : null;
```

with

```js
  const bassCell = chord.bass ? cells.flat().find((c) => c.tone && c.tone.isBass) : null;
  if (chord.bass && !bassCell) return [];
  const bassPc = bassCell ? bassCell.pc : null;
```

- [ ] **Step 4: Run tests**

Run: `node tests/run.mjs`
Expected: `61 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add src/voicings/find.js tests/voicings.test.mjs
git commit -m "Return no shapes instead of throwing when the slash bass is off the neck" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Chord-box labels and selected style

**Files:**
- Modify: `src/ui/shapes.js` (in `chordBox`)
- Modify: `index.html` (gallery CSS)

UI only; checked in the browser in Task 6.

- [ ] **Step 1: Bigger dot labels**

In `chordBox` in `src/ui/shapes.js`, replace

```js
    root.append(svg('text', {
      x: x(s), y: cy + 3, 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 700,
      fill: t.role === 'extension' ? '#1c1917' : '#ffffff',
    }, text));
```

with

```js
    const attrs = {
      x: x(s), y: cy + 3.5, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700,
      fill: t.role === 'extension' ? '#1c1917' : '#ffffff',
    };
    // Three-character labels (b13, #11, bb7) are squeezed to stay inside the 14px dot.
    if (text.length >= 3) Object.assign(attrs, { textLength: 12, lengthAdjust: 'spacingAndGlyphs' });
    root.append(svg('text', attrs, text));
```

- [ ] **Step 2: Distinct selected and focused boxes**

In `index.html`, replace the line

```css
  .shape-box[aria-pressed="true"] { background: var(--panel); color: var(--text); border-color: var(--focus); box-shadow: 0 0 0 2px var(--focus); }
```

with

```css
  /* Selected: tinted fill and a solid text-coloured border. Focus keeps the blue outline ring
     (offset), so the two never look alike. Padding drops 1px to absorb the thicker border. */
  .shape-box[aria-pressed="true"] { background: color-mix(in srgb, var(--focus) 14%, var(--panel)); color: var(--text); border: 2px solid var(--text); padding: 7px 5px; }
  .shape-box:focus-visible { outline-offset: 3px; }
```

- [ ] **Step 3: Run tests and build**

Run: `node tests/run.mjs` → `61 passed, 0 failed`
Run: `node build.mjs` → `wrote dist/fretmap.html (...)`

- [ ] **Step 4: Commit**

```bash
git add src/ui/shapes.js index.html
git commit -m "Enlarge chord-box labels; make selected and focused boxes look different" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Sync the shapes spec and README

**Files:**
- Modify: `docs/superpowers/specs/2026-09-29-fretmap-voicing-finder-design.md`
- Modify: `README.md`

- [ ] **Step 1: Spec edits** (in `2026-09-29-fretmap-voicing-finder-design.md`)

1. Line 4: `**Status:** Approved in brainstorming, awaiting spec review` → `**Status:** Implemented (ranking revised 2026-10-01, see 2026-10-01-fretmap-ranking-strings-hosting-design.md)`
2. Purpose: `All 42 existing tests run` + `unchanged.` → `All v1 tests run unchanged.` (the sentence spans lines 14–15).
3. Shape model: in the line `bassPc, sounding, openStrings, middleMutes   // inputs to ranking`, change it to `bassPc, sounding, openStrings, middleMutes, muddyBass   // inputs to ranking`.
4. Replace the whole **Ranking (`rank.js`)** section body (from `` `rankVoicings(shapes, capo) -> shape[]` `` down to, not including, `## Labels`) with:

````markdown
`rankVoicings(shapes, capo) -> shape[]` returns a new sorted array, using `easeScore(shape, capo)`. Sort keys, in order:

1. **Root in bass first.** `bassTone.role === 'root'`. For slash chords every shape has the
   slash bass, so this key ties.
2. **Ease score, ascending:**

   ```
   score = 2*fingers + span + 3*middleMutes + max(0, lowFret - capo)
           - openStrings - 1.5*sounding + (thumb ? 2 : 0)
           + 2*missing.length + (muddyBass ? 4 : 0)
   ```

   - `span = highFret - lowFret`, or 0 with no fretted notes.
   - `middleMutes` is the number of muted strings that have a sounding string on both sides.
   - `openStrings` counts strings at fret `capo`.
   - `muddyBass`: the two lowest sounding pitches are 1, 2 or 3 semitones apart with the lower
     below E3, Eb3 or C3 respectively.
3. **Ties:** lower `lowFret` first, then compare `key` as strings.

````

5. In **Chord box**, after the bullet starting `- Dots use the role colours.` (and its continuation line), add:
   `  - Dot labels are 10px; three-character labels are squeezed to fit the dot.`
   and after the **Selection** bullets add:
   `- A selected box has a tinted background and a solid border; keyboard focus shows the standard outline ring, so the two stay distinct.`
6. Error handling: `- \`findVoicings\` never throws. A null chord gives \`[]\`.` → `- \`findVoicings\` never throws. A null chord, or a slash bass found nowhere on the neck, gives \`[]\`.`
7. Testing → Ranking: replace `  - Complete shapes come before incomplete ones within the same bass group.` with
   `  - C7 x32310, Bm x24432, Dsus4 xx0233 and Bb x13331 are in their top 3; G 320003 in its top 2.`
   and add `  - A missing tone costs 2, a muddy bass 4, a fret of height 1.`
8. Testing: `- **DADGAD, D major:** some shape with 5 or more open strings is in the top 5.` → `- **DADGAD, D major:** the top shape has 4 or more open strings.`
9. Testing: `- **Existing tests:** all 42 still pass, unchanged.` → `- **Existing tests:** all v1 tests still pass, unchanged.`

- [ ] **Step 2: README edit**

In `README.md` under **Playable shapes**, replace

```
current tuning and capo, best first: root in bass, then all notes present, then easiest to
play (few fingers, small stretch, open strings). Click a shape to ring it on the neck; click it
```

with

```
current tuning and capo, best first: root in bass, then easiest to play (few fingers, small
stretch, low on the neck, open strings, nothing left out, a clear low end). Click a shape to ring it on the neck; click it
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/specs/2026-09-29-fretmap-voicing-finder-design.md
git commit -m "Sync the shapes spec and README with the revised ranking" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Verify and merge `shapes` into `main` (controller)

- [ ] **Step 1:** `node tests/run.mjs` → `61 passed, 0 failed`; `node build.mjs` succeeds.
- [ ] **Step 2: Browser checklist** (`node serve.mjs`, http://localhost:8124, also `dist/fretmap.html`): the 9 items in the shapes spec, plus:
  - C7, Bm, Dsus4, Bb: textbook shape in the first row of boxes.
  - Dot labels readable at 10px; `b13` fits its dot (try C13 or C7b9b13).
  - Selected box vs Tab-focused box look different, in light and dark mode.
- [ ] **Step 3: Merge**

```bash
git checkout main
git merge --ff-only shapes
node tests/run.mjs
```

Expected: fast-forward; `61 passed, 0 failed`.

---

# Part 2 — string-count filter (branch `strings`)

Before starting: `git checkout -b strings main`.

### Task 7: `strings` in state and the URL

**Files:**
- Modify: `src/state.js`
- Test: `tests/state.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/state.test.mjs`:

```js
check('hash: string-count filter', () => {
  assertEqual(defaultState().strings, null);
  assertEqual(stateToHash(defaultState()), '#t=40.45.50.55.59.64&capo=0&f=15&l=names&k=0.maj');
  for (const n of [3, 4, 5, 6]) {
    const hash = stateToHash({ ...defaultState(), strings: n });
    assertEqual(hash.endsWith(`&n=${n}`), true, hash);
    assertEqual(hashToState(hash).strings, n);
  }
  for (const bad of ['#n=7', '#n=2', '#n=x', '#n=', '#n=03', '#n=3.0']) {
    assertEqual(hashToState(bad).strings, null, bad);
  }
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tests/run.mjs`
Expected: `FAIL hash: string-count filter: not equal: expected null, got undefined`.

- [ ] **Step 3: Implement**

In `src/state.js`:

After `export const MAX_CAPO = 12;` add:

```js
export const STRING_COUNTS = [3, 4, 5, 6]; // shape sizes the gallery can filter to; null = any
```

In `defaultState()`, after `keyPinned: false,` add:

```js
    strings: null,
```

In `stateToHash`, after `if (s.keyPinned) p.set('kp', '1');` add:

```js
  if (s.strings) p.set('n', String(s.strings));
```

In `hashToState`, after `s.keyPinned = p.get('kp') === '1';` add:

```js

  const n = p.get('n');
  if (STRING_COUNTS.map(String).includes(n)) s.strings = Number(n);
```

- [ ] **Step 4: Run tests**

Run: `node tests/run.mjs`
Expected: `62 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add src/state.js tests/state.test.mjs
git commit -m "Add an optional string-count filter to state and the URL" -m "Written as n=3..6 only when set, so default URLs are unchanged." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: `strings` filter in `findVoicings`

**Files:**
- Modify: `src/voicings/find.js`
- Test: `tests/voicings.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/voicings.test.mjs`:

```js
check('voicings: string-count filter', () => {
  const find = (symbol, strings) =>
    findVoicings({ tuning: STANDARD, capo: 0, frets: 15, chord: parseChord(symbol), strings });
  const c4 = find('C', 4);
  assert(c4.length > 0 && c4.every((s) => s.sounding === 4), 'C, 4 strings');
  // Filtering comes before fragment removal, so 4-string fragments of 5-string shapes stay.
  assert(c4.some((s) => s.key === keyOf([x, 3, 2, 0, 1, x])), 'x3201x missing from 4-string C');
  const c7 = find('C7', 3);
  assert(c7.length > 0, 'no 3-string C7');
  for (const s of c7) {
    assertEqual(s.sounding, 3, s.key);
    const n = notesOf(s);
    assert(n.has('C') && n.has('E') && n.has('Bb'), `3-string C7 ${s.key} lacks R, 3 or b7`);
  }
  assertEqual(find('C13', 3), []); // needs R, 3, b7 and 13: four notes
  const plain = findVoicings({ tuning: STANDARD, capo: 0, frets: 15, chord: parseChord('C') });
  assertEqual(find('C', null), plain);
  assertEqual(find('C', undefined), plain);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tests/run.mjs`
Expected: `FAIL voicings: string-count filter: C, 4 strings`.

- [ ] **Step 3: Implement**

In `src/voicings/find.js`, replace

```js
// Unsorted; see rank.js. Returns [] for no chord.
export function findVoicings({ tuning, capo, frets, chord }) {
```

with

```js
// Unsorted; see rank.js. Returns [] for no chord. With `strings` (3–6), only shapes sounding
// exactly that many strings, kept before fragment removal: a fragment always sounds fewer
// strings than its parent, so within one size nothing is a fragment.
export function findVoicings({ tuning, capo, frets, chord, strings = null }) {
```

and replace

```js
  const shapes = [...found.values()].filter(Boolean);
```

with

```js
  let shapes = [...found.values()].filter(Boolean);
  if (strings !== null) shapes = shapes.filter((s) => s.sounding === strings);
```

- [ ] **Step 4: Run tests**

Run: `node tests/run.mjs`
Expected: `63 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add src/voicings/find.js tests/voicings.test.mjs
git commit -m "Let findVoicings keep only shapes that sound a given number of strings" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: Filter control in the gallery

**Files:**
- Modify: `src/ui/shapes.js`
- Modify: `src/main.js`
- Modify: `index.html` (CSS)

UI only; checked in the browser in Task 10.

- [ ] **Step 1: `main.js`**

Replace

```js
// A shape only makes sense for the chord, tuning, capo and frets it was found for.
function shapeContext(s) {
  return [s.chord ? s.chord.symbol : '', s.tuning.join('.'), s.capo, s.frets].join('|');
}
```

with

```js
// A shape only makes sense for the chord, tuning, capo, frets and string filter it was found for.
function shapeContext(s) {
  return [s.chord ? s.chord.symbol : '', s.tuning.join('.'), s.capo, s.frets, s.strings].join('|');
}
```

In `actions`, after `togglePin: () => commit({ ...state, keyPinned: !state.keyPinned }),` add:

```js
  setStrings: (strings) => commit({ ...state, strings }),
```

- [ ] **Step 2: `shapes.js` imports**

After `import { pitchClass } from '../theory/notes.js';` add:

```js
import { STRING_COUNTS } from '../state.js';
```

- [ ] **Step 3: `shapes.js` header builder**

Inside `mountShapes`, directly before the comment `// Rebuilds the boxes.`, add:

```js
  // Heading plus the "Strings: Any 3 4 5 6" filter. Shown whenever the gallery is, so a filter
  // that empties the list can still be switched back.
  function header(state) {
    const head = document.createElement('div');
    head.className = 'shapes-head';
    const heading = document.createElement('h2');
    heading.textContent = `Shapes (${shapes.length})`;
    const label = document.createElement('span');
    label.className = 'seg-label';
    label.textContent = 'Strings';
    const group = document.createElement('div');
    group.className = 'seg';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Strings');
    for (const n of [null, ...STRING_COUNTS]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.strings = n === null ? 'any' : String(n);
      b.textContent = n === null ? 'Any' : String(n);
      b.setAttribute('aria-pressed', String(state.strings === n));
      b.addEventListener('click', () => actions.setStrings(n));
      group.append(b);
    }
    head.append(heading, label, group);
    return head;
  }

  // What has keyboard focus inside the gallery, as a selector that finds it again after a rebuild.
  function focusedSelector() {
    const active = document.activeElement;
    if (!active || !el.contains(active)) return null;
    if (active.dataset.strings) return `[data-strings="${active.dataset.strings}"]`;
    if (active.dataset.key) return `.shape-box[data-key="${active.dataset.key}"]`;
    return null;
  }

  function replaceKeepingFocus(parts) {
    const selector = focusedSelector();
    el.replaceChildren(...parts);
    if (selector) {
      const again = el.querySelector(selector);
      if (again) again.focus();
    }
  }
```

- [ ] **Step 4: `shapes.js` `draw`**

In `draw(state)`, replace the start

```js
    const heading = document.createElement('h2');
    heading.textContent = `Shapes (${shapes.length})`;
    if (!shapes.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = `No playable shapes within frets ${state.capo}–${state.frets}. Try more frets (⚙) or a simpler chord.`;
      grid = null;
      el.replaceChildren(heading, empty);
      return;
    }
```

with

```js
    const head = header(state);
    if (!shapes.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = state.strings
        ? `No ${state.strings}-string shapes for ${state.chord.symbol} within frets ${state.capo}–${state.frets}. Try Any.`
        : `No playable shapes within frets ${state.capo}–${state.frets}. Try more frets (⚙) or a simpler chord.`;
      grid = null;
      replaceKeepingFocus([head, empty]);
      return;
    }
```

Change `const parts = [heading, grid];` to `const parts = [head, grid];`.

Replace the end of `draw`

```js
    // Keep keyboard focus on the same shape across a rebuild (e.g. switching Names/Numbers).
    const focused = document.activeElement && el.contains(document.activeElement) ? document.activeElement.dataset.key : undefined;
    el.replaceChildren(...parts);
    if (focused) {
      const again = grid.querySelector(`[data-key="${focused}"]`);
      if (again) again.focus();
    }
  }
```

with

```js
    // Keep keyboard focus on the same shape or filter button across a rebuild.
    replaceKeepingFocus(parts);
  }
```

- [ ] **Step 5: `shapes.js` `update`**

Replace

```js
    const next = [state.chord.symbol, state.tuning.join('.'), state.capo, state.frets].join('|');
```

with

```js
    const next = [state.chord.symbol, state.tuning.join('.'), state.capo, state.frets, state.strings].join('|');
```

(`findVoicings(state)` already receives `state.strings`; a new `next` resets `expanded`, so a filter change collapses back to 24.)

- [ ] **Step 6: CSS**

In `index.html`, after the line `.shapes h2 { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--muted); }` add:

```css
  .shapes-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 0 0 10px; }
  .shapes-head h2 { margin: 0; }
  .seg-label { color: var(--muted); font-size: 13px; }
  .shapes .seg button { padding: 3px 10px; font-size: 13px; }
  .shapes .seg button + button { border-left: 0; }
```

- [ ] **Step 7: Run tests and build**

Run: `node tests/run.mjs` → `63 passed, 0 failed`
Run: `node build.mjs` → succeeds (no "unsupported module syntax").

- [ ] **Step 8: Commit**

```bash
git add src/ui/shapes.js src/main.js index.html
git commit -m "Add a Strings: Any/3/4/5/6 filter to the shapes gallery" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: README, verify, merge (controller)

- [ ] **Step 1: README** — in **Playable shapes**, after the paragraph ending `Chord boxes count frets from the capo.` add:

```
**Strings** above the gallery limits it to shapes that sound exactly 3, 4, 5 or 6 strings —
3 gives triads and shell voicings. It's saved in the link (`&n=3`); **Any** shows everything.
```

Commit: `git commit -am "Document the strings filter" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`

- [ ] **Step 2:** `node tests/run.mjs` → `63 passed, 0 failed`; `node build.mjs`.
- [ ] **Step 3: Browser checklist** (spec part 2): Any matches `main` (same shapes, order, neck, URL without `n`); 3 → only 3-string boxes and `&n=3`, survives reload; selection clears on filter change; C13 + 3 shows the filtered empty message with the filter still visible; Tab reaches the filter buttons, Enter/Space work, focus stays on the pressed button; light and dark; phone width (375px) wraps the header cleanly.
- [ ] **Step 4: Merge**

```bash
git checkout main
git merge --ff-only strings
node tests/run.mjs
```

---

# Part 3 — GitHub Pages (branch `pages`)

Before starting: `git checkout -b pages main`.

### Task 11: Deploy workflow

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `.gitignore`, `README.md`

- [ ] **Step 1: Check current action versions**

For each of `actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`, open `https://github.com/<action>/releases/latest` and note the major version. If a newer major than below exists, use it. Use the current Node LTS major for `node-version` (22 or newer).

- [ ] **Step 2: Create `.github/workflows/pages.yml`**

```yaml
# Tests, builds and publishes dist/fretmap.html as the site's index.html on GitHub Pages.
# Runs on every push to main; rerun by hand from the Actions tab (Run workflow).
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node tests/run.mjs
      - run: node build.mjs
      - run: mkdir _site && cp dist/fretmap.html _site/index.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

(Adjust the `@vN` tags and `node-version` per Step 1.)

- [ ] **Step 3: Rehearse the build steps locally** (Git Bash)

```bash
node tests/run.mjs && node build.mjs && mkdir -p _site && cp dist/fretmap.html _site/index.html && ls -l _site
```

Expected: tests pass, `_site/index.html` exists and matches `dist/fretmap.html`. Then add `_site/` on its own line to `.gitignore` and `rm -r _site`.

- [ ] **Step 4: README** — after the **Use** section add:

```
## Deploy

Pushing to `main` runs `.github/workflows/pages.yml`: it runs the tests, builds, and publishes
`dist/fretmap.html` as the site's `index.html` on GitHub Pages. A failing test stops the
deploy. To redeploy without a change, open the repo's **Actions** tab, pick **Deploy to GitHub
Pages** and press **Run workflow**.
```

- [ ] **Step 5: Commit and merge**

```bash
git add .github/workflows/pages.yml .gitignore README.md
git commit -m "Deploy the single-file build to GitHub Pages from main" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git checkout main
git merge --ff-only pages
```

Also update the spec's workflow bullet (`actions/setup-node` (Node 20)) to the Node version actually used, in the same commit if changed.

### Task 12: Going public (controller, with the user — every outward step confirmed first)

- [ ] **Step 1:** Ask the user to sign in / sign up at github.com and create an empty **public** repo named `fretmap` (no README, licence or .gitignore). Ask for their username and noreply address (github.com → Settings → Emails → tick "Keep my email addresses private"; the address is shown there as `ID+USERNAME@users.noreply.github.com`).

- [ ] **Step 2: Rewrite the author email** (nothing is pushed yet, so this is safe). With the user's noreply address in `NOREPLY`:

```bash
git status   # must be clean; no other worktrees (git worktree list)
NOREPLY='<address the user gave>' git filter-branch --env-filter '
if [ "$GIT_AUTHOR_EMAIL" = "<personal email>" ]; then GIT_AUTHOR_EMAIL="$NOREPLY"; fi
if [ "$GIT_COMMITTER_EMAIL" = "<personal email>" ]; then GIT_COMMITTER_EMAIL="$NOREPLY"; fi
export GIT_AUTHOR_EMAIL GIT_COMMITTER_EMAIL
' -- --all
git log --all --format='%ae %ce' | sort -u
```

Expected: the noreply address is the only line. Then:

```bash
git for-each-ref --format='%(refname)' refs/original/ | xargs -r -n1 git update-ref -d
git config user.email '<noreply address>'
node tests/run.mjs
```

- [ ] **Step 3: Push — ask the user first**, showing exactly: remote URL `https://github.com/<user>/fretmap.git`, branch `main` only, public. On a yes:

```bash
git remote add origin https://github.com/<user>/fretmap.git
git push -u origin main
```

Git Credential Manager opens a browser sign-in the first time; the user completes it.

- [ ] **Step 4:** Ask the user to open the repo's Settings → Pages, set **Source: GitHub Actions**, then Actions tab → **Deploy to GitHub Pages** → **Run workflow** (the push ran before Pages was on, so its deploy job failed or was skipped).

- [ ] **Step 5:** Once the run is green, open `https://<user>.github.io/fretmap/` in the browser pane: page loads, pick a chord, shapes appear, the `#…` URL updates; check a 375px-wide viewport.

- [ ] **Step 6:** README: add under the title paragraph `**Live:** https://<user>.github.io/fretmap/`, commit, and — after asking — `git push`. The workflow redeploys automatically.

---

## Self-review notes

- Spec §1 ranking → Task 2; `muddyBass` → Task 1; small fixes → Tasks 3–4; spec sync → Task 5; merge → Task 6.
- Spec §2 state → Task 7; engine → Task 8; UI, empty message, focus, collapse, selection clearing → Task 9; checklist → Task 10.
- Spec §3 workflow, README → Task 11; going public, author rewrite, push, Pages, live link → Task 12.
- Expected test counts: 57 → 58 (T1) → 60 (T2: +2 new, 2 replaced) → 61 (T3) → 62 (T7) → 63 (T8).
