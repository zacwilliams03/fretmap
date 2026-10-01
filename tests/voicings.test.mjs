import { check, assert, assertEqual } from './harness.mjs';
import { findVoicings, fingering, droppableLabels, isMuddy } from '../src/voicings/find.js';
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
  assert(has(shapesFor('F').shapes, [x, x, 3, 2, 1, 1]), 'small F');
  assert(has(shapesFor('F').shapes, [1, 3, 3, 2, 1, 1]), 'F barre');
  assert(has(shapesFor('Gm').shapes, [x, x, 5, 3, 3, 3]), 'small Gm');
  assert(has(shapesFor('Fmaj7').shapes, [x, x, 3, 2, 1, 0]), 'Fmaj7');
});

check('voicings: the best-known shape ranks first', () => {
  assertEqual(shapesFor('C').shapes[0].key, keyOf([x, 3, 2, 0, 1, 0]));
  assertEqual(shapesFor('Am').shapes[0].key, keyOf([x, 0, 2, 2, 1, 0]));
  assertEqual(shapesFor('Cmaj7').shapes[0].key, keyOf([x, 3, 2, 0, 0, 0]));
});

check('voicings: root in bass first', () => {
  for (const symbol of ['C', 'Am7', 'C13', 'F#m7b5']) {
    const { shapes } = shapesFor(symbol);
    const rootFlags = shapes.map((s) => s.bassTone.role === 'root');
    assertEqual(rootFlags.indexOf(false) === -1 ? rootFlags.length : rootFlags.indexOf(false),
      rootFlags.lastIndexOf(true) + 1, `${symbol}: root-in-bass not all first`);
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
      if (s.barre !== null) {
        const on = s.frets.map((f, i) => (f === s.barre ? i : -1)).filter((i) => i >= 0 && !(s.thumb && i === 0));
        for (let i = on[0]; i <= on[on.length - 1]; i++) {
          assert(s.frets[i] !== null && s.frets[i] >= s.barre, `${symbol} ${s.key}: barre crosses string ${i}`);
        }
      }
    }
  }
});

check('fingering: barre, open string under a barre, thumb', () => {
  assertEqual(fingering([x, 3, 5, 5, 5, 3], 0), { fingers: 4, barre: 3, thumb: false });
  assertEqual(fingering([x, 3, 2, 0, 1, 0], 0), { fingers: 3, barre: null, thumb: false });
  // Barres only when needed: the open A shape is three fingers, not a barre.
  assertEqual(fingering([x, 0, 2, 2, 2, 0], 0), { fingers: 3, barre: null, thumb: false });
  // A barre can't cross a muted string (it would sound it).
  assertEqual(fingering([1, x, 3, 2, 1, 1], 0), { fingers: 5, barre: null, thumb: true });
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
  assertEqual(describeVoicing(d, chord, 2)[2], 'frets 2–3');
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
  const best = shapesFor('D', { tuning: DADGAD }).shapes[0];
  assert(best.openStrings >= 4, `top shape ${best.key} has ${best.openStrings} open strings`);
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

check('voicings: edges of the neck', () => {
  assertEqual(findVoicings({ tuning: STANDARD, capo: 0, frets: 15, chord: null }), []);
  assertEqual(findVoicings({ tuning: STANDARD, capo: 13, frets: 12, chord: parseChord('C') }), []);
  const high = shapesFor('C', { capo: 12, frets: 15 }).shapes;
  assert(high.length > 0 && high.every((s) => s.frets.every((f) => f === null || (f >= 12 && f <= 15))), 'capo 12');
  assert(shapesFor('D', { capo: 0, frets: 3 }).shapes.length > 0, 'frets == capo + 3');
});

check('voicings: sus chords keep their 5th; easeScore prefers fuller shapes', () => {
  for (const s of shapesFor('Csus2').shapes) assert(notesOf(s).has('G'), `Csus2 ${s.key} without G`);
  const c = shapesFor('C').shapes;
  const full = c.find((s) => s.key === keyOf([x, 3, 2, 0, 1, 0]));
  const sparse = c.find((s) => s.key === keyOf([x, 3, x, 0, 1, 0]));
  assert(easeScore(full, 0) < easeScore(sparse, 0), 'full shape should score easier than one with a muted middle');
});

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

check('voicings: a slash bass that is nowhere on the neck gives no shapes', () => {
  const unison = [40, 40, 40, 40, 40, 40]; // every string E2: frets 0–3 only reach E F F# G
  assertEqual(findVoicings({ tuning: unison, capo: 0, frets: 3, chord: parseChord('C/D') }), []);
});
