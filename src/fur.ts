// Dry-brush fur: hundreds of short tapered strokes that follow the form, bucketed into
// a few paths per (part, colour, timing bucket) so the renderer stays light.
import {P, tube, rand, ellipse, polyD, centroid} from './geom';
import {PartId, HEAD, BODY, LEG_L, LEG_R, EAR_L, EAR_R, EAR_L_IN, EAR_R_IN, BIB, HAUNCH, B} from './art';

export const inPoly = (p: P, poly: P[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

const MUZZLE: P[] = ellipse(0, -488, 56, 40);
const EYES: P[] = [[-54, -561], [54, -561]];
const NOSE_C: P = [0, -506];

type Tone = {color: string; alpha: number};
const DARK: Tone = {color: '#4a3c30', alpha: 0.42};
const MID: Tone = {color: '#7f6c56', alpha: 0.4};
const WARM: Tone = {color: '#c39a63', alpha: 0.38};
const LIGHT: Tone = {color: '#efe5d2', alpha: 0.6};
const COOL: Tone = {color: '#8f949a', alpha: 0.3};

export type FurBucket = {key: string; part: PartId; color: string; alpha: number; d: string; c: P};
type Stroke = {part: PartId; tone: Tone; poly: P[]; at: P};

const strokes: Stroke[] = [];
const add = (part: PartId, at: P, dir: P, len: number, w: number, tone: Tone, bend: number) => {
  const l = Math.hypot(dir[0], dir[1]) || 1;
  const dx = dir[0] / l;
  const dy = dir[1] / l;
  const mid: P = [at[0] + dx * len * 0.5 - dy * bend, at[1] + dy * len * 0.5 + dx * bend];
  const end: P = [at[0] + dx * len, at[1] + dy * len];
  strokes.push({part, tone, poly: tube([at, mid, end], w, 0.35, 2, false), at});
};

const scatter = (part: PartId, region: P[], n: number, seed: number, f: (p: P, r: (k: number) => number) => void) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  region.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  let made = 0;
  for (let i = 0; made < n && i < n * 6; i++) {
    const p: P = [x0 + rand(seed + i * 2.1) * (x1 - x0), y0 + rand(seed + i * 3.7 + 0.5) * (y1 - y0)];
    if (!inPoly(p, region)) continue;
    made++;
    f(p, (k) => rand(seed + i * 5.3 + k * 1.7));
  }
};
const pick = (r: number, tones: [Tone, number][]) => {
  let s = 0;
  for (const [t, w] of tones) {
    s += w;
    if (r < s) return t;
  }
  return tones[tones.length - 1][0];
};

// head: fur radiates from the nose; light on the muzzle, darker on the crown
scatter('head', HEAD, 260, 11, (p, r) => {
  if (EYES.some((e) => Math.hypot(p[0] - e[0], p[1] - e[1]) < 32) || Math.hypot(p[0] - NOSE_C[0], p[1] - NOSE_C[1]) < 16) return;
  const dir: P = [p[0] - NOSE_C[0], p[1] - NOSE_C[1] - 10];
  const muzzle = inPoly(p, MUZZLE);
  const tone = muzzle ? pick(r(1), [[LIGHT, 0.8], [COOL, 0.2]]) : pick(r(1), [[DARK, 0.3], [MID, 0.3], [WARM, 0.2], [LIGHT, 0.2]]);
  add('head', p, dir, 7 + r(2) * 9, 1.8 + r(3) * 1.2, tone, (r(4) - 0.5) * 4);
});
// body: fur falls downward, curls around the haunch, light on the bib
scatter('body', BODY, 560, 23, (p, r) => {
  if (inPoly(p, LEG_L) || inPoly(p, LEG_R)) return;
  let dir: P = [p[0] * 0.004 + (r(5) - 0.5) * 0.3, 1];
  if (inPoly(p, HAUNCH)) {
    const a = Math.atan2(p[1] + 112, p[0] - 140);
    dir = [-Math.sin(a), Math.cos(a)];
  }
  const bib = inPoly(p, BIB);
  const tone = bib ? pick(r(1), [[LIGHT, 0.75], [COOL, 0.25]]) : pick(r(1), [[DARK, 0.32], [MID, 0.3], [WARM, 0.2], [LIGHT, 0.18]]);
  add('body', p, dir, 16 + r(2) * 20, 2 + r(3) * 1.8, tone, (r(4) - 0.5) * 6);
});
[LEG_L, LEG_R].forEach((leg, li) =>
  scatter('legs', leg, 90, 41 + li * 9, (p, r) => {
    const inner = li === 0 ? p[0] > -80 : p[0] > -4;
    const tone = inner ? pick(r(1), [[LIGHT, 0.7], [COOL, 0.3]]) : pick(r(1), [[DARK, 0.3], [MID, 0.35], [WARM, 0.15], [LIGHT, 0.2]]);
    add('legs', p, [(r(5) - 0.5) * 0.2, 1], 10 + r(2) * 12, 1.8 + r(3) * 1.2, tone, (r(4) - 0.5) * 3);
  }),
);
[[EAR_L, EAR_L_IN, -1], [EAR_R, EAR_R_IN, 1]].forEach(([ear, inner, s], ei) => {
  const part: PartId = ei === 0 ? 'earL' : 'earR';
  scatter(part, ear as P[], 34, 61 + ei * 7, (p, r) => {
    const isIn = inPoly(p, inner as P[]);
    const tip: P = [(s as number) * 134, -780];
    const tone = isIn ? {color: '#f6efe4', alpha: 0.75} : pick(r(1), [[DARK, 0.4], [MID, 0.4], [WARM, 0.2]]);
    add(part, p, [tip[0] - p[0], tip[1] - p[1]], 8 + r(2) * 12, isIn ? 1.2 : 1.8, tone, (r(4) - 0.5) * 3);
  });
});
// sparrow feather flecks
scatter('bird', B.body, 40, 81, (p, r) => {
  const tone = p[1] > 8 ? {color: '#f1e9dc', alpha: 0.6} : pick(r(1), [[{color: '#3b2d22', alpha: 0.5}, 0.5], [{color: '#c8925c', alpha: 0.5}, 0.5]]);
  add('bird', p, [-1, 0.15], 5 + r(2) * 5, 1.4, tone, (r(4) - 0.5) * 2);
});

// bucket strokes by part, tone and position (for staggered reveal)
const map = new Map<string, {part: PartId; tone: Tone; polys: P[][]; ats: P[]}>();
strokes.forEach((s) => {
  const band = Math.floor((s.at[1] + 1000) / 90);
  const key = `${s.part}|${s.tone.color}|${s.tone.alpha}|${band}`;
  if (!map.has(key)) map.set(key, {part: s.part, tone: s.tone, polys: [], ats: []});
  const m = map.get(key)!;
  m.polys.push(s.poly);
  m.ats.push(s.at);
});
export const FUR: FurBucket[] = [...map.entries()].map(([key, m]) => ({
  key,
  part: m.part,
  color: m.tone.color,
  alpha: m.tone.alpha,
  d: m.polys.map((p) => polyD(p)).join(''),
  c: centroid(m.ats),
}));
