#!/usr/bin/env bash
# Renders the film in chunks (so a failure only costs one chunk, and a re-run
# resumes), joins them, lays the narration over the whole film in one piece,
# and makes a smaller copy for phones. The narration is padded with silence
# so the film keeps its closing title after the last word.
#   tools/render-film.sh            (from the video folder)
set -euo pipefail
cd "$(dirname "$0")/.."
source ../studio-env.sh
export NODE_NO_WARNINGS=1
# Keep rendering when the shell that started this script exits.
export HYPERFRAMES_RENDER_DETACHED=1

NAME=the-army-that-walked-across-the-sea
BOUNDS=(0 217 434 651 end)
mkdir -p renders/chunks

for i in 0 1 2 3; do
  out="renders/chunks/part-$i.mp4"
  if [ -s "$out" ]; then echo "part $i already rendered"; continue; fi
  start=${BOUNDS[$i]} end=${BOUNDS[$((i + 1))]}
  echo "rendering part $i from ${start}s to ${end} ($(date +%H:%M))"
  args=(--start "$start" --crf 20 --fps 30 --quiet -o "$out.tmp.mp4")
  [ "$end" != end ] && args+=(--end "$end")
  npx --no-install hyperframes render "${args[@]}"
  mv "$out.tmp.mp4" "$out"
done

echo "joining ($(date +%H:%M))"
printf "file '%s'\n" part-0.mp4 part-1.mp4 part-2.mp4 part-3.mp4 > renders/chunks/list.txt
ffmpeg -nostdin -v error -y -f concat -safe 0 -i renders/chunks/list.txt -i assets/narration.wav \
  -map 0:v -map 1:a -c:v copy -af apad -c:a aac -b:a 192k -shortest -movflags +faststart "renders/$NAME.mp4"

echo "making the phone copy ($(date +%H:%M))"
ffmpeg -nostdin -v error -y -i "renders/$NAME.mp4" -vf scale=1280:-2 -c:v libx264 -crf 27 -preset slow \
  -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "renders/$NAME-720p.mp4"

ls -la renders
echo "done ($(date +%H:%M))"
