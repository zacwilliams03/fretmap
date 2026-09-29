// Inlines src/ into one self-contained HTML file: dist/fretmap.html. It works when
// double-clicked (ES modules don't load from file://) and on any static host.
//
//   node build.mjs
//
// Each module becomes a function registered under its path in `__m`. Named imports become
// destructuring from that registry; `export` keywords are dropped and the names returned.
// Only the module style the spec allows is supported: anything else is a build error.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*'(\.[^']+)';[ \t]*$/gm;
const EXPORT_RE = /^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
const SCRIPT_TAG = '<script type="module" src="src/main.js"></script>';

const idOf = (file) => relative(ROOT, file).split('\\').join('/');

// Returns JS that defines `__m` and fills it with `entry` and everything it imports.
export function bundle(entry) {
  const order = [];
  const seen = new Set();

  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const [, , spec] of src.matchAll(IMPORT_RE)) visit(resolve(dirname(file), spec));
    order.push(file);
  }
  visit(resolve(ROOT, entry));

  const parts = order.map((file) => {
    const src = readFileSync(file, 'utf8');
    const exports = [...src.matchAll(EXPORT_RE)].map((m) => m[1]);
    const body = src
      .replace(IMPORT_RE, (_, names, spec) =>
        `const {${names.replace(/\s+as\s+/g, ': ')}} = __m[${JSON.stringify(idOf(resolve(dirname(file), spec)))}];`)
      .replace(/^export\s+/gm, '');
    const leftover = body.match(/^\s*(import|export)\b.*$/m);
    if (leftover) throw new Error(`${idOf(file)}: unsupported module syntax: ${leftover[0].trim()}`);
    return `__m[${JSON.stringify(idOf(file))}] = (() => {\n${body}\nreturn { ${exports.join(', ')} };\n})();`;
  });
  return `const __m = {};\n${parts.join('\n')}\n`;
}

export function buildHtml() {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  if (!html.includes(SCRIPT_TAG)) throw new Error(`index.html must contain ${SCRIPT_TAG}`);
  const js = `(() => {\n${bundle('src/main.js')}})();`;
  return html.replace(SCRIPT_TAG, () => `<script>\n${js}\n</script>`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = join(ROOT, 'dist', 'fretmap.html');
  mkdirSync(dirname(out), { recursive: true });
  const html = buildHtml();
  writeFileSync(out, html);
  console.log(`wrote dist/fretmap.html (${html.length} bytes)`);
}
