# Fretmap — chord map for any tuning (v1)

**Date:** 2026-09-29
**Status:** Approved in brainstorming, awaiting spec review

## Purpose

A desktop-first tool for guitarists who play in open and alternate tunings. The user chooses a
tuning, one string at a time or from presets, adds a capo if they want one, and picks any chord
from a long searchable list. The app works out the chord's notes and lights up every place they
fall on the fretboard, coloured by each note's role in the chord. A Numbers view relabels the
whole fretboard with scale degrees in a chosen key.

Phone use is a bonus, not a target. The app is a separate project from the Chord Ear Trainer.

### Scope of v1

In: six-string tunings, presets and saved favourites, a full capo, a ~44-type chord catalog plus
slash chords, the full-neck chord-tone map, Names/Numbers labels, and state kept in the URL.

Out (later): a **voicing finder** (the next project, which gets its own spec), partial capo,
left-handed flip, audio playback, recent-chord history, other string counts.

## Architecture

A new git repo at `fretmap/`. No dependencies and no framework. Plain ES modules
during development, combined into a single HTML file for use.

```
fretmap/
  index.html            loads src/main.js as a module (development)
  src/
    theory/
      notes.js          pitch classes, spelling, MIDI <-> "D2"
      chords.js         chord-type table
      parse.js          symbol -> chord object
      catalog.js        searchable chord list
      degrees.js        key-relative degree labels
    fretboard/
      map.js            tuning + capo + frets + chord -> cell grid
    tunings.js          presets, favourites, tuning-name lookup
    state.js            app state, URL hash read/write
    ui/
      toolbar.js        tuning menu, capo, label toggle, key menu, settings
      search.js         chord search combobox
      fretboard.js      SVG fretboard renderer, per-string tuners at the nut
      info.js           chord info line
    main.js             state -> render loop
  tests/run.mjs
  serve.mjs
  build.mjs
  README.md
```

**Boundary rule:** `theory/`, `fretboard/`, `tunings.js` (except its storage adapter) and
`state.js` (except `location` access) are pure and never touch the DOM. They are what the tests
cover. `ui/` only renders what they return and turns user events into state changes.

**Module style constraint (the build relies on it):** only named exports on declarations
(`export function f`, `export const X`), and only named imports with relative paths
(`import { a, b } from './x.js'`). No default exports, no `export { … }` lists, no re-exports,
no dynamic imports.

**Extension point for the voicing finder:** a future `src/voicings/` takes the cell grid from
`fretboard/map.js` plus the tuning's MIDI pitches. Nothing in v1 needs to change for it.

## Music theory model

### Notes

- A spelled note is `{ letter: 'A'..'G', acc: -2..+2 }`. Its pitch class comes from the letter's
  natural pitch class plus `acc`.
- Octaves follow scientific pitch notation: C4 = MIDI 60 and E2 = MIDI 40. The octave follows
  the letter, so B#3 is MIDI 60.
- Accidentals display as `#`, `b`, `##` and `bb`.

### Chord types (`chords.js`)

Each type has an `id`, a canonical suffix, aliases, a long name, and an ordered interval list.
Each interval carries `{ semis, degree, label, role }`, where `degree` is the scale-step number
(1–13) used for spelling.

**Roles and colours** (Okabe–Ito palette):

| Role | Labels | Colour |
|---|---|---|
| root | 1 (shown `R`) | `#D55E00` vermillion |
| third | b3, 3, 2 (sus2), 4 (sus4) | `#0072B2` blue |
| fifth | b5, 5, #5 | `#009E73` bluish green |
| seventh | 6, bb7, b7, 7 | `#CC79A7` reddish purple |
| extension | b9, 9, #9, 11, #11, b13, 13 | `#E69F00` amber (dark text on it) |
| bass | slash bass that is not a chord tone | grey dot with a ring |

The table (canonical suffix first, then aliases; formula):

| Group | Suffix / aliases | Formula |
|---|---|---|
| Triads | `` / `M`, `maj` | 1 3 5 |
| | `m` / `min`, `-` | 1 b3 5 |
| | `dim` / `°` | 1 b3 b5 |
| | `aug` / `+` | 1 3 #5 |
| | `sus2` | 1 2 5 |
| | `sus4` / `sus` | 1 4 5 |
| | `5` | 1 5 |
| 6ths | `6` | 1 3 5 6 |
| | `m6` / `min6`, `-6` | 1 b3 5 6 |
| | `6/9` / `69` | 1 3 5 6 9 |
| | `m6/9` / `m69` | 1 b3 5 6 9 |
| 7ths | `maj7` / `M7`, `Δ7`, `Δ`, `ma7` | 1 3 5 7 |
| | `7` / `dom7` | 1 3 5 b7 |
| | `m7` / `min7`, `-7` | 1 b3 5 b7 |
| | `m(maj7)` / `mMaj7`, `mM7`, `minmaj7`, `-Δ7` | 1 b3 5 7 |
| | `m7b5` / `ø`, `ø7`, `min7b5`, `-7b5` | 1 b3 b5 b7 |
| | `dim7` / `°7` | 1 b3 b5 bb7 |
| | `7sus4` / `7sus` | 1 4 5 b7 |
| | `maj7#5` / `+maj7`, `augmaj7` | 1 3 #5 7 |
| | `7#5` / `aug7`, `+7` | 1 3 #5 b7 |
| | `7b5` | 1 3 b5 b7 |
| Added | `add9` / `add2` | 1 3 5 9 |
| | `madd9` / `m(add9)`, `madd2` | 1 b3 5 9 |
| | `add11` / `add4` | 1 3 5 11 |
| | `add#11` | 1 3 5 #11 |
| Extended | `maj9` / `M9`, `Δ9` | 1 3 5 7 9 |
| | `9` | 1 3 5 b7 9 |
| | `m9` / `min9`, `-9` | 1 b3 5 b7 9 |
| | `9sus4` / `9sus` | 1 4 5 b7 9 |
| | `maj11` / `M11` | 1 3 5 7 9 11 |
| | `11` | 1 3 5 b7 9 11 |
| | `m11` / `min11`, `-11` | 1 b3 5 b7 9 11 |
| | `maj13` / `M13`, `Δ13` | 1 3 5 7 9 13 |
| | `13` | 1 3 5 b7 9 13 |
| | `m13` / `min13`, `-13` | 1 b3 5 b7 9 13 |
| | `maj7#11` / `M7#11`, `Δ#11` | 1 3 5 7 #11 |
| Altered | `7b9` | 1 3 5 b7 b9 |
| | `7#9` | 1 3 5 b7 #9 |
| | `7#11` | 1 3 5 b7 #11 |
| | `7b13` | 1 3 5 b7 b13 |
| | `7b9b13` | 1 3 5 b7 b9 b13 |
| | `7alt` / `alt` | 1 3 b7 b9 #9 #11 b13 |
| | `13b9` | 1 3 5 b7 b9 13 |
| | `13#11` | 1 3 5 b7 9 #11 13 |

That's 44 types. The table is data and can grow without code changes.

### Parsing (`parse.js`)

`parseChord(text) -> chord | null`.

- Leading and trailing whitespace is trimmed, and a space between root and suffix is allowed
  (`f sus2`).
- **Root:** a letter A–G (either case) plus an optional single `#` or `b`. Roots like `E#`,
  `Fb`, `B#` and `Cb` are accepted. Double-accidental roots are rejected.
- **Suffix:** exact match against canonical suffixes and aliases. **Case-sensitive**, because
  `M7` means maj7 and `m7` means minor 7. A leading lowercase root such as `c` is still a root.
- **Slash bass:** optional `/` followed by a note (same rules as the root).
- Anything else returns `null`. The parser never throws.

Chord object: `{ symbol, root, type, bass | null, tones: [{ note, semis, label, role }] }`,
where `symbol` is rebuilt in canonical form from the typed root and bass spellings.

**Spelling:** a tone's letter is the root letter moved up `(degree − 1) mod 7` steps. Its
accidental is whatever makes the pitch class match `root + semis`, and it may be a double
accidental (G#aug → G# B# D##). The slash bass keeps the spelling the user typed.

### Catalog (`catalog.js`)

The 17 root spellings (C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B) × 44 types = 748 entries.
Slash chords are not listed. They come only from the parser.

### Degrees (`degrees.js`)

`degreeLabel(pc, key) -> { label, inKey }`.
- Labels relative to the key root: `1 b2 2 b3 3 4 #4 5 b6 6 b7 7`.
- In a major key, 1 2 3 4 5 6 7 count as in the key. In a minor key, 1 2 b3 4 5 b6 b7 do.
- Key menu spellings: major C Db D Eb E F F# G Ab A Bb B; minor Cm C#m Dm Ebm Em Fm F#m Gm G#m
  Am Bbm Bm.

## Fretboard model (`fretboard/map.js`)

`mapFretboard({ tuning, capo, frets, chord }) -> cells[string][fret]`

- `tuning` is 6 MIDI numbers. Index 0 is string 6 (the thickest) and index 5 is string 1.
  Strings are **not** assumed to be in pitch order, so re-entrant tunings are allowed.
- Each cell is `{ midi, pc, playable, tone }`. `playable = fret >= capo`. `tone` is the matching
  chord tone `{ note, label, role, isBass }` or `null`.
- A slash bass that's already a chord tone sets `isBass` on that tone. A bass that isn't a chord
  tone becomes its own tone with role `bass`.
- `frets` is the highest fret shown. `state.js` keeps at least 3 frets above the capo: if
  `capo > frets − 3`, it raises `frets` to the smallest allowed setting (12/15/19/22/24) that
  fits. For example, capo 12 with 12 frets becomes 15.

## Tunings (`tunings.js`)

Presets (low to high):

| Name | Notes |
|---|---|
| Standard | E2 A2 D3 G3 B3 E4 |
| Drop D | D2 A2 D3 G3 B3 E4 |
| Double Drop D | D2 A2 D3 G3 B3 D4 |
| DADGAD | D2 A2 D3 G3 A3 D4 |
| Open D | D2 A2 D3 F#3 A3 D4 |
| Open Dm | D2 A2 D3 F3 A3 D4 |
| Open G | D2 G2 D3 G3 B3 D4 |
| Open C | C2 G2 C3 G3 C4 E4 |
| Open E | E2 B2 E3 G#3 B3 E4 |
| Open A | E2 A2 E3 A3 C#4 E4 |
| Eb Standard | Eb2 Ab2 Db3 Gb3 Bb3 Eb4 |
| D Standard | D2 G2 C3 F3 A3 D4 |

- **Name lookup:** an exact MIDI match against saved favourites first, then presets. No match
  shows **Custom**.
- **Favourites:** `{ name, tuning }[]` stored in `localStorage` under `fretmap.tunings.v1`.
  Every read and write is wrapped in try/catch. If storage is unavailable, favourites live in
  memory for the session. Corrupted data is ignored with a `console.warn`. Saving under an
  existing name replaces that favourite.
- **String range:** MIDI 23 (B0) to 72 (C6). The ▲▼ controls stop at the limits.
- **Open-string display spelling:** if the tuning matches a preset, use that preset's spellings
  from the table above. Otherwise use C C# D Eb E F F# G G# A Bb B plus the octave.

## State and URL (`state.js`)

State: `{ tuning, capo, frets, chord, labels: 'names'|'numbers', key: { root, mode }, keyPinned }`.

Defaults: Standard, capo 0, 15 frets, no chord, names, key C major, not pinned.

The URL hash is rewritten with `history.replaceState` on every change:
`#t=40.45.50.55.59.64&capo=2&f=15&c=<encoded symbol>&l=numbers&k=7.maj&kp=1`

Each part is checked separately on load. An invalid part falls back to its default without
affecting the others. `c` is re-parsed with `parseChord`.

**Key follows chord:** while not pinned, choosing a chord sets the key root to the chord root.
The mode becomes minor if the chord type has a b3 and no 3, otherwise major.

## UI

Layout A: a top toolbar and a full-width fretboard.

- **Toolbar:** tuning menu (My tunings, then presets; shows the tuning name or Custom) with ☆
  Save; capo menu 0–12; chord search; a Names | Numbers toggle; a key menu with 📌 (visible only
  in Numbers mode); ⚙ settings (frets shown: 12 / 15 / 19 / 22 / 24).
- **Fretboard (SVG):** string 1 at the top. Each string's tuner (▼ `D2` ▲) sits at the nut. The
  nut is drawn thick and the capo is drawn as a bar just behind its fret. Frets behind the capo
  are dimmed to about 25%. Inlays at 3 5 7 9 12(double) 15 17 19 21 24. Fret numbers run along
  the bottom.
- **Cells:**
  - A chord tone is a filled dot in its role colour, labelled with its interval (Names mode) or
    key degree (Numbers mode). A slash bass gets a ring.
  - Any other cell shows a faint label: the note name in Names mode, or the key degree in
    Numbers mode (out-of-key degrees fainter still).
  - With no chord selected, only the faint labels show.
- **Faint note-name spelling:** flats if the chord's key signature uses flats, otherwise sharps.
  The key signature is the root's major key, or its minor key when the chord is minor by the rule
  above. Flat major keys: F Bb Eb Ab Db Gb Cb. Flat minor keys: D G C F Bb Eb Ab. With no chord,
  sharps.
- **Chord search:** a combobox. The top result is `parseChord(input)` when valid. Next come
  catalog entries whose root matches case-insensitively and whose suffix or alias starts with
  the rest of the input, case-sensitively. At most 50 results are shown. ↑↓ move, Enter picks,
  Esc closes. Empty input lists all 44 types for the current chord's root (C if there's no
  chord). Invalid input shows
  *No chord matches "…"*, and the current chord stays.
- **Info line:** symbol and long name, the spelled notes, the formula, the slash bass, and,
  when capo > 0, **Shape from capo: X (plays as Y)**. X is the root moved down by the capo,
  spelled from C Db D Eb E F F# G Ab A Bb B, plus the type suffix and a transposed slash bass.
- **Theme:** light and dark via `prefers-color-scheme`, colours defined as CSS variables.
  Keyboard-focusable controls with a visible focus ring.
- **Narrow screens:** the toolbar wraps and the fretboard scrolls sideways. Nothing is adapted
  for mobile beyond that.

## Error handling

- The parser returns `null` and never throws. The search list shows the no-match message.
- An invalid URL part falls back to its default, part by part.
- Storage failure falls back to in-memory storage, and corrupted data is ignored with a warning.
- The tuner stops at the range limits.
- A capo within 3 frets of the last fret shown raises the fret count to fit.

## Testing

`node tests/run.mjs` uses the Node standard library only, imports `src/` directly, and exits
non-zero on any failure.

- **Parser:** every type parses by its canonical suffix and every alias. `CM7`, `CΔ7` and
  `Cmaj7` are the same chord. `Cm7` is different from `CM7`. Slash chords parse. `Cxyz`, `H7`,
  `C##` and an empty string return `null`.
- **Spelling:** Dbmaj7 → Db F Ab C. C#maj7 → C# E# G# B#. Bm7b5 → B D F A. G#aug → G# B# D##.
  Cdim7 → C Eb Gb Bbb. Plus a check across all 748 catalog entries that each tone's pitch class
  equals root + semis.
- **Fretboard map:** in Standard, string index 0 at fret 5 is MIDI 45 (A2). In DADGAD with capo
  2, frets 0–1 are unplayable and fret 2 is playable. Every lit cell's pitch class is in the
  chord, and every chord tone lights at least once in frets 0–12. C/E marks the E tone
  `isBass`. C/D adds a `bass` role tone.
- **Degrees:** in G major, C E G read 4 6 1. In A minor, C F G are in the key and C# is not.
- **Tunings:** DADGAD with G3 stepped down to F#3 is named Open D. An arbitrary tuning is named
  Custom. The range limits hold.
- **State:** state → hash → state gives back the same state. `#t=banana&capo=2` gives Standard
  with capo 2.
- **Key follows chord:** Am7 sets A minor, D7 sets D major, and pinned leaves the key alone.

**UI** is checked by hand in the browser pane against this list: search and pick, a slash chord,
▲▼ on a string (the name changes to Custom and back to a preset), capo dimming and the shape
line, Numbers mode with pin, saving and deleting a favourite, a refresh restoring state, and
dark mode.

## Build and run

- `node serve.mjs` serves the repo at http://localhost:8124 (the ear trainer uses 8123).
- `node build.mjs` reads `index.html`, follows the imports from `src/main.js`, orders the
  modules by dependency, and wraps each one in a function registered under its path. Named
  imports become destructuring from that registry, and `export` keywords are removed with the
  exported names returned. The result is inlined into one `<script>` in
  **`dist/fretmap.html`**, which works when double-clicked or hosted.
- `dist/` is in `.gitignore`.

## Order of work

1. `theory/` with tests
2. `fretboard/map.js`, `tunings.js` and `state.js` with tests
3. UI modules and `main.js`, checked in the browser pane
4. `serve.mjs`, `build.mjs` and the README
