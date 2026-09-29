// Tuning presets, saved favourites, and naming a tuning. A tuning is 6 MIDI numbers,
// string 6 first.
import { nameToMidi, midiToName } from './theory/notes.js';

export const MIN_MIDI = 23; // B0
export const MAX_MIDI = 72; // C6

export const PRESETS = [
  ['Standard', 'E2 A2 D3 G3 B3 E4'],
  ['Drop D', 'D2 A2 D3 G3 B3 E4'],
  ['Double Drop D', 'D2 A2 D3 G3 B3 D4'],
  ['DADGAD', 'D2 A2 D3 G3 A3 D4'],
  ['Open D', 'D2 A2 D3 F#3 A3 D4'],
  ['Open Dm', 'D2 A2 D3 F3 A3 D4'],
  ['Open G', 'D2 G2 D3 G3 B3 D4'],
  ['Open C', 'C2 G2 C3 G3 C4 E4'],
  ['Open E', 'E2 B2 E3 G#3 B3 E4'],
  ['Open A', 'E2 A2 E3 A3 C#4 E4'],
  ['Eb Standard', 'Eb2 Ab2 Db3 Gb3 Bb3 Eb4'],
  ['D Standard', 'D2 G2 C3 F3 A3 D4'],
].map(([name, notes]) => ({ name, notes: notes.split(' '), tuning: notes.split(' ').map(nameToMidi) }));

export const STANDARD = PRESETS[0].tuning;

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function isValidTuning(t) {
  return Array.isArray(t) && t.length === 6 &&
    t.every((m) => Number.isInteger(m) && m >= MIN_MIDI && m <= MAX_MIDI);
}

export function stepString(tuning, index, delta) {
  const next = tuning.slice();
  next[index] = Math.min(MAX_MIDI, Math.max(MIN_MIDI, next[index] + delta));
  return next;
}

export function tuningName(tuning, favourites = []) {
  const fav = favourites.find((f) => same(f.tuning, tuning));
  if (fav) return fav.name;
  const preset = PRESETS.find((p) => same(p.tuning, tuning));
  return preset ? preset.name : 'Custom';
}

// Open-string labels: a preset's own spellings when it matches one, otherwise generic.
export function stringNames(tuning) {
  const preset = PRESETS.find((p) => same(p.tuning, tuning));
  return preset ? preset.notes.slice() : tuning.map(midiToName);
}

const STORE_KEY = 'fretmap.tunings.v1';

// `storage` is localStorage or anything with getItem/setItem; null keeps favourites in
// memory only. Storage errors and corrupted data never break the app.
export function createFavouriteStore(storage) {
  let items = load();

  function load() {
    if (!storage) return [];
    try {
      const raw = storage.getItem(STORE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error('not an array');
      return data.filter((f) => f && typeof f.name === 'string' && f.name && isValidTuning(f.tuning));
    } catch (err) {
      console.warn('fretmap: ignoring saved tunings:', err.message);
      return [];
    }
  }

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn('fretmap: could not save tunings:', err.message);
    }
  }

  return {
    list: () => items.map((f) => ({ name: f.name, tuning: f.tuning.slice() })),
    save(name, tuning) {
      items = items.filter((f) => f.name !== name).concat([{ name, tuning: tuning.slice() }]);
      persist();
    },
    remove(name) {
      items = items.filter((f) => f.name !== name);
      persist();
    },
  };
}
