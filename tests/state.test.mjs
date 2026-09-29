import { check, assertEqual } from './harness.mjs';
import { defaultState, fitFrets, selectChord, stateToHash, hashToState } from '../src/state.js';
import { parseChord } from '../src/theory/parse.js';

check('fitFrets keeps 3 frets above the capo', () => {
  assertEqual(fitFrets(0, 12), 12);
  assertEqual(fitFrets(9, 12), 12);
  assertEqual(fitFrets(10, 12), 15);
  assertEqual(fitFrets(12, 12), 15);
  assertEqual(fitFrets(12, 22), 22);
});

check('selectChord moves the key unless pinned', () => {
  const s = selectChord(defaultState(), parseChord('Am7'));
  assertEqual(s.key, { root: 9, mode: 'minor' });
  const pinned = selectChord({ ...defaultState(), keyPinned: true }, parseChord('D7'));
  assertEqual(pinned.key, { root: 0, mode: 'major' });
  assertEqual(pinned.chord.symbol, 'D7');
});

check('hash round-trips', () => {
  const s = {
    ...defaultState(),
    tuning: [38, 45, 50, 55, 57, 62],
    capo: 2,
    frets: 19,
    chord: parseChord('C#m7b5/G'),
    labels: 'numbers',
    key: { root: 7, mode: 'minor' },
    keyPinned: true,
  };
  const hash = stateToHash(s);
  const back = hashToState(hash);
  assertEqual(stateToHash(back), hash);
  assertEqual(back.chord.symbol, 'C#m7b5/G');
  assertEqual(back.tuning, s.tuning);
  assertEqual([back.capo, back.frets, back.labels, back.keyPinned], [2, 19, 'numbers', true]);
});

check('hash: each bad part falls back on its own', () => {
  const s = hashToState('#t=banana&capo=2&f=13&c=Cxyz&l=weird&k=99.maj');
  assertEqual(s.tuning, defaultState().tuning);
  assertEqual(s.capo, 2);
  assertEqual(s.frets, 15);
  assertEqual(s.chord, null);
  assertEqual(s.labels, 'names');
  assertEqual(s.key, { root: 0, mode: 'major' });
  assertEqual(hashToState('').capo, 0);
  assertEqual(hashToState('#capo=99').capo, 0);
  assertEqual(hashToState('#capo=12&f=12').frets, 15);
});

check('hash: a chord without a key takes its key from the chord', () => {
  assertEqual(hashToState('#c=Em').key, { root: 4, mode: 'minor' });
});
