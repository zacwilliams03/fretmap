// Orders shapes: root in the bass first, then easiest to play. Missing tones and a muddy low end
// count against ease rather than being a sort key, so a 7th chord without its 5th can still rank
// with the complete shapes.

// Lower is easier. Favours few fingers, small stretches, low positions, open strings and full,
// complete shapes with a clear bass.
export function easeScore(shape, capo) {
  const height = shape.lowFret === null ? 0 : Math.max(0, shape.lowFret - capo);
  return 2 * shape.fingers + shape.span + 3 * shape.middleMutes + height -
    shape.openStrings - 1.5 * shape.sounding + (shape.thumb ? 2 : 0) +
    2 * shape.missing.length + (shape.muddyBass ? 4 : 0);
}

export function rankVoicings(shapes, capo) {
  const scored = shapes.map((shape) => ({ shape, score: easeScore(shape, capo) }));
  scored.sort((a, b) =>
    (Number(b.shape.bassTone.role === 'root') - Number(a.shape.bassTone.role === 'root')) ||
    (a.score - b.score) ||
    ((a.shape.lowFret ?? capo) - (b.shape.lowFret ?? capo)) ||
    (a.shape.key < b.shape.key ? -1 : a.shape.key > b.shape.key ? 1 : 0));
  return scored.map((s) => s.shape);
}
