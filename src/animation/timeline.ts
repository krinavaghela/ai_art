// One paused GSAP timeline choreographs the whole film; the renderer seeks it per frame.
import {gsap} from 'gsap';
import {P, spline, cumLens, pointAt, polyLen, centroid, maxDist, dist, clamp} from '../lib/geom';
import {WELLS, BRUSH_REST, BIRD_PERCH, CAT_AT} from '../artwork/art';
import {WASHES, INKS, SKETCHES, toWorld, geo} from '../artwork/items';
import {FUR} from '../artwork/fur';

export const FPS = 30;
export const DURATION = 30;

type PassDef = {name: string; dur: number; well?: string; rinse?: boolean; sweep: P[]};
const cat = (x: number, y: number): P => [CAT_AT[0] + x, CAT_AT[1] + y];

// Brush passes, in painting order. Sweeps are the brush's route in world space.
const BRUSH_PASSES: PassDef[] = [
  {name: 'fur', dur: 1.75, well: 'ochre', rinse: true, sweep: [cat(0, -600), cat(-100, -720), cat(-40, -560), cat(100, -720), cat(60, -520), cat(0, -470), cat(-90, -360), cat(-20, -330), cat(130, -330), cat(150, -150), cat(60, -120), cat(-90, -110), cat(-40, -60), cat(-90, -14), cat(-6, -14), cat(150, 10), cat(0, 20), cat(-170, -20)]},
  {name: 'white', dur: 0.65, well: 'cream', rinse: true, sweep: [cat(-60, -565), cat(60, -565), cat(0, -500), cat(0, -470), cat(-20, -400), cat(-10, -290), cat(-60, -140), cat(-86, -14), cat(-30, -120), cat(-6, -14)]},
  {name: 'rose', dur: 0.4, well: 'rose', sweep: [cat(-105, -700), cat(-30, -600), cat(0, -510), cat(30, -600), cat(105, -700)]},
  {name: 'bird', dur: 0.75, well: 'sienna', rinse: true, sweep: [[1530, 690], [1480, 680], [1440, 700], [1440, 660], [1410, 662], [1470, 650]]},
  {name: 'shade', dur: 0.75, well: 'umber', rinse: true, sweep: [cat(0, -650), cat(-108, -498), cat(108, -498), cat(140, -700), cat(0, -452), cat(-120, -262), cat(-50, -100), cat(54, -58), cat(182, -96), cat(104, -340), cat(-140, -700), [1452, 664]]},
  {name: 'marks', dur: 0.95, well: 'umber', sweep: [cat(0, -640), cat(-100, -560), cat(-80, -510), cat(0, -540), cat(80, -510), cat(100, -560), cat(0, -440), cat(-100, -330), cat(-100, -150), cat(-20, -110), cat(80, -300), cat(140, -150), cat(150, -40), cat(60, 18), cat(-120, 8), cat(-180, -50), [1452, 676], [1440, 700]]},
  {name: 'eyes', dur: 0.3, well: 'green', rinse: true, sweep: [cat(-56, -562), cat(56, -562)]},
  {name: 'detail', dur: 0.45, well: 'umber', sweep: [cat(-56, -562), cat(56, -562), cat(0, -505), cat(0, -486), cat(-100, -495), cat(100, -495), cat(-40, -12), [1414, 652]]},
];

export const T = {
  sketch0: 0.25,
  sketch1: 5.5,
  props0: 5.95,
  props1: 7.15,
  wells0: 6.95,
  wells1: 7.4,
  lift: 7.35,
  life: 0, // filled below
};

// ── state that the timeline tweens ──
export type State = ReturnType<typeof makeState>;
const makeState = () => ({
  sk: {} as Record<string, number>,
  w: {} as Record<string, number>,
  ink: {} as Record<string, number>,
  fur: {} as Record<string, number>,
  construct: 1,
  pencil: 0,
  skAll: 1,
  skDyn: 1,
  brush: {x: BRUSH_REST.x, y: BRUSH_REST.y, rot: BRUSH_REST.rot, pass: -1, u: 0},
  jarTint: 0,
  breathe: 0,
  tailAmp: 0,
  tailFlick: 0,
  blink: 0,
  smug: 0,
  smirk: 0,
  earL: 0,
  earR: 0,
  gazeBird: 0,
  gazeX: 0,
  gazeY: 0,
  headTilt: 0,
  bird: {u: 0, fly: 0, hop: 0, look: 0, beak: 0, land: 0, squash: 0, face: -1},
  glow: 0,
});

export const S = makeState();
const tl = gsap.timeline({paused: true});

// ── sketch: one continuous pencil route through contours ──
export type PencilSeg = {id: string; t0: number; t1: number; poly: P[]; cl: number[]};
export const PENCIL_ROUTE: PencilSeg[] = [];
{
  const route = SKETCHES.filter((s) => s.kind === 'construct' || s.kind === 'contour');
  const weights = route.map((s) => Math.pow(polyLen(geo(s.pts)), 0.55) * (s.kind === 'construct' ? 0.55 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = T.sketch0;
  route.forEach((s, i) => {
    const d = ((T.sketch1 - T.sketch0) * weights[i]) / total;
    S.sk[s.id] = 0;
    tl.fromTo(S.sk, {[s.id]: 0}, {[s.id]: 1, duration: d * 0.94, ease: 'sine.inOut', immediateRender: false}, t);
    const poly = geo(s.pts).map((p) => toWorld(s.part, p));
    if (s.closed) poly.push(poly[0]);
    PENCIL_ROUTE.push({id: s.id, t0: t, t1: t + d * 0.94, poly, cl: cumLens(poly)});
    t += d;
  });
  const details = SKETCHES.filter((s) => s.kind === 'detail');
  details.forEach((s, i) => {
    S.sk[s.id] = 0;
    tl.fromTo(S.sk, {[s.id]: 0}, {[s.id]: 1, duration: 0.35, ease: 'sine.out', immediateRender: false}, 3.6 + (i / details.length) * 2.0);
  });
  const hatches = SKETCHES.filter((s) => s.kind === 'hatch');
  hatches.forEach((s, i) => {
    S.sk[s.id] = 0;
    tl.fromTo(S.sk, {[s.id]: 0}, {[s.id]: 1, duration: 0.7, ease: 'none', immediateRender: false}, 4.8 + i * 0.12);
  });
  tl.fromTo(S, {pencil: 0}, {pencil: 1, duration: 0.3, immediateRender: false}, 0);
  tl.fromTo(S, {pencil: 1}, {pencil: 0, duration: 0.45, ease: 'power2.in', immediateRender: false}, T.sketch1 + 0.05);
  tl.fromTo(S, {construct: 1}, {construct: 0, duration: 0.9, immediateRender: false}, 5.6);
}

// ── paint reveal schedule ──
const smoothSweep = (pts: P[]) => (pts.length > 2 ? spline(pts, false, 6) : pts);
const nearestU = (poly: P[], cl: number[], q: P) => {
  let best = 0;
  let bd = 1e9;
  for (let i = 0; i < poly.length; i++) {
    const d = dist(poly[i], q);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return cl[best] / cl[cl.length - 1];
};
export const ORIGIN: Record<string, P> = {};
export const MAXR: Record<string, number> = {};
const scheduleItems = (pass: string, t0: number, t1: number, sweep: P[]) => {
  const poly = smoothSweep(sweep);
  const cl = cumLens(poly);
  WASHES.filter((x) => x.pass === pass).forEach((x) => {
    const pts = geo(x.pts);
    const c = centroid(pts);
    const wc = toWorld(x.part, c);
    const u = nearestU(poly, cl, wc);
    // reveal starts at the point of the shape nearest the brush route
    let o = pts[0];
    let od = 1e9;
    const bp = pointAt(poly, cl, u).pt;
    pts.forEach((p) => {
      const d = dist(toWorld(x.part, p), bp);
      if (d < od) {
        od = d;
        o = p;
      }
    });
    const origin: P = [c[0] * 0.55 + o[0] * 0.45, c[1] * 0.55 + o[1] * 0.45];
    ORIGIN[x.id] = origin;
    MAXR[x.id] = maxDist(origin, pts) + 6;
    const d = clamp(0.28 + MAXR[x.id] / 520, 0.28, 1.15);
    const start = t0 + u * (t1 - t0) - 0.04;
    S.w[x.id] = 0;
    tl.fromTo(S.w, {[x.id]: 0}, {[x.id]: 1, duration: d, ease: 'power2.out', immediateRender: false}, start);
  });
  FUR.filter((f) => (f.part === 'bird' ? 'bird' : 'marks') === pass).forEach((f) => {
    const u = nearestU(poly, cl, toWorld(f.part, f.c));
    S.fur[f.key] = 0;
    tl.fromTo(S.fur, {[f.key]: 0}, {[f.key]: 1, duration: 0.3, ease: 'sine.out', immediateRender: false}, t0 + u * (t1 - t0) - 0.05);
  });
  INKS.filter((x) => x.pass === pass).forEach((x) => {
    const pts = geo(x.pts);
    const u = nearestU(poly, cl, toWorld(x.part, centroid(pts)));
    S.ink[x.id] = 0;
    tl.fromTo(S.ink, {[x.id]: 0}, {[x.id]: 1, duration: clamp(polyLen(pts) / 700, 0.18, 0.55), ease: 'power1.inOut', immediateRender: false}, t0 + u * (t1 - t0));
  });
};
scheduleItems('props', T.props0, T.props1, [[380, 960], [1530, 960]]);
scheduleItems('wells', T.wells0, T.wells1, [[420, 900], [710, 890]]);

// ── brush choreography ──
export type BrushPass = {name: string; t0: number; t1: number; poly: P[]; cl: number[]};
export const BRUSH_ROUTE: BrushPass[] = [];
export const RIPPLES: number[] = [];
export const STAINS: {t: number; color: string | null}[] = [];
{
  let cur = {x: BRUSH_REST.x, y: BRUSH_REST.y, rot: BRUSH_REST.rot};
  const move = (t: number, d: number, x: number, y: number, rot: number, ease = 'power2.inOut') => {
    tl.fromTo(S.brush, {x: cur.x, y: cur.y, rot: cur.rot}, {x, y, rot, duration: d, ease, immediateRender: false}, t);
    cur = {x, y, rot};
    return t + d;
  };
  const JAR_X = 1410;
  let tint = 0;
  const rinse = (t: number) => {
    t = move(t, 0.17, JAR_X - 6, 772, 10);
    t = move(t, 0.08, JAR_X - 2, 846, 4, 'power1.in');
    RIPPLES.push(t);
    STAINS.push({t, color: null});
    tl.fromTo(S, {jarTint: tint}, {jarTint: Math.min(1, tint + 0.14), duration: 0.6, immediateRender: false}, t);
    tint = Math.min(1, tint + 0.14);
    return move(t, 0.08, JAR_X + 4, 780, 12, 'power1.out');
  };
  const load = (t: number, well: string) => {
    const at = WELLS[well].at;
    t = move(t, 0.15, at[0] - 4, at[1] - 3, 46);
    STAINS.push({t, color: WELLS[well].color});
    return move(t, 0.07, at[0] + 6, at[1] + 2, 52, 'sine.inOut');
  };
  let t = T.lift;
  for (const p of BRUSH_PASSES) {
    if (p.rinse) t = rinse(t);
    if (p.well) t = load(t, p.well);
    const poly = smoothSweep(p.sweep);
    t = move(t, 0.17, poly[0][0], poly[0][1], 30);
    const t0 = t;
    const t1 = t0 + p.dur;
    tl.set(S.brush, {pass: BRUSH_ROUTE.length}, t0);
    tl.fromTo(S.brush, {u: 0}, {u: 1, duration: p.dur, ease: 'none', immediateRender: false}, t0);
    const end = poly[poly.length - 1];
    tl.set(S.brush, {pass: -1, x: end[0], y: end[1], rot: 30}, t1);
    cur = {x: end[0], y: end[1], rot: 30};
    BRUSH_ROUTE.push({name: p.name, t0, t1, poly, cl: cumLens(poly)});
    scheduleItems(p.name, t0, t1, p.sweep);
    t = t1;
  }
  t = rinse(t);
  t = move(t, 0.32, BRUSH_REST.x, BRUSH_REST.y, BRUSH_REST.rot, 'power2.inOut');
  T.life = t + 0.1;
}

// ── pencil lines settle under the paint ──
tl.fromTo(S, {skDyn: 1}, {skDyn: 0, duration: 0.5, immediateRender: false}, BRUSH_ROUTE[BRUSH_ROUTE.length - 1].t0);
tl.fromTo(S, {skAll: 1}, {skAll: 0.13, duration: 0.8, immediateRender: false}, T.life - 0.6);

// ── life ──
const L = T.life;
const blink = (t: number, close = 0.12, hold = 0.06, open = 0.2) => {
  tl.fromTo(S, {blink: 0}, {blink: 1, duration: close, ease: 'power2.in', immediateRender: false}, t);
  tl.fromTo(S, {blink: 1}, {blink: 0, duration: open, ease: 'power2.out', immediateRender: false}, t + close + hold);
};
const twitch = (key: 'earL' | 'earR', t: number, dir: number) => {
  const k = {[key]: 0};
  tl.fromTo(S, {[key]: 0}, {[key]: 14 * dir, duration: 0.07, ease: 'power2.out', immediateRender: false}, t);
  tl.fromTo(S, {[key]: 14 * dir}, {[key]: -4 * dir, duration: 0.1, ease: 'sine.inOut', immediateRender: false}, t + 0.07);
  tl.fromTo(S, {[key]: -4 * dir}, {[key]: 9 * dir, duration: 0.08, ease: 'sine.inOut', immediateRender: false}, t + 0.17);
  tl.fromTo(S, {[key]: 9 * dir}, {[key]: 0, duration: 0.3, ease: 'elastic.out(1, 0.5)', immediateRender: false}, t + 0.25);
  return k;
};

tl.fromTo(S, {glow: 0}, {glow: 1, duration: 0.5, ease: 'sine.out', immediateRender: false}, L - 0.3);
tl.fromTo(S, {glow: 1}, {glow: 0, duration: 0.9, ease: 'sine.in', immediateRender: false}, L + 0.2);
tl.fromTo(S, {breathe: 0}, {breathe: 1, duration: 1.2, ease: 'sine.inOut', immediateRender: false}, L);
tl.fromTo(S, {tailAmp: 0}, {tailAmp: 1, duration: 1.5, ease: 'sine.inOut', immediateRender: false}, L + 0.4);

// first blink, right after the painting is done
blink(L + 0.35, 0.16, 0.1, 0.26);

// sparrow wakes: looks around, hops, takes off
export const FLY0 = L + 2.0;
export const FLY1 = Math.min(FLY0 + 5.4, 26.6);
tl.fromTo(S.bird, {look: 0}, {look: 1, duration: 0.18, ease: 'power2.out', immediateRender: false}, L + 0.9);
tl.fromTo(S.bird, {look: 1}, {look: -0.6, duration: 0.18, ease: 'power2.inOut', immediateRender: false}, L + 1.3);
tl.fromTo(S.bird, {look: -0.6}, {look: 0, duration: 0.15, ease: 'power2.out', immediateRender: false}, L + 1.6);
tl.fromTo(S.bird, {hop: 0}, {hop: 1, duration: 0.14, ease: 'power2.out', immediateRender: false}, L + 1.55);
tl.fromTo(S.bird, {hop: 1}, {hop: 0, duration: 0.14, ease: 'power2.in', immediateRender: false}, L + 1.69);
tl.fromTo(S.bird, {squash: 0}, {squash: 1, duration: 0.12, ease: 'power2.out', immediateRender: false}, FLY0 - 0.15);
tl.fromTo(S.bird, {squash: 1}, {squash: 0, duration: 0.12, ease: 'power2.out', immediateRender: false}, FLY0 - 0.03);
tl.fromTo(S.bird, {fly: 0}, {fly: 1, duration: 0.08, immediateRender: false}, FLY0 - 0.04);
tl.fromTo(S.bird, {u: 0}, {u: 1, duration: FLY1 - FLY0, ease: 'sine.inOut', immediateRender: false}, FLY0);
tl.fromTo(S.bird, {fly: 1}, {fly: 0, duration: 0.18, ease: 'power1.in', immediateRender: false}, FLY1 - 0.1);
tl.fromTo(S.bird, {land: 0}, {land: 1, duration: 0.25, ease: 'sine.inOut', immediateRender: false}, FLY1 - 0.12);
tl.fromTo(S.bird, {squash: 0}, {squash: 1, duration: 0.1, ease: 'power2.out', immediateRender: false}, FLY1);
tl.fromTo(S.bird, {squash: 1}, {squash: 0, duration: 0.3, ease: 'elastic.out(1, 0.45)', immediateRender: false}, FLY1 + 0.1);

// the cat notices and follows the bird with its eyes and head
tl.fromTo(S, {gazeBird: 0}, {gazeBird: 1, duration: 0.35, ease: 'power2.out', immediateRender: false}, L + 1.1);
twitch('earR', FLY0 + 0.9, 1);
blink(FLY0 + 2.3, 0.08, 0.04, 0.14);
twitch('earL', FLY0 + 2.7, -1);
twitch('earR', FLY0 + 4.3, 1);
// bird lands on the head → both ears flick, eyes roll up to look at it
twitch('earL', FLY1 + 0.02, -1);
twitch('earR', FLY1 + 0.08, 1);
tl.fromTo(S.bird, {look: 0}, {look: 1, duration: 0.2, immediateRender: false}, FLY1 + 0.5);
tl.fromTo(S.bird, {look: 1}, {look: 0, duration: 0.25, immediateRender: false}, FLY1 + 1.0);
tl.fromTo(S.bird, {beak: 0}, {beak: 1, duration: 0.07, immediateRender: false}, FLY1 + 0.75);
tl.fromTo(S.bird, {beak: 1}, {beak: 0, duration: 0.09, immediateRender: false}, FLY1 + 0.84);

// look back at the viewer, slow contented blink, then the smirk
const BACK = FLY1 + 1.0;
tl.fromTo(S, {gazeBird: 1}, {gazeBird: 0, duration: 0.4, ease: 'power2.inOut', immediateRender: false}, BACK);
blink(BACK + 0.45, 0.24, 0.22, 0.3);
export const SMIRK = BACK + 1.35;
tl.fromTo(S, {smug: 0}, {smug: 1, duration: 0.45, ease: 'power2.out', immediateRender: false}, SMIRK - 0.1);
tl.fromTo(S, {smirk: 0}, {smirk: 1, duration: 0.45, ease: 'back.out(2)', immediateRender: false}, SMIRK);
tl.fromTo(S, {headTilt: 0}, {headTilt: -5, duration: 0.6, ease: 'sine.inOut', immediateRender: false}, SMIRK - 0.1);
twitch('earR', SMIRK + 0.5, 1);
tl.fromTo(S.bird, {beak: 0}, {beak: 1, duration: 0.07, immediateRender: false}, SMIRK + 0.35);
tl.fromTo(S.bird, {beak: 1}, {beak: 0, duration: 0.09, immediateRender: false}, SMIRK + 0.44);
tl.fromTo(S, {tailFlick: 0}, {tailFlick: 1, duration: 0.25, ease: 'power2.out', immediateRender: false}, SMIRK + 0.2);
tl.fromTo(S, {tailFlick: 1}, {tailFlick: 0, duration: 0.6, ease: 'sine.inOut', immediateRender: false}, SMIRK + 0.45);
tl.set({}, {}, DURATION);

// ── sparrow flight path (world). GSAP tweens u; positions come from this spline. ──
const LAND: P = [CAT_AT[0] + 2, CAT_AT[1] - 636 - 38];
const FLIGHT_PTS: P[] = [
  [BIRD_PERCH[0], BIRD_PERCH[1]], [1530, 560], [1470, 380], [1290, 230], [1060, 130], [800, 160], [640, 310], [600, 510],
  [700, 650], [830, 610], [760, 450], [650, 300], [740, 170], [880, 140], [950, 190], LAND,
];
export const FLIGHT = spline(FLIGHT_PTS, false, 3);
export const FLIGHT_CL = cumLens(FLIGHT);
export const LAND_LOCAL: P = [2, -664];

// GSAP tags its targets with a circular `_gsap` cache, so copy plain data only.
const snap = (o: any): any => {
  if (typeof o !== 'object' || o === null) return o;
  const r: any = {};
  for (const k of Object.keys(o)) if (k !== '_gsap') r[k] = snap(o[k]);
  return r;
};
export const sample = (t: number) => {
  tl.seek(clamp(t, 0, DURATION), true);
  return snap(S) as State;
};
export const birdPathAt = (u: number) => pointAt(FLIGHT, FLIGHT_CL, u).pt;
