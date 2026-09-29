import { check, assert, assertEqual } from './harness.mjs';
import { bundle } from '../build.mjs';

check('build: bundled pure modules still work', () => {
  const js = bundle('src/theory/catalog.js');
  assert(!/^\s*(import|export)\b/m.test(js), 'import/export left in bundle');
  const m = new Function(`${js}\nreturn __m;`)();
  const { searchChords } = m['src/theory/catalog.js'];
  assertEqual(searchChords('D/F#')[0].symbol, 'D/F#');
  assert(m['src/theory/notes.js'].noteName, 'dependency not registered');
});

check('build: state module bundles with its whole dependency tree', () => {
  const m = new Function(`${bundle('src/state.js')}\nreturn __m;`)();
  const { hashToState } = m['src/state.js'];
  assertEqual(hashToState('#c=Em').chord.symbol, 'Em');
});
