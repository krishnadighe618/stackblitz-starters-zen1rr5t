// YouTube thumbnails for The Army That Walked Across the Sea, drawn with the
// channel's tapestry kit. Writes one still HyperFrames project per variant in
// thumbnail/<id>/. Snapshot each with `npx hyperframes snapshot --at 0`.
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { C, ctx, defs, stitch, solid, shape, person, horse, frieze, shore, ice, hole, r1, rng } from "../../kit/tapestry.mjs";
import { makeMap } from "../../kit/maps.mjs";

const folder = join(dirname(fileURLToPath(import.meta.url)), "..");

// Big wool lettering: weld or linen fill with a thick dark outline under it.
const words = (lines) => lines.map(([text, x, y, size, color]) =>
  `<text x="${x}" y="${y}" font-family="EB Garamond" font-weight="700" font-size="${size}" letter-spacing="${Math.round(size * 0.02)}"
    fill="${color}" stroke="${C.dark}" stroke-width="${Math.round(size / 9)}" stroke-linejoin="round" paint-order="stroke">${text}</text>`).join("");

function variantA(k) {
  const rnd = rng(7);
  let flakes = "";
  for (let i = 0; i < 26; i++) {
    const x = 60 + rnd() * 1800, y = 60 + rnd() * 460, r = 7 + rnd() * 8;
    flakes += `<path d="M${r1(x - r)},${r1(y)} h${r1(2 * r)} M${r1(x)},${r1(y - r)} v${r1(2 * r)} M${r1(x - r * 0.7)},${r1(y - r * 0.7)} l${r1(r * 1.4)},${r1(r * 1.4)} M${r1(x + r * 0.7)},${r1(y - r * 0.7)} l${r1(-r * 1.4)},${r1(r * 1.4)}" ${solid(3, C.linen)} opacity="0.55"/>`;
  }
  const crack = "M-20,1000 L170,950 L330,975 L520,915 L700,950 L860,905 L960,935";
  return `
    <rect width="1920" height="1080" fill="${C.woadDk}"/><rect width="1920" height="1080" fill="${k.url("satin")}"/>
    ${flakes}
    ${shore(k, 760, 2000, 585, 46, { fill: C.oliveDk, snow: true, seed: 5 })}
    ${ice(k, { y: 580, seed: 11, cracks: 4, drifts: 5 })}
    ${[[980, 640, 0.5], [1090, 645, 0.5], [1200, 642, 0.5], [1310, 650, 0.5]].map(([x, y, s], i) =>
      i % 2 ? horse(k, x, y, { scale: s, rider: { side: "se", hat: "brim" } }) : person(k, x, y, { side: "se", weapon: "musket", scale: s * 1.6 })).join("")}
    <path d="${crack}" fill="none" ${solid(14, C.woad3)}/><path d="${crack}" fill="none" ${stitch(5, C.dark)}/>
    ${hole(k, 1110, 960, 190)}
    ${horse(k, 1640, 1000, { scale: 2.3, color: C.brownDk, rider: { side: "se", weapon: "sword", hat: "brim", feather: C.weld, arm: "point" } })}
    ${person(k, 1310, 1000, { side: "se", weapon: "banner", flag: "se", arm: "hold", scale: 2.9, pose: "walk" })}
    ${words([["THE SEA", 80, 250, 190, C.linen], ["FROZE", 70, 500, 300, C.weld]])}
    ${frieze(1020, 60)}`;
}

function variantB(k) {
  const lost = [
    [[12.3, 56.47], [13.3, 56.47], [13.6, 56.45], [14.3, 56.3], [14.55, 56.15], [14.55, 55.2], [12.3, 55.2]],
    [[14.5, 56.5], [15.6, 56.5], [16.4, 56.35], [16.4, 55.9], [14.5, 55.9]],
    [[11.5, 57.62], [12.2, 57.62], [12.45, 57.5], [12.75, 57.15], [13.1, 56.9], [13.4, 56.65], [13.3, 56.47], [11.5, 56.47]],
    [[10.8, 59.1], [11.6, 59.1], [11.95, 58.7], [12.1, 58.3], [12.05, 57.95], [11.85, 57.65], [10.8, 57.65]],
  ];
  const m = makeMap(k, {
    bounds: [[4.5, 54.2], [19.5, 60.2]], res: "50m", extent: [[0, 0], [1920, 1020]],
    regions: [
      { id: "se", countries: ["Sweden"], fill: C.olive2 },
      { id: "dkno", countries: ["Denmark", "Norway"], fill: C.madder },
      ...lost.map((polygon, i) => ({ id: `lost${i}`, polygon, within: ["Sweden"], fill: C.weld })),
    ],
  });
  // An arrow from the words to Scania.
  const [sx, sy] = m.pt([13.6, 56.0]);
  const arrow = `M760,560 Q${r1((760 + sx) / 2)},${r1(sy - 260)} ${r1(sx - 60)},${r1(sy - 70)}`;
  const a = Math.atan2(70, 60);
  const head = `M${r1(sx - 40)},${r1(sy - 48)} l${r1(-44 * Math.cos(a - 0.5))},${r1(-44 * Math.sin(a - 0.5))} M${r1(sx - 40)},${r1(sy - 48)} l${r1(-44 * Math.cos(a + 0.5))},${r1(-44 * Math.sin(a + 0.5))}`;
  return `${m.svg}
    <path d="${arrow}" fill="none" ${solid(26, C.dark)}/><path d="${arrow}" fill="none" ${solid(14, C.linen)}/>
    <path d="${head}" fill="none" ${solid(26, C.dark)}/><path d="${head}" fill="none" ${solid(14, C.linen)}/>
    ${words([["DENMARK", 60, 250, 210, C.linen], ["LOST THIS", 60, 470, 210, C.weld]])}
    ${frieze(1020, 60)}`;
}

const VARIANTS = { a: variantA, b: variantB };
for (const [id, draw] of Object.entries(VARIANTS)) {
  const dir = join(folder, "thumbnail", id);
  mkdirSync(join(dir, "assets"), { recursive: true });
  copyFileSync(join(folder, "assets/tex-linen.jpg"), join(dir, "assets/tex-linen.jpg"));
  const k = ctx(`t${id}`);
  writeFileSync(join(dir, "index.html"), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: ${C.linen}; }
      #root .fill { position: absolute; inset: 0; width: 100%; height: 100%; }
      #t${id}-tex { background-image: url(assets/tex-linen.jpg); background-size: 512px 512px; mix-blend-mode: multiply; opacity: 0.6; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="thumb-${id}" data-width="1920" data-height="1080" data-start="0" data-duration="1" data-no-timeline>
      <svg class="fill" viewBox="0 0 1920 1080"><defs>${defs(k)}</defs>${draw(k)}</svg>
      <div id="t${id}-tex" class="fill" data-layout-ignore data-layout-allow-occlusion></div>
    </div>
  </body>
</html>
`);
  writeFileSync(join(dir, "hyperframes.json"), JSON.stringify({ paths: { assets: "assets" } }, null, 2) + "\n");
  console.log("wrote", join("thumbnail", id, "index.html"));
}
