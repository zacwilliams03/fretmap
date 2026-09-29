// Chord search combobox: type to filter, arrows to move, Enter to pick, Esc to close.
import { searchChords } from '../theory/catalog.js';
import { noteName } from '../theory/notes.js';

export function mountSearch(el, actions) {
  el.innerHTML = `
    <div class="search">
      <input id="chord-input" type="text" role="combobox" aria-expanded="false" aria-controls="chord-list"
        aria-autocomplete="list" aria-label="Chord" placeholder="Chord… e.g. Cmaj7, D/F#" autocomplete="off" spellcheck="false">
      <ul id="chord-list" role="listbox" hidden></ul>
    </div>`;
  const input = el.querySelector('input');
  const list = el.querySelector('ul');
  let results = [];
  let active = 0;
  let current = null;

  function refresh() {
    results = searchChords(input.value, current ? noteName(current.root) : 'C');
    active = 0;
    list.replaceChildren();
    if (!results.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = `No chord matches "${input.value.trim()}"`;
      list.append(li);
    }
    results.forEach((chord, i) => {
      const li = document.createElement('li');
      li.id = `chord-opt-${i}`;
      li.setAttribute('role', 'option');
      const sym = document.createElement('span');
      sym.textContent = chord.symbol;
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = chord.type.name + (chord.bass ? ` over ${noteName(chord.bass)}` : '');
      li.append(sym, name);
      // mousedown, not click, so the input's blur doesn't close the list first.
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        pick(chord);
      });
      list.append(li);
    });
    open(true);
    highlight();
  }

  function highlight() {
    [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    const li = list.children[active];
    if (li && li.id) {
      input.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView({ block: 'nearest' });
    }
  }

  function open(on) {
    list.hidden = !on;
    input.setAttribute('aria-expanded', String(on));
    if (!on) input.removeAttribute('aria-activedescendant');
  }

  function pick(chord) {
    open(false);
    input.value = chord.symbol;
    actions.setChord(chord);
  }

  input.addEventListener('focus', () => {
    input.select();
    refresh();
  });
  input.addEventListener('input', refresh);
  input.addEventListener('blur', () => {
    open(false);
    input.value = current ? current.symbol : '';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) return refresh();
      if (!results.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      highlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!list.hidden && results[active]) pick(results[active]);
    } else if (e.key === 'Escape') {
      open(false);
      input.value = current ? current.symbol : '';
    }
  });

  return {
    update(state) {
      current = state.chord;
      if (document.activeElement !== input) input.value = current ? current.symbol : '';
    },
  };
}
