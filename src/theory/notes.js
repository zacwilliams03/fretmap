// Notes: spelled notes { letter, acc }, pitch classes, and MIDI <-> "D2" names.
// C4 = MIDI 60. The octave follows the letter, so B#3 is MIDI 60 and Cb4 is MIDI 59.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
// How open strings are named when the tuning matches no preset.
const STRING_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export function mod12(n) {
  return ((n % 12) + 12) % 12;
}

export function pitchClass(note) {
  return mod12(NATURAL_PC[note.letter] + note.acc);
}

export function noteName(note) {
  return note.letter + (note.acc > 0 ? '#'.repeat(note.acc) : 'b'.repeat(-note.acc));
}

// "C", "c#", "Bb" -> { letter, acc }. Single accidentals only; anything else is null.
export function parseNote(text) {
  const m = /^([A-Ga-g])([#b]?)$/.exec(text);
  if (!m) return null;
  return { letter: m[1].toUpperCase(), acc: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0 };
}

// The note `semis` above `root`, spelled on the letter `degree - 1` steps above the root's
// letter. May come out with a double accidental (G# + #5 = D##); that is correct spelling.
export function spellInterval(root, degree, semis) {
  const letter = LETTERS[(LETTERS.indexOf(root.letter) + degree - 1) % 7];
  let acc = mod12(pitchClass(root) + semis - NATURAL_PC[letter]);
  if (acc > 6) acc -= 12;
  return { letter, acc };
}

export function pcName(pc, flats) {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

export function midiToName(midi) {
  return STRING_NAMES[mod12(midi)] + (Math.floor(midi / 12) - 1);
}

// "E2", "Eb2", "F#3" -> MIDI number, or null.
export function nameToMidi(text) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(text);
  if (!m) return null;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + NATURAL_PC[m[1]] + acc;
}
