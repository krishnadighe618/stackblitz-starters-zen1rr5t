// The Army That Walked Across the Sea: the shot list.
// Each shot starts on a paragraph of the narration (audio/segments.json) and
// is drawn with the channel's tapestry kit. Run from the video folder:
//   node tools/build-film.mjs
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  C, shape, stitch, solid, sky, nightSky, moon, birds, sea, ice, shore, ground, hill, tree, snowLayer,
  person, horse, cannon, flagCloth, ship, boat, castle, town, church, fort, wall, windmill, tent, fire,
  lantern, table, crown, cushion, throne, chest, goods, scales, ladder, hole, bridge, r1, rng,
} from "../../kit/tapestry.mjs";
import { makeMap, labelText } from "../../kit/maps.mjs";
import { timing, writeFilm } from "../../kit/film.mjs";

const folder = join(dirname(fileURLToPath(import.meta.url)), "..");
const T = timing(folder);
const SEG = T.segments;
const END_CARD = 6;
const TOTAL = Math.ceil((SEG[SEG.length - 1].end + END_CARD) * 10) / 10;

// Time of a word inside a shot, in shot seconds.
const W = (s, word, n = 1, off = 0) => Math.round((T.word(word, s.start, n) - s.start + off) * 100) / 100;
const wrap = (k, id, inner, hidden) => `<g id="${k.id(id)}"${hidden ? ' style="opacity:0"' : ""}>${inner}</g>`;

// ---------- map frames and regions ----------

const POLY = {
  scania: [[12.3, 56.47], [13.3, 56.47], [13.6, 56.45], [14.3, 56.3], [14.55, 56.15], [14.55, 55.2], [12.3, 55.2]],
  blekinge: [[14.5, 56.5], [15.6, 56.5], [16.4, 56.35], [16.4, 55.9], [14.5, 55.9]],
  halland: [[11.5, 57.62], [12.2, 57.62], [12.45, 57.5], [12.75, 57.15], [13.1, 56.9], [13.4, 56.65], [13.3, 56.47], [11.5, 56.47]],
  bohuslan: [[10.8, 59.1], [11.6, 59.1], [11.95, 58.7], [12.1, 58.3], [12.05, 57.95], [11.85, 57.65], [10.8, 57.65]],
  trondelag: [[7.5, 62.4], [10.5, 62.4], [12.3, 62.6], [13.8, 64.0], [14.3, 65.2], [7.5, 65.2]],
  bornholm: [[14.6, 54.95], [15.3, 54.95], [15.3, 55.35], [14.6, 55.35]],
  gotland: [[17.9, 56.85], [19.5, 56.85], [19.5, 58.1], [17.9, 58.1]],
  osel: [[21.7, 57.85], [23.5, 57.85], [23.5, 58.75], [21.7, 58.75]],
  jamtland: [[12.0, 61.55], [14.6, 61.5], [15.9, 62.1], [17.3, 63.2], [16.6, 64.9], [14.4, 65.15], [12.0, 64.3]],
  livonia: [[20.5, 56.85], [24.2, 56.75], [26.0, 56.6], [28.5, 56.4], [28.5, 58.2], [20.5, 58.2]],
  pomerania: [[12.3, 54.75], [14.7, 54.75], [14.7, 53.55], [12.3, 53.55]],
  jutland: [[7.9, 54.8], [9.68, 54.8], [9.68, 55.45], [9.74, 55.52], [9.9, 55.56], [10.4, 55.75], [10.95, 56.3], [11.0, 57.9], [7.9, 57.9]],
  funen: [[9.68, 55.25], [9.68, 55.45], [9.74, 55.52], [9.9, 55.56], [10.4, 55.66], [10.75, 55.66], [10.9, 55.4], [10.7, 55.2], [10.62, 55.05], [10.55, 54.95], [10.2, 54.9], [9.9, 55.0]],
};
const DKNO = { id: "dkno", countries: ["Denmark", "Norway"], fill: C.madder };
const SWEDEN = (extra = []) => [
  { id: "se", countries: ["Sweden", "Finland", "Estonia"], fill: C.weld },
  { id: "livonia", polygon: POLY.livonia, within: ["Latvia"], fill: C.weld },
  ...extra,
];
const DANISH_SWEDEN = [
  { id: "scania", polygon: POLY.scania, within: ["Sweden"], fill: C.madder },
  { id: "blekinge", polygon: POLY.blekinge, within: ["Sweden"], fill: C.madder },
  { id: "bohuslan", polygon: POLY.bohuslan, within: ["Sweden"], fill: C.madder },
];
const VIEW = { extent: [[40, 150], [1880, 945]] };
const FRAMES = {
  scand: { bounds: [[4, 54.0], [27, 69.5]], res: "50m" },
  rosk: { bounds: [[5, 54.6], [19, 65.5]], res: "50m" },
  pol: { bounds: [[10, 49.3], [27, 60.0]], res: "50m" },
  march: { bounds: [[7, 51.6], [22, 58.0]], res: "50m" },
  dk: { bounds: [[7.6, 54.45], [13.8, 57.85]], res: "10m" },
  sound: { bounds: [[11.7, 55.5], [13.3, 56.3]], res: "10m" },
  lb: { bounds: [[9.25, 54.95], [11.4, 55.75]], res: "10m" },
  gb: { bounds: [[9.9, 54.4], [12.4, 55.72]], res: "10m" },
  today: { bounds: [[11.9, 55.35], [13.3, 56.15]], res: "10m" },
};
const map = (k, frame, cfg) => makeMap(k, { ...FRAMES[frame], ...VIEW, ...cfg });
const L = (at, text, o = {}) => ({ at, text, size: 40, ...o });

// ---------- scene helpers ----------

function winter(k, o = {}) {
  const h = o.horizon ?? 600;
  return sky(k, { color: o.sky || C.linen }) + (o.birds ? birds(k, o.birds) : "") +
    shore(k, o.x0 ?? 1150, o.x1 ?? 2050, h + 4, o.shoreH ?? 50, { fill: o.shoreFill || C.oliveDk, snow: true, seed: o.seed || 4 }) +
    ice(k, { y: h, seed: o.seed || 3, cracks: o.cracks ?? 7 });
}
function rider(k, x, y, side, scale, extra = {}) {
  return horse(k, x, y, { scale, dir: extra.dir || 1, color: extra.color || [C.brown, C.brownDk, C.linen3][Math.abs(Math.round(x)) % 3], rider: { side, weapon: "sword", hat: "brim", feather: side === "se" ? C.weld : C.linen, ...extra.rider }, pose: extra.pose });
}
function gunTeam(k, x, y, scale) {
  return cannon(k, x - 170 * scale, y, { scale }) + `<line x1="${r1(x - 90 * scale)}" y1="${r1(y - 30 * scale)}" x2="${r1(x - 60 * scale)}" y2="${r1(y - 70 * scale)}" ${solid(4, C.brownDk)}/>` + horse(k, x + 30 * scale, y, { scale: scale * 0.95, color: C.brownDk, saddle: false });
}
// A marching column: kinds cycle through inf, pike, cav, gun, banner.
function column(k, id, o) {
  let s = "";
  for (let i = 0; i < o.n; i++) {
    const kind = o.kinds[i % o.kinds.length], x = o.x0 + i * o.gap, sc = o.scale, y = o.y + (o.jitter ? ((i * 37) % 13) - 6 : 0);
    if (kind === "cav") s += rider(k, x, y, o.side, sc * 0.85);
    else if (kind === "gun") s += gunTeam(k, x, y, sc * 0.8);
    else if (kind === "pike") s += person(k, x, y, { side: o.side, scale: sc * 1.05, weapon: "pike", arm: "hold", pose: i % 2 ? "walk" : "stand" });
    else if (kind === "banner") s += person(k, x, y, { side: o.side, scale: sc * 1.05, weapon: "banner", flag: o.side, arm: "hold", pose: "walk" });
    else s += person(k, x, y, { side: o.side, scale: sc * 1.05, weapon: "musket", pose: i % 2 ? "walk" : "stand" });
  }
  return `<g id="${k.id(id)}">${s}</g>`;
}
function room(k, o = {}) {
  const night = o.night;
  let s = `<rect width="1920" height="1080" fill="${night ? C.night2 : o.wall || C.linen2}"/><rect width="1920" height="1080" fill="${k.url("satin")}"/>`;
  for (const ax of o.windows || [360, 1560]) {
    const d = `M${ax - 110},700 L${ax - 110},380 A110,110 0 0 1 ${ax + 110},380 L${ax + 110},700 Z`;
    s += shape(k, d, night ? C.night : C.woad2, { w: 4 }) + `<path d="M${ax},270 L${ax},700 M${ax - 110},480 L${ax + 110},480" ${stitch(4)}/>`;
  }
  s += shape(k, `M-40,780 L1960,780 L1960,1100 L-40,1100 Z`, night ? C.brownDk : C.brown, { w: 4 });
  return s;
}
// Magnify a room's people and furniture around the floor line.
const zoom = (inner, z = 1.7, cx = 960, cy = 790) => `<g transform="translate(${cx},${cy}) scale(${z}) translate(${-cx},${-cy})">${inner}</g>`;
function seated(k, people, y) {
  return people.map(([x, o]) => person(k, x, y, { pose: "sit", ...o })).join("");
}

// ---------- the shots ----------

const SHOTS = [
  // I · THE HOOK
  { from: 0, band: "I · HERE AN ARMY MARCHES ACROSS THE SEA", build: (k, s) => ({
    svg: winter(k, { horizon: 560, birds: [[300, 250], [380, 220], [1500, 300]] }) +
      column(k, "col", { y: 790, x0: -700, n: 16, gap: 175, scale: 0.85, side: "se", kinds: ["cav", "inf", "inf", "pike", "banner", "gun", "inf", "cav"], jitter: true }) +
      snowLayer(k, "snow", { n: 60 }),
    events: [{ t: "move", id: "col", at: 0, dur: s.end - s.start, x: 900 }, { t: "move", id: "snow", at: 0, dur: s.end - s.start, y: 500 }],
  }) },
  { from: 2, band: "SOLDIERS · HORSES · CANNON", build: (k, s) => ({
    svg: winter(k, { horizon: 470, x0: 900, shoreH: 40, seed: 8 }) +
      column(k, "col", { y: 930, x0: -900, n: 9, gap: 330, scale: 1.35, side: "se", kinds: ["gun", "cav", "inf", "cav", "pike", "gun", "banner", "cav"] }) +
      snowLayer(k, "snow", { n: 50, seed: 4 }),
    events: [{ t: "move", id: "col", at: 0, dur: s.end - s.start, x: 1000 }, { t: "move", id: "snow", at: 0, dur: s.end - s.start, y: 420 }],
  }) },
  { from: 3, band: "THE SEA WAS DENMARK'S WALL", build: (k, s) => ({
    svg: sky(k) + birds(k, [[600, 260], [690, 230]]) +
      shore(k, -100, 700, 640, 70, { fill: C.olive, seed: 2 }) + town(k, 1430, 640, { w: 700, scale: 0.62, seed: 5 }) +
      shore(k, 1000, 2050, 645, 30, { fill: C.oliveDk, seed: 6 }) +
      sea(k, { y: 640 }).slice(0, 2).join("") +
      wrap(k, "s1", wrap(k, "b1", ship(k, 520, 800, { flag: "dk", scale: 0.62 }))) +
      wrap(k, "s2", wrap(k, "b2", ship(k, 1300, 860, { flag: "dk", scale: 0.75, dir: -1 }))) +
      sea(k, { y: 640 })[2],
    events: [
      { t: "move", id: "s1", at: 0, dur: s.end - s.start, x: 220 }, { t: "move", id: "s2", at: 0, dur: s.end - s.start, x: -260 },
      { t: "bob", id: "b1", at: 0, dur: s.end - s.start, amp: 5, period: 2.4, rot: 1.2, ox: 520, oy: 800 },
      { t: "bob", id: "b2", at: 0, dur: s.end - s.start, amp: 6, period: 2.9, rot: 1.4, ox: 1300, oy: 860, phase: 1 },
      { t: "move", id: "sea-1", at: 0, dur: s.end - s.start, x: -140 }, { t: "move", id: "sea-2", at: 0, dur: s.end - s.start, x: 190 },
      { t: "move", id: "sea-3", at: 0, dur: s.end - s.start, x: -260 },
    ],
  }) },
  { from: 4, band: "HOW DID THEY CROSS THE SEA?", build: (k, s) => {
    const m = map(k, "dk", {
      regions: [{ ...DKNO }, { id: "se", countries: ["Sweden"], fill: C.weld }, { id: "scania", polygon: POLY.scania, within: ["Sweden"], fill: C.madder }],
      labels: [L([9.1, 56.2], "JUTLAND"), L([10.35, 55.32], "FUNEN", { size: 32 }), L([11.65, 55.55], "ZEALAND", { size: 34 }), L([13.6, 56.0], "SCANIA", { size: 34 }), L([15.0, 57.4], "SWEDEN", { color: C.dark, halo: C.linen })],
      pins: [{ id: "cph", at: [12.57, 55.68], label: "COPENHAGEN", side: "right", size: 36 }],
      routes: [{ id: "march", via: [[9.45, 55.42], [9.85, 55.44], [10.55, 55.08], [10.8, 54.93], [11.4, 54.78], [11.9, 54.82], [11.95, 55.05], [12.3, 55.45], [12.5, 55.66]], marker: "se" }],
    });
    return { svg: m.svg, events: [{ t: "draw", id: "march", route: m.routes.march, at: 0.8, dur: W(s, "gates") - 0.5 }, { t: "pulse", id: "cph", at: W(s, "Copenhagen") }] };
  } },
  { from: 6, band: "", build: (k, s) => ({
    svg: sky(k) + `<g transform="translate(0,40)">${sea(k, { y: 800, rows: [{ dy: 0, amp: 10, wl: 150, fill: C.woad2 }, { dy: 70, amp: 14, wl: 210, fill: C.woad }] }).join("")}</g>` +
      wrap(k, "ship", ship(k, 330, 850, { flag: "dk", scale: 0.42 })) +
      `<rect x="1180" y="760" width="900" height="300" fill="${C.ice}"/>` + wrap(k, "walker", column(k, "mini", { y: 905, x0: 1300, n: 4, gap: 130, scale: 0.6, side: "se", kinds: ["cav", "inf", "banner", "inf"] })),
    html: `<div id="${k.id("title")}" style="position:absolute;left:0;right:0;top:250px;text-align:center;font-family:'EB Garamond',serif;font-weight:700;color:${C.madder};font-size:112px;line-height:1.02;letter-spacing:0.04em">THE ARMY THAT<br>WALKED ACROSS<br>THE SEA</div>
      <div id="${k.id("sub")}" style="position:absolute;left:0;right:0;top:640px;text-align:center;font-family:'EB Garamond',serif;font-weight:700;color:${C.dark};font-size:40px;letter-spacing:0.3em">DENMARK · 1658</div>`,
    events: [{ t: "rise", id: "title", at: 0.3, dur: 1.2 }, { t: "fade", id: "sub", at: 1.4, dur: 1 }, { t: "move", id: "walker", at: 0, dur: s.end - s.start, x: 220 }],
    cam: false,
  }) },

  // II · THE KINGDOM THAT OWNED THE SEA
  { from: 7, band: "II · THE KINGDOM THAT OWNED THE SEA", build: (k, s) => {
    const m = map(k, "scand", {
      regions: [...SWEDEN(), DKNO, ...DANISH_SWEDEN, { id: "halland", polygon: POLY.halland, within: ["Sweden"], hatch: true }],
      labels: [L([2.5, 63.2], "DENMARK–NORWAY", { size: 34 }), L([20.2, 63.9], "SWEDEN", { size: 40, color: C.dark, halo: C.linen }),
        L([9.0, 56.3], "JUTLAND", { size: 30 }), L([19.2, 57.7], "BALTIC SEA", { size: 34, italic: true }), L([4.8, 57.2], "NORTH SEA", { size: 34, italic: true }),
        { id: "lab-scania", at: [13.4, 55.95], text: "SCANIA", size: 34 }],
    });
    return { svg: m.svg, events: [{ t: "fade", id: "lab-scania", at: W(s, "Scania") - 0.3 }, { t: "pulse", id: "scania", at: W(s, "Scania") }, { t: "pulse", id: "dkno", at: W(s, "Norway") }],
      cam: { from: { scale: 1, x: 0, y: 0 }, to: { scale: 1.12, x: 0, y: 0 }, origin: "760 820" } };
  } },
  { from: 9, band: "THE SOUND", build: (k, s) => {
    const m = map(k, "sound", {
      regions: [DKNO, { id: "se", countries: ["Sweden"], fill: C.madder }],
      labels: [L([12.05, 55.85], "ZEALAND"), L([13.15, 55.9], "SCANIA"), L([12.78, 55.88], "THE SOUND", { size: 34, italic: true }), { id: "km", at: [12.9, 56.11], text: "4 KM", size: 30, color: C.weld }],
      pins: [{ id: "els", at: [12.61, 56.04], label: "ELSINORE", side: "left", size: 34 }, { id: "cph", at: [12.57, 55.68], label: "COPENHAGEN", side: "left", size: 34 }],
      routes: [
        { id: "ship1", via: [[12.45, 56.32], [12.68, 56.07], [12.8, 55.8], [12.85, 55.52]], marker: "nl", color: C.linen, width: 4, arrow: false },
        { id: "ship2", via: [[12.85, 55.52], [12.8, 55.8], [12.67, 56.07], [12.5, 56.32]], marker: "en", color: C.linen, width: 4, arrow: false },
      ],
    });
    return { svg: m.svg, events: [{ t: "fade", id: "km", at: W(s, "four") }, { t: "draw", id: "ship1", route: m.routes.ship1, at: W(s, "Ships"), dur: 7 }, { t: "draw", id: "ship2", route: m.routes.ship2, at: W(s, "Ships") + 2, dur: 7 }, { t: "pulse", id: "dkno", at: W(s, "both") }, { t: "pulse", id: "se", at: W(s, "both") }] };
  } },
  { from: 11, band: "HERE SHIPS PAY THE KING AT ELSINORE", build: (k, s) => ({
    svg: sky(k) + birds(k, [[400, 240], [480, 210]]) + hill(k, `M900,720 L960,640 L2000,630 L2000,800 Z`, { fill: C.olive }) + castle(k, 1380, 650, { scale: 0.78 }) +
      sea(k, { y: 690 }).slice(0, 2).join("") +
      wrap(k, "q", wrap(k, "qa", ship(k, 120, 820, { flag: "nl", scale: 0.5 })) + wrap(k, "qb", ship(k, 520, 840, { flag: "en", scale: 0.55 })) + wrap(k, "qc", boat(k, 860, 880, { people: [{ side: "dk", hat: "brim" }, { side: "civ" }], chest: true, scale: 0.9 }))) +
      sea(k, { y: 690 })[2],
    events: [{ t: "move", id: "q", at: 0, dur: s.end - s.start, x: 140 }, { t: "bob", id: "qa", at: 0, dur: s.end - s.start, amp: 4, period: 2.5, rot: 1 , ox: 120, oy: 820 },
      { t: "bob", id: "qb", at: 0, dur: s.end - s.start, amp: 5, period: 2.9, rot: 1, ox: 520, oy: 840, phase: 2 }, { t: "bob", id: "qc", at: 0, dur: s.end - s.start, amp: 4, period: 1.9, ox: 860, oy: 880 },
      { t: "move", id: "sea-1", at: 0, dur: s.end - s.start, x: -140 }, { t: "move", id: "sea-3", at: 0, dur: s.end - s.start, x: 260 }],
  }) },
  { from: 12, band: "EVERY CAPTAIN DECLARES HIS CARGO", build: (k, s) => ({
    svg: room(k) + crown(k, 960, 250, 0.9) + zoom(
      seated(k, [[1180, { side: "dk", arm: "forward", weapon: "quill", hat: "brim" }]], 740) +
      person(k, 560, 800, { side: "civ", arm: "forward", hat: "brim", scale: 1.35 }) +
      table(k, 1050, 720, { w: 620, cloth: C.woad, papers: [[-200, 100]] }) + scales(k, 960, 690, 0.8) +
      wrap(k, "chest", chest(k, 1250, 690, 0.9), true) + wrap(k, "buy", flagCloth(k, 1290, 560, "dk", 1.2) + `<line x1="1290" y1="560" x2="1290" y2="690" ${solid(4, C.brownDk)}/>`, true) +
      goods(k, 330, 800, 0.9), 1.6),
    events: [{ t: "fade", id: "chest", at: W(s, "share") }, { t: "rise", id: "buy", at: W(s, "buy") }],
  }) },
  { from: 13, band: "AND THE KING GROWS RICH", build: (k, s) => ({
    svg: sky(k) + sea(k, { y: 620 }).slice(0, 2).join("") +
      wrap(k, "nl", ship(k, 700, 760, { flag: "nl", scale: 0.42 }), true) + wrap(k, "en", ship(k, 1080, 780, { flag: "en", scale: 0.45 }), true) + wrap(k, "de", ship(k, 1450, 770, { flag: "none", scale: 0.44 }), true) +
      sea(k, { y: 620 })[2] + ground(k, 860, { d: `M-50,850 L620,850 L640,1100 L-50,1100 Z`, fill: C.brown }) +
      wrap(k, "g1", goods(k, 230, 860, 0.8), true) + wrap(k, "king", crown(k, 1640, 420, 1.1) + chest(k, 1640, 560, 1), true),
    events: [{ t: "rise", id: "g1", at: W(s, "Grain") }, { t: "rise", id: "nl", at: W(s, "Dutch") }, { t: "rise", id: "en", at: W(s, "English") }, { t: "rise", id: "de", at: W(s, "German") }, { t: "rise", id: "king", at: W(s, "king") }],
  }) },
  { from: 14, band: "ACROSS THE WATER, SWEDEN GROWS STRONG", build: (k, s) => ({
    svg: sky(k) + hill(k, `M-50,640 Q400,560 900,620 T1970,600 L1970,1100 L-50,1100 Z`, { fill: C.olive2 }) + tree(k, 1650, 640, 200, { leaves: C.oliveDk }) + tree(k, 220, 650, 170, { leaves: C.oliveDk, seed: 2 }) +
      ground(k, 760, { fill: C.olive }) +
      column(k, "col", { y: 900, x0: -1300, n: 14, gap: 210, scale: 1.05, side: "se", kinds: ["banner", "pike", "pike", "inf", "inf", "cav", "pike", "inf", "gun"] }),
    events: [{ t: "move", id: "col", at: 0, dur: s.end - s.start, x: 1250 }],
  }) },
  { from: 16, band: "THE PEACE OF 1645", build: (k, s) => {
    const m = map(k, "scand", {
      regions: [...SWEDEN(), DKNO, ...DANISH_SWEDEN, { id: "halland-se", polygon: POLY.halland, within: ["Sweden"], hatch: true },
        { id: "gotland-dk", polygon: POLY.gotland, within: ["Sweden"], fill: C.madder }, { id: "osel-dk", polygon: POLY.osel, within: ["Estonia"], fill: C.madder },
        { id: "jamt-dk", polygon: POLY.jamtland, within: ["Sweden"], fill: C.madder }, { id: "halland-dk", polygon: POLY.halland, within: ["Sweden"], fill: C.madder }],
      labels: [L([2.5, 63.2], "DENMARK–NORWAY", { size: 34 }), L([20.2, 63.9], "SWEDEN", { size: 40, color: C.dark, halo: C.linen }),
        { id: "l-got", at: [18.6, 57.9], text: "GOTLAND", size: 28, anchor: "start" }, { id: "l-osel", at: [22.6, 58.9], text: "ÖSEL", size: 28 },
        { id: "l-jamt", at: [14.6, 63.3], text: "JÄMTLAND", size: 28, color: C.dark, halo: C.linen }, { id: "l-hall", at: [11.6, 57.0], text: "HALLAND", size: 28, anchor: "end" }],
    });
    const isl = W(s, "islands"), prov = W(s, "provinces"), hal = W(s, "Halland");
    return { svg: m.svg, events: [
      { t: "out", id: "gotland-dk", at: isl }, { t: "out", id: "osel-dk", at: isl }, { t: "fade", id: "l-got", at: isl }, { t: "fade", id: "l-osel", at: isl },
      { t: "out", id: "jamt-dk", at: prov }, { t: "fade", id: "l-jamt", at: prov }, { t: "out", id: "halland-dk", at: hal }, { t: "fade", id: "l-hall", at: hal },
      { t: "pulse", id: "dkno", at: W(s, "back") }] };
  } },

  // III · THE KING WHO COULD NOT SIT STILL
  { from: 18, band: "III · THE KING WHO COULD NOT SIT STILL", build: (k, s) => ({
    svg: room(k, { windows: [300, 1620] }) + zoom(throne(k, 960, 790, 0.9) +
      wrap(k, "cushion", cushion(k, 960, 640, 0.9) + crown(k, 960, 600, 0.6), true) +
      wrap(k, "christina", person(k, 640, 800, { side: "civ", coat: C.woadDk, robe: true, hat: "crown", hair: C.brown, scale: 1.6, arm: "forward" })) +
      wrap(k, "charles", person(k, 1300, 800, { side: "se", hat: "crown", cloak: C.madder, scale: 1.65, arm: "point", weapon: "sword", dir: -1 }), true), 1.45),
    events: [{ t: "fade", id: "cushion", at: W(s, "crown") }, { t: "move", id: "christina", at: W(s, "left"), dur: 2.5, x: -800, ease: "power1.in" },
      { t: "fade", id: "charles", at: W(s, "Charles") - 0.4 }],
  }) },
  { from: 19, band: "WARSAW FALLS · KRAKÓW FALLS", build: (k, s) => {
    const m = map(k, "pol", {
      regions: [...SWEDEN([{ id: "pom", polygon: POLY.pomerania, within: ["Germany"], fill: C.weld }]), DKNO, ...DANISH_SWEDEN, { id: "pl", countries: ["Poland", "Lithuania", "Belarus"], fill: C.linen3 }],
      labels: [L([15.8, 59.0], "SWEDEN", { size: 44, color: C.dark, halo: C.linen }), L([24.5, 53.5], "POLAND–LITHUANIA", { size: 38, color: C.dark, halo: C.linen })],
      pins: [{ id: "war", at: [21.0, 52.23], label: "WARSAW", side: "right", size: 34 }, { id: "kra", at: [19.94, 50.06], label: "KRAKÓW", side: "right", size: 34 }],
      routes: [{ id: "inv", via: [[14.55, 53.43], [17.0, 52.6], [20.9, 52.25]], marker: "se" }, { id: "south", via: [[21.0, 52.2], [20.6, 51.0], [20.0, 50.1]], marker: "se" }],
    });
    return { svg: m.svg, events: [{ t: "draw", id: "inv", route: m.routes.inv, at: W(s, "invaded"), dur: 4 }, { t: "pop", id: "war", at: W(s, "Warsaw"), origin: m.pt([21.0, 52.23]).join(" ") },
      { t: "draw", id: "south", route: m.routes.south, at: W(s, "Warsaw") + 0.3, dur: 1.6 }, { t: "pop", id: "kra", at: W(s, "Kraków"), origin: m.pt([19.94, 50.06]).join(" ") }, { t: "pulse", id: "pl", at: W(s, "beaten") }] };
  } },
  { from: 21, band: "FREDERICK OF DENMARK DECLARES WAR", build: (k, s) => ({
    svg: room(k) + zoom(seated(k, [[700, { side: "civ" }], [900, { side: "civ2", dir: -1 }], [1120, { side: "civ3" }]], 740) +
      table(k, 920, 720, { w: 760, cloth: C.madder, candles: [640, 1200] }) +
      person(k, 1450, 800, { side: "dk", hat: "crown", cloak: C.madderDk, scale: 1.6, arm: "point", dir: -1, hair: C.dark }) +
      wrap(k, "war", person(k, 380, 800, { side: "dk", weapon: "banner", flag: "dk", arm: "hold", scale: 1.4 }), true), 1.5),
    events: [{ t: "rise", id: "war", at: W(s, "declared") }],
  }) },
  { from: 23, band: "THE SWEDES MARCH WEST", build: (k, s) => {
    const m = map(k, "march", {
      regions: [...SWEDEN([{ id: "pom", polygon: POLY.pomerania, within: ["Germany"], fill: C.weld }]), DKNO, ...DANISH_SWEDEN, { id: "pl", countries: ["Poland", "Lithuania"], fill: C.linen3 }],
      labels: [L([19.5, 52.2], "POLAND", { size: 38, color: C.dark, halo: C.linen }), L([9.0, 56.4], "JUTLAND", { size: 36 }), L([11.0, 52.6], "GERMAN LANDS", { size: 32 }), L([15.0, 57.3], "SWEDEN", { size: 40, color: C.dark, halo: C.linen })],
      routes: [{ id: "west", via: [[18.6, 53.0], [15.5, 53.5], [12.6, 53.9], [10.2, 54.3], [9.4, 55.2], [9.5, 56.2]], marker: "se" }],
    });
    return { svg: m.svg, events: [{ t: "draw", id: "west", route: m.routes.west, at: W(s, "marched"), dur: W(s, "Jutland") - W(s, "marched") + 0.8 }] };
  } },
  { from: 24, band: "FREDRIKSODDE FALLS BEFORE DAWN", build: (k, s) => ({
    svg: nightSky(k, { seed: 3 }) + moon(k, 1600, 260, 50) + sea(k, { y: 700, rows: [{ dy: 0, amp: 10, wl: 160, fill: C.woadDk }, { dy: 140, amp: 14, wl: 220, fill: C.night2 }], crest: C.woad2 }).join("") +
      ground(k, 760, { d: `M-50,720 Q500,700 1250,730 L1350,1100 L-50,1100 Z`, fill: C.oliveDk }) +
      fort(k, 700, 760, { scale: 1.15, flag: "dk" }) + wrap(k, "seflag", flagCloth(k, 706.9, 564.5, "se", 1.15), true) +
      ladder(k, 420, 900, 220, -18) + ladder(k, 1000, 900, 220, 16) +
      wrap(k, "att", person(k, 330, 960, { side: "se", weapon: "torch", arm: "up", pose: "walk", scale: 1.1 }) + person(k, 1100, 960, { side: "se", weapon: "torch", arm: "up", pose: "walk", scale: 1.1, dir: -1 }) + person(k, 220, 980, { side: "se", weapon: "pike", arm: "hold", scale: 1.1 })),
    events: [{ t: "move", id: "att", at: 0, dur: s.end - s.start, y: -40 }, { t: "fade", id: "seflag", at: W(s, "took") }],
  }) },
  { from: 25, band: "BETWEEN THE KING AND COPENHAGEN, THE SEA", build: (k, s) => {
    const m = map(k, "dk", {
      regions: [{ ...DKNO }, { id: "se0", countries: ["Sweden"], fill: C.weld }, { id: "scania", polygon: POLY.scania, within: ["Sweden"], fill: C.madder }, { id: "jut", polygon: POLY.jutland, within: ["Denmark"], fill: C.weld, hidden: true }],
      labels: [L([9.1, 56.2], "JUTLAND", { color: C.dark, halo: C.linen }), L([10.35, 55.32], "FUNEN", { size: 32 }), L([11.65, 55.55], "ZEALAND", { size: 34 }),
        { id: "l-lb", at: [9.3, 55.1], text: "LITTLE BELT", size: 26, italic: true, color: C.weld }, { id: "l-gb", at: [11.2, 56.0], text: "GREAT BELT", size: 26, italic: true, color: C.weld }],
      pins: [{ id: "cph", at: [12.57, 55.68], label: "COPENHAGEN", side: "right", size: 34 }],
      routes: [
        { id: "p1", via: [[9.9, 55.05], [9.8, 55.3], [9.85, 55.62]], marker: "dk", color: C.linen, width: 3, arrow: false },
        { id: "p2", via: [[11.0, 55.0], [11.05, 55.3], [10.95, 55.65]], marker: "dk", color: C.linen, width: 3, arrow: false },
      ],
    });
    return { svg: m.svg, events: [{ t: "fade", id: "jut", at: W(s, "belonged") }, { t: "fade", id: "l-lb", at: W(s, "Little") }, { t: "fade", id: "l-gb", at: W(s, "Great") },
      { t: "draw", id: "p1", route: m.routes.p1, at: W(s, "navy"), dur: 6 }, { t: "draw", id: "p2", route: m.routes.p2, at: W(s, "navy") + 0.5, dur: 6 }] };
  } },
  { from: 27, band: "THE SWEDES WAIT · THE DANES FEEL SAFE", build: (k, s) => ({
    svg: sky(k) + shore(k, 900, 2050, 600, 45, { fill: C.oliveDk, seed: 9 }) + sea(k, { y: 600 }).slice(0, 2).join("") +
      wrap(k, "dk", wrap(k, "dkb", ship(k, 1400, 700, { flag: "dk", scale: 0.4, dir: -1 }))) + sea(k, { y: 600 })[2] +
      ground(k, 860, { d: `M-50,820 Q500,800 1000,860 L1100,1100 L-50,1100 Z`, fill: C.olive2, snow: 0.6 }) +
      tent(k, 160, 860, { scale: 1.1 }) + tent(k, 420, 850, {}) +
      person(k, 640, 930, { side: "se", weapon: "musket", scale: 1.3 }) + person(k, 780, 950, { side: "se", weapon: "pike", arm: "hold", scale: 1.3 }) + person(k, 900, 960, { side: "se", arm: "point", scale: 1.3 }),
    events: [{ t: "move", id: "dk", at: 0, dur: s.end - s.start, x: -300 }, { t: "bob", id: "dkb", at: 0, dur: s.end - s.start, amp: 4, period: 2.6, rot: 1, ox: 1400, oy: 700 }],
  }) },

  // IV · THE COLDEST WINTER
  { from: 29, band: "IV · THE COLDEST WINTER", build: (k, s) => ({
    svg: sky(k, { color: C.linen2 }) + shore(k, 1000, 2050, 600, 40, { fill: C.oliveDk, snow: true }) +
      `<rect x="-50" y="600" width="2020" height="500" fill="${C.woad3}"/><rect x="-50" y="600" width="2020" height="500" fill="${k.url("satin2")}"/>` +
      ground(k, 820, { d: `M-50,780 Q600,740 1200,800 T1970,790 L1970,1100 L-50,1100 Z`, fill: C.olive, snow: 0.8 }) +
      tree(k, 300, 820, 260) + tree(k, 520, 800, 200, { seed: 3 }) + tree(k, 1500, 820, 240, { seed: 7 }) +
      snowLayer(k, "snow1", { n: 80, seed: 2 }) + snowLayer(k, "snow2", { n: 50, seed: 6 }),
    events: [{ t: "move", id: "snow1", at: 0, dur: s.end - s.start, y: 900, x: 120 }, { t: "move", id: "snow2", at: 0, dur: s.end - s.start, y: 1500, x: 200 }],
  }) },
  { from: 31, band: "THE BELT FREEZES", build: (k, s) => ({
    svg: sky(k, { color: C.linen2 }) + shore(k, 1100, 2050, 600, 50, { fill: C.oliveDk, snow: true, seed: 12 }) +
      sea(k, { y: 600, crest: C.ice }).join("") +
      `<clipPath id="${k.id("iceclip")}"><rect id="${k.id("icerect")}" x="-60" y="560" width="300" height="600"/></clipPath>` +
      `<g clip-path="url(#${k.id("iceclip")})">${ice(k, { y: 600, seed: 5 })}</g>` +
      ground(k, 900, { d: `M-50,640 L240,650 Q300,800 260,1100 L-50,1100 Z`, fill: C.olive, snow: 0.8 }) + tree(k, 120, 700, 200),
    events: [{ t: "attr", id: "icerect", at: W(s, "shore"), dur: 2.5, from: { width: 300 }, to: { width: 800 } }, { t: "attr", id: "icerect", at: W(s, "further"), dur: 2.5, from: { width: 800 }, to: { width: 1400 } },
      { t: "attr", id: "icerect", at: W(s, "across"), dur: 2.5, from: { width: 1400 }, to: { width: 2100 } }],
  }) },
  { from: 33, band: "THE ICE IS TESTED", build: (k, s) => ({
    svg: winter(k, { horizon: 560, sky: C.linen2, seed: 13 }) +
      person(k, 760, 860, { side: "se", pose: "kneel", weapon: "pole", arm: "hold", scale: 1.5 }) + lantern(k, 900, 870, { scale: 1.3, glow: 90 }) +
      person(k, 1120, 870, { side: "se", pose: "kneel", arm: "forward", scale: 1.5, dir: -1 }) +
      person(k, 1420, 880, { side: "se", hat: "crown", cloak: C.madder, arm: "point", scale: 1.6, dir: -1 }),
  }) },
  { from: 34, band: "AT DAWN, THE ARMY ON THE SHORE", build: (k, s) => ({
    svg: sky(k, { color: C.linen2 }) + `<rect x="-50" y="590" width="2020" height="20" fill="${C.oliveDk}"/>` + shore(k, 300, 1700, 596, 18, { fill: C.oliveDk, seed: 15 }) +
      ice(k, { y: 600, seed: 21, cracks: 3, drifts: 9 }) +
      ground(k, 940, { d: `M-50,900 Q700,860 1400,920 T1970,910 L1970,1100 L-50,1100 Z`, fill: C.olive, snow: 0.85 }) + snowLayer(k, "snow", { n: 40 }),
    cam: { from: { scale: 1, x: 0, y: 0 }, to: { scale: 1.12, x: 0, y: 0 }, origin: "960 600" },
    events: [{ t: "move", id: "snow", at: 0, dur: s.end - s.start, y: 700 }],
  }) },
  { from: 35, band: "HERE THEY RIDE OUT ONTO THE SEA", build: (k, s) => {
    let riders = "";
    [[200, 640, 0.55], [520, 700, 0.65], [860, 660, 0.6], [1200, 720, 0.7], [1540, 680, 0.62]].forEach(([x, y, sc], i) => (riders += rider(k, x, y, "se", sc)));
    const crack = `M200,1000 L420,940 L520,960 L760,900 L980,930 L1200,880 L1500,910 L1800,860`;
    return {
      svg: winter(k, { horizon: 520, sky: C.linen2, seed: 17 }) + wrap(k, "riders", riders) +
        column(k, "inf", { y: 930, x0: -600, n: 7, gap: 210, scale: 1.2, side: "se", kinds: ["inf", "pike", "inf", "banner"] }) +
        `<mask id="${k.id("cm")}" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><rect id="${k.id("cmr")}" x="0" y="0" width="0" height="1080" fill="#fff"/></mask>` +
        `<path d="${crack}" fill="none" ${stitch(5, C.ice3)} mask="url(#${k.id("cm")})"/>`,
      events: [{ t: "move", id: "riders", at: 0, dur: s.end - s.start, x: 260 }, { t: "move", id: "inf", at: 0, dur: s.end - s.start, x: 700 },
        { t: "attr", id: "cmr", at: W(s, "groaned"), dur: 3, from: { width: 0 }, to: { width: 1920 } }],
    };
  } },
  { from: 37, band: "THE ICE BREAKS", build: (k, s) => ({
    svg: winter(k, { horizon: 540, sky: C.linen2, seed: 19 }) +
      wrap(k, "hole", hole(k, 960, 820, 330)) +
      wrap(k, "sink", rider(k, 880, 830, "se", 0.95) + rider(k, 1080, 860, "se", 0.85, { color: C.linen3 })) +
      `<g><path d="M560,820 L1360,820 L1360,1100 L560,1100 Z" fill="${C.water}" opacity="0"/></g>` +
      person(k, 520, 900, { side: "se", arm: "forward", scale: 1.4 }) + person(k, 1420, 910, { side: "se", arm: "forward", scale: 1.4, dir: -1 }) +
      column(k, "rest", { y: 680, x0: -400, n: 8, gap: 190, scale: 0.6, side: "se", kinds: ["cav", "inf", "inf", "cav"] }),
    events: [{ t: "scale", id: "hole", at: W(s, "gave"), dur: 1.2, from: 0.3, to: 1, origin: "960 820" }, { t: "move", id: "sink", at: W(s, "gave") + 0.6, dur: 3, y: 120, ease: "power1.in" },
      { t: "out", id: "sink", at: W(s, "saved") - 0.2, dur: 1 }, { t: "move", id: "rest", at: W(s, "rest"), dur: s.end - s.start - W(s, "rest"), x: 500 }],
  }) },
  { from: 39, band: "FUNEN FALLS", build: (k, s) => {
    const m = map(k, "lb", {
      regions: [{ ...DKNO }, { id: "jut", polygon: POLY.jutland, within: ["Denmark"], fill: C.weld }, { id: "fun", polygon: POLY.funen, within: ["Denmark"], fill: C.weld, hidden: true }],
      labels: [L([9.45, 55.5], "JUTLAND", { color: C.dark, halo: C.linen }), L([10.3, 55.3], "FUNEN", { size: 40, plaque: true }), L([9.62, 55.22], "LITTLE BELT", { size: 28, italic: true }),
        { id: "l-gb", at: [11.05, 55.45], text: "GREAT BELT", size: 34, italic: true, color: C.weld }],
      pins: [{ id: "fight", at: [9.86, 55.45], color: C.dark, label: "THE DANES ARE BEATEN", side: "right", size: 30, plaque: true }],
      routes: [{ id: "cross", via: [[9.5, 55.37], [9.68, 55.38], [9.84, 55.45]], marker: "se" }],
    });
    return { svg: m.svg, events: [{ t: "draw", id: "cross", route: m.routes.cross, at: 0.5, dur: 4 }, { t: "pop", id: "fight", at: W(s, "beaten"), origin: m.pt([9.86, 55.45]).join(" ") },
      { t: "fade", id: "fight-label", at: W(s, "beaten") }, { t: "fade", id: "fun", at: W(s, "whole") }, { t: "fade", id: "l-gb", at: W(s, "next") }],
      cam: { from: { scale: 1, x: 0, y: 0 }, to: { scale: 1.06, x: -40, y: 0 } } };
  } },

  // V · THE LONG WAY ROUND
  { from: 41, band: "V · THE LONG WAY ROUND", build: (k, s) => {
    const m = map(k, "gb", {
      regions: [{ ...DKNO }, { id: "fun", polygon: POLY.funen, within: ["Denmark"], fill: C.weld }],
      labels: [L([10.3, 55.35], "FUNEN", { color: C.dark, halo: C.linen }), L([11.7, 55.45], "ZEALAND"), L([11.0, 55.55], "GREAT BELT", { size: 34, italic: true }), { id: "km", at: [11.0, 55.24], text: "OVER 15 KM OF SEA", size: 26, color: C.linen }],
      routes: [{ id: "direct", via: [[10.8, 55.31], [11.14, 55.33]], color: C.linen, width: 6, marker: "se" }],
    });
    const [x, y] = m.pt([10.98, 55.33]);
    const cross = `<g id="${k.id("x")}" style="opacity:0"><path d="M${x - 50},${y - 50} L${x + 50},${y + 50} M${x + 50},${y - 50} L${x - 50},${y + 50}" ${solid(16, C.madder)}/><path d="M${x - 50},${y - 50} L${x + 50},${y + 50} M${x + 50},${y - 50} L${x - 50},${y + 50}" ${stitch(5, C.dark)}/></g>`;
    return { svg: m.svg + cross, events: [{ t: "fade", id: "km", at: W(s, "fifteen") }, { t: "draw", id: "direct", route: m.routes.direct, at: W(s, "broke") - 2, dur: 2 }, { t: "fade", id: "x", at: W(s, "drown"), dur: 0.3 }] };
  } },
  { from: 42, band: "THE KING'S OFFICERS DISAGREE", build: (k, s) => ({
    svg: room(k, { night: true }) + zoom(seated(k, [[960, { side: "se", hat: "crown", cloak: C.madder }]], 740) +
      table(k, 960, 720, { w: 700, cloth: C.woad, candles: [700, 1220], papers: [[-160, 320]] }) +
      person(k, 460, 800, { side: "se", arm: "up", scale: 1.4 }) + person(k, 620, 810, { side: "se", arm: "forward", scale: 1.35, dir: 1 }) +
      wrap(k, "dahl", person(k, 1430, 810, { side: "se", arm: "point", feather: C.weld, scale: 1.45, dir: -1 }), true), 1.6),
    events: [{ t: "rise", id: "dahl", at: W(s, "disagreed") - 0.3 }],
  }) },
  { from: 43, band: "DAHLBERGH TESTS THE ICE BY NIGHT", build: (k, s) => ({
    svg: nightSky(k, { seed: 11 }) + moon(k, 1500, 260, 44) + shore(k, 1100, 2050, 600, 40, { fill: C.night2, seed: 5 }) +
      ice(k, { y: 600, fill: "#aab8c2", seed: 23 }) + `<rect x="-50" y="600" width="2020" height="500" fill="${C.night}" opacity="0.35"/>` +
      lantern(k, 1010, 880, { scale: 1.4, glow: 240 }) + person(k, 900, 880, { side: "se", pose: "kneel", weapon: "pole", arm: "hold", feather: C.weld, scale: 1.6 }) +
      [[700, 900], [560, 930], [420, 950], [280, 980]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="5" fill="${C.ice3}"/>`).join(""),
  }) },
  { from: 44, band: "STEPPING STONES ACROSS THE ICE", build: (k, s) => {
    const m = map(k, "gb", {
      regions: [{ ...DKNO }, { id: "fun", polygon: POLY.funen, within: ["Denmark"], fill: C.weld }],
      labels: [L([10.3, 55.35], "FUNEN", { color: C.dark, halo: C.linen }), L([11.7, 55.45], "ZEALAND"),
        { id: "l-lan", at: [10.76, 55.02], text: "LANGELAND", size: 26, anchor: "end" }, { id: "l-lol", at: [11.35, 54.72], text: "LOLLAND", size: 30 }, { id: "l-fal", at: [12.05, 54.72], text: "FALSTER", size: 26, anchor: "start" }],
      routes: [{ id: "isl", via: [[10.61, 55.06], [10.7, 54.94], [10.86, 54.88], [11.05, 54.86], [11.45, 54.78], [11.88, 54.82], [11.93, 55.02]], marker: "se" }],
    });
    return { svg: m.svg, events: [{ t: "fade", id: "l-lan", at: W(s, "Langeland") }, { t: "fade", id: "l-lol", at: W(s, "Lolland") }, { t: "fade", id: "l-fal", at: W(s, "Falster") },
      { t: "draw", id: "isl", route: m.routes.isl, at: W(s, "Langeland"), dur: W(s, "agreed") - W(s, "Langeland") + 0.5 }],
      cam: { from: { scale: 1, x: 0, y: 0 }, to: { scale: 1.1, x: -60, y: -40 } } };
  } },
  { from: 46, band: "ISLAND BY ISLAND", build: (k, s) => ({
    svg: sky(k, { color: C.linen2 }) + shore(k, -150, 520, 600, 90, { fill: C.oliveDk, snow: true, seed: 31 }) + shore(k, 1300, 2100, 600, 70, { fill: C.oliveDk, snow: true, seed: 33 }) +
      ice(k, { y: 600, seed: 29 }) +
      column(k, "col", { y: 800, x0: -900, n: 14, gap: 230, scale: 0.85, side: "se", kinds: ["cav", "gun", "inf", "inf", "gun", "banner", "cav", "pike"] }) + snowLayer(k, "snow", { n: 40, seed: 12 }),
    events: [{ t: "move", id: "col", at: 0, dur: s.end - s.start, x: 1100 }, { t: "move", id: "snow", at: 0, dur: s.end - s.start, y: 600 }],
  }) },
  { from: 47, band: "AT NIGHT, FIRES ON THE FROZEN SHORE", build: (k, s) => ({
    svg: nightSky(k, { seed: 19 }) + moon(k, 380, 250, 40) + `<rect x="-50" y="620" width="2020" height="500" fill="#8796a3"/>` +
      ground(k, 760, { d: `M-50,720 Q700,690 1300,740 T1970,720 L1970,1100 L-50,1100 Z`, fill: C.oliveDk, snow: 0.5 }) +
      tent(k, 300, 760, { scale: 1.2 }) + tent(k, 1560, 770, { scale: 1.1 }) + tent(k, 1200, 740, { scale: 0.8 }) +
      fire(k, 720, 900, "f1", { scale: 1.2 }) + fire(k, 1240, 930, "f2") +
      person(k, 600, 940, { side: "se", pose: "sit", scale: 1.2 }) + person(k, 840, 950, { side: "se", pose: "sit", scale: 1.2, dir: -1 }) +
      horse(k, 1600, 940, { color: C.brownDk, saddle: false, scale: 1.1, dir: -1 }) + person(k, 1380, 960, { side: "se", weapon: "musket", scale: 1.2, dir: -1 }),
    events: [{ t: "flicker", id: "f1", at: 0, dur: s.end - s.start, origin: "0 0" }, { t: "flicker", id: "f2", at: 0.1, dur: s.end - s.start - 0.1, origin: "0 0" }],
  }) },
  { from: 48, band: "THEY COME ASHORE ON ZEALAND", build: (k, s) => ({
    svg: sky(k) + `<rect x="0" y="380" width="1920" height="200" fill="${C.weld}" opacity="0.25"/>` + ice(k, { y: 620, seed: 37 }) +
      hill(k, `M900,1100 L1000,760 Q1200,640 1500,620 L1970,610 L1970,1100 Z`, { fill: C.olive }) + `<path d="M1000,760 Q1200,640 1500,620 L1970,610 L1970,660 Q1500,670 1050,780 Z" fill="${C.snow}" opacity="0.7"/>` +
      church(k, 1660, 625, { scale: 0.75 }) +
      wrap(k, "climb", person(k, 900, 900, { side: "se", weapon: "banner", flag: "se", arm: "hold", pose: "walk", scale: 1.3 }) + person(k, 760, 950, { side: "se", weapon: "musket", pose: "walk", scale: 1.3 }) + rider(k, 520, 980, "se", 1.1)),
    events: [{ t: "move", id: "climb", at: 0, dur: s.end - s.start, x: 260, y: -120, ease: "power1.out" }],
  }) },
  { from: 49, band: "DAHLBERGH, BUILDER OF FORTRESSES", build: (k, s) => {
    const frameArt = (x, y, art) => `<g transform="translate(${x},${y})"><rect x="-110" y="-80" width="220" height="160" fill="${C.linen}"/><rect x="-110" y="-80" width="220" height="160" fill="none" ${solid(10, C.weldDk)}/><g transform="scale(0.22)">${art}</g></g>`;
    return {
      svg: room(k, { windows: [] }) + frameArt(520, 360, fort(k, 0, 120, {})) + frameArt(1400, 360, castle(k, 0, 220, {})) +
        zoom(seated(k, [[1100, { side: "se", hair: C.grey, arm: "forward", weapon: "quill", dir: -1 }]], 740) +
        table(k, 960, 720, { w: 760, cloth: C.olive, candles: [640], papers: [[-200, 330]] }) +
        `<g transform="translate(960,700) scale(0.18,0.06)">${fort(k, 0, 0, {})}</g>`, 1.8),
    };
  } },
  { from: 50, band: "COPENHAGEN STANDS ALONE", build: (k, s) => {
    const m = map(k, "dk", {
      regions: [{ ...DKNO }, { id: "se0", countries: ["Sweden"], fill: C.weld }, { id: "scania", polygon: POLY.scania, within: ["Sweden"], fill: C.madder },
        { id: "jut", polygon: POLY.jutland, within: ["Denmark"], fill: C.weld }, { id: "fun", polygon: POLY.funen, within: ["Denmark"], fill: C.weld }],
      labels: [L([11.65, 55.45], "ZEALAND", { size: 34 })],
      pins: [{ id: "cph", at: [12.57, 55.68], label: "COPENHAGEN", side: "right", size: 36 }],
      routes: [{ id: "go", via: [[11.93, 55.02], [12.1, 55.3], [12.35, 55.58]], marker: "se" }],
    });
    return { svg: m.svg, events: [{ t: "draw", id: "go", route: m.routes.go, at: 0.3, dur: 5 }, { t: "pulse", id: "cph", at: W(s, "army") }],
      cam: { from: { scale: 1, x: 0, y: 0 }, to: { scale: 1.25, x: 0, y: 0 }, origin: "1180 640" } };
  } },

  // VI · THE PRICE OF PEACE
  { from: 51, band: "VI · THE PRICE OF PEACE", build: (k, s) => ({
    svg: sky(k) + sea(k, { y: 700, rows: [{ dy: 0, amp: 9, wl: 140, fill: C.woad2 }, { dy: 120, amp: 13, wl: 200, fill: C.woad }] }).join("") +
      hill(k, `M500,1100 L540,700 L1970,690 L1970,1100 Z`, { fill: C.olive2 }) + town(k, 1000, 700, { w: 760, scale: 0.75, seed: 9 }) +
      cannon(k, 620, 700, { sledge: false, dir: -1, scale: 0.9 }) +
      wrap(k, "se", [1500, 1650, 1800].map((x, i) => flagCloth(k, x, 470 + i * 12, "se", 1.1) + `<line x1="${x}" y1="${470 + i * 12}" x2="${x}" y2="${640 + i * 12}" ${solid(4, C.brownDk)}/>`).join("") + column(k, "line", { y: 690, x0: 1450, n: 4, gap: 120, scale: 0.55, side: "se", kinds: ["inf", "pike"] }), true) +
      wrap(k, "run", person(k, 900, 960, { side: "civ", arm: "up", pose: "walk", scale: 1.2 }) + person(k, 1040, 980, { side: "civ2", arm: "up", pose: "walk", scale: 1.2 }) + person(k, 1160, 960, { side: "civ3", pose: "walk", scale: 1.15 })),
    events: [{ t: "rise", id: "se", at: W(s, "fields"), dy: 60 }, { t: "move", id: "run", at: 0, dur: s.end - s.start, x: -500 }],
  }) },
  { from: 53, band: "A DANE SITS WITH THE SWEDES", build: (k, s) => ({
    svg: room(k) + flagCloth(k, 300, 300, "dk", 1.8) + flagCloth(k, 1510, 300, "se", 1.8) + zoom(seated(k, [[560, { side: "dk", arm: "forward" }], [760, { side: "dk" }], [1150, { side: "se", dir: -1 }], [1520, { side: "se", dir: -1, arm: "forward", weapon: "quill" }]], 740) +
      wrap(k, "ulf", person(k, 1330, 740, { side: "dk", pose: "sit", dir: -1, coat: C.madder, trim: C.weld }), true) +
      table(k, 1040, 720, { w: 1300, cloth: C.weldDk, candles: [880, 1260], papers: [[-420, 120], [-60, 120], [300, 120]] }) +
      wrap(k, "ring", `<circle cx="1332" cy="600" r="70" fill="none" ${stitch(5, C.madder)}/>`, true), 1.45),
    events: [{ t: "fade", id: "ulf", at: W(s, "Dane") - 0.2 }, { t: "fade", id: "ring", at: W(s, "Dane") }, { t: "pulse", id: "ring", at: W(s, "Corfitz") }],
  }) },
  { from: 55, band: "ULFELDT DIES ON THE RUN", build: (k, s) => ({
    svg: sky(k) + hill(k, `M-50,560 Q300,400 700,520 Q1000,440 1300,520 Q1600,420 1970,520 L1970,700 L-50,700 Z`, { fill: C.olive2 }) +
      tree(k, 300, 690, 150, { leaves: C.oliveDk }) + tree(k, 1500, 690, 180, { leaves: C.oliveDk, seed: 4 }) + church(k, 1100, 690, { scale: 0.45 }) +
      `<rect x="-50" y="690" width="2020" height="410" fill="${C.woad}"/><rect x="-50" y="690" width="2020" height="410" fill="${k.url("satin2")}"/>` +
      [760, 860, 960].map((y) => `<path d="${`M-50,${y} q60,-8 120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0`}" fill="none" ${stitch(3, C.woad2)}/>`).join("") +
      wrap(k, "b", boat(k, 1500, 860, { people: [{ side: "civ", hat: "brim" }, { side: "dk", hat: "brim", hair: C.grey }], dir: -1, scale: 1.3 })),
    events: [{ t: "move", id: "b", at: 0, dur: s.end - s.start, x: -900 }],
  }) },
  { from: 56, band: "THE TREATY OF ROSKILDE · 1658", build: (k, s) => {
    const m = map(k, "rosk", {
      regions: [...SWEDEN([{ id: "hal-h", polygon: POLY.halland, within: ["Sweden"], hatch: true }]), DKNO, ...DANISH_SWEDEN,
        { id: "x-scania", polygon: POLY.scania, within: ["Sweden"], fill: C.weld, hidden: true }, { id: "x-hal", polygon: POLY.halland, within: ["Sweden"], fill: C.weld, hidden: true },
        { id: "x-ble", polygon: POLY.blekinge, within: ["Sweden"], fill: C.weld, hidden: true }, { id: "x-born", polygon: POLY.bornholm, within: ["Denmark"], fill: C.weld, hidden: true },
        { id: "x-boh", polygon: POLY.bohuslan, within: ["Sweden"], fill: C.weld, hidden: true }, { id: "x-tro", polygon: POLY.trondelag, within: ["Norway"], fill: C.weld, hidden: true }],
      labels: [L([8.0, 61.3], "DENMARK–NORWAY", { size: 32 }), L([16.6, 62.6], "SWEDEN", { size: 40, color: C.dark, halo: C.linen }),
        { id: "l1", at: [13.3, 55.75], text: "SCANIA", size: 28, color: C.dark, halo: C.linen }, { id: "l2", at: [11.8, 57.0], text: "HALLAND", size: 26, anchor: "end" },
        { id: "l3", at: [15.4, 56.75], text: "BLEKINGE", size: 26, color: C.dark, halo: C.linen }, { id: "l4", at: [15.0, 54.75], text: "BORNHOLM", size: 26 },
        { id: "l5", at: [10.9, 58.6], text: "BOHUSLÄN", size: 26, anchor: "end" }, { id: "l6", at: [10.5, 63.9], text: "TRONDHEIM", size: 28 }],
      routes: [{ id: "border", via: [[12.62, 56.2], [12.72, 55.95], [12.75, 55.72], [12.85, 55.35]], color: C.linen, width: 6, arrow: false }],
    });
    const ev = [["Scania", "x-scania", "l1"], ["Halland", "x-hal", "l2"], ["Blekinge", "x-ble", "l3"], ["Bornholm", "x-born", "l4"], ["Bohuslän", "x-boh", "l5"], ["Trondheim", "x-tro", "l6"]]
      .flatMap(([w, r, l]) => [{ t: "fade", id: r, at: W(s, w), dur: 0.8 }, { t: "fade", id: l, at: W(s, w) }]);
    return { svg: m.svg, events: [...ev, { t: "draw", id: "border", route: m.routes.border, at: W(s, "border") - 1.5, dur: 2.5 }],
      cam: { from: { scale: 1, x: 0, y: 0 }, to: { scale: 1.12, x: 0, y: 0 }, origin: "900 760" } };
  } },
  { from: 59, band: "CHARLES COMES BACK", build: (k, s) => ({
    svg: sky(k) + town(k, 1450, 640, { w: 700, scale: 0.6, seed: 12 }) + ground(k, 700, { d: `M-50,640 Q900,600 1970,650 L1970,1100 L-50,1100 Z`, fill: C.olive2 }) +
      wrap(k, "camp", tent(k, 200, 760, { scale: 1.1 }) + tent(k, 420, 740, {}) + cannon(k, 720, 860, { sledge: false, scale: 1.2 }) + cannon(k, 980, 900, { sledge: false, scale: 1.2 })) +
      wrap(k, "more", tent(k, 1150, 760, { scale: 0.9 }) + tent(k, 1750, 780, { scale: 0.9 }) + cannon(k, 1550, 900, { sledge: false, scale: 1.1, dir: -1 }), true) +
      column(k, "col", { y: 1000, x0: -700, n: 8, gap: 220, scale: 1.1, side: "se", kinds: ["banner", "pike", "inf", "cav"] }),
    events: [{ t: "rise", id: "more", at: W(s, "surrounded") }, { t: "move", id: "col", at: 0, dur: s.end - s.start, x: 600 }],
  }) },
  { from: 61, band: "COPENHAGEN HOLDS", build: (k, s) => ({
    svg: sky(k) + town(k, 760, 700, { w: 900, scale: 0.7, wall: false, seed: 14 }) +
      sea(k, { y: 720, rows: [{ dy: 0, amp: 9, wl: 140, fill: C.woad2 }, { dy: 110, amp: 13, wl: 200, fill: C.woad }, { dy: 230, amp: 18, wl: 260, fill: C.woad3 }] }).join("") +
      wrap(k, "dutch", ship(k, 1500, 820, { flag: "nl", scale: 0.55, dir: -1 }) + ship(k, 1850, 860, { flag: "nl", scale: 0.6, dir: -1 }), true) +
      wall(k, -50, 1150, 1000, 200) +
      [[120, "dk", "musket"], [260, "civ", "musket"], [400, "civ2", "pike"], [700, "civ3", "musket"], [840, "dk", "pike"], [980, "civ", "musket"]].map(([x, side, weapon]) => person(k, x, 774, { side, weapon, arm: "hold", scale: 1.05, hat: side === "civ2" ? "cap" : "brim" })).join("") +
      person(k, 560, 774, { side: "dk", hat: "crown", cloak: C.madderDk, arm: "point", scale: 1.15, hair: C.dark }),
    events: [{ t: "fade", id: "dutch", at: W(s, "Dutch") - 0.3, dur: 0.4 }, { t: "move", id: "dutch", at: W(s, "Dutch") - 0.3, dur: s.end - s.start - W(s, "Dutch") + 0.3, fromX: 500, x: -150, ease: "power1.out" }],
  }) },
  { from: 62, band: "THE NIGHT ASSAULT FAILS", build: (k, s) => {
    const flash = (id, x, y) => wrap(k, id, `<circle cx="${x}" cy="${y}" r="70" fill="${k.url("glow")}"/><path d="M${x - 30},${y} L${x + 30},${y} M${x},${y - 30} L${x},${y + 30}" ${stitch(5, C.weld)}/>`, true);
    return {
      svg: nightSky(k, { seed: 23, yMax: 300 }) + town(k, 960, 560, { w: 1300, scale: 0.6, wall: false, seed: 16 }) + wall(k, -50, 1970, 860, 280, { fill: C.oliveDk }) +
        wrap(k, "lad", ladder(k, 520, 1000, 330, -8) + ladder(k, 1260, 1000, 330, 8) + person(k, 470, 860, { side: "se", weapon: "sword", arm: "up", scale: 1.1 }) + person(k, 1300, 880, { side: "se", weapon: "sword", arm: "up", scale: 1.1, dir: -1 })) +
        [[300, "dk"], [800, "civ"], [1100, "dk"], [1600, "civ2"]].map(([x, side]) => person(k, x, 580, { side, weapon: "musket", scale: 0.9 })).join("") +
        flash("f1", 640, 520) + flash("f2", 1180, 500) + flash("f3", 900, 540) +
        `<rect x="-50" y="1000" width="2020" height="100" fill="${C.night2}"/>`,
      events: [{ t: "fade", id: "f1", at: 1, dur: 0.2 }, { t: "out", id: "f1", at: 1.4, dur: 0.6 }, { t: "fade", id: "f2", at: 2.6, dur: 0.2 }, { t: "out", id: "f2", at: 3, dur: 0.6 },
        { t: "fade", id: "f3", at: 4.2, dur: 0.2 }, { t: "out", id: "f3", at: 4.6, dur: 0.6 }, { t: "move", id: "lad", at: W(s, "failed"), dur: 1.4, y: 260, ease: "power2.in" }],
    };
  } },
  { from: 63, band: "CHARLES DIES, AGED THIRTY-SEVEN", build: (k, s) => ({
    svg: room(k, { night: true, windows: [960] }) + `<rect x="560" y="700" width="800" height="90" fill="${C.dark}"/>` + cushion(k, 960, 700, 1.3) + crown(k, 960, 650, 0.9) +
      [620, 1300].map((x) => `<circle cx="${x}" cy="560" r="110" fill="${k.url("glow")}"/><rect x="${x - 9}" y="560" width="18" height="140" fill="${C.linen}"/><rect x="${x - 9}" y="560" width="18" height="140" fill="none" ${stitch(2)}/><path id="${k.id("c" + x)}" d="M${x},560 q-12,-20 0,-42 q12,22 0,42 Z" fill="${C.weld}"/>`).join("") +
      flagCloth(k, 870, 380, "se", 3),
  }) },
  { from: 64, band: "THE PEACE OF 1660", build: (k, s) => {
    const m = map(k, "rosk", {
      regions: [...SWEDEN([{ id: "hal", polygon: POLY.halland, within: ["Sweden"], fill: C.weld }]), DKNO,
        { id: "x-born", polygon: POLY.bornholm, within: ["Denmark"], fill: C.weld }, { id: "x-tro", polygon: POLY.trondelag, within: ["Norway"], fill: C.weld }],
      labels: [L([8.0, 61.3], "DENMARK–NORWAY", { size: 32 }), L([16.6, 62.6], "SWEDEN", { size: 40, color: C.dark, halo: C.linen }),
        L([15.0, 54.75], "BORNHOLM", { size: 26 }), L([10.5, 63.9], "TRONDHEIM", { size: 28 }), { id: "l-sc", at: [13.6, 56.2], text: "SCANIA STAYS SWEDISH", size: 28, color: C.dark, halo: C.linen }],
    });
    return { svg: m.svg, events: [{ t: "out", id: "x-born", at: W(s, "Bornholm"), dur: 1.2 }, { t: "out", id: "x-tro", at: W(s, "Trondheim"), dur: 1.2 }, { t: "fade", id: "l-sc", at: W(s, "stayed") }],
      cam: { from: { scale: 1, x: 0, y: 0 }, to: { scale: 1.1, x: 0, y: 0 }, origin: "900 760" } };
  } },
  { from: 65, band: "THE SNAPPHANAR OF THE FORESTS", build: (k, s) => {
    let trees = "";
    for (let i = 0; i < 9; i++) trees += tree(k, 80 + i * 230, 760 + (i % 2) * 20, 300 + (i % 3) * 40, { leaves: i % 2 ? C.oliveDk : C.olive, seed: i + 2 });
    return {
      svg: sky(k) + hill(k, `M-50,700 Q900,640 1970,700 L1970,1100 L-50,1100 Z`, { fill: C.olive2 }) + trees +
        `<path d="M-50,960 Q900,920 1970,960 L1970,1040 Q900,1000 -50,1040 Z" fill="${C.linen3}"/>` +
        wrap(k, "wagon", horse(k, 0, 990, { color: C.brownDk, scale: 1, load: true }) + person(k, -160, 1000, { side: "se", weapon: "musket", pose: "walk" })) +
        wrap(k, "amb", person(k, 640, 800, { side: "civ2", weapon: "musket", hat: "cap", arm: "hold", scale: 1.2 }) + person(k, 1180, 820, { side: "civ", weapon: "musket", arm: "hold", scale: 1.2, dir: -1 }) + person(k, 1500, 800, { side: "civ2", weapon: "pike", hat: "cap", arm: "hold", scale: 1.2, dir: -1 }), true),
      events: [{ t: "move", id: "wagon", at: 0, dur: s.end - s.start, x: 1000 }, { t: "rise", id: "amb", at: W(s, "ambushing"), dy: 40 }],
    };
  } },
  { from: 66, band: "THE BATTLE OF LUND · 1676", build: (k, s) => ({
    svg: sky(k, { color: C.linen2 }) + church(k, 1500, 620, { twin: true, scale: 0.75 }) + town(k, 1500, 620, { w: 600, scale: 0.4, wall: false, spires: [], seed: 31 }) +
      ground(k, 640, { d: `M-50,620 Q900,590 1970,630 L1970,1100 L-50,1100 Z`, fill: C.olive2, snow: 0.75 }) +
      wrap(k, "se", rider(k, 300, 880, "se", 1.1, { pose: "gallop" }) + rider(k, 120, 960, "se", 1.0, { pose: "gallop" }) + person(k, 420, 990, { side: "se", weapon: "pike", arm: "hold", pose: "walk", scale: 1.2 })) +
      wrap(k, "dk", rider(k, 1620, 880, "dk", 1.1, { pose: "gallop", dir: -1 }) + rider(k, 1800, 960, "dk", 1.0, { pose: "gallop", dir: -1 }), false),
    events: [{ t: "move", id: "se", at: 0, dur: s.end - s.start, x: 420, ease: "sine.inOut" }, { t: "move", id: "dk", at: 0, dur: s.end - s.start, x: -420, ease: "sine.inOut" }],
  }) },

  // VII · THE ANSWER
  { from: 67, band: "VII · THE ANSWER", build: (k, s) => {
    const roundel = (id, x, art) => wrap(k, id, `<circle cx="${x}" cy="560" r="170" fill="${C.linen}"/><circle cx="${x}" cy="560" r="170" fill="${k.url("satin")}"/><circle cx="${x}" cy="560" r="170" fill="none" ${stitch(6, C.madder)}/>${art}`);
    const flake = (x) => [0, 60, 120].map((a) => `<g transform="translate(${x},560) rotate(${a})"><path d="M0,-110 L0,110 M-22,-80 L0,-60 L22,-80 M-22,80 L0,60 L22,80" ${stitch(7, C.woad)}/></g>`).join("");
    return {
      svg: sky(k) + roundel("r1", 300, flake(300)) + roundel("r2", 740, crown(k, 740, 620, 1.3)) + roundel("r3", 1180, lantern(k, 1180, 640, { scale: 2.4, glow: 120 })) +
        roundel("r4", 1620, `<g transform="translate(1620,650) scale(0.3)">${castle(k, 0, 0, {})}</g>`),
      events: [{ t: "pop", id: "r1", at: W(s, "winter"), origin: "300 560" }, { t: "pop", id: "r2", at: W(s, "king"), origin: "740 560" }, { t: "pop", id: "r3", at: W(s, "engineer"), origin: "1180 560" }, { t: "pop", id: "r4", at: W(s, "kingdom"), origin: "1620 560" }],
    };
  } },
  { from: 69, band: "THE ICE MELTS", build: (k, s) => {
    const rnd = rng(41);
    let floes = "";
    for (let i = 0; i < 12; i++) {
      const x = rnd() * 1920, y = 660 + rnd() * 380, w = 80 + rnd() * 140;
      floes += `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(w)}" ry="${r1(w * 0.2)}" fill="${C.ice}"/><ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(w)}" ry="${r1(w * 0.2)}" fill="none" ${stitch(3, C.ice3)}/>`;
    }
    return {
      svg: sky(k) + shore(k, 1100, 2050, 620, 60, { fill: C.olive, seed: 43 }) + tree(k, 1500, 600, 140, { leaves: C.olive2 }) + sea(k, { y: 620 }).join("") +
        wrap(k, "floes", floes) + wrap(k, "ship", ship(k, -300, 800, { flag: "none", scale: 0.5 })),
      events: [{ t: "move", id: "floes", at: 0, dur: s.end - s.start, x: 200 }, { t: "move", id: "ship", at: 0, dur: s.end - s.start, x: 900 }],
    };
  } },
  { from: 70, band: "FREDERICK RULES ALONE", build: (k, s) => ({
    svg: room(k, { windows: [260, 1660] }) + zoom(throne(k, 960, 800, 1.05) +
      person(k, 960, 800, { side: "dk", hat: "crown", cloak: C.madderDk, scale: 1.7, hair: C.dark, weapon: "sword", arm: "hold" }) +
      wrap(k, "bow", person(k, 520, 840, { side: "civ", pose: "kneel", scale: 1.4 }) + person(k, 1400, 840, { side: "civ3", pose: "kneel", scale: 1.4, dir: -1 }) + person(k, 300, 850, { side: "civ2", pose: "kneel", scale: 1.3 })), 1.35),
    events: [{ t: "rise", id: "bow", at: W(s, "absolute") - 0.5, dy: -20 }],
  }) },
  { from: 71, band: "THE BORDER TODAY", build: (k, s) => {
    const m = map(k, "today", {
      regions: [{ id: "dk", countries: ["Denmark"], fill: C.madder }, { id: "se", countries: ["Sweden"], fill: C.weld }],
      labels: [L([12.15, 55.95], "DENMARK"), L([13.15, 55.95], "SWEDEN", { color: C.dark, halo: C.linen })],
      pins: [{ id: "cph", at: [12.57, 55.68], label: "COPENHAGEN", side: "left", size: 34 }, { id: "mal", at: [13.0, 55.6], label: "MALMÖ", side: "right", size: 34, labelColor: C.dark }],
      routes: [{ id: "border", via: [[12.62, 56.2], [12.72, 55.95], [12.75, 55.72], [12.8, 55.5], [12.85, 55.35]], color: C.linen, width: 6, arrow: false }],
    });
    return { svg: m.svg, events: [{ t: "draw", id: "border", route: m.routes.border, at: W(s, "border") - 0.3, dur: 4 }] };
  } },
  { from: 72, band: "THE BRIDGE OVER THE SOUND", build: (k, s) => ({
    svg: sky(k) + town(k, 260, 640, { w: 500, scale: 0.6, wall: false, seed: 51 }) +
      `<g>${shape(k, "M1650,640 L1670,330 L1700,330 L1720,640 Z", C.linen2, { w: 3 })}</g>` + town(k, 1650, 640, { w: 480, scale: 0.5, wall: false, spires: [], seed: 52 }) +
      sea(k, { y: 640 }).join("") + bridge(k, 720, "train"),
    events: [{ t: "move", id: "train", at: 0, dur: s.end - s.start, fromX: -600, x: 1900 }, { t: "move", id: "sea-1", at: 0, dur: s.end - s.start, x: -140 }, { t: "move", id: "sea-3", at: 0, dur: s.end - s.start, x: 260 }],
  }) },
  { from: 73, band: "AND AN ARMY WALKED ACROSS IT", build: (k, s) => ({
    svg: sky(k) + [[560, C.weld, 0.25], [600, C.madder, 0.18]].map(([y, c, o]) => `<rect x="0" y="${y - 120}" width="1920" height="120" fill="${c}" opacity="${o}"/>`).join("") +
      `<circle cx="1600" cy="540" r="80" fill="${C.weld}"/><circle cx="1600" cy="540" r="80" fill="none" ${stitch(4, C.madder)}/>` + ice(k, { y: 600, seed: 61, cracks: 4 }) +
      column(k, "col", { y: 690, x0: -300, n: 14, gap: 120, scale: 0.45, side: "se", kinds: ["cav", "inf", "inf", "banner", "gun"] }),
    html: `<div id="${k.id("end")}" style="position:absolute;left:0;right:0;top:175px;text-align:center;font-family:'EB Garamond',serif;font-weight:700;color:${C.madder};font-size:96px;line-height:1.05;letter-spacing:0.04em">THE ARMY THAT<br>WALKED ACROSS<br>THE SEA</div>`,
    events: [{ t: "move", id: "col", at: 0, dur: s.end - s.start, x: 700 }, { t: "fade", id: "end", at: SEG[SEG.length - 1].end - s.start + 0.6, dur: 1.5 }],
    cam: false,
  }) },
];

// ---------- timing and output ----------

const starts = SHOTS.map((s) => (s.from === 0 ? 0 : (SEG[s.from - 1].end + SEG[s.from].start) / 2));
SHOTS.forEach((s, i) => {
  s.start = Math.round(starts[i] * 1000) / 1000;
  s.end = i < SHOTS.length - 1 ? Math.round(starts[i + 1] * 1000) / 1000 : TOTAL;
});

mkdirSync(join(folder, "assets"), { recursive: true });
copyFileSync(join(folder, "audio/narration.wav"), join(folder, "assets/narration.wav"));
const tex = join(folder, "../style-test/assets/tex-linen.jpg");
if (existsSync(tex)) copyFileSync(tex, join(folder, "assets/tex-linen.jpg"));

const TITLE = "The Army That Walked Across the Sea";
const built = writeFilm(folder, SHOTS, { total: TOTAL, title: TITLE });

// Storyboard data: one key frame per shot, late enough that its moment has played.
const KEY = { "shot-13": 0.97, "shot-27": 0.95, "shot-39": 0.85, "shot-47": 0.95 };
mkdirSync(join(folder, "storyboard"), { recursive: true });
writeFileSync(join(folder, "storyboard/shots.json"), JSON.stringify(built.map((b, i) => ({
  n: i + 1, cid: b.cid, start: b.start, end: b.end, band: b.band, title: TITLE,
  key: Math.round((b.start + (b.end - b.start) * (KEY[b.cid] ?? 0.8)) * 100) / 100,
  text: SEG.filter((g) => g.start >= b.start && g.start < b.end).map((g) => g.text).join(" "),
})), null, 1));
console.log(`${built.length} shots, ${TOTAL}s`);
console.log(built.map((b) => `${b.cid} ${b.start.toFixed(1)}-${b.end.toFixed(1)} ${b.band}`).join("\n"));
