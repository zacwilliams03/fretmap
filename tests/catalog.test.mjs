import { check, assert, assertEqual } from './harness.mjs';
import { CATALOG, searchChords } from '../src/theory/catalog.js';
import { noteName, pitchClass, mod12 } from '../src/theory/notes.js';

check('catalog: 748 entries, every tone spelled at the right pitch', () => {
  assertEqual(CATALOG.length, 17 * 44);
  for (const chord of CATALOG) {
    for (const t of chord.tones) {
      assertEqual(pitchClass(t.note), mod12(pitchClass(chord.root) + t.semis), chord.symbol);
    }
  }
});

check('search: exact parse first, then prefix matches on the same root', () => {
  const r = searchChords('Cm7');
  assertEqual(r[0].symbol, 'Cm7');
  assert(r.some((c) => c.symbol === 'Cm7b5'), 'Cm7b5 missing');
  assert(r.every((c) => noteName(c.root) === 'C'), 'wrong root in results');
  assertEqual(new Set(r.map((c) => c.symbol)).size, r.length, 'duplicates');
  assertEqual(searchChords('D/F#')[0].symbol, 'D/F#');
  assertEqual(searchChords('Cxyz'), []);
  assertEqual(searchChords('C', 'C', 5).length, 5);
});

check('search: suffix matches rank ahead of alias-only matches', () => {
  const r = searchChords('Cm').map((c) => c.symbol);
  assertEqual(r[0], 'Cm');
  assert(r.indexOf('C') > r.indexOf('Cm13'), 'C major (via "maj") ranked above minor chords');
});

check('search: empty input lists every type for the current root', () => {
  assertEqual(searchChords('', 'Eb').length, 44);
  assertEqual(searchChords('', 'Eb')[0].symbol, 'Eb');
  assertEqual(searchChords('   ', 'E#')[0].symbol, 'E#');
});
