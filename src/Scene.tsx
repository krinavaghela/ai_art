import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {P, rough, polyD, blob, clamp, lerp, pointAt} from './geom';
import {
  C, Wash, Ink, Sketch, PartId, Live, CAT_AT, BIRD_PERCH, BIRD_SCALE, B, PENCIL,
  eyeOutline, eyeCentre, mouthLines, whiskers, EAR_PIVOT_L, EAR_PIVOT_R, WATER, HEAD_SCALE, HEAD_ORIGIN,
} from './art';
import {WASHES, INKS, SKETCHES, geo} from './items';
import {FUR} from './fur';
import {
  FPS as _FPS, DURATION as _DUR, sample, State, ORIGIN, MAXR, PENCIL_ROUTE, BRUSH_ROUTE, RIPPLES, STAINS,
  birdPathAt, LAND_LOCAL,
} from './timeline';

export const FPS = _FPS;
export const DURATION = _DUR;

const CUSTOM = new Set(['eyeL', 'eyeR', 'eyeInk', 'mouth', 'whisk']);
const BASES = new Set(WASHES.filter((w) => !w.glaze).map((w) => w.id));

const strHash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 997) + 1;
};
const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(clamp(v * f, 0, 255)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
const tint = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

// cache of hand-wobbled outlines for static shapes
const cache = new Map<string, {a: string; b: string; aPts: P[]}>();
const washPaths = (x: Wash, lv: Live) => {
  const dynamic = typeof x.pts === 'function';
  const key = x.id;
  if (!dynamic && cache.has(key)) return cache.get(key)!;
  const pts = geo(x.pts, lv);
  const seed = strHash(x.id);
  const amp = x.amp ?? 3;
  const hole = x.hole ? polyD(x.hole) : '';
  let r: {a: string; b: string; aPts: P[]};
  if (x.multi) {
    const polys = x.multi.map((m, i) => rough(m, true, amp, seed + i, 12));
    r = {a: polys.map((q) => polyD(q)).join(''), b: '', aPts: polys.flat()};
  } else {
    const aPts = rough(pts, true, amp, seed, 30);
    const bPts = rough(pts, true, amp * 1.9 + 1, seed + 7, 46);
    r = {a: polyD(aPts) + hole, b: polyD(bPts) + hole, aPts};
  }
  if (!dynamic) cache.set(key, r);
  return r;
};

const RevealMask: React.FC<{id: string; o: P; r: number; seed: number}> = ({id, o, r, seed}) => (
  <mask id={id} maskUnits="userSpaceOnUse" x={-3000} y={-3000} width={8000} height={8000}>
    <path d={polyD(blob(o[0], o[1], Math.max(0.01, r), seed, 0.3, 46, r * 0.012))} fill="#fff" />
  </mask>
);

const WashEl: React.FC<{x: Wash; p: number; lv: Live}> = ({x, p, lv}) => {
  if (p <= 0.001) return null;
  const {a, b, aPts} = washPaths(x, lv);
  const seed = strHash(x.id);
  const o = ORIGIN[x.id] ?? [0, 0];
  const maxR = MAXR[x.id] ?? 100;
  const r = maxR * p;
  const mid = `m-${x.id}`;
  const useMask = p < 1 && maxR > 22;
  const edge = shade(x.fill, 0.74);
  let blooms: React.ReactNode = null;
  if (x.mottle) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    aPts.forEach(([px, py]) => { x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); });
    const sz = Math.min(x1 - x0, y1 - y0);
    const hues = ['#c99d5e', '#8e97a0', tint(x.fill, 0.45), shade(x.fill, 0.8), '#d4b07a', '#9ca3a6'];
    blooms = (
      <g clipPath={`url(#clip-${x.id})`}>
       <g filter="url(#wc-soft)">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const rx = x0 + (x1 - x0) * (0.1 + 0.8 * ((seed * (i + 3) * 0.6180339) % 1));
          const ry = y0 + (y1 - y0) * (0.1 + 0.8 * ((seed * (i + 7) * 0.4142135) % 1));
          const rr = sz * (0.2 + 0.1 * (i % 3));
          return <path key={i} d={polyD(blob(rx, ry, rr, seed + i, 0.45, 30))} fill={hues[i % hues.length]} opacity={0.2} />;
        })}
       </g>
      </g>
    );
  }
  return (
    <g clipPath={x.clip ? `url(#clip-${x.clip})` : undefined} opacity={!useMask && p < 1 ? p : 1}>
      {useMask && <RevealMask id={mid} o={o} r={r} seed={seed} />}
      <g mask={useMask ? `url(#${mid})` : undefined}>
        {!x.glaze && <path d={a} fill={C.cream} opacity={0.9} fillRule="evenodd" />}
        {!x.glaze && b && <path d={b} fill={x.fill} opacity={0.3} fillRule="evenodd" />}
        <path d={a} fill={x.fill} opacity={x.glaze ? x.alpha : x.alpha * 0.82} fillRule="evenodd" />
        {blooms}
        {!x.multi && <path d={a} fill="none" stroke={edge} strokeWidth={x.glaze ? 1 : 1.4} opacity={x.glaze ? 0.15 : 0.22} />}
        {useMask && !x.glaze && (
          <g clipPath={`url(#clip-${x.id})`}>
            <path d={polyD(blob(o[0], o[1], r, seed, 0.3, 46, r * 0.012))} fill="none" stroke={edge} strokeWidth={4} opacity={0.5 * (1 - p)} />
          </g>
        )}
      </g>
    </g>
  );
};

const kindOf = (w: Wash) => {
  if (w.kind) return w.kind;
  if (w.part === 'brush' || CUSTOM.has(w.id)) return 'none';
  if (w.pass === 'shade') return 'soft';
  if (w.pass === 'marks' || w.pass === 'detail') return 'dry';
  return 'wet';
};

const dash = (p: number) => (p >= 0.999 ? {} : {pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - p});

const InkEl: React.FC<{x: Ink; p: number; lv: Live}> = ({x, p, lv}) => {
  if (p <= 0.001) return null;
  const pts = geo(x.pts, lv);
  const d = polyD(pts.length > 4 ? rough(pts, false, 0.5, strHash(x.id), 20) : pts, false);
  return <path d={d} fill="none" stroke={x.stroke} strokeWidth={x.width} opacity={x.alpha} strokeLinecap="round" strokeLinejoin="round" {...dash(p)} />;
};

const skCache = new Map<string, [string, string]>();
const SketchEl: React.FC<{x: Sketch; p: number; alpha: number; lv: Live}> = ({x, p, alpha, lv}) => {
  if (p <= 0.001 || alpha <= 0.002) return null;
  const dynamic = typeof x.pts === 'function';
  let ds = skCache.get(x.id);
  if (!ds || dynamic) {
    const pts = geo(x.pts, lv);
    const seed = strHash(x.id) + 50;
    const closed = x.closed;
    const a = rough(pts, closed, x.kind === 'hatch' ? 0.6 : 1.5, seed, 22);
    const b = rough(pts, closed, x.kind === 'hatch' ? 0.8 : 2.4, seed + 3, 30);
    if (closed) {
      // pencil overshoots where a loop closes
      a.push(a[0], a[1], a[2]);
      b.push(b[0]);
    }
    ds = [polyD(a, false), polyD(b, false)];
    if (!dynamic) skCache.set(x.id, ds);
  }
  const w = x.kind === 'construct' ? 1.1 : x.kind === 'hatch' ? 1.0 : x.kind === 'detail' ? 1.3 : 1.7;
  const body = (
    <g opacity={alpha}>
      <path d={ds[0]} fill="none" stroke={C.graphite} strokeWidth={w} opacity={0.75} strokeLinecap="round" strokeLinejoin="round" {...dash(p)} />
      {x.kind !== 'hatch' && <path d={ds[1]} fill="none" stroke={C.graphite} strokeWidth={w * 0.6} opacity={0.4} strokeLinecap="round" {...dash(p)} />}
    </g>
  );
  if (x.clip) {
    return (
      <g>
        <clipPath id={`hc-${x.id}`}>
          <path d={polyD(x.clip)} />
        </clipPath>
        <g clipPath={`url(#hc-${x.id})`}>{body}</g>
      </g>
    );
  }
  return body;
};

const sketchAlpha = (x: Sketch, st: State) => {
  if (x.kind === 'construct') return 0.38 * st.construct;
  const base = x.kind === 'hatch' ? 0.5 : x.kind === 'detail' ? 0.62 : 1;
  return base * st.skAll * (x.dyn ? st.skDyn : 1);
};

// Everything that belongs to one part: clip defs, washes, inks, then pencil on top.
const Part: React.FC<{id: PartId; st: State; lv: Live; children?: React.ReactNode; after?: React.ReactNode}> = ({id, st, lv, children, after}) => {
  const ws = WASHES.filter((w) => w.part === id && !CUSTOM.has(w.id));
  // consecutive layers sharing a filter and a clip are filtered together, then re-clipped
  // so soft bleeds stay inside the silhouette they were painted on
  const groups: {kind: string; clip?: string; items: Wash[]}[] = [];
  ws.forEach((w) => {
    const k = kindOf(w);
    const last = groups[groups.length - 1];
    if (last && last.kind === k && last.clip === w.clip) last.items.push(w);
    else groups.push({kind: k, clip: w.clip, items: [w]});
  });
  const fur = FUR.filter((f) => f.part === id && (st.fur[f.key] ?? 0) > 0.001);
  return (
    <g>
      <defs>
        {ws.filter((w) => !w.glaze).map((w) => (
          <clipPath key={w.id} id={`clip-${w.id}`}>
            <path d={washPaths(w, lv).a} fillRule="evenodd" />
          </clipPath>
        ))}
      </defs>
      {groups.map((g, gi) => {
        const live = g.items.filter((w) => (st.w[w.id] ?? 0) > 0.001);
        if (!live.length) return null;
        return (
          <g key={gi} clipPath={g.clip ? `url(#clip-${g.clip})` : undefined}>
            <g filter={g.kind === 'none' ? undefined : `url(#wc-${g.kind})`}>
              {live.map((w) => <WashEl key={w.id} x={w} p={st.w[w.id] ?? 0} lv={lv} />)}
            </g>
          </g>
        );
      })}
      {fur.length > 0 && (
        <g filter="url(#wc-dry)">
          {fur.map((f) => <path key={f.key} d={f.d} fill={f.color} opacity={f.alpha * (st.fur[f.key] ?? 0)} />)}
        </g>
      )}
      {children}
      {INKS.filter((k) => k.part === id).map((k) => (
        <InkEl key={k.id} x={k} p={st.ink[k.id] ?? 0} lv={lv} />
      ))}
      {SKETCHES.filter((s) => s.part === id).map((s) => (
        <SketchEl key={s.id} x={s} p={st.sk[s.id] ?? 0} alpha={sketchAlpha(s, st)} lv={lv} />
      ))}
      {after}
    </g>
  );
};

// ───────────── the animated face ─────────────
const Eye: React.FC<{side: 'L' | 'R'; st: State; gaze: P}> = ({side, st, gaze}) => {
  const pIris = st.w[side === 'L' ? 'eyeL' : 'eyeR'] ?? 0;
  const pInk = st.w.eyeInk ?? 0;
  if (pIris <= 0.001 && pInk <= 0.001) return null;
  const open = Math.min(1 - st.blink, 1 - 0.4 * st.smug);
  const out = eyeOutline(side, open, st.smug * 0.8);
  const d = polyD(out);
  const E = eyeCentre(side);
  const ic: P = [E[0] + gaze[0] * 9, E[1] + 2 + gaze[1] * 6];
  const upper = polyD(out.slice(0, 17), false);
  const lower = polyD([...out.slice(16), out[0]], false);
  const id = `eye${side}`;
  const seed = side === 'L' ? 11 : 12;
  return (
    <g>
      <clipPath id={`${id}-clip`}>
        <path d={d} />
      </clipPath>
      {pIris < 1 && <RevealMask id={`${id}-m`} o={E} r={64 * pIris} seed={seed} />}
      <g mask={pIris < 1 ? `url(#${id}-m)` : undefined}>
        <g clipPath={`url(#${id}-clip)`}>
          <path d={d} fill="#aab65a" />
          <circle cx={ic[0]} cy={ic[1]} r={22} fill="url(#iris)" />
          <circle cx={ic[0]} cy={ic[1]} r={21.5} fill="none" stroke={C.eyeRim} strokeWidth={2.2} opacity={0.5} />
          <ellipse cx={ic[0] + gaze[0] * 1.5} cy={ic[1]} rx={3.8 + st.smug * 0.5} ry={14} fill={C.pupil} opacity={pInk} />
          <path d={upper} fill="none" stroke="#33401c" strokeWidth={10} opacity={0.26} />
          <circle cx={E[0] - 6} cy={E[1] - 5} r={4.2} fill={C.cream} opacity={0.95 * pInk} />
          <circle cx={E[0] + 7} cy={E[1] + 6} r={1.8} fill={C.cream} opacity={0.85 * pInk} />
        </g>
      </g>
      <g opacity={pInk}>
        <path d={upper} fill="none" stroke={C.liner} strokeWidth={3} strokeLinecap="round" />
        <path d={lower} fill="none" stroke={C.liner} strokeWidth={1.7} strokeLinecap="round" opacity={0.85} />
      </g>
    </g>
  );
};

const Face: React.FC<{st: State; gaze: P}> = ({st, gaze}) => {
  const pM = st.w.mouth ?? 0;
  const pW = st.w.whisk ?? 0;
  const [ml, mr] = mouthLines(st.smirk);
  const dots: P[] = [];
  [-1, 1].forEach((s) => [[16, -492], [26, -494], [20, -484], [31, -486], [27, -478]].forEach(([x, y]) => dots.push([x * s, y])));
  return (
    <g>
      <Eye side="L" st={st} gaze={gaze} />
      <Eye side="R" st={st} gaze={gaze} />
      <g opacity={pM}>
        {dots.map((d, i) => (
          <circle key={i} cx={d[0]} cy={d[1] - (d[0] > 0 ? st.smirk * 2.5 : 0)} r={1.5} fill={C.furShade} opacity={0.7} />
        ))}
        <path d={polyD(ml, false)} fill="none" stroke={C.liner} strokeWidth={1.7} strokeLinecap="round" opacity={0.85} />
        <path d={polyD(mr, false)} fill="none" stroke={C.liner} strokeWidth={1.7 + st.smirk * 0.5} strokeLinecap="round" opacity={0.85} />
        <circle cx={-5} cy={-514} r={2.2} fill={C.cream} opacity={0.8} />
      </g>
      {pW > 0.001 &&
        ([-1, 1] as const).flatMap((s) =>
          whiskers(s, st.smirk).map((w, i) => {
            const d = polyD(w, false);
            return (
              <g key={`${s}${i}`}>
                <path d={d} fill="none" stroke="#7d6f5e" strokeWidth={2.6} opacity={0.3} strokeLinecap="round" {...dash(pW)} />
                <path d={d} fill="none" stroke={C.cream} strokeWidth={1.5} opacity={0.95} strokeLinecap="round" {...dash(pW)} />
              </g>
            );
          }),
        )}
    </g>
  );
};

// ───────────── tools ─────────────
const Brush: React.FC<{st: State; t: number}> = ({st, t}) => {
  let {x, y, rot} = st.brush;
  if (st.brush.pass >= 0) {
    const r = BRUSH_ROUTE[st.brush.pass];
    const {pt, ang} = pointAt(r.poly, r.cl, st.brush.u);
    const lt = t - r.t0;
    const sc = 14 * Math.sin(2 * Math.PI * 3.2 * lt) * Math.sin(Math.PI * st.brush.u);
    x = pt[0] - Math.sin(ang) * sc;
    y = pt[1] + Math.cos(ang) * sc;
    rot = 30 + 7 * Math.sin(2 * Math.PI * 1.7 * lt);
  }
  let stain: string | null = null;
  for (const s of STAINS) if (s.t <= t) stain = s.color;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(2)})`}>
      <Part id="brush" st={st} lv={{tailSway: 0}}>
        {stain && <path d={polyD(blob(0, -11, 6, 3, 0.2, 18).map(([px, py]) => [px, -11 + (py + 11) * 2.1] as P))} fill={stain} opacity={0.9} />}
      </Part>
    </g>
  );
};

const PencilTool: React.FC<{st: State; t: number}> = ({st, t}) => {
  if (st.pencil <= 0.001) return null;
  let seg = PENCIL_ROUTE[0];
  for (const s of PENCIL_ROUTE) if (s.t0 <= t) seg = s;
  const p = clamp((t - seg.t0) / (seg.t1 - seg.t0));
  const {pt} = pointAt(seg.poly, seg.cl, p);
  const out = 1 - st.pencil;
  const x = pt[0] + out * (t < 3 ? 700 : 620);
  const y = pt[1] + out * (t < 3 ? 420 : 380);
  const fill = (pts: P[], c: string) => <path d={polyD(pts)} fill={c} />;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(32)`}>
      {fill(PENCIL.body, C.pencilBody)}
      <path d={polyD(PENCIL.facet, false)} stroke="#c8962f" strokeWidth={2} opacity={0.6} />
      <path d="M5 -40 L5 -240" stroke="#f3d483" strokeWidth={2.5} opacity={0.7} />
      {fill(PENCIL.wood, C.pencilWood)}
      {fill(PENCIL.lead, C.graphite)}
      {fill(PENCIL.band, C.ferrule)}
      {fill(PENCIL.eraser, C.eraser)}
      <path d={polyD([...PENCIL.body, PENCIL.body[0]], false)} fill="none" stroke="#8e6a2a" strokeWidth={1.4} opacity={0.6} />
    </g>
  );
};

// ───────────── scene ─────────────
export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const uA = sample(t - 0.14).bird.u;
  const uB = sample(t + 0.14).bird.u;
  const st = sample(t);

  // living motion
  const b = st.breathe * Math.sin((2 * Math.PI * t) / 3.3);
  const sway = st.tailAmp * (5 * Math.sin((2 * Math.PI * t) / 2.7) + 2 * Math.sin((2 * Math.PI * t) / 1.15)) + st.tailFlick * 14;
  const lv: Live = {tailSway: sway};

  // sparrow position
  const fly = st.bird.fly;
  let bird: P = [BIRD_PERCH[0], BIRD_PERCH[1] - st.bird.hop * 22];
  const inFlight = st.bird.u > 0 && st.bird.land < 1;
  if (inFlight) bird = birdPathAt(st.bird.u);
  const vA = birdPathAt(uA);
  const vB = birdPathAt(uB);
  const vx = vB[0] - vA[0];
  const vy = vB[1] - vA[1];

  // cat gaze toward the bird (eyes, then head)
  const eyeW: P = [CAT_AT[0], CAT_AT[1] - 548];
  const head0: P = [...bird] as P;
  const dx = head0[0] - eyeW[0];
  const dy = head0[1] - eyeW[1];
  const len = Math.hypot(dx, dy) || 1;
  const amt = Math.min(1, len / 240) * st.gazeBird;
  const gaze: P = [(dx / len) * amt, (dy / len) * amt];
  const headRot = st.gazeBird * clamp(dx / 700, -1, 1) * 6 * (1 - st.bird.land * 0.7) + st.headTilt;
  const hx = gaze[0] * 6;
  const hy = gaze[1] * 4 - 5.2 * b;
  const headToWorld = (p: P): P => {
    const a = (headRot * Math.PI) / 180;
    const qx = p[0] * HEAD_SCALE;
    const qy = HEAD_ORIGIN[1] + (p[1] - HEAD_ORIGIN[1]) * HEAD_SCALE + 470;
    return [CAT_AT[0] + qx * Math.cos(a) - qy * Math.sin(a) + hx, CAT_AT[1] - 470 + qx * Math.sin(a) + qy * Math.cos(a) + hy];
  };
  if (st.bird.land > 0) {
    const top = headToWorld(LAND_LOCAL);
    const perched: P = [top[0], top[1] - 38];
    const fl = birdPathAt(1);
    bird = [lerp(fl[0], perched[0], st.bird.land), lerp(fl[1], perched[1], st.bird.land)];
  }
  // face direction & body tilt
  let face = -1;
  if (st.bird.u > 0) {
    const sgn = Math.abs(vx) > 2 ? Math.sign(vx) : 1;
    face = sgn * (0.6 + 0.4 * Math.min(1, Math.abs(vx) / 50));
  }
  face = lerp(face, 1, st.bird.land);
  const tilt = fly * clamp((Math.atan2(vy, Math.abs(vx) + 1) * 180) / Math.PI * 0.35, -22, 22) * Math.sign(face) + (st.bird.land > 0 ? headRot : 0);
  const bob = fly * Math.sin(2 * Math.PI * 6.5 * t) * 3;
  const flap = Math.cos(2 * Math.PI * 6.5 * t);
  const sq = st.bird.squash;
  const birdT = `translate(${bird[0].toFixed(1)} ${(bird[1] + bob + sq * 3).toFixed(1)}) rotate(${tilt.toFixed(2)}) scale(${(face * BIRD_SCALE * (1 + sq * 0.08)).toFixed(3)} ${(BIRD_SCALE * (1 - sq * 0.12)).toFixed(3)})`;

  const wingT = (far: boolean) => {
    const f = far ? Math.cos(2 * Math.PI * 6.5 * t + 0.5) * 0.85 : flap;
    return `translate(${B.shoulder[0] + (far ? -3 : 0)} ${B.shoulder[1] + (far ? -2 : 0)}) rotate(${far ? -16 : -8}) scale(1 ${f.toFixed(3)})`;
  };

  // jar water ripples
  const ripples = RIPPLES.flatMap((r) =>
    [0, 0.16].map((off) => {
      const k = (t - r - off) / 0.9;
      if (k < 0 || k > 1) return null;
      return <ellipse key={`${r}-${off}`} cx={1408} cy={806} rx={8 + 74 * k} ry={2 + 10 * k} fill="none" stroke="#8ea69d" strokeWidth={2} opacity={(1 - k) * 0.7} />;
    }),
  );
  const waterP = st.w.water ?? 0;

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <defs>
          <filter id="paper" x={0} y={0} width={1920} height={1080} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={4} result="fine" />
            <feColorMatrix in="fine" type="matrix" values="0.62 0 0 0 0.66  0.62 0 0 0 0.66  0.62 0 0 0 0.66  0 0 0 0 1" result="fineG" />
            <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves={3} seed={9} result="coarse" />
            <feColorMatrix in="coarse" type="matrix" values="0.7 0 0 0 0.66  0.7 0 0 0 0.66  0.7 0 0 0 0.66  0 0 0 0 1" result="coarseG" />
            <feComposite in="fineG" in2="coarseG" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="grain" />
            <feComposite in="SourceGraphic" in2="grain" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} />
          </filter>
          <filter id="wc-wet" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={3} seed={2} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={9} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feGaussianBlur in="d" stdDeviation={0.9} result="db" />
            <feMorphology in="db" operator="erode" radius={2.5} result="er" />
            <feGaussianBlur in="er" stdDeviation={2.5} result="erb" />
            <feComposite in="db" in2="erb" operator="out" result="rim" />
            <feColorMatrix in="rim" type="matrix" values="0.68 0 0 0 0  0 0.66 0 0 0  0 0 0.66 0 0  0 0 0 0.75 0" result="rimD" />
            <feMerge>
              <feMergeNode in="db" />
              <feMergeNode in="rimD" />
            </feMerge>
          </filter>
          <filter id="wc-soft" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={2} seed={5} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={16} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feGaussianBlur in="d" stdDeviation={5} />
          </filter>
          <filter id="wc-dry" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves={2} seed={8} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={3.5} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feGaussianBlur in="d" stdDeviation={0.45} />
          </filter>
          <radialGradient id="iris">
            <stop offset="0" stopColor="#e6e29a" />
            <stop offset="0.3" stopColor={C.eye1} />
            <stop offset="0.78" stopColor={C.eye2} />
            <stop offset="1" stopColor="#647d30" />
          </radialGradient>
        </defs>
        <g filter="url(#paper)">
          <Part id="shadow" st={st} lv={lv} />
          <Part id="paletteSide" st={st} lv={lv} />
          <Part id="palette" st={st} lv={lv} />
          <Part id="jar" st={st} lv={lv}>
            {waterP > 0.99 && st.jarTint > 0 && <path d={polyD(rough(WATER, true, 1.5, 3))} fill="#c39a63" opacity={st.jarTint * 0.32} />}
            {ripples}
          </Part>

          <g transform={`translate(${CAT_AT[0]} ${CAT_AT[1]})`}>
            <g transform={`scale(${(1 + 0.005 * b).toFixed(4)} ${(1 + 0.011 * b).toFixed(4)})`}>
              <Part id="body" st={st} lv={lv} />
              <Part id="legs" st={st} lv={lv} />
            </g>
            <Part id="tail" st={st} lv={lv} />
            <g transform={`translate(${hx.toFixed(2)} ${hy.toFixed(2)}) rotate(${headRot.toFixed(3)} 0 -470) translate(0 ${HEAD_ORIGIN[1]}) scale(${HEAD_SCALE}) translate(0 ${-HEAD_ORIGIN[1]})`}>
              <g transform={`rotate(${st.earL.toFixed(2)} ${EAR_PIVOT_L[0]} ${EAR_PIVOT_L[1]})`}>
                <Part id="earL" st={st} lv={lv} />
              </g>
              <g transform={`rotate(${st.earR.toFixed(2)} ${EAR_PIVOT_R[0]} ${EAR_PIVOT_R[1]})`}>
                <Part id="earR" st={st} lv={lv} />
              </g>
              <Part id="head" st={st} lv={lv}>
                <Face st={st} gaze={gaze} />
              </Part>
            </g>
          </g>

          <Part id="jarFront" st={st} lv={lv} />

          <g transform={birdT}>
            {fly > 0.01 && (
              <g transform={wingT(true)} opacity={fly}>
                <Part id="birdFar" st={st} lv={lv} />
              </g>
            )}
            <g opacity={1}>
              <BirdBody st={st} fly={fly} lv={lv} />
            </g>
            <g transform={`rotate(${(st.bird.look * 16).toFixed(2)} ${B.neck[0]} ${B.neck[1]})`}>
              <BirdHead st={st} lv={lv} />
            </g>
            {fly > 0.01 && (
              <g transform={wingT(false)} opacity={fly}>
                <Part id="birdNear" st={st} lv={lv} />
              </g>
            )}
          </g>

          <Brush st={st} t={t} />
          <PencilTool st={st} t={t} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// bird body: folded wing + legs fade out in flight
const BirdBody: React.FC<{st: State; fly: number; lv: Live}> = ({st, fly, lv}) => {
  const hide = new Set(fly > 0.5 ? ['bWing', 'bBar', 'bMk1', 'bMk2', 'bMk3'] : []);
  const ws = WASHES.filter((w) => w.part === 'bird');
  return (
    <g>
      <defs>
        {ws.map((w) => (
          <clipPath key={w.id} id={`clip-${w.id}`}>
            <path d={washPaths(w, lv).a} />
          </clipPath>
        ))}
      </defs>
      <g filter="url(#wc-wet)">
        {ws.filter((w) => !hide.has(w.id)).map((w) => (
          <WashEl key={w.id} x={w} p={st.w[w.id] ?? 0} lv={lv} />
        ))}
        {FUR.filter((f) => f.part === 'bird').map((f) => <path key={f.key} d={f.d} fill={f.color} opacity={f.alpha * (st.fur[f.key] ?? 0)} />)}
      </g>
      <g opacity={1 - fly}>
        {INKS.filter((k) => k.part === 'bird').map((k) => (
          <InkEl key={k.id} x={k} p={st.ink[k.id] ?? 0} lv={lv} />
        ))}
      </g>
      {fly > 0.01 && <path d="M-6 20 L-12 27 M4 20 L-2 28" stroke={C.bLeg} strokeWidth={2} opacity={fly} strokeLinecap="round" />}
      {SKETCHES.filter((s) => s.part === 'bird' && !(fly > 0.5 && s.id === 'bWing')).map((s) => (
        <SketchEl key={s.id} x={s} p={st.sk[s.id] ?? 0} alpha={sketchAlpha(s, st)} lv={lv} />
      ))}
    </g>
  );
};

const BirdHead: React.FC<{st: State; lv: Live}> = ({st, lv}) => {
  const ws = WASHES.filter((w) => w.part === 'birdHead');
  const beak = st.bird.beak;
  return (
    <g>
      <defs>
        {ws.map((w) => (
          <clipPath key={w.id} id={`clip-${w.id}`}>
            <path d={washPaths(w, lv).a} />
          </clipPath>
        ))}
      </defs>
      <g filter="url(#wc-wet)">
      {ws.map((w) => {
        const el = <WashEl key={w.id} x={w} p={st.w[w.id] ?? 0} lv={lv} />;
        if (w.id === 'bBeakLo') return <g key={w.id} transform={`rotate(${beak * 22} 36 -24)`}>{el}</g>;
        if (w.id === 'bBeakUp') return <g key={w.id} transform={`rotate(${-beak * 8} 36 -26)`}>{el}</g>;
        return el;
      })}
      </g>
      {SKETCHES.filter((s) => s.part === 'birdHead').map((s) => (
        <SketchEl key={s.id} x={s} p={st.sk[s.id] ?? 0} alpha={sketchAlpha(s, st)} lv={lv} />
      ))}
    </g>
  );
};

