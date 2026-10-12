#!/bin/zsh
# Render review stills: ./shots.sh 90 300 ...  (frames) -> out/review/fN_v.jpg on cream
cd "${0:A:h}"
npx remotion bundle --out-dir=build >/dev/null 2>&1 || { echo bundle failed; exit 1; }
mkdir -p out/review
for f in "$@"; do
  npx remotion still build KituPaint out/review/f$f.png --frame=$f >/dev/null 2>&1 &
done
wait
python3 "$FLAT" out/review/f*.png >/dev/null
ls out/review/*_v.jpg
