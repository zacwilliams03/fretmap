// Tuning + capo + fret count + chord -> a grid of cells, one row per string.
// Row 0 is string 6 (tuning[0]). Pure: the renderer and the future voicing finder read this.
import { mod12, pitchClass } from '../theory/notes.js';

export function mapFretboard({ tuning, capo, frets, chord }) {
  return tuning.map((open) => {
    const row = [];
    for (let fret = 0; fret <= frets; fret++) {
      const midi = open + fret;
      const pc = mod12(midi);
      const tone = chord ? chord.tones.find((t) => pitchClass(t.note) === pc) || null : null;
      row.push({ fret, midi, pc, playable: fret >= capo, tone });
    }
    return row;
  });
}
