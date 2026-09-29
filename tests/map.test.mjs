import { check, assert, assertEqual } from './harness.mjs';
import { mapFretboard } from '../src/fretboard/map.js';
import { parseChord } from '../src/theory/parse.js';
import { pitchClass } from '../src/theory/notes.js';

const STANDARD = [40, 45, 50, 55, 59, 64];
const DADGAD = [38, 45, 50, 55, 57, 62];

check('map: shape and pitches in standard tuning', () => {
  const cells = mapFretboard({ tuning: STANDARD, capo: 0, frets: 15, chord: null });
  assertEqual(cells.length, 6);
  assertEqual(cells[0].length, 16);
  assertEqual(cells[0][5].midi, 45);
  assertEqual(cells[5][0].midi, 64);
  assertEqual(cells[0][5].tone, null);
});

check('map: capo 2 makes frets 0-1 unplayable', () => {
  const cells = mapFretboard({ tuning: DADGAD, capo: 2, frets: 12, chord: null });
  assertEqual(cells.map((row) => [row[0].playable, row[1].playable, row[2].playable]),
    Array(6).fill([false, false, true]));
});

check('map: lit cells are chord tones, and every tone lights in frets 0-12', () => {
  for (const symbol of ['E', 'Cmaj9', 'F#m7b5', 'Bb13#11', 'D/F#', 'C/D']) {
    const chord = parseChord(symbol);
    const cells = mapFretboard({ tuning: DADGAD, capo: 0, frets: 12, chord }).flat();
    const chordPcs = new Set(chord.tones.map((t) => pitchClass(t.note)));
    for (const cell of cells) {
      if (cell.tone) assert(chordPcs.has(cell.pc), `${symbol}: stray tone at pc ${cell.pc}`);
      else assert(!chordPcs.has(cell.pc), `${symbol}: pc ${cell.pc} not lit`);
    }
    for (const t of chord.tones) {
      assert(cells.some((c) => c.tone === t), `${symbol}: ${t.label} never lit`);
    }
  }
});

check('map: slash bass flags carry through', () => {
  const ce = mapFretboard({ tuning: STANDARD, capo: 0, frets: 12, chord: parseChord('C/E') });
  assertEqual(ce[0][0].tone.isBass, true); // open low E
  const cd = mapFretboard({ tuning: STANDARD, capo: 0, frets: 12, chord: parseChord('C/D') });
  assertEqual(cd[2][0].tone.role, 'bass'); // open D string
});
