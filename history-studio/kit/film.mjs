// Turns a shot list into a HyperFrames project: one scene file per shot,
// a frame overlay (inscription band, border frieze, linen texture) that runs
// the whole film, and index.html with the narration.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { C, ctx, defs, frieze, stitch } from "./tapestry.mjs";

// Word timing: finds when a word is spoken, from Whisper's transcript, or
// by its position in the paragraph when Whisper spelled it differently.
export function timing(folder) {
  const segments = JSON.parse(readFileSync(join(folder, "audio/segments.json"), "utf8"));
  const words = JSON.parse(readFileSync(join(folder, "audio/transcript.json"), "utf8"));
  const norm = (w) => w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  return {
    segments,
    // Global time of the nth occurrence of `word` at or after `from`.
    word(word, from = 0, n = 1) {
      const want = norm(word);
      let seen = 0;
      for (const w of words) {
        if (w.start < from - 0.05) continue;
        if (norm(w.text) === want && ++seen === n) return w.start;
      }
      seen = 0;
      for (const s of segments) {
        if (s.end < from) continue;
        let idx = -1, pos = 0;
        const text = s.text.toLowerCase();
        while ((idx = text.indexOf(word.toLowerCase(), pos)) !== -1) {
          const t = s.start + (idx / text.length) * (s.end - s.start);
          if (t >= from - 0.05 && ++seen === n) return t;
          pos = idx + 1;
        }
      }
      throw new Error(`word not found: ${word} after ${from}`);
    },
  };
}

const num = (v) => Math.round(v * 1000) / 1000;

function eventJS(e) {
  const at = num(Math.max(0, e.at ?? 0)), dur = num(e.dur ?? 0.6), el = e.id ? `$("${e.id}")` : "";
  switch (e.t) {
    case "fade":
      return `tl.fromTo(${el}, { opacity: ${e.from ?? 0} }, { opacity: ${e.to ?? 1}, duration: ${dur}, ease: "power1.inOut" }, ${at});`;
    case "out":
      return `tl.fromTo(${el}, { opacity: 1 }, { opacity: 0, duration: ${dur}, ease: "power1.in" }, ${at});`;
    case "rise":
      return `tl.fromTo(${el}, { opacity: 0, y: ${e.dy ?? 24} }, { opacity: 1, y: 0, duration: ${num(e.dur ?? 0.7)}, ease: "power3.out" }, ${at});`;
    case "pop":
      return `tl.fromTo(${el}, { scale: 0, svgOrigin: "${e.origin}" }, { scale: 1, svgOrigin: "${e.origin}", duration: ${num(e.dur ?? 0.45)}, ease: "back.out(2)" }, ${at});`;
    case "pulse":
      return `tl.fromTo(${el}, { opacity: 1 }, { opacity: 0.35, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: 3 }, ${at});`;
    case "move":
      return `tl.fromTo(${el}, { x: ${e.fromX ?? 0}, y: ${e.fromY ?? 0} }, { x: ${e.x ?? 0}, y: ${e.y ?? 0}, duration: ${dur}, ease: "${e.ease || "none"}" }, ${at});`;
    case "scale":
      return `tl.fromTo(${el}, { scale: ${e.from}, svgOrigin: "${e.origin}" }, { scale: ${e.to}, svgOrigin: "${e.origin}", duration: ${dur}, ease: "${e.ease || "power1.inOut"}" }, ${at});`;
    case "spin":
      return `tl.fromTo(${el}, { rotation: ${e.from ?? 0}, svgOrigin: "${e.origin}" }, { rotation: ${e.deg}, svgOrigin: "${e.origin}", duration: ${dur}, ease: "${e.ease || "none"}" }, ${at});`;
    case "attr":
      return `tl.fromTo(${el}, { attr: ${JSON.stringify(e.from)} }, { attr: ${JSON.stringify(e.to)}, duration: ${dur}, ease: "${e.ease || "power1.inOut"}" }, ${at});`;
    case "flicker": {
      const reps = Math.max(1, Math.floor(dur / 0.22) - 1);
      return `tl.fromTo(${el}, { scaleY: 1, svgOrigin: "${e.origin}" }, { scaleY: 0.82, svgOrigin: "${e.origin}", duration: 0.22, ease: "sine.inOut", yoyo: true, repeat: ${reps} }, ${at});`;
    }
    case "bob":
      return `(() => { const n = ${el}, o = { k: 0 }; tl.fromTo(o, { k: 0 }, { k: 1, duration: ${dur}, ease: "none", onUpdate() {
        const s = o.k * ${dur}; n.setAttribute("transform", "translate(0," + (${e.amp ?? 6} * Math.sin(6.2832 * s / ${e.period ?? 1.6} + ${e.phase ?? 0})).toFixed(2) + ") rotate(" + (${e.rot ?? 0} * Math.sin(6.2832 * s / ${e.period ?? 1.6} + ${e.phase ?? 0} + 0.8)).toFixed(2) + ", ${e.ox ?? 0}, ${e.oy ?? 0})"); } }, ${at}); })();`;
    case "draw": {
      const r = e.route;
      return `(() => { const L = ${r.length}, S = ${JSON.stringify(r.samples)}, ease = gsap.parseEase("${e.ease || "power1.inOut"}");
        const rev = $("${e.id}-reveal"), m = $("${e.id}-marker"), o = { k: 0 };
        tl.fromTo(o, { k: 0 }, { k: 1, duration: ${dur}, ease: "none", onUpdate() {
          const f = ease(o.k); rev.setAttribute("stroke-dashoffset", (L * (1 - f)).toFixed(1));
          if (m) { const i = Math.min(S.length - 2, Math.floor(f * (S.length - 1))), t = f * (S.length - 1) - i, a = S[i], b = S[i + 1];
            m.setAttribute("transform", "translate(" + (a[0] + (b[0] - a[0]) * t).toFixed(1) + "," + (a[1] + (b[1] - a[1]) * t).toFixed(1) + ")"); } } }, ${at});
        const h = $("${e.id}-head"); if (h) tl.fromTo(h, { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${num(at + dur - 0.1)}); })();`;
    }
    default:
      throw new Error(`unknown event ${e.t}`);
  }
}

function shotFile(shot) {
  const p = shot.p, dur = num(shot.end - shot.start);
  const cam = shot.cam === false ? "" : (() => {
    const c = shot.cam || {};
    const from = c.from || { scale: 1, x: 0, y: 0 }, to = c.to || { scale: 1.045, x: 0, y: 0 };
    const o = c.origin || "960 540";
    return `tl.fromTo($("cam"), { scale: ${from.scale}, x: ${from.x}, y: ${from.y}, svgOrigin: "${o}" }, { scale: ${to.scale}, x: ${to.x}, y: ${to.y}, svgOrigin: "${o}", duration: ${dur}, ease: "${c.ease || "sine.inOut"}" }, 0);`;
  })();
  return `<template>
  <style>
    #root { position: absolute; inset: 0; overflow: hidden; background: ${C.linen}; }
    #root .fill { position: absolute; inset: 0; width: 100%; height: 100%; }
    ${shot.css || ""}
  </style>
  <div id="root" data-composition-id="${shot.cid}" data-width="1920" data-height="1080">
    <svg id="${p}-all" class="fill" viewBox="0 0 1920 1080">
      <defs>${defs(shot.k)}</defs>
      <g id="${p}-cam">${shot.svg}</g>
    </svg>
    ${shot.html || ""}
    <div id="${p}-tex" class="fill" style="background-image:url(assets/tex-linen.jpg);background-size:512px 512px;mix-blend-mode:multiply;opacity:0.7" data-layout-ignore data-layout-allow-occlusion></div>
  </div>
  <script>
    (() => {
      const $ = (id) => document.getElementById("${p}-" + id);
      const tl = gsap.timeline({ paused: true });
      tl.fromTo($("all"), { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" }, 0);
      ${cam}
      ${(shot.events || []).map(eventJS).join("\n      ")}
      window.__timelines["${shot.cid}"] = tl;
    })();
  </script>
</template>
`;
}

function frameFile(shots, total) {
  const k = ctx("fr");
  const bands = shots
    .filter((s) => s.band)
    .map((s) => {
      const size = s.band.length > 34 ? Math.floor((48 * 34) / s.band.length) : 48;
      return `<div id="fr-${s.p}" class="clip band" data-start="${num(s.start)}" data-duration="${num(s.end - s.start)}" style="font-size:${size}px">${s.band}</div>`;
    })
    .join("\n    ");
  const fades = shots
    .filter((s) => s.band)
    .map((s) => `tl.fromTo("#fr-${s.p}", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out" }, ${num(s.start + 0.15)});`)
    .join("\n      ");
  return `<template>
  <style>
    #root { position: absolute; inset: 0; pointer-events: none; }
    #root .fill { position: absolute; inset: 0; width: 100%; height: 100%; }
    #root .band { position: absolute; left: 0; right: 0; top: 34px; text-align: center; font-family: "EB Garamond", serif;
      font-weight: 700; letter-spacing: 0.18em; color: ${C.madder}; white-space: nowrap; }
    #root .tex { position: absolute; left: 0; right: 0; background-image: url(assets/tex-linen.jpg); background-size: 512px 512px; mix-blend-mode: multiply; opacity: 0.7; }
  </style>
  <div id="root" data-composition-id="frame" data-width="1920" data-height="1080">
    <svg class="fill" viewBox="0 0 1920 1080" data-layout-ignore>
      <rect x="0" y="0" width="1920" height="132" fill="${C.linen}"/>
      <line x1="0" y1="8" x2="1920" y2="8" ${stitch(4, C.madder)}/>
      <line x1="0" y1="124" x2="1920" y2="124" ${stitch(4, C.madder)}/>
      ${frieze(960, 120)}
    </svg>
    ${bands}
    <div class="tex" style="top:0;height:132px" data-layout-ignore data-layout-allow-occlusion></div>
    <div class="tex" style="top:960px;height:120px" data-layout-ignore data-layout-allow-occlusion></div>
  </div>
  <script>
    (() => {
      const tl = gsap.timeline({ paused: true });
      ${fades}
      window.__timelines["frame"] = tl;
    })();
  </script>
</template>
`;
}

// shots: [{ name, start, end, band, build(k) -> { svg, html?, css?, events?, cam? } }]
export function writeFilm(folder, shots, { total, audio = "assets/narration.wav", title = "film" }) {
  mkdirSync(join(folder, "compositions"), { recursive: true });
  const built = shots.map((s, i) => {
    const p = `s${String(i + 1).padStart(2, "0")}`;
    const k = ctx(p);
    const out = s.build(k, s);
    return { ...s, ...out, p, k, cid: `shot-${p.slice(1)}` };
  });
  for (const b of built) writeFileSync(join(folder, `compositions/${b.cid}.html`), shotFile(b));
  writeFileSync(join(folder, "compositions/frame.html"), frameFile(built, total));
  const hosts = built
    .map((b) => `      <div id="${b.cid}" data-composition-id="${b.cid}" data-composition-src="compositions/${b.cid}.html" data-start="${num(b.start)}" data-duration="${num(b.end - b.start)}" data-track-index="0" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`)
    .join("\n");
  writeFileSync(
    join(folder, "index.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: ${C.linen}; }
      #frame { z-index: 10; }
    </style>
  </head>
  <body>
    <!-- Generated by tools/build-film.mjs from the shot list: edit that and re-run it. -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="${num(total)}" data-width="1920" data-height="1080">
${hosts}
      <div id="frame" data-composition-id="frame" data-composition-src="compositions/frame.html" data-start="0" data-duration="${num(total)}" data-track-index="2" data-track-kind="graphics" data-width="1920" data-height="1080"></div>
      <audio id="narration" class="clip" src="${audio}" data-start="0" data-track-index="1" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`,
  );
  return built;
}
