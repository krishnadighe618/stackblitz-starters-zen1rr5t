// The channel's tapestry kit: palette, stitch styles and drawn pieces.
// Every function returns an SVG string. `k` is a per-scene context from
// ctx(prefix) so pattern and gradient ids stay unique across a film.
// Pieces face right; pass dir: -1 to face left. y is the ground line.

export const C = {
  dark: "#3a2c22", madder: "#a8432f", madderDk: "#7e2f22", woad: "#3f5c7d", woad2: "#506f92",
  woad3: "#34506f", woadDk: "#273d55", weld: "#c9a13c", weldDk: "#a9842a", olive: "#6f7c3d",
  olive2: "#8a9650", oliveDk: "#56612e", linen: "#efe4c8", linen2: "#e3d5b3", linen3: "#d6c59e",
  ice: "#e2e9ea", ice2: "#c7d5dc", ice3: "#a9bcc7", snow: "#f7f4ec", night: "#24324a",
  night2: "#1a2438", skin: "#e6c39b", brown: "#7a5236", brownDk: "#5a3b26", verdigris: "#6f9a8a",
  grey: "#8f8a80", water: "#2a3f55",
};

// Colours for each side: coat, trim, flag.
export const SIDES = {
  se: { coat: C.woad, trim: C.weld, hat: C.dark },
  dk: { coat: C.madder, trim: C.linen, hat: C.dark },
  civ: { coat: C.brown, trim: C.linen3, hat: C.dark },
  civ2: { coat: C.olive, trim: C.linen, hat: C.dark },
  civ3: { coat: C.weldDk, trim: C.linen, hat: C.dark },
  nl: { coat: C.dark, trim: C.linen, hat: C.dark },
  clergy: { coat: C.dark, trim: C.linen, hat: C.dark },
};

export function ctx(prefix) {
  return { p: prefix, id: (n) => `${prefix}-${n}`, url: (n) => `url(#${prefix}-${n})` };
}

export const r1 = (n) => Math.round(n * 10) / 10;
export function stitch(w = 4, color = C.dark) {
  return `stroke="${color}" stroke-width="${w}" stroke-dasharray="${r1(w * 2)} ${r1(w * 1.2)}" stroke-linecap="round" stroke-linejoin="round"`;
}
export const solid = (w = 4, color = C.dark) => `stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const T = (x, y, s = 1, dir = 1) => `translate(${r1(x)},${r1(y)}) scale(${r1(s * dir * 1000) / 1000},${r1(s * 1000) / 1000})`;

// A small seeded random generator, so drawings are the same on every build.
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Filled shape with the satin stitch texture and a stitched outline.
export function shape(k, d, fill, o = {}) {
  const sw = o.w ?? 4;
  return `<path d="${d}" fill="${fill}"/>` +
    (o.satin === false ? "" : `<path d="${d}" fill="${k.url(o.satin2 ? "satin2" : "satin")}"/>`) +
    (o.outline === false ? "" : `<path d="${d}" fill="none" ${stitch(sw, o.line || C.dark)}/>`);
}

export function defs(k) {
  return `
    <pattern id="${k.id("satin")}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
      <line x1="0" y1="0" x2="0" y2="9" stroke="#000" stroke-opacity="0.13" stroke-width="3.5"/></pattern>
    <pattern id="${k.id("satin2")}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
      <line x1="0" y1="0" x2="0" y2="9" stroke="#fff" stroke-opacity="0.12" stroke-width="3"/></pattern>
    <pattern id="${k.id("stripes")}" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="9" height="18" fill="${C.weld}"/><rect x="9" width="9" height="18" fill="${C.madder}"/></pattern>
    <radialGradient id="${k.id("glow")}"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
    <radialGradient id="${k.id("firelight")}"><stop offset="0" stop-color="#f0a040" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#f0a040" stop-opacity="0"/></radialGradient>`;
}

// ---------- sky, sea, ice, land ----------

export function sky(k, o = {}) {
  return `<rect width="1920" height="1080" fill="${o.color || C.linen}"/>`;
}
export function nightSky(k, o = {}) {
  const rnd = rng(o.seed || 7);
  let s = `<rect width="1920" height="1080" fill="${C.night}"/>`;
  for (let i = 0; i < (o.stars ?? 60); i++) {
    const x = rnd() * 1920, y = 140 + rnd() * (o.yMax ?? 520), r = 2 + rnd() * 3;
    s += `<path d="M${r1(x - r)},${r1(y)} h${r1(2 * r)} M${r1(x)},${r1(y - r)} v${r1(2 * r)}" ${solid(1.8, C.linen)} opacity="${r1(0.5 + rnd() * 0.5)}"/>`;
  }
  return s;
}
export function moon(k, x, y, r = 46) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.linen}"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" ${stitch(3, C.weld)}/>`;
}
export function birds(k, list) {
  return list.map(([x, y]) => `<path d="M${x},${y} q16,-16 30,0 q14,-16 30,0" fill="none" ${stitch(4)}/>`).join("");
}
export function waveLine(y, amp, wl, x0 = -720, x1 = 2640) {
  let d = `M${x0},${y}`;
  for (let x = x0; x < x1; x += wl) d += ` q${wl / 4},${-amp} ${wl / 2},0 q${wl / 4},${amp} ${wl / 2},0`;
  return d;
}
function waveBand(y, amp, wl, bottom = 1100, x0 = -720, x1 = 2640) {
  const xe = x0 + Math.ceil((x1 - x0) / wl) * wl;
  return `${waveLine(y, amp, wl, x0, x1)} L${xe},${bottom} L${x0},${bottom} Z`;
}
// Open sea in rows; each row is a group `${name}-N` that a shot can drift.
export function sea(k, o = {}) {
  const y = o.y ?? 640, name = o.name || "sea";
  const rows = o.rows || [
    { dy: 0, amp: 9, wl: 140, fill: C.woad2 },
    { dy: 120, amp: 13, wl: 190, fill: C.woad },
    { dy: 270, amp: 18, wl: 260, fill: C.woad3 },
  ];
  return rows.map((r, i) => `<g id="${k.id(`${name}-${i + 1}`)}">
      <path d="${waveBand(y + r.dy, r.amp, r.wl)}" fill="${r.fill}"/>
      <path d="${waveBand(y + r.dy, r.amp, r.wl)}" fill="${k.url("satin2")}"/>
      <path d="${waveLine(y + r.dy, r.amp, r.wl)}" fill="none" ${stitch(4, o.crest || C.linen)}/>
    </g>`);
}
// Frozen sea from y down: pale ice, faint stitched lines, seeded cracks and snow.
export function ice(k, o = {}) {
  const y = o.y ?? 620, rnd = rng(o.seed || 3);
  let s = `<rect x="-200" y="${y}" width="2320" height="${1100 - y}" fill="${o.fill || C.ice}"/>`;
  s += `<rect x="-200" y="${y}" width="2320" height="${1100 - y}" fill="${k.url("satin2")}"/>`;
  for (let i = 0; i < 9; i++) {
    const yy = y + 30 + i * ((1080 - y) / 9);
    s += `<path d="M-100,${r1(yy)} L2020,${r1(yy + (rnd() - 0.5) * 20)}" fill="none" ${stitch(2.5, C.ice2)}/>`;
  }
  for (let i = 0; i < (o.cracks ?? 7); i++) {
    let x = rnd() * 1920, yy = y + 40 + rnd() * (1040 - y), d = `M${r1(x)},${r1(yy)}`;
    for (let j = 0; j < 4; j++) { x += 40 + rnd() * 80; yy += (rnd() - 0.5) * 50; d += ` L${r1(x)},${r1(yy)}`; }
    s += `<path d="${d}" fill="none" ${stitch(3, C.ice3)}/>`;
  }
  for (let i = 0; i < (o.drifts ?? 6); i++) {
    const x = rnd() * 1920, yy = y + 30 + rnd() * (1040 - y), w = 80 + rnd() * 160;
    s += `<ellipse cx="${r1(x)}" cy="${r1(yy)}" rx="${r1(w)}" ry="${r1(w * 0.12)}" fill="${C.snow}"/>`;
  }
  s += `<line x1="-200" y1="${y}" x2="2120" y2="${y}" ${stitch(3, C.ice3)}/>`;
  return s;
}
// A low island or far shore on the horizon.
export function shore(k, x0, x1, y, h, o = {}) {
  const rnd = rng(o.seed || 11), n = 6;
  let d = `M${x0},${y}`;
  for (let i = 1; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, top = y - h * (0.5 + rnd() * 0.5);
    d += ` Q${r1(x - (x1 - x0) / n / 2)},${r1(top)} ${r1(x)},${r1(i === n ? y : y - h * 0.4)}`;
  }
  d += " Z";
  return shape(k, d, o.fill || C.olive, { w: 3 }) + (o.snow ? `<path d="${d}" fill="${C.snow}" opacity="0.55"/>` : "");
}
export function ground(k, y, o = {}) {
  const d = o.d || `M-50,${y} Q480,${y - 30} 960,${y} T1970,${y} L1970,1100 L-50,1100 Z`;
  return shape(k, d, o.fill || C.olive, { w: 4 }) + (o.snow ? `<path d="${d}" fill="${C.snow}" opacity="${o.snow}"/>` : "");
}
export function hill(k, d, o = {}) {
  return shape(k, d, o.fill || C.olive, { w: 4 });
}

// ---------- nature ----------

export function tree(k, x, y, h = 220, o = {}) {
  const b = (x1, y1, x2, y2, w) => `<path d="M${r1(x1)},${r1(y1)} L${r1(x2)},${r1(y2)}" ${solid(w, C.brownDk)}/>`;
  let s = b(0, 0, 0, -h, 12);
  const rnd = rng(o.seed || 5);
  for (let i = 0; i < 6; i++) {
    const yy = -h * (0.35 + i * 0.1), side = i % 2 ? 1 : -1, len = h * (0.35 - i * 0.03);
    s += b(0, yy, side * len, yy - len * 0.7, 7);
    s += b(side * len * 0.6, yy - len * 0.42, side * len * (0.6 + rnd() * 0.3), yy - len * 0.95, 4);
  }
  if (o.snow) s += `<ellipse cx="0" cy="${r1(-h * 0.6)}" rx="${r1(h * 0.18)}" ry="8" fill="${C.snow}"/>`;
  if (o.leaves) s += `<circle cx="0" cy="${r1(-h * 0.75)}" r="${r1(h * 0.32)}" fill="${o.leaves}"/><circle cx="0" cy="${r1(-h * 0.75)}" r="${r1(h * 0.32)}" fill="${k.url("satin")}"/><circle cx="0" cy="${r1(-h * 0.75)}" r="${r1(h * 0.32)}" fill="none" ${stitch(3)}/>`;
  return `<g transform="${T(x, y, 1)}">${s}</g>`;
}
export function snowLayer(k, id, o = {}) {
  const rnd = rng(o.seed || 9);
  let dots = "";
  for (let i = 0; i < (o.n ?? 70); i++) {
    const x = rnd() * 1920, y = rnd() * 1080, r = 3 + rnd() * 4;
    dots += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${C.snow}" opacity="${r1(0.6 + rnd() * 0.4)}"/>`;
  }
  return `<g id="${k.id(id)}"><g>${dots}</g><g transform="translate(0,-1080)">${dots}</g><g transform="translate(0,-2160)">${dots}</g></g>`;
}

// ---------- people ----------

// A standing figure about 140 px tall at scale 1.
export function person(k, x, y, o = {}) {
  const side = SIDES[o.side || "se"] || SIDES.se;
  const coat = o.coat || side.coat, trim = o.trim || side.trim;
  const pose = o.pose || "stand";
  let legs;
  if (pose === "walk") legs = `<path d="M-4,-40 L-16,0 M4,-40 L16,0" ${solid(9, C.dark)}/>`;
  else if (pose === "kneel") legs = `<path d="M-6,-40 L-22,-14 L-2,-2 M6,-40 L20,-20 L26,0" ${solid(9, C.dark)}/>`;
  else if (pose === "sit") legs = "";
  else legs = `<path d="M-6,-40 L-7,0 M6,-40 L7,0" ${solid(9, C.dark)}/>`;
  const lift = pose === "kneel" ? 14 : 0;
  const robe = o.robe
    ? `M-26,-2 L26,-2 L17,-104 Q0,-112 -17,-104 Z`
    : `M-24,-38 L24,-38 L17,-104 Q0,-112 -17,-104 Z`;
  let s = `<g transform="translate(0,${lift})">${legs}`;
  if (o.cloak) s += shape(k, `M-20,-104 Q-40,-60 -34,-20 L-6,-30 Z`, o.cloak, { w: 3 });
  s += shape(k, robe, coat, { w: 3 });
  s += `<line x1="-21" y1="-68" x2="21" y2="-68" ${solid(6, trim)}/>`;
  // arm
  const hand = { down: [16, -64], forward: [44, -98], up: [22, -150], point: [52, -112], hold: [30, -80] }[o.arm || "down"];
  s += `<path d="M6,-100 L${hand[0]},${hand[1]}" ${solid(9, coat)}/><circle cx="${hand[0]}" cy="${hand[1]}" r="5" fill="${C.skin}"/>`;
  // weapon or tool
  if (o.weapon === "musket") s += `<line x1="-16" y1="-58" x2="30" y2="-152" ${solid(5, C.brownDk)}/>`;
  if (o.weapon === "pike") s += `<line x1="${hand[0]}" y1="20" x2="${hand[0]}" y2="-240" ${solid(4, C.brownDk)}/><path d="M${hand[0] - 5},-240 L${hand[0]},-262 L${hand[0] + 5},-240 Z" fill="${C.grey}"/>`;
  if (o.weapon === "pole") s += `<line x1="${hand[0] - 20}" y1="${hand[1] - 30}" x2="${hand[0] + 30}" y2="8" ${solid(5, C.brownDk)}/>`;
  if (o.weapon === "sword") s += `<line x1="${hand[0]}" y1="${hand[1]}" x2="${hand[0] + 30}" y2="${hand[1] - 50}" ${solid(4, C.grey)}/>`;
  if (o.weapon === "quill") s += `<line x1="${hand[0]}" y1="${hand[1]}" x2="${hand[0] + 14}" y2="${hand[1] - 22}" ${solid(3, C.linen)}/>`;
  if (o.weapon === "banner") s += `<line x1="${hand[0]}" y1="10" x2="${hand[0]}" y2="-230" ${solid(4, C.brownDk)}/>` + flagCloth(k, hand[0], -230, o.flag || "se", 1.1);
  if (o.weapon === "torch") s += `<line x1="${hand[0]}" y1="${hand[1]}" x2="${hand[0] + 6}" y2="${hand[1] - 40}" ${solid(5, C.brownDk)}/><path d="M${hand[0] + 6},${hand[1] - 40} q-12,-18 0,-38 q12,20 0,38 Z" fill="${C.weld}"/>`;
  // head, hair, hat
  s += `<path d="M-12,-118 Q-16,-98 -8,-94 L-2,-112 Z" fill="${o.hair || C.brownDk}"/>`;
  s += `<circle cx="2" cy="-122" r="13" fill="${C.skin}"/><circle cx="2" cy="-122" r="13" fill="none" ${solid(2.5, C.dark)}/>`;
  s += `<circle cx="9" cy="-124" r="2" fill="${C.dark}"/>`;
  const hat = o.hat ?? "brim";
  if (hat === "brim") s += `<path d="M-10,-133 Q2,-156 15,-133 Z" fill="${side.hat}"/><ellipse cx="2" cy="-133" rx="25" ry="6" fill="${side.hat}"/>` + (o.feather ? `<path d="M-6,-140 q-18,-14 -24,4" fill="none" ${solid(5, o.feather)}/>` : "");
  if (hat === "crown") s += `<path d="M-11,-132 L-11,-146 L-5,-139 L2,-150 L9,-139 L15,-146 L15,-132 Z" fill="${C.weld}"/><path d="M-11,-132 L-11,-146 L-5,-139 L2,-150 L9,-139 L15,-146 L15,-132 Z" fill="none" ${solid(2, C.dark)}/>`;
  if (hat === "helmet") s += `<path d="M-12,-128 Q2,-150 16,-128 Z" fill="${C.grey}"/><line x1="-14" y1="-128" x2="18" y2="-128" ${solid(4, C.grey)}/>`;
  if (hat === "cap") s += `<path d="M-11,-130 Q2,-146 15,-130 Z" fill="${C.dark}"/>`;
  s += `</g>`;
  return `<g transform="${T(x, y, o.scale || 1, o.dir || 1)}">${s}</g>`;
}

// A horse about 200 px long, with an optional rider.
export function horse(k, x, y, o = {}) {
  const coat = o.color || C.brown;
  const legs = o.pose === "gallop"
    ? `M60,-50 L30,-14 M80,-48 L62,-4 M136,-48 L160,-16 M152,-52 L184,-24`
    : `M58,-50 L52,0 M78,-48 L82,0 M134,-48 L128,0 M150,-52 L158,0`;
  let s = `<path d="${legs}" ${solid(10, C.dark)}/>`;
  s += `<path d="M44,-80 Q20,-70 22,-36" fill="none" ${solid(9, C.dark)}/>`;
  s += shape(k, `M44,-80 Q62,-102 120,-98 Q150,-98 162,-84 Q168,-62 152,-50 Q102,-42 58,-46 Q38,-55 44,-80 Z`, coat, { w: 3 });
  s += shape(k, `M146,-90 Q154,-118 168,-134 Q175,-142 190,-138 Q198,-133 196,-124 Q192,-118 180,-118 Q172,-104 164,-80 Z`, coat, { w: 3 });
  s += `<path d="M170,-136 L176,-150 L180,-136 Z" fill="${coat}"/><circle cx="182" cy="-130" r="2.5" fill="${C.dark}"/>`;
  s += `<path d="M150,-96 Q158,-122 172,-136" fill="none" ${solid(6, C.dark)}/>`;
  if (o.saddle !== false) s += `<path d="M86,-100 L120,-100 L116,-88 L90,-88 Z" fill="${C.madderDk}"/>`;
  if (o.rider) {
    const r = o.rider;
    s += person(k, 100, -54, { ...r, pose: "sit", scale: 1 });
    s += `<path d="M96,-80 L92,-48 L100,-40" ${solid(8, C.dark)}/>`;
  }
  if (o.load) s += `<rect x="70" y="-112" width="60" height="22" rx="4" fill="${C.linen3}"/><rect x="70" y="-112" width="60" height="22" rx="4" fill="none" ${stitch(2)}/>`;
  return `<g transform="${T(x, y, o.scale || 1, o.dir || 1)}"><g transform="translate(-100,0)">${s}</g></g>`;
}

export function cannon(k, x, y, o = {}) {
  let s = "";
  if (o.sledge !== false) s += `<path d="M-70,0 L60,0 Q80,0 84,-14" fill="none" ${solid(7, C.brownDk)}/><rect x="-60" y="-26" width="110" height="18" fill="${C.brown}"/><rect x="-60" y="-26" width="110" height="18" fill="none" ${stitch(2)}/>`;
  else s += `<circle cx="-20" cy="-22" r="22" fill="${C.brown}"/><circle cx="-20" cy="-22" r="22" fill="none" ${stitch(3)}/><circle cx="-20" cy="-22" r="5" fill="${C.dark}"/>`;
  s += shape(k, `M-70,-44 L60,-52 Q74,-52 74,-40 Q74,-30 60,-30 L-70,-34 Q-80,-39 -70,-44 Z`, C.dark, { w: 2, line: C.grey });
  return `<g transform="${T(x, y, o.scale || 1, o.dir || 1)}">${s}</g>`;
}

// ---------- flags ----------

export function flagCloth(k, x, y, kind = "se", s = 1) {
  const w = 60 * s, h = 40 * s;
  let f;
  if (kind === "se") f = `<rect width="${w}" height="${h}" fill="${C.woad}"/><rect x="${w * 0.3}" width="${h * 0.22}" height="${h}" fill="${C.weld}"/><rect y="${h * 0.39}" width="${w}" height="${h * 0.22}" fill="${C.weld}"/>`;
  else if (kind === "dk") f = `<rect width="${w}" height="${h}" fill="${C.madder}"/><rect x="${w * 0.3}" width="${h * 0.2}" height="${h}" fill="${C.linen}"/><rect y="${h * 0.4}" width="${w}" height="${h * 0.2}" fill="${C.linen}"/>`;
  else if (kind === "nl") f = `<rect width="${w}" height="${h / 3}" fill="${C.madder}"/><rect y="${h / 3}" width="${w}" height="${h / 3}" fill="${C.linen}"/><rect y="${(2 * h) / 3}" width="${w}" height="${h / 3}" fill="${C.woad}"/>`;
  else if (kind === "en") f = `<rect width="${w}" height="${h}" fill="${C.linen}"/><rect x="${w * 0.43}" width="${h * 0.2}" height="${h}" fill="${C.madder}"/><rect y="${h * 0.4}" width="${w}" height="${h * 0.2}" fill="${C.madder}"/>`;
  else f = `<rect width="${w}" height="${h}" fill="${C.linen}"/>`;
  return `<g transform="translate(${r1(x)},${r1(y)})">${f}<rect width="${w}" height="${h}" fill="none" ${stitch(2)}/></g>`;
}

// ---------- ships and boats ----------

// A 17th-century three-masted warship, bow to the right, waterline at y.
export function ship(k, x, y, o = {}) {
  const flag = o.flag || "dk";
  let s = "";
  const masts = [[60, -320], [180, -380], [290, -300]];
  for (const [mx, top] of masts) s += `<line x1="${mx}" y1="-30" x2="${mx}" y2="${top}" ${solid(7, C.brownDk)}/>`;
  s += `<line x1="350" y1="-50" x2="440" y2="-120" ${solid(6, C.brownDk)}/>`;
  if (o.sails !== "furled") {
    for (const [mx, top] of masts) {
      const w = mx === 180 ? 70 : 58;
      for (const [t, h] of [[top + 40, 95], [top + 150, 110]]) {
        const d = `M${mx - w},${t} L${mx + w},${t} Q${mx + w + 10},${t + h / 2} ${mx + w - 4},${t + h} L${mx - w + 4},${t + h} Q${mx - w + 10},${t + h / 2} ${mx - w},${t} Z`;
        if (t + h < -40) s += shape(k, d, o.sail || C.linen, { w: 3 });
      }
    }
    s += shape(k, `M360,-62 L430,-112 L420,-60 Z`, o.sail || C.linen, { w: 2.5 });
  } else {
    for (const [mx, top] of masts) s += `<line x1="${mx - 50}" y1="${top + 60}" x2="${mx + 50}" y2="${top + 60}" ${solid(10, C.linen3)}/>`;
  }
  const hull = `M-30,-100 L40,-100 L50,-46 L300,-46 Q345,-50 370,-74 L360,-24 Q330,12 280,18 L30,18 Q-18,14 -34,-36 Z`;
  s += shape(k, hull, o.hull || C.brown, { w: 3.5 });
  s += `<path d="M-28,-60 L48,-60 M52,-24 L340,-24" fill="none" ${solid(5, C.weld)}/>`;
  for (let gx = 80; gx <= 300; gx += 44) s += `<rect x="${gx}" y="-14" width="14" height="12" fill="${C.dark}"/>`;
  s += `<rect x="-10" y="-92" width="14" height="14" fill="${C.weld}"/><rect x="14" y="-92" width="14" height="14" fill="${C.weld}"/>`;
  for (const [mx, top] of masts) s += `<line x1="${mx}" y1="${top}" x2="${mx}" y2="${top - 30}" ${solid(4, C.brownDk)}/>` + flagCloth(k, mx + 2, top - 30, flag, 0.7);
  s += flagCloth(k, -60, -150, flag, 0.9) + `<line x1="-30" y1="-100" x2="-60" y2="-150" ${solid(4, C.brownDk)}/>`;
  return `<g transform="${T(x, y, o.scale || 1, o.dir || 1)}"><g transform="translate(-180,0)">${s}</g></g>`;
}
export function boat(k, x, y, o = {}) {
  let s = "";
  (o.people || []).forEach((p, i) => (s += person(k, -50 + i * 60, 6, { ...p, pose: "sit" })));
  s += shape(k, `M-110,-30 L110,-30 Q100,10 60,14 L-70,14 Q-104,8 -110,-30 Z`, o.hull || C.brown, { w: 3 });
  s += `<line x1="-60" y1="-24" x2="-110" y2="30" ${solid(5, C.brownDk)}/><line x1="40" y1="-24" x2="0" y2="30" ${solid(5, C.brownDk)}/>`;
  if (o.chest) s += chest(k, 70, -30, 0.7);
  return `<g transform="${T(x, y, o.scale || 1, o.dir || 1)}">${s}</g>`;
}

// ---------- buildings ----------

// Kronborg: a square Renaissance castle with green copper spires.
export function castle(k, x, y, o = {}) {
  let s = shape(k, `M-420,0 L-380,-60 L380,-60 L420,0 Z`, C.oliveDk, { w: 3 });
  s += shape(k, `M-280,-60 L-280,-260 L280,-260 L280,-60 Z`, C.linen2, { w: 4 });
  s += shape(k, `M-300,-260 L-200,-340 L200,-340 L300,-260 Z`, C.verdigris, { w: 3 });
  for (const tx of [-300, 300]) {
    s += shape(k, `M${tx - 40},-60 L${tx - 40},-320 L${tx + 40},-320 L${tx + 40},-60 Z`, C.linen2, { w: 4 });
    s += shape(k, `M${tx - 48},-320 L${tx},-420 L${tx + 48},-320 Z`, C.verdigris, { w: 3 });
    s += `<line x1="${tx}" y1="-420" x2="${tx}" y2="-450" ${solid(4, C.weld)}/>`;
  }
  s += shape(k, `M-40,-340 L-40,-430 L40,-430 L40,-340 Z`, C.linen2, { w: 3 });
  s += shape(k, `M-50,-430 L0,-560 L50,-430 Z`, C.verdigris, { w: 3 });
  s += `<line x1="0" y1="-560" x2="0" y2="-600" ${solid(4, C.weld)}/>`;
  for (let row = 0; row < 3; row++) for (let i = -4; i <= 4; i++) s += `<path d="M${i * 56 - 10},${-90 - row * 58} v-26 a10,10 0 0 1 20,0 v26 Z" fill="${C.woadDk}"/>`;
  s += `<path d="M-30,-60 v-60 a30,30 0 0 1 60,0 v60 Z" fill="${C.dark}"/>`;
  return `<g transform="${T(x, y, o.scale || 1)}">${s}</g>`;
}
// A row of stepped-gable houses and church spires, with an optional wall.
export function town(k, x, y, o = {}) {
  const rnd = rng(o.seed || 21), w = o.w || 900;
  let s = "", cx = -w / 2;
  const fills = [C.madder, C.linen2, C.weld, C.linen3, C.madderDk];
  while (cx < w / 2 - 40) {
    const hw = 50 + rnd() * 40, hh = 90 + rnd() * 80, f = fills[Math.floor(rnd() * fills.length)];
    const steps = `M${r1(cx)},0 L${r1(cx)},${r1(-hh)} L${r1(cx + hw * 0.2)},${r1(-hh)} L${r1(cx + hw * 0.2)},${r1(-hh - 18)} L${r1(cx + hw * 0.4)},${r1(-hh - 18)} L${r1(cx + hw * 0.4)},${r1(-hh - 36)} L${r1(cx + hw * 0.6)},${r1(-hh - 36)} L${r1(cx + hw * 0.6)},${r1(-hh - 18)} L${r1(cx + hw * 0.8)},${r1(-hh - 18)} L${r1(cx + hw * 0.8)},${r1(-hh)} L${r1(cx + hw)},${r1(-hh)} L${r1(cx + hw)},0 Z`;
    s += shape(k, steps, f, { w: 3 });
    s += `<rect x="${r1(cx + hw * 0.3)}" y="${r1(-hh * 0.6)}" width="${r1(hw * 0.4)}" height="${r1(hh * 0.25)}" fill="${C.woadDk}"/>`;
    cx += hw + 4;
  }
  for (const [sx, sh] of o.spires || [[-w * 0.3, 320], [w * 0.05, 380], [w * 0.32, 300]]) {
    s += shape(k, `M${r1(sx - 34)},0 L${r1(sx - 34)},${r1(-sh * 0.55)} L${r1(sx + 34)},${r1(-sh * 0.55)} L${r1(sx + 34)},0 Z`, C.linen2, { w: 3 });
    s += shape(k, `M${r1(sx - 40)},${r1(-sh * 0.55)} L${r1(sx)},${r1(-sh)} L${r1(sx + 40)},${r1(-sh * 0.55)} Z`, C.verdigris, { w: 3 });
    s += `<line x1="${r1(sx)}" y1="${r1(-sh)}" x2="${r1(sx)}" y2="${r1(-sh - 30)}" ${solid(4, C.weld)}/>`;
  }
  if (o.wall !== false) {
    s += shape(k, `M${-w / 2 - 60},0 L${-w / 2 - 40},-70 L${w / 2 + 40},-70 L${w / 2 + 60},0 Z`, C.oliveDk, { w: 3 });
    for (let bx = -w / 2; bx <= w / 2; bx += 150) s += shape(k, `M${bx - 40},-60 L${bx},-100 L${bx + 40},-60 Z`, C.olive, { w: 3 });
  }
  return `<g transform="${T(x, y, o.scale || 1)}">${s}</g>`;
}
export function church(k, x, y, o = {}) {
  let s = shape(k, `M-120,0 L-120,-130 L120,-130 L120,0 Z`, o.wall || C.linen2, { w: 3 });
  s += shape(k, `M-134,-128 L0,-200 L134,-128 Z`, o.roof || C.madder, { w: 3 });
  const towers = o.twin ? [-80, 80] : [150];
  for (const tx of towers) {
    s += shape(k, `M${tx - 34},0 L${tx - 34},-250 L${tx + 34},-250 L${tx + 34},0 Z`, o.wall || C.linen2, { w: 3 });
    s += shape(k, `M${tx - 40},-250 L${tx},-330 L${tx + 40},-250 Z`, o.spire || C.verdigris, { w: 3 });
    s += `<path d="M${tx - 10},-190 v-26 a10,10 0 0 1 20,0 v26 Z" fill="${C.woadDk}"/>`;
  }
  for (const wx of [-80, -30, 20]) s += `<path d="M${wx},-40 v-40 a12,12 0 0 1 24,0 v40 Z" fill="${C.woadDk}"/>`;
  return `<g transform="${T(x, y, o.scale || 1)}">${s}</g>`;
}
// A star-shaped earth fortress seen from above and to the side.
export function fort(k, x, y, o = {}) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10 - Math.PI / 2, r = i % 2 ? 150 : 260;
    pts.push(`${r1(Math.cos(a) * r * 1.4)},${r1(Math.sin(a) * r * 0.55)}`);
  }
  let s = shape(k, `M${pts.join(" L")} Z`, C.olive2, { w: 4 });
  s += shape(k, `M${pts.map((p) => p.split(",").map((v, j) => r1(Number(v) * (j ? 0.72 : 0.78))).join(",")).join(" L")} Z`, C.olive, { w: 3 });
  for (const [bx, bw, bh] of [[-120, 90, 60], [-10, 110, 80], [110, 80, 55]]) {
    s += shape(k, `M${bx},-10 L${bx},${-10 - bh} L${bx + bw},${-10 - bh} L${bx + bw},-10 Z`, C.linen2, { w: 3 });
    s += shape(k, `M${bx - 8},${-10 - bh} L${bx + bw / 2},${-40 - bh} L${bx + bw + 8},${-10 - bh} Z`, C.madder, { w: 3 });
  }
  s += flagCloth(k, 6, -170, o.flag || "dk", 1) + `<line x1="6" y1="-170" x2="6" y2="-90" ${solid(4, C.brownDk)}/>`;
  return `<g transform="${T(x, y, o.scale || 1)}">${s}</g>`;
}
export function wall(k, x0, x1, y, h = 160, o = {}) {
  let s = shape(k, `M${x0},${y} L${x0 + 30},${y - h} L${x1 - 30},${y - h} L${x1},${y} Z`, o.fill || C.oliveDk, { w: 4 });
  for (let bx = x0 + 60; bx < x1 - 40; bx += 46) s += `<rect x="${bx}" y="${y - h - 26}" width="26" height="26" fill="${o.fill || C.oliveDk}"/><rect x="${bx}" y="${y - h - 26}" width="26" height="26" fill="none" ${stitch(2)}/>`;
  return s;
}
export function windmill(k, x, y, id, o = {}) {
  let s = shape(k, `M-40,0 L-26,-170 L26,-170 L40,0 Z`, C.linen2, { w: 3 });
  s += shape(k, `M-34,-168 L0,-210 L34,-168 Z`, C.madder, { w: 3 });
  let sails = "";
  for (let i = 0; i < 4; i++) sails += `<g transform="rotate(${i * 90})"><rect x="-10" y="-150" width="20" height="140" fill="${C.linen}"/><rect x="-10" y="-150" width="20" height="140" fill="none" ${stitch(2)}/></g>`;
  s += `<g transform="translate(0,-180)"><g id="${k.id(id)}">${sails}</g><circle r="9" fill="${C.dark}"/></g>`;
  return `<g transform="${T(x, y, o.scale || 1)}">${s}</g>`;
}
export function tent(k, x, y, o = {}) {
  const s = shape(k, `M-90,0 L0,-120 L90,0 Z`, o.fill || C.linen2, { w: 3 }) + `<path d="M0,-120 L-14,0 L14,0 Z" fill="${C.dark}"/>` + flagCloth(k, 0, -160, o.flag || "se", 0.6) + `<line x1="0" y1="-120" x2="0" y2="-160" ${solid(3, C.brownDk)}/>`;
  return `<g transform="${T(x, y, o.scale || 1)}">${s}</g>`;
}
export function fire(k, x, y, id, o = {}) {
  const s = `<circle cx="0" cy="-30" r="160" fill="${k.url("firelight")}"/>` +
    `<path d="M-40,0 L40,-14 M-40,-14 L40,0" ${solid(10, C.brownDk)}/>` +
    `<g id="${k.id(id)}"><path d="M-30,-6 Q-34,-50 0,-90 Q34,-50 30,-6 Z" fill="${C.madder}"/><path d="M-16,-6 Q-18,-36 0,-62 Q18,-36 16,-6 Z" fill="${C.weld}"/></g>`;
  return `<g transform="${T(x, y, o.scale || 1)}">${s}</g>`;
}
export function lantern(k, x, y, o = {}) {
  return `<g transform="${T(x, y, o.scale || 1)}"><circle cx="0" cy="-20" r="${o.glow ?? 120}" fill="${k.url("glow")}"/>` +
    `<path d="M-14,-40 L14,-40 L12,0 L-12,0 Z" fill="${C.weld}"/><path d="M-14,-40 L14,-40 L12,0 L-12,0 Z" fill="none" ${solid(3, C.dark)}/>` +
    `<path d="M-8,-40 Q0,-56 8,-40" fill="none" ${solid(3, C.dark)}/></g>`;
}

// ---------- interiors and objects ----------

export function table(k, x, y, o = {}) {
  const w = o.w || 700;
  let s = shape(k, `M${-w / 2},0 L${w / 2},0 L${w / 2 - 10},-30 L${-w / 2 + 10},-30 Z`, C.brown, { w: 3 });
  s += shape(k, `M${-w / 2 + 10},0 L${w / 2 - 10},0 L${w / 2 - 20},120 L${-w / 2 + 20},120 Z`, o.cloth || C.madder, { w: 3 });
  for (const [px, pw] of o.papers || [[-120, 90], [40, 110]]) s += `<path d="M${px},-32 L${px + pw},-32 L${px + pw - 8},-44 L${px + 8},-44 Z" fill="${C.linen}"/><path d="M${px},-32 L${px + pw},-32 L${px + pw - 8},-44 L${px + 8},-44 Z" fill="none" ${stitch(2)}/>`;
  for (const cx of o.candles || []) s += `<rect x="${cx - 6}" y="-80" width="12" height="50" fill="${C.linen}"/><path d="M${cx},-80 q-8,-14 0,-28 q8,14 0,28 Z" fill="${C.weld}"/><circle cx="${cx}" cy="-96" r="60" fill="${k.url("glow")}"/>`;
  return `<g transform="${T(x, y, 1)}">${s}</g>`;
}
export function crown(k, x, y, s = 1) {
  const d = `M-50,0 L-56,-60 L-28,-30 L0,-74 L28,-30 L56,-60 L50,0 Z`;
  return `<g transform="${T(x, y, s)}">${shape(k, d, C.weld, { w: 3 })}<circle cx="0" cy="-20" r="9" fill="${C.madder}"/><circle cx="-30" cy="-16" r="6" fill="${C.woad}"/><circle cx="30" cy="-16" r="6" fill="${C.woad}"/></g>`;
}
export function cushion(k, x, y, s = 1) {
  return `<g transform="${T(x, y, s)}">${shape(k, `M-80,0 Q-90,-30 -70,-40 L70,-40 Q90,-30 80,0 Z`, C.madder, { w: 3 })}<circle cx="-80" cy="-4" r="8" fill="${C.weld}"/><circle cx="80" cy="-4" r="8" fill="${C.weld}"/></g>`;
}
export function throne(k, x, y, s = 1) {
  return `<g transform="${T(x, y, s)}">${shape(k, `M-90,0 L-90,-320 Q0,-380 90,-320 L90,0 Z`, C.madder, { w: 4 })}${shape(k, `M-110,0 L-110,-140 L110,-140 L110,0 Z`, C.weldDk, { w: 3 })}</g>`;
}
export function chest(k, x, y, s = 1) {
  return `<g transform="${T(x, y, s)}">${shape(k, `M-60,0 L-60,-60 L60,-60 L60,0 Z`, C.brown, { w: 3 })}${shape(k, `M-64,-60 Q0,-96 64,-60 Z`, C.brownDk, { w: 3 })}` +
    [-30, -5, 20].map((cx) => `<circle cx="${cx}" cy="-68" r="12" fill="${C.weld}"/><circle cx="${cx}" cy="-68" r="12" fill="none" ${solid(2, C.weldDk)}/>`).join("") + `</g>`;
}
export function goods(k, x, y, s = 1) {
  let g = "";
  for (const bx of [-140, -70]) g += shape(k, `M${bx - 28},0 Q${bx - 34},-40 ${bx - 28},-80 L${bx + 28},-80 Q${bx + 34},-40 ${bx + 28},0 Z`, C.brown, { w: 3 }) + `<path d="M${bx - 32},-26 h64 M${bx - 32},-54 h64" ${solid(4, C.dark)}/>`;
  g += shape(k, `M0,0 Q-6,-60 20,-70 Q46,-60 40,0 Z`, C.linen3, { w: 3 });
  for (let i = 0; i < 4; i++) g += `<rect x="70" y="${-20 - i * 20}" width="160" height="18" fill="${i % 2 ? C.brown : C.weldDk}"/><rect x="70" y="${-20 - i * 20}" width="160" height="18" fill="none" ${stitch(2)}/>`;
  return `<g transform="${T(x, y, s)}">${g}</g>`;
}
export function scales(k, x, y, s = 1) {
  return `<g transform="${T(x, y, s)}"><line x1="0" y1="0" x2="0" y2="-150" ${solid(6, C.brownDk)}/><line x1="-90" y1="-140" x2="90" y2="-140" ${solid(5, C.brownDk)}/>` +
    `<path d="M-90,-140 L-120,-80 L-60,-80 Z M90,-140 L60,-80 L120,-80 Z" fill="none" ${solid(2, C.dark)}/>` +
    `<path d="M-125,-80 Q-90,-60 -55,-80 Z M55,-80 Q90,-60 125,-80 Z" fill="${C.weld}"/></g>`;
}
export function ladder(k, x, y, h = 260, angle = -14) {
  let s = `<line x1="-24" y1="0" x2="-24" y2="${-h}" ${solid(6, C.brownDk)}/><line x1="24" y1="0" x2="24" y2="${-h}" ${solid(6, C.brownDk)}/>`;
  for (let ry = -20; ry > -h; ry -= 34) s += `<line x1="-24" y1="${ry}" x2="24" y2="${ry}" ${solid(4, C.brownDk)}/>`;
  return `<g transform="translate(${x},${y}) rotate(${angle})">${s}</g>`;
}
export function hole(k, x, y, w = 260) {
  const pts = [];
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 * i) / 14, r = (i % 2 ? 0.86 : 1) * w;
    pts.push(`${r1(Math.cos(a) * r)},${r1(Math.sin(a) * r * 0.28)}`);
  }
  return `<g transform="translate(${x},${y})"><path d="M${pts.join(" L")} Z" fill="${C.water}"/><path d="M${pts.join(" L")} Z" fill="none" ${stitch(4, C.ice3)}/>` +
    `<path d="M${-w * 0.6},${-w * 0.05} q20,-10 40,0 q20,-10 40,0" fill="none" ${stitch(3, C.linen)}/></g>`;
}
// A modern cable-stayed bridge, in the same stitched style.
export function bridge(k, y, trainId) {
  let s = `<path d="M-50,${y} L1970,${y - 40}" ${solid(16, C.grey)}/><path d="M-50,${y + 16} L1970,${y - 24}" ${solid(4, C.dark)}/>`;
  for (const px of [700, 1220]) {
    const py = y - (px / 1920) * 40;
    s += `<path d="M${px - 18},${py + 80} L${px - 10},${py - 260} L${px + 10},${py - 260} L${px + 18},${py + 80} Z" fill="${C.linen2}"/><path d="M${px - 18},${py + 80} L${px - 10},${py - 260} L${px + 10},${py - 260} L${px + 18},${py + 80} Z" fill="none" ${stitch(3)}/>`;
    for (let i = 1; i <= 6; i++) s += `<line x1="${px}" y1="${py - 250 + i * 10}" x2="${px - i * 70}" y2="${py + (i * 70 / 1920) * 40}" ${solid(2, C.dark)}/><line x1="${px}" y1="${py - 250 + i * 10}" x2="${px + i * 70}" y2="${py - (i * 70 / 1920) * 40}" ${solid(2, C.dark)}/>`;
  }
  for (let px = 120; px < 1920; px += 240) if (px !== 720 && px !== 1200) s += `<rect x="${px - 8}" y="${y - (px / 1920) * 40}" width="16" height="90" fill="${C.linen3}"/>`;
  let train = "";
  for (let i = 0; i < 4; i++) train += `<rect x="${i * 130}" y="-36" width="124" height="34" rx="8" fill="${i ? C.linen : C.madder}"/><rect x="${i * 130}" y="-36" width="124" height="34" rx="8" fill="none" ${stitch(2)}/>` + [20, 60, 100].map((wx) => `<rect x="${i * 130 + wx}" y="-30" width="16" height="12" fill="${C.woadDk}"/>`).join("");
  s += `<g id="${k.id(trainId)}"><g transform="translate(0,${y - 8}) rotate(-1.2)">${train}</g></g>`;
  return s;
}
export function frieze(y, h, colors = [C.madder, C.woad, C.weld, C.olive]) {
  const cell = 96;
  let s = `<rect x="0" y="${y}" width="1920" height="${h}" fill="${C.linen}"/>`;
  for (let i = 0, x = 0; x < 1920; i++, x += cell) {
    const cx = x + cell / 2, cy = y + h / 2, r = h * 0.32;
    s += `<path d="M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z" fill="${colors[i % colors.length]}" ${stitch(3)}/>`;
    s += `<line x1="${x + cell}" y1="${y + 10}" x2="${x + cell}" y2="${y + h - 10}" ${stitch(3, C.madder)}/>`;
  }
  s += `<line x1="0" y1="${y + 4}" x2="1920" y2="${y + 4}" ${stitch(4, C.madder)}/><line x1="0" y1="${y + h - 4}" x2="1920" y2="${y + h - 4}" ${stitch(4, C.madder)}/>`;
  return s;
}
