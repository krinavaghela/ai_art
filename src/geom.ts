// Geometry helpers: Catmull-Rom splines, hand-drawn roughening, tapered tubes, blobs.
export type P = [number, number];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const rand = (seed: number) => hash(seed * 13.17 + 0.5);

// Smooth 1D value noise in [-1, 1].
export const noise1 = (x: number, seed: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i + seed * 57.3);
  const b = hash(i + 1 + seed * 57.3);
  return (a + (b - a) * u) * 2 - 1;
};
export const fbm = (x: number, seed: number) =>
  0.6 * noise1(x, seed) + 0.3 * noise1(x * 2.1 + 3.7, seed + 11) + 0.1 * noise1(x * 4.3 + 1.1, seed + 23);

const cr = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (k: 0 | 1) =>
    0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
  return [f(0), f(1)];
};

// Densely sample a Catmull-Rom spline through pts.
export const spline = (pts: P[], closed = true, step = 4): P[] => {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const out: P[] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[closed ? (i + 2) % n : Math.min(i + 2, n - 1)];
    const k = Math.max(2, Math.ceil(dist(p1, p2) / step));
    for (let j = 0; j < k; j++) out.push(cr(p0, p1, p2, p3, j / k));
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
};

export const polyLen = (poly: P[], closed = false) => {
  let s = 0;
  for (let i = 1; i < poly.length; i++) s += dist(poly[i], poly[i - 1]);
  if (closed && poly.length > 1) s += dist(poly[0], poly[poly.length - 1]);
  return s;
};

// Offset a sampled polyline along its normals by seamless fbm noise (a hand-drawn wobble).
export const rough = (poly: P[], closed: boolean, amp: number, seed: number, wl = 40): P[] => {
  const n = poly.length;
  const per = polyLen(poly, closed) || 1;
  let s = 0;
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) s += dist(poly[i], poly[i - 1]);
    const a = poly[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = poly[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    let o = fbm(s / wl, seed);
    if (closed) {
      const w = s / per;
      o = o * (1 - w) + fbm((s - per) / wl, seed) * w;
    }
    out.push([poly[i][0] + (dy / L) * o * amp, poly[i][1] - (dx / L) * o * amp]);
  }
  return out;
};

export const polyD = (pts: P[], closed = true) => {
  if (!pts.length) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  return closed ? d + 'Z' : d;
};

export const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28): P[] => {
  const c = Math.cos((rot * Math.PI) / 180);
  const s = Math.sin((rot * Math.PI) / 180);
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
};

// Irregular round blob (pigment dab / reveal front).
export const blob = (cx: number, cy: number, r: number, seed: number, irr = 0.22, n = 44, phase = 0): P[] => {
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = i / n;
    const k = 4.5;
    const v = fbm(w * k + phase, seed) * (1 - w) + fbm((w - 1) * k + phase, seed) * w;
    const rr = r * (1 + irr * v);
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
};

// Tapered stroke around a centre spline; width(t) with t in [0,1] along the stroke.
export const tube = (center: P[], w0: number, w1: number, step = 3, capRound = true): P[] => {
  const c = spline(center, false, step);
  const n = c.length;
  const L: P[] = [];
  const R: P[] = [];
  const total = polyLen(c) || 1;
  let s = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) s += dist(c[i], c[i - 1]);
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const t = s / total;
    const w = lerp(w0, w1, Math.pow(t, 0.85)) / 2;
    L.push([c[i][0] + (dy / l) * w, c[i][1] - (dx / l) * w]);
    R.push([c[i][0] - (dy / l) * w, c[i][1] + (dx / l) * w]);
  }
  const out: P[] = [...L];
  if (capRound) {
    // rounded end cap
    const e = c[n - 1];
    const p = c[n - 2] || c[n - 1];
    const ang = Math.atan2(e[1] - p[1], e[0] - p[0]);
    const r = w1 / 2;
    for (let k = 1; k < 6; k++) {
      const a = ang - Math.PI / 2 + (k / 6) * Math.PI;
      out.push([e[0] + Math.cos(a) * r, e[1] + Math.sin(a) * r]);
    }
  }
  out.push(...R.reverse());
  return out;
};

export const centroid = (pts: P[]): P => {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p[0];
    y += p[1];
  }
  return [x / pts.length, y / pts.length];
};

export const maxDist = (o: P, pts: P[]) => pts.reduce((m, p) => Math.max(m, dist(o, p)), 0);

export const mirror = (pts: P[]): P[] => pts.map(([x, y]) => [-x, y] as P);

// Point + tangent angle at fraction p along a polyline (lengths cached by caller).
export const cumLens = (poly: P[]) => {
  const c = [0];
  for (let i = 1; i < poly.length; i++) c.push(c[i - 1] + dist(poly[i], poly[i - 1]));
  return c;
};
export const pointAt = (poly: P[], cl: number[], p: number): {pt: P; ang: number} => {
  const target = clamp(p) * cl[cl.length - 1];
  let i = 1;
  while (i < cl.length - 1 && cl[i] < target) i++;
  const seg = cl[i] - cl[i - 1] || 1;
  const f = (target - cl[i - 1]) / seg;
  const a = poly[i - 1];
  const b = poly[i] || a;
  return {pt: [lerp(a[0], b[0], f), lerp(a[1], b[1], f)], ang: Math.atan2(b[1] - a[1], b[0] - a[0])};
};

// Back-and-forth pencil shading clipped later by a region.
export const hatch = (x0: number, y0: number, x1: number, y1: number, angle: number, gap: number): P[] => {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2;
  const out: P[] = [];
  let k = 0;
  for (let o = -R; o <= R; o += gap, k++) {
    const px = cx - dy * o;
    const py = cy + dx * o;
    const a1: P = [px - dx * R, py - dy * R];
    const a2: P = [px + dx * R, py + dy * R];
    if (k % 2) out.push(a2, a1);
    else out.push(a1, a2);
  }
  return out;
};
