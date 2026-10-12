# Kitu Paint

A 30-second pencil-to-watercolor timelapse of Kitu and a sparrow, with a palette, brush and water jar.
It's built from SVG, animated with GSAP and rendered by Remotion. The background is fully transparent.

| Time | What happens |
|---|---|
| 0–6 s | A pencil sketches the construction lines, the contours and the hatching. |
| 6–7.4 s | The props get their washes and paint fills the palette wells. |
| 7.4–18.8 s | The brush rinses, loads color and paints in order: fur, whites, pinks, sparrow, shading, tabby markings, green eyes, then fine detail. |
| ~19 s | The painting comes alive: Kitu blinks and starts breathing, and the tail sways. |
| 21–26 s | The sparrow hops, takes off and flutters around. Kitu's eyes and head follow it, the ears twitch, and she blinks. |
| 26–30 s | The sparrow lands on Kitu's head. She looks up at it, then back at the viewer, gives a slow blink and ends on a smug smirk. |

## Commands

```bash
npm run studio        # live preview / scrub in Remotion Studio
npm run render:mov    # ProRes 4444 with alpha  -> out/kitu-paint-alpha.mov
npm run render:webm   # VP9 with alpha, transcoded from the .mov -> out/kitu-paint-alpha.webm
```

## Files

- `src/art.ts` holds the shapes and colors: the cat in cat-local space, the sparrow in bird-local space and the props in world space.
- `src/items.ts` turns those shapes into washes, inks and pencil strokes, and tags each with the paint pass that lays it down.
- `src/timeline.ts` is one paused GSAP timeline that drives everything: the pencil route, the brush route (dips and palette loads), the reveals, blinks, ears, the flight `u` and the smirk.
- `src/Scene.tsx` is the SVG renderer. It handles the watercolor look (wobbly edges, layered halos, pooled edges, wet-in-wet blooms, paper-grain multiply) and the animated face.
