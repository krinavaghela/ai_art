#!/bin/zsh
# Render review stills on a cream background: scripts/shots.sh 90 300 570 ...
# Output: out/review/f<frame>_v.jpg  (needs Python 3 with Pillow)
cd "${0:A:h}/.."
npx remotion bundle --out-dir=build >/dev/null 2>&1 || { echo "bundle failed"; exit 1; }
mkdir -p out/review
for f in "$@"; do
  npx remotion still build CatPaint "out/review/f$f.png" --frame="$f" >/dev/null 2>&1 &
done
wait
python3 scripts/flatten.py out/review/f*.png >/dev/null
ls out/review/*_v.jpg
