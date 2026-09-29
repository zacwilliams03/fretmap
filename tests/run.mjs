// Runs every test file. Node standard library only; exits non-zero on any failure.
//
//   node tests/run.mjs
import { report } from './harness.mjs';
import './notes.test.mjs';
import './chords.test.mjs';
import './parse.test.mjs';

report();
