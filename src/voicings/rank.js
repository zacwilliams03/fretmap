// Orders shapes: root in the bass first, then fewest missing tones, then easiest to play.

// Lower is easier. Favours few fingers, small stretches, open strings and full, low shapes.
export function easeScore(shape, capo) {
  const height = shape.lowFret === null ? 0 : Math.max(0, shape.lowFret - capo);
  return 2 * shape.fingers + shape.span + 3 * shape.middleMutes + 0.25 * height -
    shape.openStrings - 1.5 * shape.sounding + (shape.thumb ? 2 : 0);
}

export function rankVoicings(shapes, capo) {
  const scored = shapes.map((shape) => ({ shape, score: easeScore(shape, capo) }));
  scored.sort((a, b) =>
    (Number(b.shape.bassTone.role === 'root') - Number(a.shape.bassTone.role === 'root')) ||
    (a.shape.missing.length - b.shape.missing.length) ||
    (a.score - b.score) ||
    ((a.shape.lowFret ?? capo) - (b.shape.lowFret ?? capo)) ||
    (a.shape.key < b.shape.key ? -1 : a.shape.key > b.shape.key ? 1 : 0));
  return scored.map((s) => s.shape);
}
