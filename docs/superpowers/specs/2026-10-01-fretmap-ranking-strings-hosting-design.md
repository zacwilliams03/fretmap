# Fretmap — ranking fix, string-count filter, public hosting

**Date:** 2026-10-01
**Status:** Approved in brainstorming, awaiting spec review
**Builds on:** `2026-09-29-fretmap-chord-map-design.md` (v1) and
`2026-09-29-fretmap-voicing-finder-design.md` (playable shapes, branch `shapes`)

## Purpose

Three pieces of work, done in this order:

1. **Finish `shapes`:** fix the ranking so textbook shapes come near the top, fix the small
   review issues, then merge `shapes` into `main`.
2. **String-count filter:** let the user show only shapes that sound exactly 3, 4, 5 or 6
   strings. Off by default.
3. **Public link:** deploy `dist/fretmap.html` to GitHub Pages so it can be shared.

**Add-only rule (for 2 and 3):** with the filter on **Any**, the URL, gallery and neck are
identical to `main` after step 1. All existing tests run unchanged. Step 1 changes behaviour
that only exists on the unmerged `shapes` branch, so it is a fix, not a change to `main`.

## 1. Ranking fix and small fixes (branch `shapes`)

### Problem

Textbook shapes ranked too low in standard tuning: C7 `x32310` was #54, Bm `x24432` #16,
Dsus4 `xx0233` #13, Bb `x13331` #6. There were three causes:

- "Fewest missing tones" was a hard sort key ahead of ease, so any shape that dropped the 5th
  came after every complete shape.
- Height cost only 0.25 per fret, so shapes with open strings under a hand at fret 7 or higher
  (`878080` for C7, `79070x` for Bm) beat low grips.
- Shapes that open with a muddy low interval (Bm `x20402`: B2 under D3) beat clean ones.

### New ranking (`rank.js`)

Sort keys, in order:

1. **Root in bass first** (unchanged).
2. **Ease score, ascending:**

   ```
   score = 2*fingers + span + 3*middleMutes + 1*max(0, lowFret - capo)
           - openStrings - 1.5*sounding + (thumb ? 2 : 0)
           + 2*missing.length + (muddyBass ? 4 : 0)
   ```

3. **Ties:** lower `lowFret` first, then compare `key` as strings (unchanged).

`muddyBass` is a new shape field computed in `find.js`. Take the two lowest sounding MIDI
pitches `lo ≤ hi`. It is true when `hi − lo` is 1, 2 or 3 semitones and `lo` is below that
interval's low limit: 52 (E3) for 1, 51 (Eb3) for 2, 48 (C3) for 3. Larger intervals and
unisons are never muddy. Major 3rds are deliberately not penalised, because open G
(`320003`, G2–B2) is idiomatic.

Results this was tuned on (standard tuning, no capo, 15 frets):

| Chord | Shape | Rank before | Rank after |
|---|---|---|---|
| C7 | x32310 | 54 | 2 |
| Bm | x24432 | 16 | 2 |
| Dsus4 | xx0233 | 13 | 3 |
| Bb | x13331 | 6 | 3 |

These stay at #1: C, F, Am, D, E, Dm, A7, G7, F#m, Cmaj7, D7, E7, Em, B7, Gm, Asus2, Am7,
Dmaj7. G `320003` and C/G `332010` are #2. Esus4 `022200` (#6) and Cm `x35543` (#9) are
unchanged, behind other valid open-string grips.

### Small fixes

- **Chord-box dot labels:** 8px → 10px.
- **Selected vs focused boxes:** a selected box (`aria-pressed="true"`) gets a tinted background
  and a 2px border in `var(--text)`. Keyboard focus keeps the standard outline ring with an
  offset. The two must look different when both apply.
- **`findVoicings` never throws:** if the chord has a slash bass and no cell carries it, return
  `[]`.
- **Spec sync:** in `2026-09-29-fretmap-voicing-finder-design.md`:
  - Set the status to *Implemented*.
  - Replace the ranking section with the one above.
  - Update the DADGAD and "complete before incomplete" test descriptions.
  - Change "All 42 existing tests" to say that the v1 tests run unchanged.

### Tests (`tests/voicings.test.mjs`)

- **New regression tests**, standard tuning, no capo, 15 frets:
  - C7 `x32310`, Bm `x24432`, Dsus4 `xx0233` and Bb `x13331` are each in their chord's top 3.
  - C `x32010` is still #1.
  - G `320003` is in the top 2.
- **`muddyBass`:**
  - Bm `x20402` is muddy, and `x24432` is not.
  - G `320003` is not muddy (major 3rd).
- **`easeScore`:** for the same shape, each missing tone adds exactly 2.
- **Replaced** (these encoded the old ranking):
  - "Complete shapes come before incomplete ones within the same bass group" is replaced by the
    `easeScore` test above.
  - "DADGAD D: some shape with 5 or more open strings is in the top 5" becomes "DADGAD D: the
    top shape has 4 or more open strings".
- **Slash bass off the neck:** a chord whose slash bass matches no cell gives `[]`, not a
  throw. Build it from a real parsed chord, then make the bass tone unreachable, for example
  with a stub grid.

Then run the browser checklist from the shapes spec and merge `shapes` into `main`
(fast-forward or merge commit, no squash).

## 2. String-count filter (branch `strings`, from `main`)

### State (`state.js`)

- New field `strings`: `null` (Any) or one of `3, 4, 5, 6`. The default is `null`.
- `stateToHash` writes `n=<count>` only when `strings` is not null, so default URLs are
  unchanged.
- `hashToState` accepts `n` only if it matches `/^[3-6]$/`. Anything else gives `null`.

### Engine (`find.js`)

`findVoicings({ tuning, capo, frets, chord, strings })`:

- `strings` is `undefined`/`null`: exactly the current behaviour.
- `strings` is a number: keep only shapes with `sounding === strings`, **before** fragment
  removal. A fragment always sounds fewer strings than the shape it belongs to, so within one
  size nothing is removed. This is why "4" for C includes `x3201x`, which Any hides next to
  `x32010`.

Ranking is unchanged.

### UI (`src/ui/shapes.js`, `main.js`, `index.html` CSS)

- The gallery header holds the heading and a segmented control: **Strings: Any · 3 · 4 · 5 · 6**.
  It's a group of `<button type="button" aria-pressed>` elements in a `role="group"` with
  `aria-label="Strings"`, following the Names/Numbers toggle's pattern. The control is only
  shown when the gallery is (when there's a chord).
- The heading count is the filtered count: `Shapes (N)`.
- New action `setStrings(n)` in `main.js` commits `{ ...state, strings: n }`. `strings` is added
  to `shapeContext`, so changing it clears the selected shape. The gallery's recompute key
  includes `strings`, so changing it collapses back to 24.
- **Empty with a filter:** *"No {n}-string shapes for {symbol} within frets {capo}–{frets}. Try
  Any."* The unfiltered empty message is unchanged.
- Keyboard focus stays on the clicked filter button after the gallery redraws.

### Tests

- **`find`:**
  - With `strings: 4`, C includes `x3201x` and every shape sounds 4 strings.
  - With `strings: 3`, every C7 shape sounds 3 strings and contains R, 3 and b7.
  - With `strings` omitted or null, the output deep-equals the current call.
- **`state`:**
  - `n` round-trips for 3–6.
  - The default state's hash has no `n`.
  - `n=7`, `n=x` and `n=` give `null`.
  - The existing round-trip test is unchanged.

**Browser checklist:**
1. With Any, everything matches `main` before this branch, and the URL has no `n`.
2. Picking 3 shows only 3-string boxes and adds `&n=3`. Reloading keeps it.
3. A selected shape clears when the filter changes.
4. The filtered empty message appears (for example C13 with 3).
5. The keyboard reaches the filter buttons, and Enter/Space toggle them.

## 3. Public hosting (GitHub Pages)

### Repo changes (branch `pages`, from `main`)

`.github/workflows/pages.yml`:
- Triggers: `push` to `main`, and `workflow_dispatch`.
- Permissions: `contents: read`, `pages: write`, `id-token: write`.
- Concurrency group `pages`, so in-progress deploys are not cancelled.
- Build job:
  1. checkout
  2. `actions/setup-node` (Node 24, the current LTS; action majors checked at implementation time)
  3. `node tests/run.mjs`
  4. `node build.mjs`
  5. `mkdir _site && cp dist/fretmap.html _site/index.html`
  6. `actions/configure-pages`
  7. `actions/upload-pages-artifact` (path `_site`)
- Deploy job: `actions/deploy-pages`, in environment `github-pages`.

Failing tests block a deploy. `build.mjs` and the app are unchanged.

README: add a **Live** line with the Pages URL once known, and a short **Deploying** section
(push to `main` and the workflow publishes; how to rerun it by hand). Keep the Netlify Drop
line as an alternative.

### Going public (needs the user; Claude asks before each outward step)

1. The user signs in or signs up at github.com and creates an empty **public** repo `fretmap`
   (no README or licence, so the push is clean).
2. The user gives their username and their noreply address (Settings → Emails →
   "Keep my email addresses private" shows `<id>+<user>@users.noreply.github.com`).
3. **Author email:** nothing has been pushed yet, so rewrite every commit's author and
   committer email from `<personal email>` to the noreply address on all local branches.
   Use `git filter-branch --env-filter` or `git filter-repo` if installed. Set
   `git config user.email` to the noreply address in this repo only. Then check with
   `git log --all --format='%ae %ce' | sort -u`.
4. **Ask the user, then:** `git remote add origin https://github.com/<user>/fretmap.git` and
   `git push -u origin main`. Git Credential Manager opens a browser sign-in the first time.
   Other branches are not pushed unless the user wants them.
5. The user sets Settings → Pages → Source to **GitHub Actions**, then reruns the workflow
   from the Actions tab (the first push ran before Pages was enabled).
6. The site is at `https://<user>.github.io/fretmap/`. Check it loads on desktop and phone,
   then add it to the README.

## Out of scope

Custom domain, analytics, a manifest/PWA, ranking changes beyond the factors above, filtering
by anything other than sounding-string count, and selecting several counts at once.
