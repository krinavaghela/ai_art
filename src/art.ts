// All artwork as data. Cat parts are in cat-local space (base centre at 0,0, up is -y);
// sparrow parts in bird-local space (body centre at 0,0, facing +x); props in world space.
import {P, ellipse, blob, tube, mirror, spline, lerp, rand} from './geom';

export const C = {
  fur: '#b6a385',
  furLight: '#ddd1ba',
  furShade: '#8a775f',
  mark: '#4d3f33',
  markSoft: '#6e5b47',
  cream: '#f7f0e4',
  pink: '#e7ad9b',
  nose: '#c98a7c',
  noseDark: '#8a584c',
  eye1: '#d2d77c',
  eye2: '#8fa847',
  eyeRim: '#4f5c2a',
  pupil: '#2a231e',
  liner: '#3b3028',
  graphite: '#4f4943',
  // sparrow
  bBrown: '#9c7350',
  bDark: '#3b2d22',
  bChest: '#8a5636',
  bGrey: '#a29a8e',
  bCheek: '#eee7da',
  bBelly: '#dccfb6',
  bWing: '#8e623c',
  bTail: '#6f5136',
  bBeak: '#4a4038',
  bLeg: '#bf8f7e',
  // props
  wood: '#d8b383',
  woodSide: '#b78b5c',
  woodGrain: '#b9926a',
  glass: '#d6e2dc',
  glassEdge: '#7f8e88',
  water: '#c8dbd3',
  handle: '#b25f3d',
  ferrule: '#bdb6aa',
  bristle: '#5b4734',
  shadow: '#9b8d7a',
  pencilBody: '#e2b24c',
  pencilWood: '#ecd0a6',
  eraser: '#d98c7c',
};

// Palette wells (world) — the brush loads colour from these.
export const WELLS: Record<string, {at: P; color: string}> = {
  ochre: {at: [470, 873], color: '#d9a446'},
  sienna: {at: [532, 862], color: '#b8643a'},
  rose: {at: [596, 858], color: '#d98c7c'},
  green: {at: [656, 867], color: '#86a24e'},
  umber: {at: [702, 889], color: '#6b4f37'},
  cream: {at: [652, 923], color: '#efe6d2'},
  grey: {at: [428, 899], color: '#a39a8d'},
};

export const CAT_AT: P = [960, 960];
export const BIRD_PERCH: P = [1452, 686];
export const BIRD_SCALE = 1.25;
export const BRUSH_REST = {x: 522, y: 904, rot: 76};

export type PartId =
  | 'shadow' | 'paletteSide' | 'palette' | 'jar' | 'jarFront' | 'brush'
  | 'body' | 'legs' | 'tail' | 'earL' | 'earR' | 'head'
  | 'birdFar' | 'bird' | 'birdHead' | 'birdNear';

export type Geo = P[] | ((lv: Live) => P[]);
export interface Live {
  tailSway: number;
}
export const STATIC_LIVE: Live = {tailSway: 0};

export interface Wash {
  id: string;
  part: PartId;
  pts: Geo; // closed outline (already spline-sampled)
  fill: string;
  alpha: number;
  pass: string;
  glaze?: boolean; // translucent layer on top of an opaque base
  clip?: string; // id of a base wash this layer is clipped to
  amp?: number; // edge wobble
  hole?: P[];
  mottle?: boolean; // add wet-in-wet blooms inside
  multi?: P[][]; // several dabs painted as one layer
  kind?: 'wet' | 'soft' | 'dry' | 'none'; // which watercolour filter the layer sits in
}
export interface Ink {
  id: string;
  part: PartId;
  pts: Geo; // open polyline
  stroke: string;
  width: number;
  alpha: number;
  pass: string;
}
export interface Sketch {
  id: string;
  part: PartId;
  pts: Geo;
  closed: boolean;
  kind: 'construct' | 'contour' | 'detail' | 'hatch';
  clip?: P[]; // hatch region
  dyn?: boolean; // feature that later animates (eyes, mouth) — pencil fades out after inking
}

const S = (pts: P[], closed = true, step = 4) => spline(pts, closed, step);

// ───────────────────────── CAT ─────────────────────────
export const HEAD: P[] = S([
  [0, -664], [46, -660], [88, -640], [116, -604], [128, -566], [127, -534], [136, -514], [119, -502],
  [104, -480], [70, -455], [30, -440], [0, -437], [-30, -440], [-70, -455], [-104, -480], [-119, -502],
  [-136, -514], [-127, -534], [-128, -566], [-116, -604], [-88, -640], [-46, -660],
]);
const EAR_R_RAW: P[] = [[34, -646], [60, -690], [92, -738], [120, -772], [134, -780], [143, -761], [146, -716], [142, -664], [130, -616], [102, -598], [60, -612]];
const EAR_R_IN_RAW: P[] = [[60, -640], [84, -684], [108, -730], [126, -756], [133, -736], [131, -692], [123, -648], [104, -630], [80, -630]];
export const EAR_R = S(EAR_R_RAW);
export const EAR_L = S(mirror(EAR_R_RAW));
export const EAR_R_IN = S(EAR_R_IN_RAW);
export const EAR_L_IN = S(mirror(EAR_R_IN_RAW));
export const EAR_PIVOT_R: P = [92, -628];
export const EAR_PIVOT_L: P = [-92, -628];

export const BODY: P[] = S([
  [-70, -472], [-88, -410], [-108, -340], [-122, -262], [-125, -180], [-120, -100], [-112, -32], [-100, -6],
  [40, -4], [128, -2], [184, -28], [206, -92], [199, -170], [174, -238], [138, -298], [106, -360], [86, -420], [74, -472],
]);
export const HAUNCH: P[] = ellipse(140, -112, 70, 104, -18, 40);
export const BIB: P[] = S([
  [-60, -452], [-72, -392], [-74, -322], [-62, -258], [-34, -222], [-4, -218], [26, -246], [40, -316], [40, -392], [30, -452],
]);
export const LEG_L: P[] = S([[-116, -252], [-114, -160], [-107, -70], [-103, -24], [-82, -16], [-69, -32], [-68, -112], [-70, -210], [-90, -258]]);
export const LEG_R: P[] = S([[-42, -232], [-37, -142], [-29, -56], [-25, -22], [-3, -16], [8, -32], [11, -112], [14, -210], [-8, -240]]);
export const PAW_L: P[] = ellipse(-88, -13, 26, 12, 0, 30);
export const PAW_R: P[] = ellipse(-12, -13, 26, 12, 0, 30);

// tail lies on the ground and wraps in front of the paws; its tip sways
const TAIL_C: P[] = [[182, -16], [150, 8], [80, 20], [0, 22], [-80, 17], [-140, 5], [-172, -18], [-184, -46], [-178, -70]];
export const tailCentre = (sway: number): P[] =>
  TAIL_C.map((p, i) => {
    if (i < 4) return p;
    const piv = TAIL_C[4];
    const a = (sway * (i - 4) * Math.PI) / 180;
    // rotate cumulatively around the previous joint chain (approximate by pivot at index 4)
    const dx = p[0] - piv[0];
    const dy = p[1] - piv[1];
    return [piv[0] + dx * Math.cos(a) - dy * Math.sin(a), piv[1] + dx * Math.sin(a) + dy * Math.cos(a)] as P;
  });
export const tailShape = (sway: number) => tube(tailCentre(sway), 36, 15, 4);
const tailBand = (sway: number, t0: number, t1: number, w0: number) => {
  const c = spline(tailCentre(sway), false, 3);
  const a = Math.floor(t0 * (c.length - 1));
  const b = Math.max(a + 2, Math.floor(t1 * (c.length - 1)));
  const seg = c.slice(a, b + 1);
  const w = lerp(36, 15, Math.pow(t0, 0.85)) * w0;
  return tube(seg, w, w * 0.92, 2, false);
};

// eye geometry (shared by sketch and the animated eye)
export const EYE = {
  L: {I: [-26, -553] as P, O: [-82, -570] as P},
  R: {I: [26, -553] as P, O: [82, -570] as P},
  h: 27,
  hl: 14,
};
export const eyeOutline = (side: 'L' | 'R', open = 1, flat = 0): P[] => {
  const {I, O} = EYE[side];
  const dx = O[0] - I[0];
  const dy = O[1] - I[1];
  const len = Math.hypot(dx, dy);
  let nx = dy / len;
  let ny = -dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const u = lerp(-EYE.hl / EYE.h, 1, open);
  const up = EYE.h * u * 1.33;
  const lo = EYE.hl * 1.33;
  const k1 = lerp(0.12, 0.25, flat);
  const k2 = lerp(0.82, 0.7, flat);
  const pt = (t: number, off: number): P => [I[0] + dx * t + nx * off, I[1] + dy * t + ny * off];
  const cub = (a: P, b: P, c: P, d: P, t: number): P => {
    const m = 1 - t;
    return [m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0], m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1]];
  };
  const out: P[] = [];
  const upA = pt(k1, up);
  const upB = pt(k2, up * (1 - flat * 0.25));
  for (let i = 0; i <= 16; i++) out.push(cub(I, upA, upB, O, i / 16));
  const loA = pt(0.8, -lo);
  const loB = pt(0.22, -lo);
  for (let i = 1; i < 16; i++) out.push(cub(O, loA, loB, I, i / 16));
  return out;
};
export const eyeCentre = (side: 'L' | 'R'): P => {
  const {I, O} = EYE[side];
  return [(I[0] + O[0]) / 2, (I[1] + O[1]) / 2 - 6];
};

export const NOSE: P[] = S([[-15, -514], [-8, -519], [0, -520], [8, -519], [15, -514], [10, -505], [4, -499], [0, -497], [-4, -499], [-10, -505]], true, 2);
export const mouthLines = (smirk: number): P[][] => {
  const L: P[] = [[0, -497], [0, -488], [-6, -481], [-15, -479], [-23, -484]];
  const R: P[] = [[0, -488], [lerp(6, 8, smirk), lerp(-481, -483, smirk)], [lerp(15, 18, smirk), lerp(-479, -485, smirk)], [lerp(23, 27, smirk), lerp(-484, -496, smirk)]];
  if (smirk > 0.02) R.push([lerp(23.5, 30.5, smirk), lerp(-485, -499, smirk)], [lerp(23, 32, smirk), lerp(-484, -494, smirk)]);
  return [S(L, false, 2), S(R, false, 2)];
};
export const whiskers = (side: 1 | -1, smirk: number): P[][] => {
  const lift = side > 0 ? smirk * 7 : smirk * 1.5;
  const base: [P, P, P][] = [
    [[34, -492], [95, -510], [158, -514]],
    [[36, -486], [100, -492], [166, -484]],
    [[34, -480], [92, -472], [150, -452]],
  ];
  return base.map((w) => S(w.map(([x, y], i) => [x * side, y - lift * (i / 2)] as P), false, 3));
};

// Tabby markings are painted as broken, feathered dry-brush dabs rather than solid shapes.
let markSeed = 0;
const mk = (c: P[], w0: number, w1: number): P[][] => {
  const seed = ++markSeed;
  const sm = spline(c, false, 1.5);
  const n = sm.length;
  const out: P[][] = [];
  let i = 0;
  let k = 0;
  while (i < n - 2) {
    const j = Math.min(n - 1, i + Math.round(9 + rand(seed * 31 + k) * 12));
    const jit = 0.72 + rand(seed * 17 + k) * 0.55;
    const seg = sm.slice(i, j + 1);
    if (seg.length >= 3) out.push(tube(seg, lerp(w0, w1, i / (n - 1)) * jit, Math.max(0.6, lerp(w0, w1, j / (n - 1)) * jit * 0.6), 1.5));
    i = j + Math.round(rand(seed * 7 + k) * 2.2);
    k++;
  }
  return out.length ? out : [tube(c, w0, w1, 2)];
};
const dot = (x: number, y: number, r: number, seed: number): P[][] => {
  const out = [blob(x, y, r * 0.85, seed, 0.38, 18)];
  const a = rand(seed) * 6.28;
  out.push(blob(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.6, r * 0.42, seed + 1, 0.4, 14));
  if (r > 5) out.push(blob(x + Math.cos(a + 2.4) * r * 0.8, y + Math.sin(a + 2.4) * r * 0.7, r * 0.32, seed + 2, 0.4, 12));
  return out;
};
const both = (c: P[], w0: number, w1: number): P[][][] => [mk(c, w0, w1), mk(mirror(c), w0, w1)];

export const HEAD_MARKS: P[][][] = [
  mk([[0, -662], [0, -640], [-1, -613]], 6, 2),
  ...both([[16, -659], [19, -636], [16, -609]], 5, 1.6),
  ...both([[34, -651], [40, -630], [35, -603]], 4.5, 1.4),
  ...both([[83, -571], [100, -568], [122, -558]], 4.5, 1.2),
  ...both([[70, -532], [94, -528], [120, -520]], 4, 1.1),
  ...both([[28, -549], [32, -537], [37, -525]], 3.2, 1),
  dot(-9, -598, 3.2, 1), dot(9, -598, 3.2, 2), dot(-25, -594, 2.8, 3), dot(25, -594, 2.8, 4),
  dot(-99, -498, 4.2, 5), dot(-86, -511, 3.4, 6), dot(99, -498, 4.2, 7), dot(86, -511, 3.4, 8),
  dot(-55, -648, 4.5, 9), dot(55, -648, 4.5, 10), dot(-70, -632, 3.2, 11), dot(70, -632, 3.2, 12),
  ...both([[52, -620], [66, -612], [80, -598]], 3.6, 1),
  ...both([[106, -604], [116, -586], [122, -572]], 3.6, 1),
];
export const BODY_MARKS: P[][][] = [
  // necklaces
  mk([[-80, -458], [-60, -440], [-38, -430]], 9, 3), mk([[80, -458], [60, -440], [38, -430]], 9, 3),
  mk([[-14, -421], [0, -418], [14, -421]], 5, 3),
  mk([[-96, -406], [-70, -385], [-44, -377]], 9, 3), mk([[92, -408], [68, -386], [44, -378]], 9, 3),
  // left flank
  dot(-104, -334, 8, 21), dot(-111, -292, 7, 22), dot(-100, -252, 6, 23), dot(-88, -306, 5, 24),
  // right side + back
  dot(70, -350, 7, 25), dot(88, -312, 8, 26), dot(104, -276, 7, 27), dot(60, -296, 5.5, 28), dot(52, -258, 5.5, 29), dot(110, -332, 5.5, 30),
  // haunch mackerel arcs
  mk([[92, -204], [138, -200], [176, -168]], 8, 2.5), mk([[86, -152], [138, -142], [188, -112]], 9, 2.5),
  mk([[94, -100], [142, -88], [194, -62]], 8, 2.5), mk([[110, -50], [150, -38], [182, -22]], 6, 2),
  dot(128, -246, 7, 31), dot(158, -222, 6, 32), dot(66, -200, 5.5, 33), dot(60, -120, 6, 34), dot(70, -62, 5.5, 35),
  // shoulder + flank stripes
  mk([[-124, -366], [-108, -360], [-92, -366]], 6, 2), mk([[-125, -220], [-110, -214], [-96, -220]], 6, 2),
  mk([[44, -332], [70, -324], [96, -302]], 5, 1.6), mk([[34, -228], [62, -222], [90, -232]], 5, 1.6),
];
export const LEG_MARKS: P[][][] = [
  mk([[-121, -176], [-104, -170], [-88, -174]], 7, 2.5), mk([[-119, -130], [-102, -125], [-86, -128]], 7, 2.5), mk([[-116, -84], [-100, -80], [-86, -83]], 6, 2.5),
  mk([[-42, -156], [-26, -151], [-12, -154]], 6, 2.5), mk([[-38, -110], [-22, -106], [-8, -109]], 6, 2.5), mk([[-34, -66], [-19, -62], [-6, -65]], 5, 2),
  mk([[-121, -218], [-104, -213], [-88, -216]], 6, 2), mk([[-44, -200], [-28, -196], [-14, -198]], 5, 2),
];
export const tailMarks = (sway: number): P[][] => [
  tailBand(sway, 0.22, 0.27, 1.02), tailBand(sway, 0.36, 0.41, 1.02), tailBand(sway, 0.5, 0.55, 1.02),
  tailBand(sway, 0.63, 0.68, 1.02), tailBand(sway, 0.75, 0.8, 1.02), tailBand(sway, 0.86, 1, 1.05),
];

// ───────────────────────── SPARROW ─────────────────────────
export const B = {
  body: S([[-30, 2], [-22, -12], [-4, -19], [12, -19], [22, -12], [26, 2], [22, 14], [8, 23], [-10, 23], [-24, 14]]),
  tail: S([[-22, -3], [-48, -9], [-68, -13], [-73, -7], [-69, 2], [-48, 6], [-22, 10]]),
  belly: S([[-20, 12], [-4, 15], [14, 11], [24, 3], [21, 15], [6, 24], [-10, 24], [-22, 18]]),
  head: ellipse(24, -23, 15, 14, 0, 30),
  crown: S([[11, -31], [17, -36], [28, -38], [37, -33], [31, -29], [20, -29]]),
  cheek: S([[21, -23], [32, -24], [37, -18], [31, -11], [20, -12], [16, -18]]),
  bib: S([[30, -15], [38, -13], [35, -2], [27, 8], [18, 10], [20, 0], [25, -9]]),
  wing: S([[-24, -6], [-12, -14], [4, -15], [16, -8], [14, 2], [2, 8], [-14, 9], [-32, 4]]),
  beakUp: S([[35, -30], [44, -28.5], [51, -25.5], [36, -24.5]], true, 2),
  beakLo: S([[36, -24.5], [48, -24], [36, -20.5]], true, 2),
  eye: [31, -27] as P,
  shoulder: [6, -12] as P,
  neck: [18, -14] as P,
};
const mkS = (c: P[], w0: number, w1: number) => tube(c, w0, w1, 2);
export const B_MARKS: P[][] = [
  mkS([[38, -27], [33, -27], [27, -25]], 3.2, 1.5), // eye stripe
  mkS([[-16, -12], [-6, -15], [4, -15]], 3.2, 1.4), mkS([[-20, -6], [-8, -9], [4, -8]], 3, 1.2), // back streaks
  mkS([[-22, 0], [-8, -2], [6, -1]], 3, 1.2),
  mkS([[-28, 4], [-16, 6], [-4, 6]], 2.6, 1),
];
export const B_WINGBAR = mkS([[-14, 0], [-2, 2.5], [10, 1]], 3.4, 2);
export const B_LEGS: P[][] = [
  [[-4, 20], [-6, 34]], [[-6, 34], [-13, 36]], [[-6, 34], [1, 36]],
  [[6, 20], [8, 34]], [[8, 34], [2, 36]], [[8, 34], [15, 36]],
];
// open wing, drawn relative to the shoulder, pointing up and back
export const B_OPEN: P[] = S([[0, 0], [-6, -16], [-14, -36], [-26, -56], [-40, -70], [-52, -75], [-58, -68], [-52, -56], [-44, -42], [-35, -28], [-24, -14], [-12, -4]]);
export const B_PRIMARIES: P[][] = [
  mkS([[-30, -60], [-46, -71]], 4, 2), mkS([[-30, -50], [-52, -64]], 4, 2), mkS([[-28, -40], [-48, -52]], 4, 2), mkS([[-24, -30], [-42, -40]], 3.6, 1.8),
];

// ───────────────────────── PROPS ─────────────────────────
export const JAR = S([
  [1322, 744], [1318, 772], [1313, 822], [1312, 898], [1318, 938], [1338, 955], [1410, 961], [1482, 955], [1502, 938], [1508, 898], [1507, 822], [1502, 772], [1498, 744], [1410, 752],
]);
export const JAR_RIM = ellipse(1410, 738, 92, 15, 0, 48);
export const JAR_RIM_IN = ellipse(1410, 739, 82, 11, 0, 48);
export const WATER = S([
  [1316, 806], [1314, 850], [1313, 898], [1318, 938], [1338, 953], [1410, 958], [1482, 953], [1502, 938], [1507, 898], [1506, 850], [1504, 806], [1410, 819],
]);
export const WATER_TOP = ellipse(1410, 806, 94, 13, 0, 48);
export const JAR_SHINE: P[][] = [mkS([[1334, 778], [1330, 860], [1337, 926]], 7, 3), mkS([[1354, 790], [1352, 834]], 3.4, 2), mkS([[1490, 800], [1493, 880]], 3, 2)];

export const PALETTE = S([
  [404, 902], [418, 872], [470, 852], [560, 844], [650, 852], [716, 872], [742, 898], [728, 926], [668, 948], [606, 946], [574, 934], [548, 940], [504, 952], [446, 946], [410, 928],
]);
export const PALETTE_SIDE = S([
  [404, 902], [410, 928], [446, 946], [504, 952], [548, 940], [574, 934], [606, 946], [668, 948], [728, 926], [742, 898], [745, 909], [731, 938], [668, 959], [606, 957], [574, 945], [548, 951], [504, 963], [446, 957], [407, 939], [401, 913],
]);
export const THUMB = ellipse(482, 916, 21, 9, -4, 30);
export const blobAt = (at: P, seed: number, r = 15): P[] => blob(0, 0, r, seed, 0.28, 30).map(([x, y]) => [at[0] + x * 1.15, at[1] + y * 0.62] as P);

export const BRUSH = {
  bristle: S([[0, 0], [-5, -10], [-7.5, -26], [-6.5, -44], [6.5, -44], [7.5, -26], [5, -10]], true, 2),
  ferrule: [[-6.8, -44], [-6.2, -84], [6.2, -84], [6.8, -44]] as P[],
  handle: S([[-6.2, -84], [-5, -170], [-3.6, -262], [0, -268], [3.6, -262], [5, -170], [6.2, -84]], true, 4),
};

export const PENCIL = {
  lead: [[0, 0], [-2.6, -9], [2.6, -9]] as P[],
  wood: [[-2.6, -9], [-9, -32], [9, -32], [2.6, -9]] as P[],
  body: [[-9, -32], [-9, -250], [9, -250], [9, -32]] as P[],
  facet: [[-3, -32], [-3, -250]] as P[],
  band: [[-9, -250], [-9, -268], [9, -268], [9, -250]] as P[],
  eraser: S([[-9, -268], [-8.5, -284], [-4, -289], [4, -289], [8.5, -284], [9, -268]], true, 2),
};

export const SHADOWS: P[][] = [ellipse(968, 972, 245, 24, 0, 44), ellipse(1414, 963, 116, 13, 0, 40), ellipse(578, 965, 182, 14, 0, 40)];

// the head is drawn large and shrunk to natural proportion around the neck
export const HEAD_SCALE = 0.86;
export const HEAD_ORIGIN: P = [0, -455];
