import { check, assertEqual } from './harness.mjs';
import { pitchClass, noteName, parseNote, spellInterval, midiToName, nameToMidi, pcName } from '../src/theory/notes.js';

check('parseNote reads letters with one optional accidental', () => {
  assertEqual(parseNote('C'), { letter: 'C', acc: 0 });
  assertEqual(parseNote('c#'), { letter: 'C', acc: 1 });
  assertEqual(parseNote('Bb'), { letter: 'B', acc: -1 });
  assertEqual(parseNote('H'), null);
  assertEqual(parseNote('C##'), null);
  assertEqual(parseNote(''), null);
});

check('pitchClass and noteName handle single and double accidentals', () => {
  assertEqual(pitchClass({ letter: 'C', acc: -1 }), 11);
  assertEqual(pitchClass({ letter: 'B', acc: 1 }), 0);
  assertEqual(noteName({ letter: 'D', acc: 2 }), 'D##');
  assertEqual(noteName({ letter: 'B', acc: -2 }), 'Bbb');
  assertEqual(noteName({ letter: 'F', acc: 0 }), 'F');
});

check('spellInterval picks the letter by degree', () => {
  const gSharp = { letter: 'G', acc: 1 };
  assertEqual(noteName(spellInterval(gSharp, 3, 4)), 'B#');
  assertEqual(noteName(spellInterval(gSharp, 5, 8)), 'D##');
  const c = { letter: 'C', acc: 0 };
  assertEqual(noteName(spellInterval(c, 7, 9)), 'Bbb');
  assertEqual(noteName(spellInterval(c, 9, 14)), 'D');
  assertEqual(noteName(spellInterval(c, 13, 20)), 'Ab');
});

check('MIDI names use scientific pitch (C4 = 60)', () => {
  assertEqual(midiToName(40), 'E2');
  assertEqual(midiToName(60), 'C4');
  assertEqual(midiToName(51), 'Eb3');
  assertEqual(nameToMidi('E2'), 40);
  assertEqual(nameToMidi('Eb2'), 39);
  assertEqual(nameToMidi('F#3'), 54);
  assertEqual(nameToMidi('B#3'), 60);
  assertEqual(nameToMidi('Cb4'), 59);
  assertEqual(nameToMidi('X9'), null);
});

check('pcName switches between sharps and flats', () => {
  assertEqual(pcName(10, false), 'A#');
  assertEqual(pcName(10, true), 'Bb');
  assertEqual(pcName(-2, true), 'Bb');
});
