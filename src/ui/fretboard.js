// Fretboard: per-string tuners at the nut (HTML) beside an SVG neck. String 1 is on top.
import { mapFretboard } from '../fretboard/map.js';
import { stringNames, MIN_MIDI, MAX_MIDI } from '../tunings.js';
import { pcName } from '../theory/notes.js';
import { degreeLabel, prefersFlats } from '../theory/degrees.js';

const ROW = 40;        // px per string; the tuner rows use the same height
const OPEN_W = 44;     // width of the open-string column, left of the nut
const NUMBERS_H = 24;  // fret numbers under the neck
const DOT_R = 13;
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_INLAYS = [12, 24];
const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs, text) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function mountFretboard(el, actions) {
  let last = null;
  let lastHighlight = null;
  new ResizeObserver(() => last && render(last, lastHighlight)).observe(el);

  // `highlight` is an optional shape from the gallery. Without one, the neck draws exactly as v1.
  function render(state, highlight = null) {
    last = state;
    lastHighlight = highlight;
    // Tuners are rebuilt each render; remember which one had focus so keyboard users keep their place.
    const focusedTuner = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.tuner : undefined;
    const { tuning, capo, frets, chord, labels, key } = state;
    const cells = mapFretboard({ tuning, capo, frets, chord });
    const flats = prefersFlats(chord);
    const names = stringNames(tuning);

    // Tuners, string 1 (tuning index 5) at the top.
    const tuners = document.createElement('div');
    tuners.className = 'tuners';
    for (let i = 5; i >= 0; i--) {
      const row = document.createElement('div');
      row.className = 'tuner';
      const down = document.createElement('button');
      down.type = 'button';
      down.textContent = '▼';
      down.dataset.tuner = `${i}:down`;
      down.disabled = tuning[i] <= MIN_MIDI;
      down.setAttribute('aria-label', `Tune string ${6 - i} down`);
      down.addEventListener('click', () => actions.stepString(i, -1));
      const note = document.createElement('span');
      note.className = 'note';
      note.textContent = names[i];
      const up = document.createElement('button');
      up.type = 'button';
      up.textContent = '▲';
      up.dataset.tuner = `${i}:up`;
      up.disabled = tuning[i] >= MAX_MIDI;
      up.setAttribute('aria-label', `Tune string ${6 - i} up`);
      up.addEventListener('click', () => actions.stepString(i, 1));
      row.append(down, note, up);
      tuners.append(row);
    }

    // Fret width fills the space left after the tuners, within sensible limits.
    const available = el.clientWidth - 110 - OPEN_W;
    const fretW = Math.max(40, Math.min(80, Math.floor(available / frets)));
    const width = OPEN_W + frets * fretW + 2;
    const height = ROW * 6 + NUMBERS_H;
    const neckH = ROW * 6;
    const cx = (fret) => (fret === 0 ? OPEN_W / 2 : OPEN_W + (fret - 0.5) * fretW);
    const cy = (row) => ROW * (row + 0.5);

    const root = svg('svg', { width, height, viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Fretboard' });

    for (const f of INLAYS) if (f <= frets) root.append(svg('circle', { cx: cx(f), cy: neckH / 2, r: 7, fill: 'var(--inlay)' }));
    for (const f of DOUBLE_INLAYS) {
      if (f > frets) continue;
      root.append(svg('circle', { cx: cx(f), cy: ROW * 1.5, r: 7, fill: 'var(--inlay)' }));
      root.append(svg('circle', { cx: cx(f), cy: ROW * 4.5, r: 7, fill: 'var(--inlay)' }));
    }
    for (let f = 1; f <= frets; f++) {
      const x = OPEN_W + f * fretW;
      root.append(svg('line', { x1: x, x2: x, y1: ROW / 2, y2: neckH - ROW / 2, stroke: 'var(--fret)', 'stroke-width': 2 }));
    }
    root.append(svg('line', { x1: OPEN_W, x2: OPEN_W, y1: ROW / 2 - 4, y2: neckH - ROW / 2 + 4, stroke: 'var(--nut)', 'stroke-width': 6 }));
    for (let r = 0; r < 6; r++) {
      root.append(svg('line', { x1: 0, x2: width, y1: cy(r), y2: cy(r), stroke: 'var(--string)', 'stroke-width': 1 + r * 0.3 }));
    }
    if (capo > 0) {
      const x = OPEN_W + capo * fretW - 6;
      root.append(svg('rect', { x: x - 4, y: ROW / 2 - 8, width: 8, height: neckH - ROW + 16, rx: 3, fill: 'var(--capo)' }));
    }

    for (let r = 0; r < 6; r++) {
      const row = cells[5 - r]; // display row 0 is string 1
      const shapeFret = highlight ? highlight.frets[5 - r] : undefined;
      for (const cell of row) {
        if (highlight && shapeFret === null && cell.fret === 0) {
          // A string the shape mutes: ✕ in the open column instead of its usual label.
          root.append(svg('text', { x: cx(0), y: cy(r) + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--text)' }, '✕'));
          continue;
        }
        const inShape = highlight && shapeFret === cell.fret;
        const g = svg('g', { opacity: cell.playable && (!highlight || inShape) ? 1 : 0.25 });
        const x = cx(cell.fret);
        const y = cy(r);
        const degree = labels === 'numbers' ? degreeLabel(cell.pc, key) : null;
        if (cell.tone) {
          const t = cell.tone;
          if (t.isBass) g.append(svg('circle', { cx: x, cy: y, r: DOT_R + 3, fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }));
          if (inShape) g.append(svg('circle', { cx: x, cy: y, r: DOT_R + (t.isBass ? 7 : 4), fill: 'none', stroke: 'var(--text)', 'stroke-width': 2.5 }));
          g.append(svg('circle', { cx: x, cy: y, r: DOT_R, fill: `var(--${t.role})` }));
          const text = degree ? degree.label : t.label === '1' ? 'R' : t.label;
          const ink = t.role === 'extension' ? '#1c1917' : '#ffffff';
          g.append(svg('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: ink }, text));
        } else {
          const text = degree ? degree.label : pcName(cell.pc, flats);
          const faded = degree && !degree.inKey;
          g.append(svg('rect', { x: x - 11, y: y - 7, width: 22, height: 14, fill: 'var(--bg)' }));
          g.append(svg('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--faint)', opacity: faded ? 0.5 : 1 }, text));
        }
        root.append(g);
      }
    }

    for (let f = 1; f <= frets; f++) {
      const label = f === capo ? 'capo' : [...INLAYS, ...DOUBLE_INLAYS].includes(f) ? String(f) : '';
      if (label) root.append(svg('text', { x: cx(f), y: neckH + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }, label));
    }

    el.replaceChildren(tuners, root);
    if (focusedTuner) {
      // At a range limit the focused button is now disabled; fall back to its partner.
      const [string, dir] = focusedTuner.split(':');
      const again = tuners.querySelector(`[data-tuner="${focusedTuner}"]:not(:disabled)`) ||
        tuners.querySelector(`[data-tuner="${string}:${dir === 'up' ? 'down' : 'up'}"]`);
      if (again) again.focus();
    }
  }

  return { update: render };
}
