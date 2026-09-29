// Wires state to the UI. The only module that touches location, history and storage.
import { hashToState, stateToHash, selectChord, fitFrets } from './state.js';
import { createFavouriteStore, stepString } from './tunings.js';
import { mountToolbar } from './ui/toolbar.js';
import { mountSearch } from './ui/search.js';
import { mountFretboard } from './ui/fretboard.js';
import { mountInfo } from './ui/info.js';

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const favourites = createFavouriteStore(getStorage());
let state = hashToState(location.hash);

function commit(next) {
  state = next;
  history.replaceState(null, '', stateToHash(state));
  render();
}

const actions = {
  setTuning: (tuning) => commit({ ...state, tuning }),
  stepString: (index, delta) => commit({ ...state, tuning: stepString(state.tuning, index, delta) }),
  setCapo: (capo) => commit({ ...state, capo, frets: fitFrets(capo, state.frets) }),
  setFrets: (frets) => commit({ ...state, frets: fitFrets(state.capo, frets) }),
  setChord: (chord) => commit(selectChord(state, chord)),
  setLabels: (labels) => commit({ ...state, labels }),
  setKey: (key) => commit({ ...state, key }),
  togglePin: () => commit({ ...state, keyPinned: !state.keyPinned }),
  saveFavourite(name) {
    favourites.save(name, state.tuning);
    render();
  },
  deleteFavourite(name) {
    favourites.remove(name);
    render();
  },
};

const toolbar = mountToolbar(document.getElementById('toolbar'), actions);
const search = mountSearch(toolbar.searchSlot, actions);
const board = mountFretboard(document.getElementById('board'), actions);
const info = mountInfo(document.getElementById('info'));

function render() {
  toolbar.update(state, favourites.list());
  search.update(state);
  board.update(state);
  info.update(state);
}

// Hand-edited URLs and back/forward. replaceState never fires this, so it only sees outside changes.
window.addEventListener('hashchange', () => commit(hashToState(location.hash)));

history.replaceState(null, '', stateToHash(state));
render();
