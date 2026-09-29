// Chord-type table. Each formula token maps to [semitones, scale degree, role]; the degree
// picks the letter when spelling, the role picks the colour.

const INTERVALS = {
  '1': [0, 1, 'root'],
  '2': [2, 2, 'third'],
  'b3': [3, 3, 'third'],
  '3': [4, 3, 'third'],
  '4': [5, 4, 'third'],
  'b5': [6, 5, 'fifth'],
  '5': [7, 5, 'fifth'],
  '#5': [8, 5, 'fifth'],
  '6': [9, 6, 'seventh'],
  'bb7': [9, 7, 'seventh'],
  'b7': [10, 7, 'seventh'],
  '7': [11, 7, 'seventh'],
  'b9': [13, 9, 'extension'],
  '9': [14, 9, 'extension'],
  '#9': [15, 9, 'extension'],
  '11': [17, 11, 'extension'],
  '#11': [18, 11, 'extension'],
  'b13': [20, 13, 'extension'],
  '13': [21, 13, 'extension'],
};

// [suffix, aliases, long name, formula]
const TABLE = [
  ['', ['M', 'maj'], 'major', '1 3 5'],
  ['m', ['min', '-'], 'minor', '1 b3 5'],
  ['dim', ['°'], 'diminished', '1 b3 b5'],
  ['aug', ['+'], 'augmented', '1 3 #5'],
  ['sus2', [], 'suspended 2nd', '1 2 5'],
  ['sus4', ['sus'], 'suspended 4th', '1 4 5'],
  ['5', [], 'power chord', '1 5'],
  ['6', [], 'sixth', '1 3 5 6'],
  ['m6', ['min6', '-6'], 'minor sixth', '1 b3 5 6'],
  ['6/9', ['69'], 'six-nine', '1 3 5 6 9'],
  ['m6/9', ['m69'], 'minor six-nine', '1 b3 5 6 9'],
  ['maj7', ['M7', 'Δ7', 'Δ', 'ma7'], 'major seventh', '1 3 5 7'],
  ['7', ['dom7'], 'dominant seventh', '1 3 5 b7'],
  ['m7', ['min7', '-7'], 'minor seventh', '1 b3 5 b7'],
  ['m(maj7)', ['mMaj7', 'mM7', 'minmaj7', '-Δ7'], 'minor major seventh', '1 b3 5 7'],
  ['m7b5', ['ø', 'ø7', 'min7b5', '-7b5'], 'half-diminished seventh', '1 b3 b5 b7'],
  ['dim7', ['°7'], 'diminished seventh', '1 b3 b5 bb7'],
  ['7sus4', ['7sus'], 'seventh suspended 4th', '1 4 5 b7'],
  ['maj7#5', ['+maj7', 'augmaj7'], 'augmented major seventh', '1 3 #5 7'],
  ['7#5', ['aug7', '+7'], 'augmented seventh', '1 3 #5 b7'],
  ['7b5', [], 'seventh flat five', '1 3 b5 b7'],
  ['add9', ['add2'], 'added ninth', '1 3 5 9'],
  ['madd9', ['m(add9)', 'madd2'], 'minor added ninth', '1 b3 5 9'],
  ['add11', ['add4'], 'added eleventh', '1 3 5 11'],
  ['add#11', [], 'added sharp eleventh', '1 3 5 #11'],
  ['maj9', ['M9', 'Δ9'], 'major ninth', '1 3 5 7 9'],
  ['9', [], 'dominant ninth', '1 3 5 b7 9'],
  ['m9', ['min9', '-9'], 'minor ninth', '1 b3 5 b7 9'],
  ['9sus4', ['9sus'], 'ninth suspended 4th', '1 4 5 b7 9'],
  ['maj11', ['M11'], 'major eleventh', '1 3 5 7 9 11'],
  ['11', [], 'dominant eleventh', '1 3 5 b7 9 11'],
  ['m11', ['min11', '-11'], 'minor eleventh', '1 b3 5 b7 9 11'],
  ['maj13', ['M13', 'Δ13'], 'major thirteenth', '1 3 5 7 9 13'],
  ['13', [], 'dominant thirteenth', '1 3 5 b7 9 13'],
  ['m13', ['min13', '-13'], 'minor thirteenth', '1 b3 5 b7 9 13'],
  ['maj7#11', ['M7#11', 'Δ#11'], 'major seventh sharp eleven', '1 3 5 7 #11'],
  ['7b9', [], 'seventh flat nine', '1 3 5 b7 b9'],
  ['7#9', [], 'seventh sharp nine', '1 3 5 b7 #9'],
  ['7#11', [], 'seventh sharp eleven', '1 3 5 b7 #11'],
  ['7b13', [], 'seventh flat thirteen', '1 3 5 b7 b13'],
  ['7b9b13', [], 'seventh flat nine flat thirteen', '1 3 5 b7 b9 b13'],
  ['7alt', ['alt'], 'altered dominant', '1 3 b7 b9 #9 #11 b13'],
  ['13b9', [], 'thirteenth flat nine', '1 3 5 b7 b9 13'],
  ['13#11', [], 'thirteenth sharp eleven', '1 3 5 b7 9 #11 13'],
];

export const CHORD_TYPES = TABLE.map(([suffix, aliases, name, formula]) => ({
  id: suffix || 'maj',
  suffix,
  aliases,
  name,
  intervals: formula.split(' ').map((label) => {
    const [semis, degree, role] = INTERVALS[label];
    return { semis, degree, label, role };
  }),
}));

const BY_SUFFIX = new Map();
for (const type of CHORD_TYPES) {
  for (const s of [type.suffix, ...type.aliases]) BY_SUFFIX.set(s, type);
}

// Exact, case-sensitive: "M7" is maj7, "m7" is minor 7.
export function findType(suffix) {
  return BY_SUFFIX.get(suffix) || null;
}
