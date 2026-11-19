// Tapestry maps: Natural Earth land and countries (world-atlas), projected
// for a frame, with kingdom colours, regions cut out by hand-drawn
// polygons, stitched borders, labels, pins and routes that draw on.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoConicConformal, geoPath } from "d3-geo";
import { feature, merge, mesh } from "topojson-client";
import { C, shape, stitch, solid, flagCloth, r1 } from "./tapestry.mjs";

const require = createRequire(import.meta.url);
const cache = {};
function topo(res) {
  if (!cache[res]) cache[res] = JSON.parse(readFileSync(require.resolve(`world-atlas/countries-${res}.json`), "utf8"));
  return cache[res];
}

// Catmull-Rom through points -> cubic path, plus evenly spaced samples.
function smoothRoute(pts) {
  if (pts.length === 2) {
    const [a, b] = pts;
    const d = `M${r1(a[0])},${r1(a[1])} L${r1(b[0])},${r1(b[1])}`;
    return { d, dense: Array.from({ length: 201 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / 200, a[1] + ((b[1] - a[1]) * i) / 200]) };
  }
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  const dense = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(p2[0])},${r1(p2[1])}`;
    for (let s = 0; s < 60; s++) {
      const t = s / 60, u = 1 - t;
      dense.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  dense.push(pts[pts.length - 1]);
  return { d, dense };
}
function samplesOf(dense, n = 100) {
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = cum[cum.length - 1], out = [];
  for (let k = 0, j = 0; k <= n; k++) {
    const target = (total * k) / n;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const a = dense[Math.max(0, j - 1)], b = dense[Math.min(dense.length - 1, j + 1)];
    out.push([r1(dense[j][0]), r1(dense[j][1]), r1((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI)]);
  }
  return { samples: out, length: Math.ceil(total) };
}

// cfg: { bounds: [[lon,lat],[lon,lat]], res, parallels, center, sea, land,
//   regions: [{ id, countries?, polygon?, within?, fill, hatch?, hidden? }],
//   borders, labels: [{ id?, at:[lon,lat], text, size, color, italic, spacing, anchor }],
//   pins: [{ id, at, color, label, side, labelId }], routes: [{ id, via:[[lon,lat],...], color, width, dash, marker }] }
export function makeMap(k, cfg) {
  const t = topo(cfg.res || "50m");
  const countries = feature(t, t.objects.countries);
  const byName = (n) => countries.features.filter((f) => f.properties.name === n);
  const [[lon0, lat0], [lon1, lat1]] = cfg.bounds;
  const mid = (lon0 + lon1) / 2, midLat = (lat0 + lat1) / 2;
  const frame = { type: "MultiPoint", coordinates: [[lon0, lat0], [lon1, lat0], [lon0, lat1], [lon1, lat1], [mid, lat0], [mid, lat1], [lon0, midLat], [lon1, midLat]] };
  const projection = geoConicConformal()
    .parallels(cfg.parallels || [lat0 + (lat1 - lat0) / 4, lat1 - (lat1 - lat0) / 4])
    .rotate([-(cfg.center ?? (lon0 + lon1) / 2), 0])
    .fitExtent(cfg.extent || [[0, 0], [1920, 1080]], frame)
    .clipExtent([[-60, -60], [1980, 1140]]);
  const path = geoPath(projection).digits(1);
  const pt = (ll) => projection(ll).map(r1);
  const merged = (names) => path(merge(t, t.objects.countries.geometries.filter((g) => names.includes(g.properties.name))));
  const poly = (ring) => `M${ring.map((ll) => pt(ll).join(",")).join(" L")} Z`;

  let svg = `<rect x="-60" y="-60" width="2040" height="1200" fill="${cfg.sea || C.woad}"/>`;
  svg += `<rect x="-60" y="-60" width="2040" height="1200" fill="${k.url("satin2")}"/>`;
  for (let i = 0; i < 8; i++) {
    let d = `M-60,${180 + i * 120}`;
    for (let x = -60; x < 1980; x += 140) d += ` q35,-9 70,0 q35,9 70,0`;
    svg += `<path d="${d}" fill="none" ${stitch(3, C.woad2)}/>`;
  }
  const landPath = path(merge(t, t.objects.countries.geometries));
  svg += shape(k, landPath, cfg.land || C.olive, { outline: false });

  let clipN = 0;
  for (const r of cfg.regions || []) {
    let body = "";
    const fill = r.hatch ? k.url("stripes") : r.fill;
    if (r.countries) body = `<path d="${merged(r.countries)}" fill="${fill}"/><path d="${merged(r.countries)}" fill="${k.url("satin")}"/>`;
    if (r.polygon) {
      const cid = k.id(`clip${clipN++}`);
      body = `<clipPath id="${cid}"><path d="${merged(r.within)}"/></clipPath>
        <g clip-path="url(#${cid})"><path d="${poly(r.polygon)}" fill="${fill}"/><path d="${poly(r.polygon)}" fill="${k.url("satin")}"/></g>`;
    }
    svg += `<g id="${k.id(r.id)}"${r.hidden ? ' style="opacity:0"' : ""}>${body}</g>`;
  }
  const borders = path(mesh(t, t.objects.countries, (a, b) => a !== b));
  if (borders) svg += `<path d="${borders}" fill="none" ${stitch(3, C.linen)} opacity="0.85"/>`;
  svg += `<path d="${landPath}" fill="none" ${stitch(3)}/>`;

  const routes = {};
  for (const r of cfg.routes || []) {
    const { d, dense } = smoothRoute(r.via.map(pt));
    const { samples, length } = samplesOf(dense);
    routes[r.id] = { samples, length };
    const L = length;
    const end = samples[samples.length - 1];
    const a = (end[2] * Math.PI) / 180, ah = 26;
    const head = `M${r1(end[0] + Math.cos(a) * 8)},${r1(end[1] + Math.sin(a) * 8)} L${r1(end[0] - Math.cos(a - 0.5) * ah)},${r1(end[1] - Math.sin(a - 0.5) * ah)} L${r1(end[0] - Math.cos(a + 0.5) * ah)},${r1(end[1] - Math.sin(a + 0.5) * ah)} Z`;
    svg += `<g id="${k.id(r.id)}">
      <mask id="${k.id(r.id + "-mask")}" maskUnits="userSpaceOnUse" x="-60" y="-60" width="2040" height="1200">
        <path id="${k.id(r.id + "-reveal")}" d="${d}" fill="none" stroke="#fff" stroke-width="60" stroke-linecap="round" stroke-dasharray="${L} ${L}" stroke-dashoffset="${L}"/></mask>
      <g mask="url(#${k.id(r.id + "-mask")})">
        <path d="${d}" fill="none" stroke="${C.dark}" stroke-opacity="0.35" stroke-width="${(r.width || 9) + 6}" stroke-linecap="round"/>
        <path d="${d}" fill="none" ${r.dash === false ? solid(r.width || 9, r.color || C.weld) : stitch(r.width || 9, r.color || C.weld)}/>
      </g>
      ${r.arrow === false ? "" : `<path id="${k.id(r.id + "-head")}" d="${head}" fill="${r.color || C.weld}" stroke="${C.dark}" stroke-width="2.5" style="opacity:0"/>`}
    </g>`;
    if (r.marker) {
      const s0 = samples[0];
      svg += `<g id="${k.id(r.id + "-marker")}" transform="translate(${s0[0]},${s0[1]})"><g transform="translate(-4,-6)">
        <line x1="0" y1="0" x2="0" y2="-74" ${solid(5, C.brownDk)}/>${flagCloth(k, 0, -74, r.marker, 0.9)}
        <circle cx="0" cy="0" r="9" fill="${C.dark}"/></g></g>`;
    }
  }
  for (const p of cfg.pins || []) {
    const [x, y] = pt(p.at);
    svg += `<g id="${k.id(p.id)}"><circle cx="${x}" cy="${y}" r="16" fill="${p.color || C.madder}"/><circle cx="${x}" cy="${y}" r="16" fill="none" ${stitch(3)}/><circle cx="${x}" cy="${y}" r="6" fill="${C.linen}"/></g>`;
    if (p.label) {
      const side = p.side || "right", dx = side === "right" ? 30 : side === "left" ? -30 : 0, dy = side === "above" ? -30 : side === "below" ? 52 : 12;
      const anchor = side === "right" ? "start" : side === "left" ? "end" : "middle";
      svg += `<g id="${k.id(p.labelId || p.id + "-label")}">${labelText(x + dx, y + dy, p.label, { size: p.size || 40, anchor, color: p.labelColor || C.linen, halo: p.labelHalo, plaque: p.plaque })}</g>`;
    }
  }
  for (const l of cfg.labels || []) {
    const [x, y] = pt(l.at);
    const el = labelText(x, y, l.text, l);
    svg += l.id ? `<g id="${k.id(l.id)}">${el}</g>` : el;
  }
  return { svg, routes, pt, projection };
}

// Embroidered label: letters in wool with a dark halo so they read on any colour.
export function labelText(x, y, text, o = {}) {
  // One text element; the halo is its own stroke painted under the fill.
  const size = Math.max(28, o.size || 38), color = o.color || C.linen;
  // A linen patch behind dark lettering, for labels that sit on changing colours.
  if (o.plaque) {
    const w = text.length * size * 0.72 + 40, h = size * 1.35, anchor = o.anchor || "middle";
    const x0 = anchor === "start" ? x - 20 : anchor === "end" ? x - w + 20 : x - w / 2;
    return `<rect x="${r1(x0)}" y="${r1(y - size * 1.02)}" width="${r1(w)}" height="${r1(h)}" rx="6" fill="${C.linen}"/>` +
      `<rect x="${r1(x0)}" y="${r1(y - size * 1.02)}" width="${r1(w)}" height="${r1(h)}" rx="6" fill="none" ${stitch(3, C.madder)}/>` +
      `<text x="${r1(x)}" y="${r1(y)}" font-family="EB Garamond" font-weight="700" font-size="${size}" letter-spacing="${o.spacing ?? Math.round(size / 6)}" text-anchor="${anchor}" fill="${C.dark}">${text}</text>`;
  }
  return `<text x="${r1(x)}" y="${r1(y)}" font-family="EB Garamond" font-weight="700" font-size="${size}" letter-spacing="${o.spacing ?? Math.round(size / 6)}" text-anchor="${o.anchor || "middle"}"${o.italic ? ' font-style="italic"' : ""} fill="${color}" stroke="${o.halo || C.dark}" stroke-width="${r1(Math.max(5, size / 6))}" stroke-linejoin="round" paint-order="stroke">${text}</text>`;
}
