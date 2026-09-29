import { check, assertEqual } from './harness.mjs';
import { PRESETS, STANDARD, stepString, tuningName, stringNames, createFavouriteStore, MIN_MIDI, MAX_MIDI } from '../src/tunings.js';

const preset = (name) => PRESETS.find((p) => p.name === name).tuning;

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

check('presets: 12 of them, standard is E2..E4', () => {
  assertEqual(PRESETS.length, 12);
  assertEqual(STANDARD, [40, 45, 50, 55, 59, 64]);
  assertEqual(preset('DADGAD'), [38, 45, 50, 55, 57, 62]);
});

check('naming: DADGAD with G3 down a semitone is Open D; others are Custom', () => {
  assertEqual(tuningName(preset('DADGAD')), 'DADGAD');
  assertEqual(tuningName(stepString(preset('DADGAD'), 3, -1)), 'Open D');
  assertEqual(tuningName([40, 45, 50, 55, 59, 63]), 'Custom');
});

check('naming: a matching favourite wins over a preset', () => {
  assertEqual(tuningName(STANDARD, [{ name: 'My std', tuning: STANDARD }]), 'My std');
});

check('stepString clamps to B0..C6 and does not mutate', () => {
  const low = [MIN_MIDI, 45, 50, 55, 59, 64];
  assertEqual(stepString(low, 0, -1)[0], MIN_MIDI);
  const high = [40, 45, 50, 55, 59, MAX_MIDI];
  assertEqual(stepString(high, 5, 1)[5], MAX_MIDI);
  const t = STANDARD.slice();
  stepString(t, 0, -2);
  assertEqual(t, STANDARD);
});

check('stringNames: preset spelling, else generic', () => {
  assertEqual(stringNames(preset('Eb Standard')), ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4']);
  assertEqual(stringNames([39, 44, 49, 54, 58, 64]), ['Eb2', 'G#2', 'C#3', 'F#3', 'Bb3', 'E4']);
});

check('favourites: save, replace by name, remove, persist', () => {
  const storage = fakeStorage();
  const store = createFavouriteStore(storage);
  store.save('Mine', [38, 45, 50, 55, 57, 62]);
  store.save('Mine', [38, 45, 50, 54, 57, 62]);
  assertEqual(store.list(), [{ name: 'Mine', tuning: [38, 45, 50, 54, 57, 62] }]);
  assertEqual(createFavouriteStore(storage).list().length, 1);
  store.remove('Mine');
  assertEqual(createFavouriteStore(storage).list(), []);
});

check('favourites: corrupted data and missing storage are survivable', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    assertEqual(createFavouriteStore(fakeStorage({ 'fretmap.tunings.v1': '{not json' })).list(), []);
    assertEqual(createFavouriteStore(fakeStorage({ 'fretmap.tunings.v1': '[{"name":"x","tuning":[1,2]}]' })).list(), []);
    const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    const store = createFavouriteStore(throwing);
    store.save('A', STANDARD);
    assertEqual(store.list().length, 1);
  } finally {
    console.warn = warn;
  }
  const memory = createFavouriteStore(null);
  memory.save('B', STANDARD);
  assertEqual(memory.list().length, 1);
});
