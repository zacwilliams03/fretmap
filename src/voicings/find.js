// Every playable shape for a chord. Slide a 4-fret window up the neck, let each string be
// muted, open or on a chord tone inside the window, and keep what a hand can actually play.
// Pure: reads the v1 fretboard grid, never changes it.
import { mapFretboard } from '../fretboard/map.js';

export const WINDOW = 4;       // frets one hand covers
export const MAX_FINGERS = 4;  // plus the thumb on string 6, see fingering()
export const MIN_SOUNDING = 3;
const ALTERATIONS = ['b9', '#9', '#11', 'b13'];

// Low interval limits (MIDI): a semitone, whole tone or minor 3rd between the two lowest notes
// sounds muddy below E3, Eb3 and C3. Major 3rds are left alone, since open G (G2–B2) is idiomatic.
const LOW_LIMIT = { 1: 52, 2: 51, 3: 48 };

// True when the two lowest pitches form a close interval below its low limit.
export function isMuddy(pitches) {
  const [lo, hi] = pitches.slice().sort((a, b) => a - b);
  const limit = LOW_LIMIT[hi - lo];
  return limit !== undefined && lo < limit;
}

// Labels a shape may leave out: a plain 5th when there's a real 3rd (not in power or sus chords),
// and the 9th/11th under a named 11th or 13th. A 7alt needs only two of its four alterations (see evaluate). Everything
// else defines the chord and is required.
export function droppableLabels(chord) {
  const labels = chord.tones.filter((t) => t.role !== 'bass').map((t) => t.label);
  const drop = new Set();
  if (labels.includes('3') || labels.includes('b3')) drop.add('5');
  if (labels.includes('11') || labels.includes('13')) drop.add('9');
  if (labels.includes('13')) drop.add('11');
  if (chord.type.id === '7alt') for (const l of ALTERATIONS) drop.add(l);
  return drop;
}

// Fingers needed for the fretted notes on `strings`. One finger per note when that's few
// enough; otherwise the notes on the lowest fret may share one barre, but only if every string
// between its ends is fretted, since a barre would sound an open or muted string it crosses.
function hand(strings, frets, capo) {
  if (strings.length <= MAX_FINGERS) return { fingers: strings.length, barre: null };
  const low = Math.min(...strings.map((s) => frets[s]));
  const atLow = strings.filter((s) => frets[s] === low);
  if (atLow.length >= 2) {
    let clear = true;
    for (let s = atLow[0]; s <= atLow[atLow.length - 1]; s++) if (frets[s] === null || frets[s] <= capo) clear = false;
    if (clear) return { fingers: strings.length - atLow.length + 1, barre: low };
  }
  return { fingers: strings.length, barre: null };
}

// null when no hand can play it. The thumb may take string 6 (tuning index 0) when it is fretted
// at or behind every other fretted note and the other four fingers manage the rest.
export function fingering(frets, capo) {
  const fretted = [];
  frets.forEach((f, s) => { if (f !== null && f > capo) fretted.push(s); });
  const all = hand(fretted, frets, capo);
  if (all.fingers <= MAX_FINGERS) return { ...all, thumb: false };
  const rest = fretted.filter((s) => s !== 0);
  if (rest.length === fretted.length || rest.some((s) => frets[s] < frets[0])) return null;
  const others = hand(rest, frets, capo);
  if (others.fingers > MAX_FINGERS) return null;
  return { fingers: others.fingers + 1, barre: others.barre, thumb: true };
}

function evaluate(frets, cells, chord, drop, bassPc, capo) {
  const sounding = [];
  frets.forEach((f, s) => { if (f !== null) sounding.push(s); });
  if (sounding.length < MIN_SOUNDING) return null;

  // Lowest note by actual pitch, so re-entrant tunings are judged correctly.
  let lowest = sounding[0];
  for (const s of sounding) if (cells[s][frets[s]].midi < cells[lowest][frets[lowest]].midi) lowest = s;
  if (bassPc !== null && cells[lowest][frets[lowest]].pc !== bassPc) return null;

  const tones = frets.map((f, s) => (f === null ? null : cells[s][f].tone));
  const present = new Set(tones.filter(Boolean));
  const missing = [];
  for (const t of chord.tones) {
    if (present.has(t)) continue;
    if (t.isBass || !drop.has(t.label)) return null;
    missing.push(t.label);
  }
  if (chord.type.id === '7alt' && missing.filter((l) => ALTERATIONS.includes(l)).length > 2) return null;

  const grip = fingering(frets, capo);
  if (!grip) return null;

  const fretted = frets.filter((f) => f !== null && f > capo);
  const first = sounding[0];
  const last = sounding[sounding.length - 1];
  let middleMutes = 0;
  for (let s = first + 1; s < last; s++) if (frets[s] === null) middleMutes++;

  return {
    key: frets.map((f) => (f === null ? 'x' : f)).join(','),
    frets: frets.slice(),
    tones,
    bassTone: tones[lowest],
    bassPc: cells[lowest][frets[lowest]].pc,
    missing,
    fingers: grip.fingers,
    barre: grip.barre,
    thumb: grip.thumb,
    lowFret: fretted.length ? Math.min(...fretted) : null,
    highFret: fretted.length ? Math.max(...fretted) : null,
    span: fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0,
    sounding: sounding.length,
    openStrings: frets.filter((f) => f === capo).length,
    middleMutes,
    muddyBass: isMuddy(sounding.map((s) => cells[s][frets[s]].midi)),
  };
}

// B is a fragment of A when A is B plus open strings only, with the same bass and the same
// number of missing tones, and no harder to play. So x3201x goes next to x32010, but the small
// F xx3211 stays next to the full barre 133211, and the D shape xx0232 next to x50232.
function isFragmentOf(b, a, capo) {
  if (a.sounding <= b.sounding || a.bassPc !== b.bassPc || a.missing.length !== b.missing.length) return false;
  if (a.fingers > b.fingers || a.middleMutes > b.middleMutes || (a.thumb && !b.thumb)) return false;
  return b.frets.every((f, s) => (f === null ? a.frets[s] === null || a.frets[s] === capo : a.frets[s] === f));
}

// Unsorted; see rank.js. Returns [] for no chord.
export function findVoicings({ tuning, capo, frets, chord }) {
  if (!chord || capo > frets) return [];
  const cells = mapFretboard({ tuning, capo, frets, chord });
  const drop = droppableLabels(chord);
  const bassPc = chord.bass ? cells.flat().find((c) => c.tone && c.tone.isBass).pc : null;
  const found = new Map();

  const lastStart = Math.max(capo + 1, frets - WINDOW + 1);
  for (let start = capo + 1; start <= lastStart; start++) {
    const end = Math.min(start + WINDOW - 1, frets);
    const options = cells.map((row) => {
      const opts = [null];
      if (row[capo].tone) opts.push(capo);
      for (let f = start; f <= end; f++) if (row[f].tone) opts.push(f);
      return opts;
    });
    const combo = new Array(6);
    const walk = (s) => {
      if (s === 6) {
        const key = combo.join(',');
        if (!found.has(key)) found.set(key, evaluate(combo, cells, chord, drop, bassPc, capo));
        return;
      }
      for (const f of options[s]) {
        combo[s] = f;
        walk(s + 1);
      }
    };
    walk(0);
  }

  const shapes = [...found.values()].filter(Boolean);
  return shapes.filter((b) => !shapes.some((a) => a !== b && isFragmentOf(b, a, capo)));
}
