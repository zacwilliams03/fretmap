// Playable-shapes gallery: one chord box per shape, best first. Clicking a box asks main.js to
// highlight it on the neck; clicking it again (or Esc) clears the highlight.
import { findVoicings } from '../voicings/find.js';
import { rankVoicings } from '../voicings/rank.js';
import { describeVoicing } from '../voicings/describe.js';
import { degreeLabel } from '../theory/degrees.js';
import { pitchClass } from '../theory/notes.js';

const FIRST = 24;                    // boxes shown before "Show all"
const ROWS = 4;                      // fret rows per box
const BOX = { left: 14, top: 22, gap: 13, row: 20 };
const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs, text) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

// A vertical chord diagram: string 6 on the left, frets counted from the capo.
function chordBox(shape, state) {
  const { capo, labels, key } = state;
  const rel = (f) => f - capo;
  const low = shape.lowFret === null ? 1 : rel(shape.lowFret);
  const high = shape.highFret === null ? 1 : rel(shape.highFret);
  const start = high <= ROWS ? 1 : low;
  const width = BOX.left * 2 + BOX.gap * 5 + 14;
  const height = BOX.top + BOX.row * ROWS + 6;
  const x = (s) => BOX.left + s * BOX.gap;
  const y = (f) => BOX.top + (f - start + 0.5) * BOX.row;

  const root = svg('svg', { width, height, viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' });
  for (let s = 0; s < 6; s++) {
    root.append(svg('line', { x1: x(s), x2: x(s), y1: BOX.top, y2: BOX.top + ROWS * BOX.row, stroke: 'currentColor', 'stroke-opacity': 0.5 }));
  }
  for (let r = 0; r <= ROWS; r++) {
    const nut = r === 0 && start === 1;
    root.append(svg('line', {
      x1: x(0), x2: x(5), y1: BOX.top + r * BOX.row, y2: BOX.top + r * BOX.row,
      stroke: 'currentColor', 'stroke-opacity': nut ? 1 : 0.5, 'stroke-width': nut ? 3 : 1,
    }));
  }
  if (start > 1) root.append(svg('text', { x: x(5) + 7, y: BOX.top + BOX.row * 0.7, 'font-size': 10, fill: 'currentColor' }, `${start}fr`));

  if (shape.barre !== null) {
    const on = shape.frets.map((f, s) => (f === shape.barre ? s : -1)).filter((s) => s >= 0 && !(shape.thumb && s === 0));
    root.append(svg('rect', {
      x: x(on[0]) - 7, y: y(rel(shape.barre)) - 7, width: x(on[on.length - 1]) - x(on[0]) + 14, height: 14,
      rx: 7, fill: 'currentColor', 'fill-opacity': 0.25,
    }));
  }

  shape.frets.forEach((f, s) => {
    if (f === null) {
      root.append(svg('text', { x: x(s), y: BOX.top - 7, 'text-anchor': 'middle', 'font-size': 11, fill: 'currentColor' }, '✕'));
      return;
    }
    if (f === capo) {
      root.append(svg('circle', { cx: x(s), cy: BOX.top - 10, r: 4, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 }));
      return;
    }
    const t = shape.tones[s];
    const cy = y(rel(f));
    root.append(svg('circle', { cx: x(s), cy, r: 7, fill: `var(--${t.role})` }));
    const text = labels === 'numbers' ? degreeLabel(pitchClass(t.note), key).label : t.label === '1' ? 'R' : t.label;
    const attrs = {
      x: x(s), y: cy + 3.5, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700,
      fill: t.role === 'extension' ? '#1c1917' : '#ffffff',
    };
    // Three-character labels (b13, #11, bb7) are squeezed to stay inside the 14px dot.
    if (text.length >= 3) Object.assign(attrs, { textLength: 12, lengthAdjust: 'spacingAndGlyphs' });
    root.append(svg('text', attrs, text));
    if (shape.thumb && s === 0) root.append(svg('text', { x: x(s) - 11, y: cy + 3, 'text-anchor': 'middle', 'font-size': 9, fill: 'currentColor' }, 'T'));
  });
  return root;
}

export function mountShapes(el, actions) {
  let context = '';       // what the shape list was computed for
  let shapes = [];
  let expanded = false;
  let drawn = '';         // what the boxes on screen were drawn for
  let grid = null;
  let last = null;        // latest { state, selected }, for the Show all button

  // Esc clears a selected shape, except inside the chord search or a form field, which use Esc
  // for their own thing.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || (e.target.closest && e.target.closest('.search, form, input, select, textarea'))) return;
    actions.clearShape();
  });

  // Rebuilds the boxes. Only needed when the list, the labels or the key change; a selection
  // change just flips aria-pressed (see markSelected), which stays fast with ~1000 boxes.
  function draw(state) {
    const heading = document.createElement('h2');
    heading.textContent = `Shapes (${shapes.length})`;
    if (!shapes.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = `No playable shapes within frets ${state.capo}–${state.frets}. Try more frets (⚙) or a simpler chord.`;
      grid = null;
      el.replaceChildren(heading, empty);
      return;
    }

    grid = document.createElement('div');
    grid.className = 'shape-grid';
    const shown = expanded ? shapes : shapes.slice(0, FIRST);
    shown.forEach((shape, i) => {
      const lines = describeVoicing(shape, state.chord, state.capo);
      const box = document.createElement('button');
      box.type = 'button';
      box.className = 'shape-box';
      box.dataset.key = shape.key;
      box.setAttribute('aria-label', `${state.chord.symbol} shape ${i + 1}: ${lines.join(', ')}`);
      box.append(chordBox(shape, state));
      for (const line of lines) {
        const span = document.createElement('span');
        span.textContent = line;
        box.append(span);
      }
      box.addEventListener('click', () => actions.selectShape(shape));
      grid.append(box);
    });

    const parts = [heading, grid];
    if (!expanded && shapes.length > FIRST) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'more';
      more.textContent = `Show all (${shapes.length})`;
      more.addEventListener('click', () => {
        expanded = true;
        update(last.state, last.selected);
        // The button is gone; carry keyboard focus to the first newly shown shape.
        if (grid && grid.children[FIRST]) grid.children[FIRST].focus();
      });
      parts.push(more);
    }

    // Keep keyboard focus on the same shape across a rebuild (e.g. switching Names/Numbers).
    const focused = document.activeElement && el.contains(document.activeElement) ? document.activeElement.dataset.key : undefined;
    el.replaceChildren(...parts);
    if (focused) {
      const again = grid.querySelector(`[data-key="${focused}"]`);
      if (again) again.focus();
    }
  }

  function markSelected(selected) {
    if (!grid) return;
    for (const box of grid.children) {
      box.setAttribute('aria-pressed', String(!!selected && selected.key === box.dataset.key));
    }
  }

  function update(state, selected) {
    last = { state, selected };
    if (!state.chord) {
      el.hidden = true;
      el.replaceChildren();
      context = '';
      drawn = '';
      grid = null;
      return;
    }
    el.hidden = false;

    const next = [state.chord.symbol, state.tuning.join('.'), state.capo, state.frets].join('|');
    if (next !== context) {
      context = next;
      shapes = rankVoicings(findVoicings(state), state.capo);
      expanded = false;
    }
    const look = [context, state.labels, state.key.root, state.key.mode, expanded].join('|');
    if (look !== drawn) {
      drawn = look;
      draw(state);
    }
    markSelected(selected);
  }

  return { update };
}
