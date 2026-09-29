// Three short labels for a shape: what's in the bass, what's missing, where it sits.
import { noteName } from '../theory/notes.js';

const BASS_NAMES = { '1': 'root', 'b3': '3rd', '3': '3rd', 'b5': '5th', '5': '5th', '#5': '5th', 'bb7': '7th', 'b7': '7th', '7': '7th' };
const ORDINALS = { '5': '5th', '9': '9th', '11': '11th' }; // altered tones keep their own label

export function describeVoicing(shape, chord, capo) {
  const t = shape.bassTone;
  const bass = chord.bass || !BASS_NAMES[t.label] ? `bass ${noteName(t.note)}` : `${BASS_NAMES[t.label]} in bass`;

  const notes = shape.missing.length ? `no ${shape.missing.map((l) => ORDINALS[l] || l).join(', ')}` : 'all notes';

  // Positions count from the capo, so a D shape reads the same at any capo.
  let position;
  if (shape.lowFret === null) position = 'open';
  else if (shape.barre !== null) position = `barre ${shape.barre - capo}`;
  else if (shape.lowFret === shape.highFret) position = `fret ${shape.lowFret - capo}`;
  else position = `frets ${shape.lowFret - capo}–${shape.highFret - capo}`;
  if (shape.thumb) position += ' · thumb';

  return [bass, notes, position];
}
