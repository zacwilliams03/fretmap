// Minimal test harness: Node standard library only. Test files call check();
// tests/run.mjs imports every test file, then calls report().

const failures = [];
let passed = 0;

export function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
  }
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

export function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg || 'not equal'}: expected ${e}, got ${a}`);
}

export function report() {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.log(`${passed} passed, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
}
