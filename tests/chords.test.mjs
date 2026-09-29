import { check, assert, assertEqual } from './harness.mjs';
import { CHORD_TYPES, findType } from '../src/theory/chords.js';

check('the table has 44 types and no suffix or alias is used twice', () => {
  assertEqual(CHORD_TYPES.length, 44);
  const seen = new Set();
  for (const t of CHORD_TYPES) {
    for (const s of [t.suffix, ...t.aliases]) {
      assert(!seen.has(s), `duplicate suffix "${s}"`);
      seen.add(s);
    }
  }
});

check('intervals carry semis, degree, label and role', () => {
  const m7b5 = findType('m7b5');
  assertEqual(m7b5.intervals.map((i) => i.label), ['1', 'b3', 'b5', 'b7']);
  assertEqual(m7b5.intervals.map((i) => i.semis), [0, 3, 6, 10]);
  assertEqual(m7b5.intervals.map((i) => i.role), ['root', 'third', 'fifth', 'seventh']);
  assertEqual(findType('sus4').intervals[1], { semis: 5, degree: 4, label: '4', role: 'third' });
  assertEqual(findType('9').intervals[4], { semis: 14, degree: 9, label: '9', role: 'extension' });
});

check('findType is exact and case-sensitive', () => {
  assertEqual(findType('M7').id, 'maj7');
  assertEqual(findType('m7').id, 'm7');
  assertEqual(findType('').id, 'maj');
  assertEqual(findType('xyz'), null);
});

check('no chord type repeats a pitch class', () => {
  for (const t of CHORD_TYPES) {
    const pcs = t.intervals.map((i) => i.semis % 12);
    assertEqual(new Set(pcs).size, pcs.length, t.id);
  }
});
