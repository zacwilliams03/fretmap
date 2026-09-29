// Runs every test file. Node standard library only; exits non-zero on any failure.
//
//   node tests/run.mjs
import { report } from './harness.mjs';
import './notes.test.mjs';
import './chords.test.mjs';
import './parse.test.mjs';
import './catalog.test.mjs';
import './degrees.test.mjs';
import './map.test.mjs';
import './tunings.test.mjs';
import './state.test.mjs';
import './build.test.mjs';
import './voicings.test.mjs';

report();
