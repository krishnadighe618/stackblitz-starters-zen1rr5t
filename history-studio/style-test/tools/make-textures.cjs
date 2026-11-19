// Renders the seamless 512 px texture tiles in assets/ with headless Chromium
// (Playwright). Run once: node tools/make-textures.cjs
const { chromium } = require("playwright");
const path = require("path");

const gray = "0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1";
const tone = (lo, hi, warm = 0) => {
  const s = hi - lo;
  return `<feComponentTransfer>
    <feFuncR type="linear" slope="${s}" intercept="${lo}"/>
    <feFuncG type="linear" slope="${s}" intercept="${lo - warm}"/>
    <feFuncB type="linear" slope="${s}" intercept="${lo - warm * 2}"/>
  </feComponentTransfer>`;
};
const textures = {
  // Vellum: soft blotches plus fine fibre, slightly warm.
  "tex-vellum": `
    <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="3" stitchTiles="stitch" result="a"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="7" stitchTiles="stitch" result="b"/>
    <feComposite in="a" in2="b" operator="arithmetic" k2="0.75" k3="0.35" k4="-0.05"/>
    <feColorMatrix type="matrix" values="${gray}"/>${tone(0.62, 1.12, 0.02)}`,
  // Linen: horizontal and vertical threads.
  "tex-linen": `
    <feTurbulence type="fractalNoise" baseFrequency="0.015 0.55" numOctaves="2" seed="11" stitchTiles="stitch" result="h"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.55 0.015" numOctaves="2" seed="13" stitchTiles="stitch" result="v"/>
    <feComposite in="h" in2="v" operator="arithmetic" k2="0.55" k3="0.55"/>
    <feColorMatrix type="matrix" values="${gray}"/>${tone(0.55, 1.2, 0.01)}`,
  // Card stock: fine, even fibre.
  "tex-card": `
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="17" stitchTiles="stitch" result="a"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="19" stitchTiles="stitch" result="b"/>
    <feComposite in="a" in2="b" operator="arithmetic" k2="0.7" k3="0.3"/>
    <feColorMatrix type="matrix" values="${gray}"/>${tone(0.8, 1.1)}`,
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  for (const [name, filter] of Object.entries(textures)) {
    await page.setContent(`<body style="margin:0"><svg width="512" height="512">
      <filter id="f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">${filter}</filter>
      <rect width="512" height="512" filter="url(#f)"/></svg></body>`);
    const out = path.join(__dirname, "..", "assets", `${name}.jpg`);
    await page.screenshot({ path: out, type: "jpeg", quality: 90 });
    console.log("wrote", out);
  }
  await browser.close();
})();
