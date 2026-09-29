// Info line under the neck: chord name, notes, formula, bass, and the capo shape.
import { noteName } from '../theory/notes.js';
import { capoShape } from '../theory/parse.js';

export function mountInfo(el) {
  function item(label, value, cls) {
    const span = document.createElement('span');
    if (cls) span.className = cls;
    if (label) span.append(`${label}: `);
    const b = document.createElement('b');
    b.textContent = value;
    span.append(b);
    return span;
  }

  return {
    update(state) {
      const { chord, capo } = state;
      if (!chord) {
        el.replaceChildren('Pick a chord to light up its notes.');
        return;
      }
      const tones = chord.tones.filter((t) => t.role !== 'bass');
      const title = item('', chord.symbol, 'title');
      title.append(` ${chord.type.name}`);
      const parts = [
        title,
        item('Notes', tones.map((t) => noteName(t.note)).join(' ')),
        item('Formula', tones.map((t) => t.label).join(' ')),
      ];
      if (chord.bass) parts.push(item('Bass', noteName(chord.bass)));
      if (capo > 0) {
        const shape = item('Shape from capo', capoShape(chord, capo));
        shape.append(` (plays as ${chord.symbol})`);
        parts.push(shape);
      }
      el.replaceChildren(...parts);
    },
  };
}
