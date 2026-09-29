// Chord symbols -> chord objects. Never throws: anything unrecognised is null.
import { parseNote, noteName, pitchClass, spellInterval, mod12 } from './notes.js';
import { findType } from './chords.js';

// Labels for a slash bass that is not a chord tone, by semitones above the root.
const BASS_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
// Root names for "Shape from capo".
const SHAPE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function parseChord(text) {
  if (typeof text !== 'string') return null;
  const m = /^([A-Ga-g][#b]?)\s*(.*)$/.exec(text.trim());
  if (!m) return null;
  const root = parseNote(m[1]);
  const rest = m[2];

  // The whole remainder as a suffix first, so "6/9" is not read as a slash chord.
  let type = findType(rest);
  let bass = null;
  if (!type) {
    const slash = rest.lastIndexOf('/');
    if (slash < 0) return null;
    type = findType(rest.slice(0, slash).trim());
    bass = parseNote(rest.slice(slash + 1).trim());
    if (!type || !bass) return null;
  }
  return buildChord(root, type, bass);
}

export function buildChord(root, type, bass) {
  const tones = type.intervals.map((iv) => ({
    note: spellInterval(root, iv.degree, iv.semis),
    semis: iv.semis,
    label: iv.label,
    role: iv.role,
    isBass: false,
  }));
  if (bass) {
    const match = tones.find((t) => pitchClass(t.note) === pitchClass(bass));
    if (match) {
      match.isBass = true;
    } else {
      const semis = mod12(pitchClass(bass) - pitchClass(root));
      tones.push({ note: bass, semis, label: BASS_LABELS[semis], role: 'bass', isBass: true });
    }
  }
  const symbol = noteName(root) + type.suffix + (bass ? `/${noteName(bass)}` : '');
  return { symbol, root, type, bass, tones };
}

// The chord shape you finger behind a capo: E with capo 2 is a "D" shape.
export function capoShape(chord, capo) {
  const name = (note) => SHAPE_NAMES[mod12(pitchClass(note) - capo)];
  return name(chord.root) + chord.type.suffix + (chord.bass ? `/${name(chord.bass)}` : '');
}
