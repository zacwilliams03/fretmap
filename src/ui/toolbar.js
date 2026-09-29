// Toolbar: tuning menu with save/delete, capo, search slot, Names/Numbers, key + pin, frets.
import { PRESETS, tuningName } from '../tunings.js';
import { KEY_NAMES } from '../theory/degrees.js';
import { FRET_OPTIONS, MAX_CAPO } from '../state.js';

export function mountToolbar(el, actions) {
  const capoOptions = Array.from({ length: MAX_CAPO + 1 }, (_, i) =>
    `<option value="${i}">${i === 0 ? 'None' : i}</option>`).join('');
  const keyOptions = ['major', 'minor'].map((mode) =>
    KEY_NAMES[mode].map((name, root) => `<option value="${root}.${mode}">${name}</option>`).join('')).join('');
  const fretOptions = FRET_OPTIONS.map((f) => `<option value="${f}">${f}</option>`).join('');

  el.innerHTML = `
    <label class="field">Tuning <select id="tuning-select"></select></label>
    <button type="button" class="icon" id="save-tuning" title="Save this tuning" aria-label="Save this tuning">☆</button>
    <form class="save-form" id="save-form" hidden><input id="save-name" type="text" placeholder="Name this tuning" aria-label="Tuning name" maxlength="40"><button type="submit">Save</button></form>
    <button type="button" class="icon" id="delete-tuning" title="Delete this saved tuning" aria-label="Delete this saved tuning" hidden>✕</button>
    <label class="field">Capo <select id="capo-select">${capoOptions}</select></label>
    <div class="search-slot" id="search-slot"></div>
    <div class="seg" role="group" aria-label="Labels">
      <button type="button" data-labels="names">Names</button><button type="button" data-labels="numbers">Numbers</button>
    </div>
    <span class="key-controls" id="key-controls">
      <label class="field">Key <select id="key-select">${keyOptions}</select></label>
      <button type="button" class="icon" id="pin-key" title="Lock the key while changing chords" aria-label="Lock key">📌</button>
    </span>
    <details class="settings"><summary aria-label="Settings">⚙</summary>
      <div class="panel"><label class="field">Frets shown <select id="frets-select">${fretOptions}</select></label></div>
    </details>`;

  const $ = (id) => el.querySelector(`#${id}`);
  const tuningSelect = $('tuning-select');
  let favourites = [];
  let currentName = 'Custom';

  tuningSelect.addEventListener('change', () => {
    const [kind, name] = tuningSelect.value.split(':');
    const source = kind === 'fav' ? favourites : PRESETS;
    const found = source.find((t) => t.name === name);
    if (found) actions.setTuning(found.tuning.slice());
  });
  const saveForm = $('save-form');
  const saveName = $('save-name');
  $('save-tuning').addEventListener('click', () => {
    saveForm.hidden = !saveForm.hidden;
    if (!saveForm.hidden) {
      saveName.value = currentName === 'Custom' ? '' : currentName;
      saveName.focus();
      saveName.select();
    }
  });
  saveForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = saveName.value.trim();
    if (!name) return;
    saveForm.hidden = true;
    actions.saveFavourite(name);
  });
  saveName.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') saveForm.hidden = true;
  });

  // Two-step delete: the first click arms the button, a second click within 3s deletes.
  const deleteButton = $('delete-tuning');
  let armed = null;
  function disarm() {
    clearTimeout(armed);
    armed = null;
    deleteButton.textContent = '✕';
  }
  deleteButton.addEventListener('click', () => {
    if (armed) {
      disarm();
      actions.deleteFavourite(currentName);
      return;
    }
    deleteButton.textContent = `Delete "${currentName}"?`;
    armed = setTimeout(disarm, 3000);
  });
  $('capo-select').addEventListener('change', (e) => actions.setCapo(Number(e.target.value)));
  el.querySelectorAll('[data-labels]').forEach((b) =>
    b.addEventListener('click', () => actions.setLabels(b.dataset.labels)));
  $('key-select').addEventListener('change', (e) => {
    const [root, mode] = e.target.value.split('.');
    actions.setKey({ root: Number(root), mode });
  });
  $('pin-key').addEventListener('click', () => actions.togglePin());
  $('frets-select').addEventListener('change', (e) => actions.setFrets(Number(e.target.value)));

  return {
    searchSlot: $('search-slot'),
    update(state, favs) {
      favourites = favs;
      currentName = tuningName(state.tuning, favs);
      const isFav = favs.some((f) => f.name === currentName);
      const option = (value, label) => {
        const o = document.createElement('option');
        o.value = value;
        o.textContent = label;
        return o;
      };
      tuningSelect.replaceChildren();
      if (favs.length) {
        const group = document.createElement('optgroup');
        group.label = 'My tunings';
        favs.forEach((f) => group.append(option(`fav:${f.name}`, f.name)));
        tuningSelect.append(group);
      }
      const presets = document.createElement('optgroup');
      presets.label = 'Presets';
      PRESETS.forEach((p) => presets.append(option(`preset:${p.name}`, p.name)));
      tuningSelect.append(presets);
      if (currentName === 'Custom') tuningSelect.append(option('custom', 'Custom'));
      tuningSelect.value = isFav ? `fav:${currentName}` : currentName === 'Custom' ? 'custom' : `preset:${currentName}`;

      $('delete-tuning').hidden = !isFav;
      $('capo-select').value = String(state.capo);
      el.querySelectorAll('[data-labels]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.labels === state.labels)));
      $('key-controls').hidden = state.labels !== 'numbers';
      $('key-select').value = `${state.key.root}.${state.key.mode}`;
      $('pin-key').setAttribute('aria-pressed', String(state.keyPinned));
      $('frets-select').value = String(state.frets);
    },
  };
}
