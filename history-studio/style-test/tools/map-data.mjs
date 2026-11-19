// Projects Natural Earth coastlines (world-atlas) for the North Sea frame and
// writes map-data.json: land path, label points and the raid route.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoConicConformal, geoPath, geoGraticule } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const W = 1920, H = 1080;
const res = process.env.RES || "50m";
const topo = JSON.parse(readFileSync(require.resolve(`world-atlas/land-${res}.json`), "utf8"));
const land = feature(topo, topo.objects.land);

// Frame: Scotland/Northumbria on the left, Norway top right, Denmark bottom right.
const frame = { type: "MultiPoint", coordinates: [[-6.5, 53.3], [12.5, 53.3], [-6.5, 63.2], [12.5, 63.2]] };
const projection = geoConicConformal()
  .parallels([54, 62])
  .rotate([-3, 0])
  .fitExtent([[-40, -40], [W + 40, H + 40]], frame)
  .clipExtent([[-20, -20], [W + 20, H + 20]]);
const path = geoPath(projection).digits(1);
const p = (lon, lat) => projection([lon, lat]).map((v) => Math.round(v * 10) / 10);

const places = {
  start: p(5.3, 60.3),         // Hordaland coast, western Norway
  lindisfarne: p(-1.8, 55.68),
  norway: p(9.0, 61.6),
  northumbria: p(-2.6, 55.0),
  scotland: p(-4.2, 57.2),
  denmark: p(9.2, 56.1),
  northSea: p(2.6, 57.4),
};
// Route: a gentle quadratic curve bowing north of the straight line, plus
// 101 points spaced evenly along it (x, y, heading in degrees) so a marker can
// ride the head of the line as it draws.
const [x0, y0] = places.start, [x2, y2] = places.lindisfarne;
const c = [(x0 + x2) / 2 + 60, (y0 + y2) / 2 - 140];
const at = (t) => {
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * c[0] + t * t * x2, u * u * y0 + 2 * u * t * c[1] + t * t * y2];
};
const dense = [], cum = [0];
for (let i = 0; i <= 2000; i++) dense.push(at(i / 2000));
for (let i = 1; i < dense.length; i++) {
  cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
}
const total = cum[cum.length - 1];
const samples = [];
for (let k = 0, j = 0; k <= 100; k++) {
  const target = (total * k) / 100;
  while (j < cum.length - 2 && cum[j + 1] < target) j++;
  const a = dense[Math.max(0, j - 1)], b = dense[Math.min(dense.length - 1, j + 1)];
  const heading = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  samples.push([Math.round(dense[j][0] * 10) / 10, Math.round(dense[j][1] * 10) / 10, Math.round(heading * 10) / 10]);
}
const route = {
  d: `M${x0},${y0} Q${c[0].toFixed(1)},${c[1].toFixed(1)} ${x2},${y2}`,
  length: Math.ceil(total),
  samples,
};

const graticule = path(geoGraticule().step([2, 1])());
const out = { width: W, height: H, land: path(land), graticule, places, route };
writeFileSync(new URL("../map-data.json", import.meta.url), JSON.stringify(out));
console.log(`land path ${out.land.length} chars, route ${route.length}px`, places);
