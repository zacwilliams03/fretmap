import { check, assert, assertEqual } from './harness.mjs';
import { CHORD_TYPES } from '../src/theory/chords.js';
import { parseChord, capoShape } from '../src/theory/parse.js';
import { noteName } from '../src/theory/notes.js';

const notes = (symbol) => parseChord(symbol).tones.map((t) => noteName(t.note)).join(' ');

check('every type parses by its suffix and by every alias', () => {
  for (const t of CHORD_TYPES) {
    for (const s of [t.suffix, ...t.aliases]) {
      const chord = parseChord(`C${s}`);
      assert(chord, `C${s} did not parse`);
      assertEqual(chord.type.id, t.id, `C${s}`);
    }
  }
});

check('alternative symbols give the same chord; case matters after the root', () => {
  assertEqual(parseChord('CM7').symbol, 'Cmaj7');
  assertEqual(parseChord('CΔ7').symbol, 'Cmaj7');
  assertEqual(parseChord('Cm7').symbol, 'Cm7');
  assertEqual(parseChord('c#m7b5').symbol, 'C#m7b5');
  assertEqual(parseChord('  f sus2 ').symbol, 'Fsus2');
  assertEqual(parseChord('bbm').symbol, 'Bbm');
});

check('spelling follows the typed root', () => {
  assertEqual(notes('Dbmaj7'), 'Db F Ab C');
  assertEqual(notes('C#maj7'), 'C# E# G# B#');
  assertEqual(notes('Bm7b5'), 'B D F A');
  assertEqual(notes('G#aug'), 'G# B# D##');
  assertEqual(notes('Cdim7'), 'C Eb Gb Bbb');
  assertEqual(notes('E#'), 'E# G## B#');
});

check('slash chords: chord-tone bass is flagged, other bass is added', () => {
  const ce = parseChord('C/E');
  assertEqual(ce.symbol, 'C/E');
  assertEqual(ce.tones.length, 3);
  assertEqual(ce.tones.find((t) => t.isBass).label, '3');

  const cd = parseChord('C/D');
  assertEqual(cd.tones.length, 4);
  const bass = cd.tones[3];
  assertEqual([noteName(bass.note), bass.role, bass.label, bass.isBass], ['D', 'bass', '2', true]);

  assertEqual(parseChord('D/F#').symbol, 'D/F#');
  assertEqual(parseChord('C6/9').type.id, '6/9');
  assertEqual(parseChord('C6/9/E').symbol, 'C6/9/E');
  assertEqual(parseChord('C#m7b5/G').symbol, 'C#m7b5/G');
});

check('nonsense returns null instead of throwing', () => {
  for (const bad of ['Cxyz', 'H7', 'C##', '', '   ', 'C/', 'C/H', 'Cm7/xyz', null, undefined, 42]) {
    assertEqual(parseChord(bad), null, `input ${JSON.stringify(bad)}`);
  }
});

check('capoShape transposes down by the capo', () => {
  assertEqual(capoShape(parseChord('E'), 2), 'D');
  assertEqual(capoShape(parseChord('F#m7'), 2), 'Em7');
  assertEqual(capoShape(parseChord('D/F#'), 2), 'C/E');
  assertEqual(capoShape(parseChord('C'), 1), 'B');
});
