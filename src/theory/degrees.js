// Key-relative degree labels for the Numbers view, and which key a chord implies.
import { mod12, pitchClass, noteName } from './notes.js';

const LABELS = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
const IN_KEY = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};
export const KEY_NAMES = {
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'],
};
const FLAT_KEYS = {
  major: ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
  minor: ['D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab'],
};

// key = { root: 0..11, mode: 'major' | 'minor' }
export function degreeLabel(pc, key) {
  const i = mod12(pc - key.root);
  return { label: LABELS[i], inKey: IN_KEY[key.mode].includes(i) };
}

// Minor if the chord has a b3 and no 3 (m, dim, m7b5 …); otherwise major.
export function keyForChord(chord) {
  const semis = chord.tones.filter((t) => t.role !== 'bass').map((t) => t.semis);
  const minor = semis.includes(3) && !semis.includes(4);
  return { root: pitchClass(chord.root), mode: minor ? 'minor' : 'major' };
}

// Should the faint note names use flats? Yes for a flat root, or a root whose key
// (major, or minor per keyForChord) has flats in its key signature.
export function prefersFlats(chord) {
  if (!chord) return false;
  if (chord.root.acc < 0) return true;
  return FLAT_KEYS[keyForChord(chord).mode].includes(noteName(chord.root));
}
