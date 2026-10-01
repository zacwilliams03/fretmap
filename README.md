# Fretmap

Pick a tuning, add a capo, choose a chord: every note of that chord lights up across the
whole neck, coloured by what it does in the chord. Built for open and alternate tunings.
Desktop first; works on a phone with sideways scrolling.

No dependencies. Plain ES modules in `src/`, combined into one HTML file for use.

## Use

```bash
node build.mjs
```

Then double-click `dist/fretmap.html`, or drag the `dist/` folder onto
[Netlify Drop](https://app.netlify.com/drop) to use it from a phone.

## Develop

```bash
node serve.mjs
```

Open http://localhost:8124. ES modules don't load from `file://`, so the dev copy needs the
server; the built file doesn't.

## Test

```bash
node tests/run.mjs
```

Node standard library only. Covers everything in `src/theory/`, `src/fretboard/`,
`src/tunings.js`, `src/state.js`, and the build's module bundling. The UI is checked by
hand.

## Playable shapes

Pick a chord and the **Shapes** gallery under the neck lists every fingerable shape in the
current tuning and capo, best first: root in the bass, then easiest to play (few fingers, small
stretch, low on the neck, open strings, nothing left out, a clear low end). Click a shape to ring it on the neck; click it
again or press Esc to clear it. Chord boxes count frets from the capo.

A shape may drop a plain 5th, the 9th/11th under a named 11th or 13th, and up to two
alterations of a 7alt. A thumb over the top is allowed on string 6. The rules live in
`src/voicings/`.

## Colours

Okabe–Ito palette, chosen to stay distinct with red/green colour blindness. Every dot also
carries its interval label, so colour is never the only cue.

| Role | Intervals | Colour |
|---|---|---|
| root | 1 | vermillion |
| third | b3, 3, sus2, sus4 | blue |
| fifth | b5, 5, #5 | green |
| seventh | 6, bb7, b7, 7 | purple |
| extension | 9s, 11s, 13s | amber |
| slash bass (not a chord tone) | — | grey, ringed |

## Module rules

`build.mjs` bundles by rewriting imports, so modules may only use named exports on
declarations (`export function f`, `export const X`) and named relative imports
(`import { a } from './x.js'`). The build fails loudly on anything else.

`theory/`, `fretboard/`, `tunings.js` and `state.js` are pure — no DOM — and are what the
tests cover. `ui/` renders; `main.js` is the only place that touches `location`, `history`
and `localStorage`.
