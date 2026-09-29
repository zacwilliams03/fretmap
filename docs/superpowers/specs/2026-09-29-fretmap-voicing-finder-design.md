# Fretmap — playable shapes (voicing finder)

**Date:** 2026-09-29
**Status:** Approved in brainstorming, awaiting spec review
**Builds on:** `2026-09-29-fretmap-chord-map-design.md` (v1)

## Purpose

For the current chord, tuning and capo, list every playable shape as a gallery of chord
diagrams, ranked so the most useful ones come first. Clicking a diagram shows that shape on the
main neck.

**Add-only constraint:** nothing that exists today changes. With no chord chosen, or with no
shape selected, the page looks and behaves exactly as v1 does. All 42 existing tests run
unchanged.

## Architecture

New files:

```
src/voicings/
  find.js       pure: { tuning, capo, frets, chord } -> every valid shape
  rank.js       pure: sorts shapes
  describe.js   pure: short labels for a shape
src/ui/shapes.js      gallery of chord boxes, click/keyboard selection
tests/voicings.test.mjs
```

The voicing modules read `mapFretboard` from `src/fretboard/map.js` and the existing theory
modules. They never modify them. The same module rule as v1 applies: only named
`export function` / `export const` declarations, and single-line relative named imports.

Edits to existing files, each small and all of them inert when no shape is selected:

| File | Change |
|---|---|
| `index.html` | adds `<section class="shapes" id="shapes"></section>` after `#info`, plus gallery CSS |
| `src/main.js` | mounts the gallery; holds the selected shape (UI-only, not in the URL); passes it to the fretboard |
| `src/ui/fretboard.js` | `update(state, highlight)` takes an optional second argument. When it's `undefined` or `null`, the output is identical to v1 |
| `tests/run.mjs` | one new import line |

Untouched: `src/theory/*`, `src/fretboard/map.js`, `src/tunings.js`, `src/state.js`,
`build.mjs`, `serve.mjs`, and all existing tests.

## Shape model

A shape is:

```
{
  frets: [f6, f5, f4, f3, f2, f1],  // index 0 = string 6, as in `tuning`; null = muted;
                                     // a number = absolute fret; the capo fret means "open"
  tones: [tone | null] x 6,          // the chord tone each sounding string plays
  bassTone,                          // tone of the lowest-sounding note, by MIDI pitch
  missing: [label],                  // droppable chord tones this shape leaves out
  fingers,                           // fingers used, counting a barre as one and the thumb as one
  thumb: boolean,                    // string 6 fretted with the thumb
  barre: fret | null,
  lowFret, highFret,                 // fretted range; null when nothing is fretted
  span,                              // highFret - lowFret, 0 when nothing is fretted
  key,                               // "x,3,2,0,1,0": identity for dedupe and selection
  bassPc, sounding, openStrings, middleMutes   // inputs to ranking
}
```

## Finding shapes (`find.js`)

`findVoicings({ tuning, capo, frets, chord }) -> shape[]` (unsorted). It returns `[]` when
`chord` is null or `capo > frets`.

**Search space**
- Only frets `capo..frets` are used. Fret `capo` is treated as open.
- **Windows:** for each `w` from `capo + 1` to `max(capo + 1, frets − 3)`, the window is frets
  `w..min(w + 3, frets)`.
- In a window, each string's options are: muted; open (fret `capo`) if that pitch class is a
  chord tone; or any fret in the window whose pitch class is a chord tone. "Chord tone" includes
  a slash-bass tone.
- Every combination is tried. Results from all windows are merged and deduplicated by `frets`.

**A combination is a shape only if all of these hold:**
1. **At least 3 strings sound.**
2. **Required tones are all present.** A tone is required unless it's droppable. Droppable tones:
   - the plain `5`, when the chord has a real 3rd (`3` or `b3`), so power and sus chords keep
     their 5th;
   - in chords whose type includes an `11` label: the `9`;
   - in chords whose type includes a `13` label: the `9` and the `11`;
   - in a `7alt`: any two of its four alterations (`b9 #9 #11 b13`). Its 7 notes can't fit
     on 6 strings, and "alt" means "some alterations", so at least two must be present.

   All other tones are required: the root, the third-role tone, the seventh-role tone, every
   altered tone (`b5 #5 b9 #9 #11 b13`, except in a `7alt` as above) and the named top extension. A slash-bass tone is
   required.
3. **Slash chords:** the lowest-sounding note, by MIDI pitch, has the bass pitch class.
4. **Fingering fits the hand.** Let the fretted notes be the strings with fret greater than
   `capo`.
   - **One finger per note** when there are at most 4 fretted notes, with no barre.
   - **Barre**, only when more fingers are needed: if the lowest fretted fret occurs on 2 or more
     strings, and every string between the outermost of those is fretted (none open or muted,
     because a barre would sound them), those notes count as one finger (`barre = that fret`).
   - **Thumb:** if the finger count is 5, the shape is still allowed when string 6 is fretted at
     a fret no higher than every other fretted note. It then gets `thumb = true` and is counted
     as 4 + thumb. String 6 is the thickest string (`tuning` index 0), whatever its pitch.
   - Anything needing more fingers is rejected.

**Removing fragments:** drop shape B if another shape A is B **plus open strings only**, with
the same bass pitch class and the same `missing` count, and no harder to play (no more fingers,
no more muted middle strings, and no thumb unless B has one too). So `x3201x` goes next to
`x32010`, but the small F `xx3211` stays next to the full barre `133211`, and the D shape
`xx0232` next to `x50232`.

## Ranking (`rank.js`)

`rankVoicings(shapes, capo) -> shape[]` returns a new sorted array, using `easeScore(shape, capo)`. Sort keys, in order:

1. **Root in bass first.** `bassTone.role === 'root'`. For slash chords every shape has the
   slash bass, so this key ties.
2. **Fewest missing tones.**
3. **Ease score, ascending:**

   ```
   score = 2*fingers + span + 3*middleMutes + 0.25*max(0, lowFret - capo)
           - openStrings - 1.5*sounding + (thumb ? 2 : 0)
   ```

   - `span = highFret - lowFret`, or 0 with no fretted notes.
   - `middleMutes` is the number of muted strings that have a sounding string on both sides.
   - `openStrings` counts strings at fret `capo`.
4. **Ties:** lower `lowFret` first, then compare `frets` as strings.

## Labels (`describe.js`)

`describeVoicing(shape, chord, capo) -> [bass, notes, position]`:
- **bass:** `root in bass`, `3rd in bass`, `5th in bass`, `7th in bass`, or `bass <note>` for
  anything else. Slash chords always use `bass <note>`.
- **notes:** `all notes`, or `no 5th` / `no 9th` / `no 9th, 11th` / `no b9` (from `missing`;
  altered tones keep their own label).
- **position:** `open` when nothing is fretted. Otherwise `frets a–b` (`fret a` when a = b), or `barre n` when there's
  a barre. Append ` · thumb` when `thumb`. Frets are **relative to the capo**, so a D shape at
  capo 2 reads `frets 2–3`, the same as it would with no capo, matching the chord box.

## UI

**Gallery (`src/ui/shapes.js`)**, in `#shapes` under the info line:
- Hidden (`hidden` attribute) when there's no chord, so the page matches v1.
- Heading **Shapes (N)**. Shows the first 24, with a **Show all (N)** button after them.
  Changing the chord collapses back to 24.
- **Chord box:** an SVG with 6 vertical strings (string 6 on the left) and 4 fret rows.
  - The top line is drawn thick when the window starts at the capo or nut, and `nfr` is labelled
    otherwise. `n` is relative to the capo.
  - A hollow circle marks open strings and `✕` marks muted ones.
  - Dots use the role colours. Their label is the interval in Names mode or the key degree in
    Numbers mode.
  - A barre is drawn as a rounded bar. A thumb note gets a small `T`.
- The 3 description lines go under each box.
- **Empty:** *"No playable shapes within frets {capo}–{frets}. Try more frets (⚙) or a simpler
  chord."*
- The shape list is recomputed only when the chord, tuning, capo or frets change. The boxes are
  redrawn only when that list, the labels or the key change. Selecting a shape just updates
  `aria-pressed` on the existing boxes.

**Selection:**
- Each box is a `<button>` with `aria-pressed`. Clicking it, or Enter/Space, selects it, and the
  same action on the selected box clears it. **Esc** clears it, except while focus is in the chord
  search or a form field (they use Esc themselves). After **Show all**, focus moves to the
  first newly shown box.
- Changing the chord, tuning, capo or fret count clears the selection. Changing labels or key
  keeps it.

**Neck highlight (`fretboard.js`, only when a highlight is passed):**
- Cells belonging to the shape keep their dot and gain a ring (2.5px, `var(--text)`), drawn like
  the slash-bass ring but outside it if both apply.
- All other chord-tone dots and faint labels drop to 25% opacity.
- A muted string shows `✕` in the open-string column instead of whatever was there.

## Error handling

- `findVoicings` never throws. A null chord gives `[]`.
- An empty result shows the message above rather than an empty section.
- Storage and URL are not involved: the selection is transient.

## Testing

`tests/voicings.test.mjs` (Node standard library, harness from v1):

- **Known shapes, standard tuning, no capo, 15 frets:**
  - C includes `x32010` and `x35553`.
  - G includes `320003`.
  - Am includes `x02210`.
- **Ranking:**
  - For C, the first shape is `x32010`.
  - For C/E, every shape's lowest note is E.
  - Root-in-bass shapes all come before the others.
  - Complete shapes come before incomplete ones within the same bass group.
- **Required tones:**
  - No Cmaj7 shape lacks B.
  - C13 shapes may lack D and F but always have A (the 13) and Bb.
  - C5 shapes always have G.
  - Cdim shapes always have Gb.
- **Hand rules:**
  - Nothing sounds fewer than 3 strings.
  - Nothing needs more than 4 fingers, except thumb shapes, which have string 6 at the lowest
    fretted fret.
  - No barre has an open or muted string between its ends.
- **Fragments:** `x3201x` is not in C's list when `x32010` is.
- **Re-entrant tuning** (for example `[43, 48, 52, 57, 62, 55]`): for a slash chord, the bass is
  judged by pitch.
- **Capo:** with capo 2, no shape uses frets 0–1. E major includes the D shape
  `[null, null, 2, 4, 5, 4]`, and `describe` gives its position relative to the capo as
  `frets 2–3`, the same as an uncapoed D.
- **DADGAD, D major:** some shape with 5 or more open strings is in the top 5.
- **Describe:** the labels for `x32010` in C are `root in bass`, `all notes`, `frets 1–3`.
- **Existing tests:** all 42 still pass, unchanged.

**Browser checklist (by hand):**
1. With no chord, the page is identical to v1, and `#shapes` is hidden.
2. With a chord and nothing selected, the neck is identical to v1 (compare the SVG markup).
3. Clicking a box highlights the shape on the neck, with ✕ on muted strings. Clicking again,
   or pressing Esc, clears it.
4. With the capo on 2, boxes are drawn relative to the capo, and the neck highlight lands on the
   right absolute frets.
5. Numbers mode shows key degrees in the boxes.
6. **Show all (N)** reveals the rest. A new chord collapses it.
7. The empty-result message appears (for example, a hard chord with 12 frets).
8. Keyboard: Tab reaches the boxes, and Enter/Space and Esc work.
9. The single-file build works (`dist/fretmap.html`).

## Out of scope

Fingering numbers, sound playback, saving favourite shapes, putting the selection in the URL,
partial capo, and 7-string support.
