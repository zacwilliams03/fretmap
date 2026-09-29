import { check, assertEqual } from './harness.mjs';
import { degreeLabel, keyForChord, prefersFlats } from '../src/theory/degrees.js';
import { parseChord } from '../src/theory/parse.js';

const G_MAJOR = { root: 7, mode: 'major' };
const A_MINOR = { root: 9, mode: 'minor' };

check('degrees: C E G in G major read 4 6 1', () => {
  assertEqual([0, 4, 7].map((pc) => degreeLabel(pc, G_MAJOR).label), ['4', '6', '1']);
  assertEqual(degreeLabel(1, G_MAJOR), { label: '#4', inKey: false });
});

check('degrees: A minor has C F G in the key, C# out', () => {
  assertEqual([0, 5, 7].map((pc) => degreeLabel(pc, A_MINOR)), [
    { label: 'b3', inKey: true }, { label: 'b6', inKey: true }, { label: 'b7', inKey: true },
  ]);
  assertEqual(degreeLabel(1, A_MINOR), { label: '3', inKey: false });
});

check('keyForChord: minor for b3 without 3, else major', () => {
  assertEqual(keyForChord(parseChord('Am7')), { root: 9, mode: 'minor' });
  assertEqual(keyForChord(parseChord('D7')), { root: 2, mode: 'major' });
  assertEqual(keyForChord(parseChord('Bm7b5')), { root: 11, mode: 'minor' });
  assertEqual(keyForChord(parseChord('C7#9')), { root: 0, mode: 'major' });
  assertEqual(keyForChord(parseChord('Csus4')), { root: 0, mode: 'major' });
});

check('prefersFlats: flat roots and flat key signatures', () => {
  assertEqual(prefersFlats(parseChord('Bb')), true);
  assertEqual(prefersFlats(parseChord('F')), true);
  assertEqual(prefersFlats(parseChord('Dm')), true);
  assertEqual(prefersFlats(parseChord('D')), false);
  assertEqual(prefersFlats(parseChord('F#m')), false);
  assertEqual(prefersFlats(null), false);
});
