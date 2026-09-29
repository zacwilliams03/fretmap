// The searchable chord list: 17 root spellings x every chord type. Slash chords are not
// listed; they reach the results only through the parser.
import { CHORD_TYPES } from './chords.js';
import { parseNote, noteName } from './notes.js';
import { parseChord, buildChord } from './parse.js';

export const ROOT_SPELLINGS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

export const CATALOG = ROOT_SPELLINGS.flatMap((r) =>
  CHORD_TYPES.map((type) => buildChord(parseNote(r), type, null)));

// Results for the search box. Exact parse first (covers slash chords), then catalog entries
// with the same root whose suffix starts with what was typed after the root, then those
// matched only through an alias (so "Cm" lists minor chords before C via "maj").
export function searchChords(input, currentRoot = 'C', limit = 50) {
  const text = input.trim();
  if (!text) {
    const root = parseNote(currentRoot) || parseNote('C');
    return CHORD_TYPES.map((type) => buildChord(root, type, null)).slice(0, limit);
  }

  const exact = parseChord(text);
  const m = /^([A-Ga-g][#b]?)\s*(.*)$/.exec(text);
  if (!m) return exact ? [exact] : [];
  const rootName = noteName(parseNote(m[1]));
  const rest = m[2];
  const suffixHits = [];
  const aliasHits = [];
  for (const chord of CATALOG) {
    if (noteName(chord.root) !== rootName) continue;
    if (exact && chord.symbol === exact.symbol) continue;
    if (chord.type.suffix.startsWith(rest)) suffixHits.push(chord);
    else if (chord.type.aliases.some((a) => a.startsWith(rest))) aliasHits.push(chord);
  }
  return (exact ? [exact] : []).concat(suffixHits, aliasHits).slice(0, limit);
}
