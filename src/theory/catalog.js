// The searchable chord list: 17 root spellings x every chord type. Slash chords are not
// listed; they reach the results only through the parser.
import { CHORD_TYPES } from './chords.js';
import { parseNote, noteName } from './notes.js';
import { parseChord, buildChord } from './parse.js';

export const ROOT_SPELLINGS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

export const CATALOG = ROOT_SPELLINGS.flatMap((r) =>
  CHORD_TYPES.map((type) => buildChord(parseNote(r), type, null)));

// Results for the search box. Exact parse first (covers slash chords), then catalog entries
// with the same root whose suffix or an alias starts with what was typed after the root.
export function searchChords(input, currentRoot = 'C', limit = 50) {
  const text = input.trim();
  if (!text) {
    const root = parseNote(currentRoot) || parseNote('C');
    return CHORD_TYPES.map((type) => buildChord(root, type, null)).slice(0, limit);
  }

  const results = [];
  const exact = parseChord(text);
  if (exact) results.push(exact);

  const m = /^([A-Ga-g][#b]?)\s*(.*)$/.exec(text);
  if (!m) return results;
  const rootName = noteName(parseNote(m[1]));
  const rest = m[2];
  for (const chord of CATALOG) {
    if (results.length >= limit) break;
    if (noteName(chord.root) !== rootName) continue;
    if (exact && chord.symbol === exact.symbol) continue;
    const names = [chord.type.suffix, ...chord.type.aliases];
    if (names.some((n) => n.startsWith(rest))) results.push(chord);
  }
  return results;
}
