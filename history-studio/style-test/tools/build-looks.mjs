// Builds the style test: one 8-second scene (a map of the raid route, then a
// longship off Lindisfarne) drawn in four looks. Writes compositions/look-*.html
// and index.html. Run: node tools/build-looks.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const here = (p) => new URL(`../${p}`, import.meta.url);
const map = JSON.parse(readFileSync(here("map-data.json"), "utf8"));
const P = map.places;
const SCENE = 8; // seconds per look
const NARRATION_AT = 0.6;
const NARRATION_LEN = Math.ceil(
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", "assets/narration.wav"], { cwd: new URL("..", import.meta.url) }).toString()) * 10,
) / 10;

// ---------- shared geometry ----------

const r1 = (n) => Math.round(n * 10) / 10;

function waveLine(y, amp, wl, x0 = -720, x1 = 2640) {
  let d = `M${x0},${y}`;
  for (let x = x0; x < x1; x += wl) d += ` q${wl / 4},${-amp} ${wl / 2},0 q${wl / 4},${amp} ${wl / 2},0`;
  return d;
}
function waveBand(y, amp, wl, bottom = 1100, x0 = -720, x1 = 2640) {
  const xe = x0 + Math.ceil((x1 - x0) / wl) * wl;
  return `${waveLine(y, amp, wl, x0, x1)} L${xe},${bottom} L${x0},${bottom} Z`;
}
// Sea rows, back to front. The ship sits between rows 2 and 3.
const ROWS = [
  { y: 640, amp: 8, wl: 120, drift: 120 },
  { y: 770, amp: 13, wl: 180, drift: 180 },
  { y: 925, amp: 20, wl: 260, drift: 520 },
];

// Longship in local coordinates: waterline at y=0, prow towards +x.
const SHIP = {
  hull: "M-380,-175 Q-350,-40 -250,12 L250,12 Q350,-40 392,-205 L368,-200 Q330,-72 240,-44 L-240,-44 Q-330,-60 -357,-172 Z",
  plank: "M-352,-118 Q-300,-12 -228,-16 L228,-16 Q318,-26 364,-146",
  head: "M388,-206 q30,-16 54,2 q-10,9 -27,5 q5,15 -12,23 q-7,-15 -15,-30 z",
  tail: "M-381,-176 q-16,-22 3,-36 q16,-6 20,9 q-11,-3 -13,8 z",
  sail: "M-180,-425 L180,-425 Q205,-280 176,-140 L-176,-140 Q-150,-280 -180,-425 Z",
  shields: Array.from({ length: 11 }, (_, i) => -210 + i * 42),
  oars: [-200, -120, -40, 40, 120, 200],
};
function shipParts(p, s) {
  // s: style hooks for each part (attribute strings), plus optional extras.
  const stripes = [-180, -60, 60]
    .map((x) => `<rect x="${x}" y="-430" width="60" height="300" ${s.stripe}/>`)
    .join("");
  return `
    <clipPath id="${p}-sailclip"><path d="${SHIP.sail}"/></clipPath>
    <clipPath id="${p}-hullclip"><path d="${SHIP.hull}"/></clipPath>
    ${SHIP.oars.map((x) => `<line x1="${x}" y1="-30" x2="${x - 52}" y2="70" ${s.oar}/>`).join("")}
    <line x1="-370" y1="-165" x2="0" y2="-470" ${s.rope}/>
    <line x1="382" y1="-196" x2="0" y2="-470" ${s.rope}/>
    <line x1="0" y1="-40" x2="0" y2="-475" ${s.mast}/>
    <path d="${SHIP.sail}" ${s.sail}/>
    <g clip-path="url(#${p}-sailclip)">${stripes}</g>
    <path d="${SHIP.sail}" ${s.sailLine}/>
    <line x1="-200" y1="-428" x2="200" y2="-428" ${s.mast}/>
    <path d="${SHIP.hull}" ${s.hull}/>
    ${s.hullExtra || ""}
    <path d="${SHIP.plank}" ${s.plank}/>
    <path d="${SHIP.hull}" ${s.hullLine}/>
    <path d="${SHIP.head}" ${s.head}/><path d="${SHIP.tail}" ${s.head}/>
    ${SHIP.shields
      .map((x, i) => `<circle cx="${x}" cy="-50" r="19" ${s.shield(i)}/>` + (s.boss ? `<circle cx="${x}" cy="-50" r="5" ${s.boss}/>` : ""))
      .join("")}`;
}
// Small ship for the map: hull and sail only.
function mapShipParts(s) {
  return `<g transform="scale(-0.13,0.13)">
    <line x1="0" y1="-40" x2="0" y2="-470" ${s.mast}/>
    <path d="${SHIP.sail}" ${s.sail}/>
    <path d="${SHIP.hull}" ${s.hull}/>
    <path d="${SHIP.head}" ${s.head}/></g>`;
}

const CLIFF = "M1150,1100 L1170,760 Q1215,650 1275,575 Q1310,520 1340,478 Q1420,462 1500,470 L1940,458 L1940,1100 Z";
const CLIFF_TOP = "M1340,478 Q1420,462 1500,470 L1940,458 L1940,520 Q1700,540 1500,530 Q1400,525 1330,500 Z";
const HILLS = "M-20,605 Q180,548 400,578 Q560,596 700,580 Q860,560 1000,606 Z";
const MONASTERY = {
  walls: [
    "M1480,380 h210 v92 h-210 Z", // nave
    "M1690,300 h70 v172 h-70 Z", // tower
    "M1365,420 h100 v52 h-100 Z", // outbuilding
  ],
  roofs: ["M1462,384 L1585,300 L1708,384 Z", "M1682,304 L1725,238 L1768,304 Z", "M1352,424 L1415,386 L1478,424 Z"],
  cross: "M1725,238 v-46 M1710,212 h30",
  windows: [1508, 1553, 1598, 1643].map((x) => `M${x},450 v-30 a10,10 0 0 1 20,0 v30 Z`).concat([
    "M1714,472 v-42 a11,11 0 0 1 22,0 v42 Z",
    "M1716,360 v-24 a9,9 0 0 1 18,0 v24 Z",
  ]),
};
function monastery(s) {
  return `
    ${MONASTERY.walls.map((d) => `<path d="${d}" ${s.wall}/>`).join("")}
    ${MONASTERY.roofs.map((d) => `<path d="${d}" ${s.roof}/>`).join("")}
    ${MONASTERY.windows.map((d) => `<path d="${d}" ${s.window}/>`).join("")}
    <path d="${MONASTERY.cross}" ${s.cross}/>`;
}

function sea(p, s) {
  return ROWS.map(
    (row, i) => `<g id="${p}-wave${i + 1}">
      <path d="${waveBand(row.y, row.amp, row.wl)}" ${s.band(i)}/>
      ${s.crest ? `<path d="${waveLine(row.y, row.amp, row.wl)}" ${s.crest(i)}/>` : ""}
      ${s.inner ? s.inner(row, i) : ""}
    </g>`,
  );
}

function routeLayer(p, s) {
  const L = map.route.length;
  return `
    <mask id="${p}-routemask" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
      <path id="${p}-routereveal" d="${map.route.d}" fill="none" stroke="#fff" stroke-width="40"
        stroke-linecap="round" stroke-dasharray="${L} ${L}" stroke-dashoffset="${L}"/>
    </mask>
    <path d="${map.route.d}" fill="none" ${s.route} mask="url(#${p}-routemask)"/>`;
}

const label = (x, y, text, attrs) => `<text x="${r1(x)}" y="${r1(y)}" ${attrs}>${text}</text>`;

// ---------- the four looks ----------

const LOOKS = [];

// A: Parchment & ink, like an old chronicle or map.
LOOKS.push({
  id: "a",
  name: "Parchment & ink",
  css: `
    #a-title { left: 196px; top: 118px; padding: 26px 44px 30px; background: #f1e2bd;
      border: 3px solid #33210f; outline: 1.5px solid #33210f; outline-offset: -11px;
      font-family: "EB Garamond", serif; color: #33210f; }
    #a-title .kick { font-size: 32px; font-style: italic; color: #9d2a1d; letter-spacing: 0.04em; }
    #a-title .big { font-size: 116px; font-weight: 700; line-height: 0.95; }
    #a-title .big b { color: #9d2a1d; }
    #a-caption { left: 196px; bottom: 120px; font-family: "EB Garamond", serif; font-style: italic;
      font-size: 46px; color: #33210f; background: rgba(241,226,189,0.92); padding: 10px 28px;
      border-top: 2px solid #33210f; border-bottom: 2px solid #33210f; }
    #a-tex { background-image: url(assets/tex-vellum.jpg); opacity: 0.7; }
    #a-vignette { background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(70,40,15,0.42) 100%); }`,
  defs: `
    <pattern id="a-hatch" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="11" stroke="#33210f" stroke-width="1.6" stroke-opacity="0.5"/></pattern>
    <pattern id="a-seahatch" width="40" height="16" patternUnits="userSpaceOnUse">
      <path d="M0,8 q10,-5 20,0 q10,5 20,0" fill="none" stroke="#33210f" stroke-width="1.3" stroke-opacity="0.22"/></pattern>`,
  map: () => `
    <rect width="1920" height="1080" fill="#e8d4a8"/>
    <rect width="1920" height="1080" fill="url(#a-seahatch)"/>
    <path d="${map.graticule}" fill="none" stroke="#33210f" stroke-opacity="0.3" stroke-width="1.3" stroke-dasharray="2 7"/>
    <path d="${map.land}" fill="none" stroke="#33210f" stroke-opacity="0.08" stroke-width="34" stroke-linejoin="round"/>
    <path d="${map.land}" fill="none" stroke="#33210f" stroke-opacity="0.14" stroke-width="16" stroke-linejoin="round"/>
    <path d="${map.land}" fill="#f2e3bf" stroke="#33210f" stroke-width="2.6" stroke-linejoin="round"/>
    <g transform="translate(250,478)" stroke="#33210f" stroke-width="2" fill="#f2e3bf">
      <circle r="56" fill="none" stroke-opacity="0.6"/>
      <path d="M0,-78 L13,-13 L78,0 L13,13 L0,78 L-13,13 L-78,0 L-13,-13 Z"/>
      <path d="M0,-78 L13,-13 L0,0 Z M78,0 L13,13 L0,0 Z M0,78 L-13,13 L0,0 Z M-78,0 L-13,-13 L0,0 Z" fill="#33210f"/>
      <text y="-90" text-anchor="middle" font-family="EB Garamond" font-size="30" fill="#33210f" stroke="none">N</text>
    </g>`,
  labels: () => {
    const a = `font-family="EB Garamond" fill="#33210f" text-anchor="middle"`;
    return [
      label(P.norway[0], P.norway[1], "NORWAY", `${a} font-size="40" letter-spacing="10"`),
      label(P.scotland[0], P.scotland[1], "PICTLAND", `${a} font-size="34" letter-spacing="8"`),
      label(P.northumbria[0] - 30, P.northumbria[1] + 30, "NORTHUMBRIA", `${a} font-size="32" letter-spacing="6"`),
      label(P.denmark[0], P.denmark[1], "DENMARK", `${a} font-size="34" letter-spacing="8"`),
      label(P.northSea[0], P.northSea[1], "Oceanus Germanicus", `${a} font-size="40" font-style="italic"`),
    ].join("");
  },
  route: `stroke="#9d2a1d" stroke-width="5" stroke-dasharray="16 11" stroke-linecap="round"`,
  pin: (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="#9d2a1d" stroke="#33210f" stroke-width="2.5"/>
    <circle cx="${x}" cy="${y}" r="24" fill="none" stroke="#9d2a1d" stroke-width="2"/>`,
  pinLabel: (x, y) => label(x + 36, y + 14, "Lindisfarne", `font-family="EB Garamond" font-style="italic" font-weight="700" font-size="46" fill="#9d2a1d"`),
  mapShip: () =>
    mapShipParts({
      mast: `stroke="#33210f" stroke-width="22"`,
      sail: `fill="#9d2a1d" stroke="#33210f" stroke-width="20"`,
      hull: `fill="#33210f"`,
      head: `fill="#33210f"`,
    }),
  illo: (p) => `
    <rect width="1920" height="1080" fill="#eedcb4"/>
    <g fill="none" stroke="#33210f" stroke-width="2.2" stroke-opacity="0.55" stroke-linecap="round">
      <path d="M260,170 q40,-34 90,-6 q36,-30 84,-2 q44,-8 52,26"/><path d="M820,110 q34,-26 74,-4 q30,-24 70,0"/>
      <circle cx="1100" cy="190" r="58"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return `<line x1="${r1(1100 + Math.cos(a) * 74)}" y1="${r1(190 + Math.sin(a) * 74)}" x2="${r1(1100 + Math.cos(a) * 100)}" y2="${r1(190 + Math.sin(a) * 100)}"/>`;
      }).join("")}
    </g>
    <path d="${HILLS}" fill="#dcc591" stroke="#33210f" stroke-width="2.5"/>
    <path d="${HILLS}" fill="url(#a-hatch)"/>
    <path d="${CLIFF}" fill="#dfc58f" stroke="#33210f" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="${CLIFF}" fill="url(#a-hatch)" opacity="0.8"/>
    <path d="${CLIFF_TOP}" fill="#e9d6a6" stroke="#33210f" stroke-width="2.4"/>
    ${monastery({
      wall: `fill="#f4e7c7" stroke="#33210f" stroke-width="3"`,
      roof: `fill="url(#a-hatch)" stroke="#33210f" stroke-width="3" stroke-linejoin="round"`,
      window: `fill="#33210f"`,
      cross: `fill="none" stroke="#9d2a1d" stroke-width="6" stroke-linecap="round"`,
    })}
    ${sea(p, {
      band: (i) => `fill="${["#e2cc9b", "#d9c08b", "#cfb37c"][i]}"`,
      crest: () => `fill="none" stroke="#33210f" stroke-width="3" stroke-linejoin="round"`,
      inner: (row) => `<path d="${waveLine(row.y + 40, row.amp * 0.6, row.wl)}" fill="none" stroke="#33210f" stroke-width="1.6" stroke-opacity="0.45"/>`,
    }).slice(0, 2).join("")}
    <g id="${p}-ship" transform="translate(-520,860) scale(0.9)">${shipParts(p, {
      oar: `stroke="#33210f" stroke-width="6" stroke-linecap="round"`,
      rope: `stroke="#33210f" stroke-width="2.5"`,
      mast: `stroke="#33210f" stroke-width="9" stroke-linecap="round"`,
      sail: `fill="#f3e4c0"`,
      stripe: `fill="#9d2a1d"`,
      sailLine: `fill="none" stroke="#33210f" stroke-width="3.5"`,
      hull: `fill="#c99c60"`,
      plank: `fill="none" stroke="#33210f" stroke-width="2.4"`,
      hullLine: `fill="none" stroke="#33210f" stroke-width="3.8" stroke-linejoin="round"`,
      head: `fill="#33210f"`,
      shield: (i) => `fill="${i % 2 ? "#9d2a1d" : "#f3e4c0"}" stroke="#33210f" stroke-width="2.6"`,
      boss: `fill="#33210f"`,
    })}</g>
    ${sea(p, {
      band: () => `fill="#c6a96f"`,
      crest: () => `fill="none" stroke="#33210f" stroke-width="3.4" stroke-linejoin="round"`,
      inner: (row) => `<path d="${waveLine(row.y + 55, row.amp * 0.5, row.wl)}" fill="none" stroke="#33210f" stroke-width="1.8" stroke-opacity="0.45"/>`,
    })[2]}`,
  title: `<div class="kick">Anno Domini</div><div class="big"><b>7</b>93</div>`,
  caption: `The holy island of Lindisfarne, 8 June 793`,
  overlays: `<div id="a-vignette" class="fill" data-layout-ignore data-layout-allow-occlusion></div><div id="a-tex" class="fill tex" data-layout-ignore data-layout-allow-occlusion></div>`,
});

// B: Stitched tapestry: wool on linen, inscription band and border frieze.
const WOOL = { dark: "#3a2c22", madder: "#a8432f", woad: "#3f5c7d", woad2: "#506f92", woad3: "#34506f", weld: "#c9a13c", olive: "#6f7c3d", linen: "#efe4c8" };
const stitch = (w = 5, color = WOOL.dark) =>
  `stroke="${color}" stroke-width="${w}" stroke-dasharray="${w * 2} ${w * 1.2}" stroke-linecap="round" stroke-linejoin="round"`;
function frieze(y, h) {
  const cell = 96, colors = [WOOL.madder, WOOL.woad, WOOL.weld, WOOL.olive];
  let s = `<rect x="0" y="${y}" width="1920" height="${h}" fill="${WOOL.linen}"/>`;
  for (let i = 0, x = 0; x < 1920; i++, x += cell) {
    const cx = x + cell / 2, cy = y + h / 2, r = h * 0.32;
    s += `<path d="M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z" fill="${colors[i % 4]}" ${stitch(3)}/>`;
    s += `<line x1="${x + cell}" y1="${y + 10}" x2="${x + cell}" y2="${y + h - 10}" ${stitch(3, WOOL.madder)}/>`;
  }
  s += `<line x1="0" y1="${y + 4}" x2="1920" y2="${y + 4}" ${stitch(4, WOOL.madder)}/>`;
  s += `<line x1="0" y1="${y + h - 4}" x2="1920" y2="${y + h - 4}" ${stitch(4, WOOL.madder)}/>`;
  return s;
}
LOOKS.push({
  id: "b",
  name: "Stitched tapestry",
  css: `
    #b-band { position: absolute; left: 0; right: 0; top: 0; height: 132px; }
    .b-ins { position: absolute; left: 0; right: 0; top: 30px; text-align: center;
      font-family: "EB Garamond", serif; font-weight: 700; font-size: 52px; letter-spacing: 0.2em;
      color: ${WOOL.madder}; }
    #b-tex { background-image: url(assets/tex-linen.jpg); opacity: 0.75; }`,
  defs: `
    <pattern id="b-satin" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
      <line x1="0" y1="0" x2="0" y2="9" stroke="#000" stroke-opacity="0.16" stroke-width="3.5"/></pattern>
    <pattern id="b-satin2" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
      <line x1="0" y1="0" x2="0" y2="9" stroke="#fff" stroke-opacity="0.12" stroke-width="3"/></pattern>`,
  map: () => `
    <rect width="1920" height="1080" fill="${WOOL.woad}"/>
    <rect width="1920" height="1080" fill="url(#b-satin2)"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="${waveLine(250 + i * 130, 10, 140, -100, 2000)}" fill="none" ${stitch(3, WOOL.woad2)}/>`).join("")}
    <path d="${map.land}" fill="${WOOL.olive}"/>
    <path d="${map.land}" fill="url(#b-satin)"/>
    <path d="${map.land}" fill="none" ${stitch(4)}/>`,
  labels: () => {
    const a = `font-family="EB Garamond" font-weight="700" fill="${WOOL.linen}" text-anchor="middle"`;
    return [
      label(P.norway[0], P.norway[1], "NORWAY", `${a} font-size="42" letter-spacing="10"`),
      label(P.scotland[0], P.scotland[1], "PICTS", `${a} font-size="36" letter-spacing="8"`),
      label(P.denmark[0], P.denmark[1], "DANES", `${a} font-size="36" letter-spacing="8"`),
      label(P.northSea[0], P.northSea[1], "THE NORTH SEA", `${a} font-size="38" letter-spacing="9"`),
    ].join("");
  },
  route: `stroke="${WOOL.weld}" stroke-width="8" stroke-dasharray="18 10" stroke-linecap="round"`,
  pin: (x, y) => `<circle cx="${x}" cy="${y}" r="17" fill="${WOOL.madder}" ${stitch(3)}/>`,
  pinLabel: (x, y) => label(x + 34, y + 13, "LINDISFARNE", `font-family="EB Garamond" font-weight="700" font-size="40" letter-spacing="5" fill="${WOOL.linen}"`),
  mapShip: () =>
    mapShipParts({
      mast: `stroke="${WOOL.dark}" stroke-width="22"`,
      sail: `fill="${WOOL.madder}" stroke="${WOOL.dark}" stroke-width="22"`,
      hull: `fill="${WOOL.weld}" stroke="${WOOL.dark}" stroke-width="22"`,
      head: `fill="${WOOL.madder}"`,
    }),
  illo: (p) => `
    <rect width="1920" height="1080" fill="${WOOL.linen}"/>
    ${[[380, 300], [470, 260], [940, 330], [1020, 290]].map(([x, y]) => `<path d="M${x},${y} q16,-16 30,0 q14,-16 30,0" fill="none" ${stitch(4)}/>`).join("")}
    <path d="${HILLS}" fill="${WOOL.olive}"/><path d="${HILLS}" fill="url(#b-satin)"/><path d="${HILLS}" fill="none" ${stitch(4)}/>
    <path d="${CLIFF}" fill="${WOOL.olive}"/><path d="${CLIFF}" fill="url(#b-satin)"/>
    <path d="${CLIFF_TOP}" fill="${WOOL.weld}"/><path d="${CLIFF_TOP}" fill="url(#b-satin)"/>
    <path d="${CLIFF}" fill="none" ${stitch(5)}/>
    ${monastery({
      wall: `fill="${WOOL.linen}" ${stitch(4)}`,
      roof: `fill="${WOOL.madder}" ${stitch(4)}`,
      window: `fill="${WOOL.woad}"`,
      cross: `fill="none" stroke="${WOOL.weld}" stroke-width="8" stroke-linecap="round"`,
    })}
    ${sea(p, {
      band: (i) => `fill="${[WOOL.woad2, WOOL.woad, WOOL.woad3][i]}"`,
      crest: () => `fill="none" ${stitch(4, WOOL.linen)}`,
    }).slice(0, 2).join("")}
    <g id="${p}-ship" transform="translate(-520,860) scale(0.9)">${shipParts(p, {
      oar: `stroke="${WOOL.dark}" stroke-width="7" stroke-linecap="round"`,
      rope: `${stitch(3)}`,
      mast: `stroke="${WOOL.dark}" stroke-width="10" stroke-linecap="round"`,
      sail: `fill="${WOOL.linen}"`,
      stripe: `fill="${WOOL.madder}"`,
      sailLine: `fill="none" ${stitch(5)}`,
      hull: `fill="${WOOL.madder}"`,
      hullExtra: `<g clip-path="url(#${p}-hullclip)">
        <path d="M-360,-140 Q-305,-30 -230,-30 L230,-30 Q320,-40 370,-170" fill="none" stroke="${WOOL.weld}" stroke-width="16"/>
        <path d="M-330,-80 Q-290,-2 -220,-2 L220,-2 Q300,-10 350,-110" fill="none" stroke="${WOOL.woad}" stroke-width="16"/>
        <path d="${SHIP.hull}" fill="url(#b-satin)"/></g>`,
      plank: `fill="none" stroke="none"`,
      hullLine: `fill="none" ${stitch(5)}`,
      head: `fill="${WOOL.madder}" ${stitch(3)}`,
      shield: (i) => `fill="${[WOOL.woad, WOOL.weld, WOOL.madder][i % 3]}" ${stitch(3)}`,
    })}</g>
    ${sea(p, {
      band: () => `fill="${WOOL.woad3}"`,
      crest: () => `fill="none" ${stitch(5, WOOL.linen)}`,
      inner: (row) => `<path d="${waveLine(row.y + 60, row.amp * 0.6, row.wl)}" fill="none" ${stitch(3, WOOL.woad2)}/>`,
    })[2]}`,
  frame: () => `<svg class="fill" viewBox="0 0 1920 1080">
    <rect x="0" y="0" width="1920" height="132" fill="${WOOL.linen}"/>
    <line x1="0" y1="8" x2="1920" y2="8" ${stitch(4, WOOL.madder)}/>
    <line x1="0" y1="124" x2="1920" y2="124" ${stitch(4, WOOL.madder)}/>
    ${frieze(960, 120)}</svg>`,
  title: null,
  caption: null,
  inscriptions: ["HERE THE NORTHMEN CROSS THE SEA", "HERE THEY COME TO LINDISFARNE · 793"],
  overlays: `<div id="b-tex" class="fill tex" data-layout-ignore data-layout-allow-occlusion></div>`,
});

// C: Paper cut-out: layered card with soft shadows.
const PAPER = { teal: "#2e6e72", teal2: "#3f8b8a", teal3: "#79b4ab", sand: "#efd6a4", sand2: "#d9b77d", coral: "#e0603a", navy: "#1d2b45", cream: "#fbf5e9" };
LOOKS.push({
  id: "c",
  name: "Paper cut-out",
  css: `
    #c-title { left: 196px; top: 118px; padding: 28px 48px 34px; background: ${PAPER.cream};
      border-radius: 18px; box-shadow: 0 10px 0 rgba(29,43,69,0.12), 0 14px 30px rgba(29,43,69,0.28);
      font-family: "Outfit", sans-serif; color: ${PAPER.navy}; }
    #c-title .kick { font-size: 30px; font-weight: 700; letter-spacing: 0.18em; color: ${PAPER.coral}; }
    #c-title .big { font-size: 128px; font-weight: 900; line-height: 0.95; }
    #c-title .big small { font-size: 44px; font-weight: 700; margin-left: 10px; }
    #c-caption { left: 196px; bottom: 120px; font-family: "Outfit", sans-serif; font-weight: 700;
      font-size: 44px; color: ${PAPER.navy}; background: ${PAPER.cream}; padding: 14px 34px; border-radius: 999px;
      box-shadow: 0 8px 22px rgba(29,43,69,0.3); }
    #c-tex { background-image: url(assets/tex-card.jpg); opacity: 0.9; }`,
  defs: `
    <filter id="c-shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="${PAPER.navy}" flood-opacity="0.3"/></filter>`,
  map: () => `
    <rect width="1920" height="1080" fill="${PAPER.teal}"/>
    <path d="${map.land}" fill="none" stroke="${PAPER.teal2}" stroke-width="64" stroke-linejoin="round"/>
    <path d="${map.land}" fill="none" stroke="${PAPER.teal3}" stroke-width="30" stroke-linejoin="round"/>
    <path d="${map.land}" fill="${PAPER.sand}" filter="url(#c-shadow)"/>`,
  labels: () => {
    const a = `font-family="Outfit" font-weight="700" fill="${PAPER.navy}" text-anchor="middle"`;
    return [
      label(P.norway[0], P.norway[1], "NORWAY", `${a} font-size="40" letter-spacing="6"`),
      label(P.scotland[0], P.scotland[1], "PICTLAND", `${a} font-size="34" letter-spacing="4"`),
      label(P.northumbria[0] - 30, P.northumbria[1] + 30, "NORTHUMBRIA", `${a} font-size="32" letter-spacing="3"`),
      label(P.denmark[0], P.denmark[1], "DENMARK", `${a} font-size="34" letter-spacing="4"`),
      label(P.northSea[0], P.northSea[1], "NORTH SEA", `font-family="Outfit" font-weight="700" fill="${PAPER.cream}" text-anchor="middle" font-size="40" letter-spacing="8"`),
    ].join("");
  },
  route: `stroke="${PAPER.coral}" stroke-width="10" stroke-linecap="round" filter="url(#c-shadow)"`,
  pin: (x, y) => `<circle cx="${x}" cy="${y}" r="20" fill="${PAPER.coral}" stroke="${PAPER.cream}" stroke-width="6" filter="url(#c-shadow)"/>`,
  pinLabel: (x, y) => `<g filter="url(#c-shadow)"><rect x="${x + 36}" y="${y - 34}" width="262" height="64" rx="32" fill="${PAPER.cream}"/></g>
    ${label(x + 167, y + 11, "Lindisfarne", `font-family="Outfit" font-weight="700" font-size="34" fill="${PAPER.navy}" text-anchor="middle"`)}`,
  mapShip: () =>
    `<g filter="url(#c-shadow)">${mapShipParts({
      mast: `stroke="${PAPER.navy}" stroke-width="22"`,
      sail: `fill="${PAPER.cream}"`,
      hull: `fill="${PAPER.navy}"`,
      head: `fill="${PAPER.navy}"`,
    })}</g>`,
  illo: (p) => `
    <rect width="1920" height="1080" fill="#f9e3c6"/>
    <path d="${waveBand(330, 18, 420, 1100)}" fill="#f5d6b0" filter="url(#c-shadow)"/>
    <path d="${waveBand(470, 14, 360, 1100)}" fill="#f1c89c" filter="url(#c-shadow)"/>
    <circle cx="1060" cy="250" r="92" fill="${PAPER.coral}" filter="url(#c-shadow)"/>
    <path d="${HILLS}" fill="#a9c1ad" filter="url(#c-shadow)"/>
    <path d="${CLIFF}" fill="${PAPER.sand2}" filter="url(#c-shadow)"/>
    <path d="${CLIFF_TOP}" fill="${PAPER.sand}" filter="url(#c-shadow)"/>
    <g filter="url(#c-shadow)">${monastery({
      wall: `fill="${PAPER.cream}"`,
      roof: `fill="${PAPER.navy}"`,
      window: `fill="${PAPER.teal}"`,
      cross: `fill="none" stroke="${PAPER.coral}" stroke-width="8" stroke-linecap="round"`,
    })}</g>
    ${sea(p, { band: (i) => `fill="${[PAPER.teal3, PAPER.teal2, PAPER.teal][i]}" filter="url(#c-shadow)"` }).slice(0, 2).join("")}
    <g id="${p}-ship" transform="translate(-520,860) scale(0.9)"><g filter="url(#c-shadow)">${shipParts(p, {
      oar: `stroke="${PAPER.navy}" stroke-width="8" stroke-linecap="round"`,
      rope: `stroke="${PAPER.navy}" stroke-width="3"`,
      mast: `stroke="${PAPER.navy}" stroke-width="11" stroke-linecap="round"`,
      sail: `fill="${PAPER.cream}"`,
      stripe: `fill="${PAPER.coral}"`,
      sailLine: `fill="none"`,
      hull: `fill="${PAPER.navy}"`,
      hullExtra: `<g clip-path="url(#${p}-hullclip)"><path d="M-360,-140 Q-305,-30 -230,-30 L230,-30 Q320,-40 370,-170" fill="none" stroke="${PAPER.coral}" stroke-width="12"/></g>`,
      plank: `fill="none"`,
      hullLine: `fill="none"`,
      head: `fill="${PAPER.navy}"`,
      shield: (i) => `fill="${i % 2 ? PAPER.coral : PAPER.cream}"`,
      boss: `fill="${PAPER.navy}"`,
    })}</g></g>
    ${sea(p, { band: () => `fill="${PAPER.teal}" filter="url(#c-shadow)"` })[2]}`,
  title: `<div class="kick">THE NORTH SEA</div><div class="big">793<small>AD</small></div>`,
  caption: `Lindisfarne · 8 June 793`,
  overlays: `<div id="c-tex" class="fill tex" data-layout-ignore data-layout-allow-occlusion></div>`,
});

// D: Night documentary: dark, glowing lines, cinematic bars.
const NIGHT = { bg: "#0a1220", sea: "#0b1626", land: "#14233a", coast: "#5aa5c8", gold: "#f0b44c", text: "#e8eef5", muted: "#9dbbd0", ink: "#05080e" };
LOOKS.push({
  id: "d",
  name: "Night documentary",
  css: `
    #d-title { left: 196px; top: 190px; font-family: "Inter", sans-serif; color: ${NIGHT.text};
      text-shadow: 0 2px 24px rgba(0,0,0,0.6); }
    #d-title .kick { font-size: 30px; font-weight: 700; letter-spacing: 0.4em; color: ${NIGHT.gold}; }
    #d-title .big { font-size: 164px; font-weight: 900; line-height: 1; letter-spacing: -0.02em; }
    #d-caption { right: 196px; bottom: 190px; text-align: right; font-family: "Inter", sans-serif; font-weight: 700;
      font-size: 40px; letter-spacing: 0.22em; color: ${NIGHT.text}; padding-top: 18px;
      border-top: 3px solid ${NIGHT.gold}; text-shadow: 0 2px 18px rgba(0,0,0,0.7); }
    .d-bar { position: absolute; left: 0; right: 0; height: 124px; background: #000; }`,
  defs: `
    <filter id="d-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="d-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#08101d"/><stop offset="0.55" stop-color="#1b2b48"/>
      <stop offset="0.85" stop-color="#7a4d3c"/><stop offset="1" stop-color="#d0803f"/></linearGradient>
    <linearGradient id="d-seafade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d0803f" stop-opacity="0.55"/><stop offset="1" stop-color="#d0803f" stop-opacity="0"/></linearGradient>`,
  map: () => `
    <rect width="1920" height="1080" fill="${NIGHT.sea}"/>
    <path d="${map.graticule}" fill="none" stroke="#1f3352" stroke-width="1.2"/>
    <path d="${map.land}" fill="${NIGHT.land}" stroke="${NIGHT.coast}" stroke-width="1.8" stroke-linejoin="round" filter="url(#d-glow)"/>`,
  labels: () => {
    const a = `font-family="Inter" font-weight="600" fill="${NIGHT.muted}" text-anchor="middle"`;
    return [
      label(P.norway[0], P.norway[1] + 110, "NORWAY", `${a} font-size="32" letter-spacing="12"`),
      label(P.scotland[0], P.scotland[1], "PICTLAND", `${a} font-size="30" letter-spacing="10"`),
      label(P.northumbria[0] - 30, P.northumbria[1] + 30, "NORTHUMBRIA", `${a} font-size="30" letter-spacing="8"`),
      label(P.denmark[0], P.denmark[1], "DENMARK", `${a} font-size="30" letter-spacing="10"`),
      label(P.northSea[0], P.northSea[1], "NORTH SEA", `${a} font-size="30" letter-spacing="14" fill-opacity="0.8"`),
    ].join("");
  },
  route: `stroke="${NIGHT.gold}" stroke-width="5" stroke-linecap="round" filter="url(#d-glow)"`,
  pin: (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="${NIGHT.gold}" filter="url(#d-glow)"/>
    <circle cx="${x}" cy="${y}" r="26" fill="none" stroke="${NIGHT.gold}" stroke-width="2.5" stroke-opacity="0.8"/>`,
  pinLabel: (x, y) => label(x + 42, y + 12, "LINDISFARNE", `font-family="Inter" font-weight="700" font-size="32" letter-spacing="6" fill="${NIGHT.text}"`),
  mapShip: () =>
    `<g filter="url(#d-glow)">${mapShipParts({
      mast: `stroke="${NIGHT.gold}" stroke-width="22"`,
      sail: `fill="${NIGHT.gold}"`,
      hull: `fill="${NIGHT.gold}"`,
      head: `fill="${NIGHT.gold}"`,
    })}</g>`,
  illo: (p) => `
    <rect width="1920" height="1080" fill="url(#d-sky)"/>
    ${Array.from({ length: 70 }, (_, i) => {
      const x = (i * 733) % 1920, y = 130 + ((i * 397) % 380), r = 1 + (i % 3) * 0.7;
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.35 + (i % 4) * 0.15}"/>`;
    }).join("")}
    <circle cx="640" cy="250" r="46" fill="#f3ead6" filter="url(#d-glow)"/>
    <path d="${HILLS}" fill="#121a2a"/>
    <path d="${CLIFF}" fill="${NIGHT.ink}"/>
    ${monastery({
      wall: `fill="${NIGHT.ink}"`,
      roof: `fill="${NIGHT.ink}"`,
      window: `fill="${NIGHT.gold}" filter="url(#d-glow)"`,
      cross: `fill="none" stroke="${NIGHT.ink}" stroke-width="7" stroke-linecap="round"`,
    })}
    ${sea(p, {
      band: (i) => `fill="${["#101a2c", "#0b1322", "#070d18"][i]}"`,
      crest: (i) => `fill="none" stroke="#d0803f" stroke-opacity="${[0.6, 0.35, 0.2][i]}" stroke-width="2"`,
    }).slice(0, 2).join("")}
    <rect x="0" y="600" width="1920" height="180" fill="url(#d-seafade)" opacity="0.5"/>
    <g fill="#f3ead6">${Array.from({ length: 16 }, (_, i) => {
      const y = 650 + i * 26, w = 70 + i * 26, x = 640 - w / 2 + ((i * 37) % 23) - 11;
      return `<rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="${3 + (i % 3)}" rx="2" opacity="${r1(0.75 - i * 0.035)}"/>`;
    }).join("")}</g>
    <g id="${p}-ship" transform="translate(-520,860) scale(0.9)">${shipParts(p, {
      oar: `stroke="${NIGHT.ink}" stroke-width="7" stroke-linecap="round"`,
      rope: `stroke="${NIGHT.ink}" stroke-width="3"`,
      mast: `stroke="${NIGHT.ink}" stroke-width="10" stroke-linecap="round"`,
      sail: `fill="#22314d"`,
      stripe: `fill="#152036"`,
      sailLine: `fill="none" stroke="#e39a55" stroke-opacity="0.75" stroke-width="3"`,
      hull: `fill="${NIGHT.ink}"`,
      plank: `fill="none"`,
      hullLine: `fill="none" stroke="#e39a55" stroke-opacity="0.8" stroke-width="3"`,
      head: `fill="${NIGHT.ink}"`,
      shield: () => `fill="#0d1424" stroke="#e39a55" stroke-opacity="0.7" stroke-width="2.5"`,
    })}</g>
    ${sea(p, {
      band: () => `fill="#060b14"`,
      crest: () => `fill="none" stroke="#d0803f" stroke-opacity="0.18" stroke-width="2"`,
    })[2]}`,
  title: `<div class="kick">THE NORTH SEA · AD</div><div class="big">793</div>`,
  caption: `LINDISFARNE · 8 JUNE 793`,
  overlays: `<div class="d-bar" style="top:0" data-layout-ignore></div><div class="d-bar" style="bottom:0" data-layout-ignore></div>`,
});

// ---------- scene file ----------

function sceneFile(look, index) {
  const p = look.id;
  const { lindisfarne: [lx, ly] } = P;
  const s0 = map.route.samples[0];
  const tag = `${String.fromCharCode(65 + index)} · ${look.name}`;
  return `<template>
  <style>
    #root { position: absolute; inset: 0; overflow: hidden; }
    #root .fill { position: absolute; inset: 0; width: 100%; height: 100%; }
    #root .tex { mix-blend-mode: multiply; background-size: 512px 512px; }
    #root .htext { position: absolute; }
    #${p}-tag { position: absolute; top: 150px; right: 192px; padding: 10px 24px; border-radius: 999px;
      background: rgba(12, 12, 14, 0.72); color: #fff; font-family: "Inter", sans-serif;
      font-weight: 600; font-size: 28px; letter-spacing: 0.02em; }
    ${look.css}
  </style>
  <div id="root" data-composition-id="look-${p}" data-width="1920" data-height="1080">
    <svg id="${p}-map" class="fill" viewBox="0 0 1920 1080">
      <defs>${look.defs}</defs>
      <g id="${p}-mapg">
        ${look.map()}
        <g id="${p}-labels">${look.labels()}</g>
        ${routeLayer(p, look)}
        <g id="${p}-pin">${look.pin(lx, ly)}</g>
        <g id="${p}-pinlabel">${look.pinLabel(lx, ly)}</g>
        <g id="${p}-mapship" transform="translate(${s0[0]},${s0[1]})">${look.mapShip()}</g>
      </g>
    </svg>
    <svg id="${p}-illo" class="fill" viewBox="0 0 1920 1080" style="opacity:0">
      ${look.illo(p)}
    </svg>
    ${look.frame ? look.frame() : ""}
    ${look.title ? `<div id="${p}-title" class="htext">${look.title}</div>` : ""}
    ${look.caption ? `<div id="${p}-caption" class="htext">${look.caption}</div>` : ""}
    ${(look.inscriptions || []).map((t, i) => `<div id="${p}-ins${i + 1}" class="b-ins">${t}</div>`).join("")}
    ${look.overlays || ""}
    <div id="${p}-tag" data-layout-ignore>${tag}</div>
  </div>
  <script>
    (() => {
      const P = "${p}";
      const $ = (id) => document.getElementById(P + "-" + id);
      const tl = gsap.timeline({ paused: true });
      const samples = ${JSON.stringify(map.route.samples)};

      // Map: slow push-in towards Lindisfarne.
      tl.fromTo($("mapg"), { scale: 1, svgOrigin: "${lx} ${ly}" }, { scale: 1.07, svgOrigin: "${lx} ${ly}", duration: 4.8, ease: "none" }, 0);
      tl.fromTo($("labels"), { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.out" }, 0.3);
      if ($("title")) tl.fromTo($("title"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.2);
      if ($("ins1")) tl.fromTo($("ins1"), { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power1.out" }, 0.2);

      // Route draws from Norway to Lindisfarne; the ship rides its head.
      const L = ${map.route.length};
      const routeEase = gsap.parseEase("power1.inOut");
      const ship = $("mapship");
      const route = { k: 0 };
      tl.fromTo(route, { k: 0 }, {
        k: 1, duration: 2.6, ease: "none",
        onUpdate() {
          const f = routeEase(route.k);
          $("routereveal").setAttribute("stroke-dashoffset", (L * (1 - f)).toFixed(1));
          const i = Math.min(99, Math.floor(f * 100)), t = f * 100 - i;
          const a = samples[i], b = samples[i + 1];
          const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
          const tilt = ((a[2] + 180 + 540) % 360 - 180) * 0.35;
          ship.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ") rotate(" + tilt.toFixed(1) + ")");
        },
      }, 0.8);
      tl.fromTo($("pin"), { scale: 0, svgOrigin: "${lx} ${ly}" }, { scale: 1, svgOrigin: "${lx} ${ly}", duration: 0.45, ease: "back.out(2.2)" }, 3.3);
      tl.fromTo($("pinlabel"), { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 3.45);

      // Cut to the illustration.
      tl.fromTo($("illo"), { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power1.inOut" }, 4.2);
      tl.fromTo($("map"), { opacity: 1 }, { opacity: 0, duration: 0.05, ease: "none" }, 4.85);
      if ($("title")) tl.to($("title"), { opacity: 0, duration: 0.4, ease: "power1.in" }, 4.2);
      if ($("ins1")) tl.to($("ins1"), { opacity: 0, duration: 0.4, ease: "power1.in" }, 4.2);
      if ($("ins2")) tl.fromTo($("ins2"), { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power1.out" }, 4.5);
      if ($("caption")) tl.fromTo($("caption"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 5.0);

      // Sea rows drift at different speeds.
      ${ROWS.map((row, i) => `tl.fromTo($("wave${i + 1}"), { x: 0 }, { x: -${row.drift}, duration: 3.8, ease: "none" }, 4.2);`).join("\n      ")}

      // The longship sails in and bobs on the swell.
      const bigShip = $("ship");
      const sailEase = gsap.parseEase("power2.out");
      const sail = { k: 0 };
      tl.fromTo(sail, { k: 0 }, {
        k: 1, duration: 3.8, ease: "none",
        onUpdate() {
          const s = sail.k * 3.8;
          const x = -520 + 1180 * sailEase(sail.k);
          const y = 860 + 7 * Math.sin((2 * Math.PI * s) / 2.4);
          const r = 1.4 * Math.sin((2 * Math.PI * s) / 2.4 + 0.8);
          bigShip.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ") rotate(" + r.toFixed(2) + ") scale(0.9)");
        },
      }, 4.2);

      window.__timelines["look-${p}"] = tl;
    })();
  </script>
</template>
`;
}

// ---------- write files ----------

mkdirSync(here("compositions"), { recursive: true });
LOOKS.forEach((look, i) => writeFileSync(here(`compositions/look-${look.id}.html`), sceneFile(look, i)));

const total = SCENE * LOOKS.length;
const hosts = LOOKS.map(
  (look, i) => `      <div
        id="look-${look.id}"
        data-composition-id="look-${look.id}"
        data-composition-src="compositions/look-${look.id}.html"
        data-start="${i * SCENE}"
        data-duration="${SCENE}"
        data-track-index="0"
        data-track-kind="graphics"
        data-width="1920"
        data-height="1080"
      ></div>`,
).join("\n");
const voices = LOOKS.map(
  (look, i) => `      <audio id="narration-${look.id}" class="clip" src="assets/narration.wav" data-start="${i * SCENE + NARRATION_AT}" data-duration="${NARRATION_LEN}" data-track-index="1" data-volume="1"></audio>`,
).join("\n");
writeFileSync(
  here("index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #111; }
    </style>
  </head>
  <body>
    <!-- Generated by tools/build-looks.mjs: edit that file and re-run it. -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
${hosts}
${voices}
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`,
);
console.log(`wrote ${LOOKS.length} looks, ${total}s`);
