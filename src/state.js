// App state and its URL-hash form. Pure: main.js does the actual location/history calls.
import { STANDARD, isValidTuning } from './tunings.js';
import { parseChord } from './theory/parse.js';
import { keyForChord } from './theory/degrees.js';

export const FRET_OPTIONS = [12, 15, 19, 22, 24];
export const MAX_CAPO = 12;
export const STRING_COUNTS = [3, 4, 5, 6]; // shape sizes the gallery can filter to; null = any

export function defaultState() {
  return {
    tuning: STANDARD.slice(),
    capo: 0,
    frets: 15,
    chord: null,
    labels: 'names',
    key: { root: 0, mode: 'major' },
    keyPinned: false,
    strings: null,
  };
}

// Keep at least 3 frets above the capo.
export function fitFrets(capo, frets) {
  if (capo <= frets - 3) return frets;
  return FRET_OPTIONS.find((f) => capo <= f - 3);
}

// Choosing a chord moves the key to it unless the key is pinned.
export function selectChord(state, chord) {
  const next = { ...state, chord };
  if (chord && !state.keyPinned) next.key = keyForChord(chord);
  return next;
}

export function stateToHash(s) {
  const p = new URLSearchParams();
  p.set('t', s.tuning.join('.'));
  p.set('capo', String(s.capo));
  p.set('f', String(s.frets));
  if (s.chord) p.set('c', s.chord.symbol);
  p.set('l', s.labels);
  p.set('k', `${s.key.root}.${s.key.mode === 'minor' ? 'min' : 'maj'}`);
  if (s.keyPinned) p.set('kp', '1');
  if (s.strings) p.set('n', String(s.strings));
  return `#${p.toString()}`;
}

// Each part is checked on its own; a bad part falls back to its default.
export function hashToState(hash) {
  const p = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const s = defaultState();

  const t = (p.get('t') || '').split('.').map(Number);
  if (isValidTuning(t)) s.tuning = t;

  const capo = p.get('capo');
  if (/^\d+$/.test(capo || '') && Number(capo) <= MAX_CAPO) s.capo = Number(capo);

  const f = Number(p.get('f'));
  if (FRET_OPTIONS.includes(f)) s.frets = f;
  s.frets = fitFrets(s.capo, s.frets);

  if (p.has('c')) s.chord = parseChord(p.get('c'));

  if (p.get('l') === 'numbers') s.labels = 'numbers';

  const k = /^(\d+)\.(maj|min)$/.exec(p.get('k') || '');
  if (k && Number(k[1]) < 12) s.key = { root: Number(k[1]), mode: k[2] === 'min' ? 'minor' : 'major' };
  else if (s.chord) s.key = keyForChord(s.chord);

  s.keyPinned = p.get('kp') === '1';

  const n = p.get('n');
  if (STRING_COUNTS.map(String).includes(n)) s.strings = Number(n);
  return s;
}
