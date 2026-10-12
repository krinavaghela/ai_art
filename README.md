# Cat Paint

A 30-second pencil-to-watercolor timelapse of Kitu the cat and a sparrow, with a palette, a brush and a water jar.
It's drawn in SVG, animated with GSAP and rendered with Remotion. The background is fully transparent.

Preview: [`media/cat-paint-alpha.webm`](media/cat-paint-alpha.webm) (VP9 with alpha)

| Time | What happens |
|---|---|
| 0–6 s | A pencil sketches the construction lines, the contours and the hatching. |
| 6–7.4 s | The props get their washes and paint fills the palette wells. |
| 7.4–18.8 s | The brush rinses, loads color and paints in order: fur, whites, pinks, sparrow, shading, tabby markings, green eyes, then fine detail. |
| ~19 s | The painting comes alive: Kitu blinks and starts breathing, and the tail sways. |
| 21–26 s | The sparrow hops, takes off and flutters around. Kitu's eyes and head follow it, the ears twitch, and she blinks. |
| 26–30 s | The sparrow lands on Kitu's head. She looks up at it, then back at the viewer, gives a slow blink and ends on a smug smirk. |

## Getting started

```bash
npm install
npm run studio        # live preview and scrubbing in Remotion Studio
npm run render:mov    # ProRes 4444 with alpha -> out/cat-paint-alpha.mov
npm run render:webm   # VP9 with alpha, transcoded from the .mov -> out/cat-paint-alpha.webm
```

`scripts/shots.sh 90 300 570` renders review stills on a cream background into `out/review/` (needs Python 3 with Pillow).

## Project structure

```
src/
  index.ts              Remotion entry point
  Root.tsx              composition: 1920×1080, 30 fps, 30 s
  scene/Scene.tsx       SVG renderer: watercolor filters, washes, fur, animated face, sparrow, tools
  artwork/art.ts        shapes and colors (cat, sparrow, palette, jar, brush, pencil)
  artwork/items.ts      washes, ink lines and pencil strokes, each tagged with its paint pass
  artwork/fur.ts        dry-brush fur strokes that follow the form
  animation/timeline.ts one paused GSAP timeline: pencil route, brush route, reveals, blinks, flight, smirk
  lib/geom.ts           splines, hand-drawn wobble, tapered strokes, blobs
scripts/
  shots.sh              review stills
  flatten.py            flattens transparent frames onto cream
media/
  cat-paint-alpha.webm  rendered film with alpha
```

Renders go to `out/`, which git ignores. The ProRes file is about 900 MB, over GitHub's 100 MB file limit.

Rendering on an 8 GB Mac is limited to 3 Chrome tabs; more tabs run out of memory on the filter-heavy frames.
